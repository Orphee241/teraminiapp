import { NextRequest, NextResponse } from 'next/server'
import { authenticate, staffPermission, requireSameOrigin } from '../../_auth'
import { documentOperationError } from '../../../../lib/document-errors'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { invoiceActorHeaders, invoiceOwnerHeaders } from '../../../../lib/invoice-owner-signature'
import { invalidateDocumentLists } from '../../../../lib/document-cache'
import { userStaffRole } from '../../_auth'
import { enqueueTelegramNotificationForRecipients } from '../../../../modules/notifications/server/notifications'
import { notificationRecipientsForOwner } from '../../../../modules/teams/server/team-repository'
import { recordAuditEvent } from '../../../../modules/administration/server/repository'
import { resolveDocumentOwner } from '../../../../modules/documents/document-access'
const apiBase = () => (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
const validDocumentId = (value: string) => /^\d{1,18}$/.test(value)

async function proxy(request: NextRequest, path: string, owner: string, body?: unknown) {
  try {
    const base = apiBase()
    const key = process.env.INVOICE_API_KEY || ''
    if (!base || !key) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
    const bodyText = body === undefined ? '' : JSON.stringify(body)
    const proof = invoiceOwnerHeaders(owner, request.method, path, bodyText)
    const response = await fetch(`${base}${path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json', 'x-api-key': key, ...proof },
      body: body === undefined ? undefined : bodyText,
      cache: 'no-store',
    })
    if (response.status === 204) return new NextResponse(null, { status: 204 })
    if (!response.ok) {
      const message = request.method === 'PUT'
        ? documentOperationError(response.status, 'modification')
        : response.status === 404 ? 'Document introuvable.' : 'Impossible de traiter ce document pour le moment.'
      return NextResponse.json({ error: message }, { status: response.status })
    }
    const text = await response.text()
    let payload: unknown
    try { payload = text ? JSON.parse(text) : {} } catch { payload = { error: 'Service de documents momentanément indisponible.' } }
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Service de documents momentanément indisponible.' }, { status: 503 })
  }
}

function bodyFailure(error: unknown) {
  const tooLarge = error instanceof RequestBodyLimitError
  return NextResponse.json({ error: tooLarge ? 'Document trop volumineux.' : 'Données du document invalides.' }, { status: tooLarge ? 413 : 400 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const id = (await params).id
  if (!validDocumentId(id)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  if (await staffPermission(owner, 'read') === false) return NextResponse.json({ error: 'Votre rôle ne permet pas de consulter les documents.' }, { status: 403 })
  if (!takeRateLimit(`document-detail:user:${owner}`, 120, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const access = resolveDocumentOwner(owner, request.nextUrl.searchParams.get('owner_telegram_id'), await userStaffRole(owner), 'read')
  if (!access.allowed) return NextResponse.json({ error: 'Votre rôle ou le propriétaire demandé ne permet pas cette consultation.' }, { status: 403 })
  return proxy(request, `/v1/documents/${id}?owner_telegram_id=${encodeURIComponent(access.owner)}`, access.owner)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const id = (await params).id
  if (!validDocumentId(id)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  if (await staffPermission(owner, 'update') === false) return NextResponse.json({ error: 'Votre rôle ne permet pas de modifier les documents.' }, { status: 403 })
  if (!takeRateLimit(`document-mutate:user:${owner}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de modifications rapprochées.' }, { status: 429 })
  let body: any
  try { body = await readBoundedJson(request, 64 * 1024) } catch (error) { return bodyFailure(error) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Données du document invalides.' }, { status: 400 })
  const access = resolveDocumentOwner(owner, body.owner_telegram_id, await userStaffRole(owner), 'update')
  if (!access.allowed) return NextResponse.json({ error: 'Votre rôle ou le propriétaire demandé ne permet pas cette modification.' }, { status: 403 })
  body.owner_telegram_id = access.owner
  invalidateDocumentLists(access.owner)
  return proxy(request, `/v1/documents/${id}?owner_telegram_id=${encodeURIComponent(access.owner)}`, access.owner, body)
}

export async function DELETE() {
  return NextResponse.json({ error: 'La suppression définitive est désactivée. Utilisez l’annulation avec motif.' }, { status: 403 })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const actor = String(auth.user?.id || '')
  if (await staffPermission(actor, 'cancel') !== true) return NextResponse.json({ error: 'Seul un Admin peut annuler un document.' }, { status: 403 })
  if (!takeRateLimit(`document-cancel:user:${actor}`, 10, 60_000)) return NextResponse.json({ error: 'Trop d’annulations rapprochées.' }, { status: 429 })
  const id = (await params).id
  if (!validDocumentId(id)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  let body: unknown
  try { body = await readBoundedJson(request, 4096) } catch (error) { return bodyFailure(error) }
  const reason = body && typeof body === 'object' && !Array.isArray(body) ? String((body as Record<string, unknown>).reason || '').trim() : ''
  if (!reason || reason.length > 1000) return NextResponse.json({ error: 'Indiquez un motif (1 à 1000 caractères).' }, { status: 400 })
  const owner = String(body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>).owner_telegram_id || actor : actor)
  if (!/^\d{1,20}$/.test(owner)) return NextResponse.json({ error: 'Propriétaire invalide.' }, { status: 400 })
  const actorRole = await userStaffRole(actor)
  if (owner !== actor && !actorRole) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const base = apiBase(); const key = process.env.INVOICE_API_KEY || ''
  if (!base || !key) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  const path = `/v1/documents/${id}/cancel?owner_telegram_id=${encodeURIComponent(owner)}`
  const bodyText = JSON.stringify({ reason })
  const proof = invoiceOwnerHeaders(owner, 'POST', path, bodyText)
  const actorProof = invoiceActorHeaders(owner, actor, 'POST', path, bodyText)
  try {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, ...proof, ...actorProof }, body: bodyText, cache: 'no-store' })
    if (!response.ok) { const payload = await response.json().catch(() => ({})); return NextResponse.json({ error: payload.detail || 'Annulation impossible.' }, { status: response.status }) }
    invalidateDocumentLists(owner)
    const upstreamPayload = await response.json().catch(() => ({}))
    let auditRecorded = true
    try { await recordAuditEvent({ actorId: actor, actorRole: actorRole || 'admin', action: 'document.cancel', targetType: 'document', targetId: id, reason, metadata: { owner_telegram_id: owner } }) } catch { auditRecorded = false }
    void notificationRecipientsForOwner(owner).then(recipients => enqueueTelegramNotificationForRecipients({ eventType: 'document.cancelled', entityType: 'document', entityId: id, idempotencyKey: `document.cancelled:${id}:${upstreamPayload.cancelled_at || reason}`, title: 'Document annulé', body: `Un document a été annulé. Motif : ${reason}`, appUrl: process.env.MINIAPP_PUBLIC_URL || 'https://t.me/Terainterface_bot?startapp' }, recipients)).catch(() => undefined)
    return NextResponse.json({ ...upstreamPayload, audit_recorded: auditRecorded })
  } catch { return NextResponse.json({ error: 'Service de documents momentanément indisponible.' }, { status: 503 }) }
}
