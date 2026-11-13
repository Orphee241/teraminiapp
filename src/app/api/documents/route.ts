import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../_auth'
import { documentOperationError } from '../../../lib/document-errors'
import { readBoundedJson, RequestBodyLimitError } from '../../../lib/request-body'
import { takeRateLimit } from '../../../lib/rate-limit'
import { invoiceOwnerHeaders } from '../../../lib/invoice-owner-signature'
import { cachedDocumentList, cacheDocumentList, invalidateDocumentLists } from '../../../lib/document-cache'
import { DAILY_FREE_DOCUMENT_LIMIT, DOCUMENT_PACKS } from '../../../modules/documents/billing-policy'

const apiBase = () => (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
const apiKey = () => process.env.INVOICE_API_KEY || ''

async function proxy(request: NextRequest, path: string, owner: string, body?: unknown) {
  const base = apiBase()
  if (!base || !apiKey()) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  try {
    const bodyText = body === undefined ? '' : JSON.stringify(body)
    const proof = invoiceOwnerHeaders(owner, request.method, path, bodyText)
    const response = await fetch(`${base}${path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey(), ...proof },
      body: body === undefined ? undefined : bodyText,
      cache: 'no-store',
    })
    if (!response.ok) {
      const message = request.method === 'POST'
        ? documentOperationError(response.status)
        : 'Impossible de charger vos documents. Réessayez dans quelques instants.'
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

async function dailyDocumentUsage(owner: string): Promise<number | null> {
  const base = apiBase()
  if (!base || !apiKey()) return null
  const path = `/v1/documents?owner_telegram_id=${encodeURIComponent(owner)}&status_filter=&document_type=`
  try {
    const proof = invoiceOwnerHeaders(owner, 'GET', path)
    const response = await fetch(`${base}${path}`, { headers: { 'x-api-key': apiKey(), ...proof }, cache: 'no-store' })
    if (!response.ok) return null
    const payload = await response.json().catch(() => ({})) as { documents?: Array<{ created_at?: string }> }
    const today = new Date().toISOString().slice(0, 10)
    return Array.isArray(payload.documents) ? payload.documents.filter(document => String(document.created_at || '').slice(0, 10) === today).length : 0
  } catch { return null }
}

async function auth(request: NextRequest) {
  const result = await authenticate(request)
  return result.response ? { response: result.response, owner: '' } : { response: null, owner: String(result.user?.id || '') }
}

export async function GET(request: NextRequest) {
  const checked = await auth(request)
  if (checked.response) return checked.response
  if (!takeRateLimit(`documents-read:user:${checked.owner}`, 90, 60_000) || !takeRateLimit('documents-read:global', 3000, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées. Réessayez dans un instant.' }, { status: 429 })
  const params = request.nextUrl.searchParams
  const query = new URLSearchParams({ owner_telegram_id: checked.owner, search: params.get('search') || '', status_filter: params.get('status') || '', document_type: params.get('document_type') || '' })
  const key = `${checked.owner}:${params.get('document_type') || ''}:${params.get('status') || ''}:${params.get('search') || ''}`
  const cached = cachedDocumentList(key)
  if (cached) return NextResponse.json(cached)
  const result = await proxy(request, `/v1/documents?${query.toString()}`, checked.owner)
  if (result.status === 200) {
    const body = await result.clone().json().catch(() => null)
    if (body) cacheDocumentList(key, body)
  }
  return result
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await auth(request)
  if (checked.response) return checked.response
  if (!takeRateLimit(`documents-create:user:${checked.owner}`, 8, 60 * 60_000) || !takeRateLimit('documents-create:global', 600, 60 * 60_000)) return NextResponse.json({ error: 'Trop de créations rapprochées. Réessayez plus tard.' }, { status: 429 })
  let body: any
  try { body = await readBoundedJson(request, 64 * 1024) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Document trop volumineux.' : 'Données du document invalides.' }, { status: tooLarge ? 413 : 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Données du document invalides.' }, { status: 400 })
  const usedToday = await dailyDocumentUsage(checked.owner)
  if (usedToday === null) return NextResponse.json({ error: 'Impossible de vérifier votre quota de génération. Réessayez.' }, { status: 503 })
  if (usedToday >= DAILY_FREE_DOCUMENT_LIMIT) {
    return NextResponse.json({ error: 'Votre quota gratuit quotidien est atteint.', code: 'DOCUMENT_PACK_REQUIRED', freeLimit: DAILY_FREE_DOCUMENT_LIMIT, usedToday, packs: DOCUMENT_PACKS }, { status: 402 })
  }
  body.owner_telegram_id = checked.owner
  invalidateDocumentLists(checked.owner)
  return proxy(request, '/v1/documents', checked.owner, body)
}
