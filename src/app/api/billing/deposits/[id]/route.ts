import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../_auth'
import { takeRateLimit } from '../../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../../lib/request-security'
import { configuredServiceUrl, requestTimeout } from '../../../../../lib/external-service'
import { updatePaymentStatus } from '../../../../../modules/billing/server/billing-repository'
import { enqueueTelegramNotificationForRecipients } from '../../../../../modules/notifications/server/notifications'
import { notificationRecipientsForOwner } from '../../../../../modules/teams/server/team-repository'

const terapayUrl = () => configuredServiceUrl(process.env.TERAPAY_API_URL)
const terapayToken = () => process.env.TERAPAY_SERVICE_TOKEN || ''
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Identifiant de paiement invalide.' }, { status: 400 })
  const owner = String(checked.user?.id || '')
  if (!takeRateLimit(`payment-status:user:${owner}`, 60, 60_000) || !takeRateLimit('payment-status:global', 1200, 60_000)) return NextResponse.json({ error: 'Trop de vérifications rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(owner, 'payment-status', 60, 1200, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de vérifications rapprochées.' }, { status: 429 })
  const base = terapayUrl(); const token = terapayToken()
  if (!base || !token) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  try {
    const response = await fetch(`${base}/api/document-deposits/${id}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: requestTimeout(5_000) })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) return NextResponse.json({ error: 'Impossible de vérifier le paiement.' }, { status: 502 })
    const providerStatus = String(payload.status || 'PENDING').toUpperCase()
    const status = ['PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','EXPIRED'].includes(providerStatus) ? providerStatus : 'PENDING'
    const result = await updatePaymentStatus(id, status, String(checked.user?.id || ''))
    if (!result) return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 })
    if (result.newlyCredited) void notificationRecipientsForOwner(result.owner).then(recipients => enqueueTelegramNotificationForRecipients({ eventType: 'payment.completed', entityType: 'payment', entityId: id, idempotencyKey: `payment.completed:${id}`, title: 'Paiement confirmé', body: `Un paiement est confirmé. ${result.documents} crédit${result.documents > 1 ? 's' : ''} de document${result.documents > 1 ? 's' : ''} sont disponibles.`, appUrl: process.env.MINIAPP_PUBLIC_URL || 'https://t.me/Terainterface_bot?startapp' }, recipients)).catch(() => undefined)
    return NextResponse.json({ success: true, depositId: id, status, message: typeof payload.message === 'string' ? payload.message.slice(0, 240) : undefined, credited: result.credited })
  } catch { return NextResponse.json({ error: 'Impossible de vérifier le paiement.' }, { status: 503 }) }
}
