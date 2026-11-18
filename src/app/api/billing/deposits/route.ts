import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'
import { configuredServiceUrl, requestTimeout } from '../../../../lib/external-service'
import { findDocumentPack } from '../../../../modules/documents/billing-policy'
import { createPendingPayment, listPayments, availableDocumentCredits } from '../../../../modules/billing/server/billing-repository'

const terapayUrl = () => configuredServiceUrl(process.env.TERAPAY_API_URL)
const terapayToken = () => process.env.TERAPAY_SERVICE_TOKEN || ''
const allowedProvider = (value: unknown) => String(value || '').trim().toUpperCase() === 'AIRTEL_GAB' ? 'AIRTEL_GAB' : null
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^241[0-9]{8}$/.test(digits)) return digits
  if (/^0[0-9]{8}$/.test(digits)) return `241${digits.slice(1)}`
  if (/^[0-9]{8}$/.test(digits)) return `241${digits}`
  return null
}

export async function GET(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  try {
    const owner = String(checked.user?.id || '')
    if (!takeRateLimit(`payments-read:user:${owner}`, 60, 60_000) || !takeRateLimit('payments-read:global', 1200, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
    const persistedLimit = await enforcePersistentRateLimit(owner, 'payments-read', 60, 1200, 60_000)
    if (!persistedLimit.available) return NextResponse.json({ error: 'Historique des paiements momentanément indisponible.' }, { status: 503 })
    if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
    const payments = await listPayments(owner)
    const documentCredits = await availableDocumentCredits(owner)
    return NextResponse.json({ payments, documentCredits })
  } catch { return NextResponse.json({ error: 'Historique des paiements momentanément indisponible.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const owner = String(checked.user?.id || '')
  if (!takeRateLimit(`payment-create:user:${owner}`, 5, 15 * 60_000) || !takeRateLimit('payment-create:global', 300, 15 * 60_000)) return NextResponse.json({ error: 'Trop de demandes de paiement rapprochées. Réessayez plus tard.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(owner, 'payment-create', 5, 300, 15 * 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de demandes de paiement rapprochées. Réessayez plus tard.' }, { status: 429 })
  let body: Record<string, unknown>
  try { body = await readBoundedJson(request, 4096) as Record<string, unknown> } catch (error) { return NextResponse.json({ error: error instanceof RequestBodyLimitError ? 'Demande de paiement trop volumineuse.' : 'Données de paiement invalides.' }, { status: 400 }) }
  const pack = findDocumentPack(body.packCode)
  const phoneNumber = normalizePhone(String(body.phoneNumber || ''))
  const provider = allowedProvider(body.provider)
  if (!pack || !phoneNumber || !provider) return NextResponse.json({ error: 'Choisissez un pack et un numéro Airtel Gabon valide.' }, { status: 400 })
  const base = terapayUrl(); const token = terapayToken()
  if (!base || !token) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  const depositId = randomUUID()
  const reference = `MINIAPP-${owner}-${depositId}`
  try {
    const response = await fetch(`${base}/api/document-deposits`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ externalUserId: owner, packCode: pack.code, currency: pack.currency, provider, phoneNumber, documentReference: reference }), cache: 'no-store', signal: requestTimeout(5_000) })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    const externalDepositId = typeof payload.depositId === 'string' && /^[0-9a-f-]{36}$/i.test(payload.depositId) ? payload.depositId : ''
    if (!response.ok || !externalDepositId) return NextResponse.json({ error: 'Le paiement n’a pas pu être initialisé.' }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 })
    await createPendingPayment({ depositId: externalDepositId, owner, packCode: pack.code, documents: pack.documents, amount: pack.amount, currency: pack.currency, provider, phoneNumber })
    return NextResponse.json({ success: true, depositId: externalDepositId, status: String(payload.status || 'PENDING'), amount: pack.amount, currency: pack.currency, documents: pack.documents }, { status: 202 })
  } catch { return NextResponse.json({ error: 'Le service de paiement est momentanément indisponible.' }, { status: 503 }) }
}
