import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { findDocumentPack } from '../../../../modules/documents/billing-policy'
import { createPendingPayment } from '../../../../modules/billing/server/billing-repository'

const terapayUrl = () => String(process.env.TERAPAY_API_URL || '').replace(/\/$/, '')
const terapayToken = () => process.env.TERAPAY_SERVICE_TOKEN || ''
const allowedProvider = (value: unknown) => String(value || '').trim().toUpperCase() === 'AIRTEL_GAB' ? 'AIRTEL_GAB' : null
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^241[0-9]{8}$/.test(digits)) return digits
  if (/^0[0-9]{8}$/.test(digits)) return `241${digits.slice(1)}`
  if (/^[0-9]{8}$/.test(digits)) return `241${digits}`
  return null
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Données de paiement invalides.' }, { status: 400 }) }
  const pack = findDocumentPack(body.packCode)
  const phoneNumber = normalizePhone(String(body.phoneNumber || ''))
  const provider = allowedProvider(body.provider)
  if (!pack || !phoneNumber || !provider) return NextResponse.json({ error: 'Choisissez un pack et un numéro Airtel Gabon valide.' }, { status: 400 })
  const base = terapayUrl(); const token = terapayToken()
  if (!base || !token) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  const depositId = randomUUID()
  const owner = String(checked.user?.id || '')
  const reference = `MINIAPP-${owner}-${depositId}`
  try {
    const response = await fetch(`${base}/api/document-deposits`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ externalUserId: owner, packCode: pack.code, currency: pack.currency, provider, phoneNumber, documentReference: reference }), cache: 'no-store' })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || !payload.depositId) return NextResponse.json({ error: 'Le paiement n’a pas pu être initialisé.' }, { status: response.status >= 400 && response.status < 500 ? response.status : 502 })
    await createPendingPayment({ depositId: String(payload.depositId), owner, packCode: pack.code, documents: pack.documents, amount: pack.amount, currency: pack.currency, provider, phoneNumber })
    return NextResponse.json({ success: true, depositId: String(payload.depositId), status: String(payload.status || 'PENDING'), amount: pack.amount, currency: pack.currency, documents: pack.documents }, { status: 202 })
  } catch { return NextResponse.json({ error: 'Le service de paiement est momentanément indisponible.' }, { status: 503 }) }
}
