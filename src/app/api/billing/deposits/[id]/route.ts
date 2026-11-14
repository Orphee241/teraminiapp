import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../_auth'
import { updatePaymentStatus } from '../../../../../modules/billing/server/billing-repository'

const terapayUrl = () => String(process.env.TERAPAY_API_URL || '').replace(/\/$/, '')
const terapayToken = () => process.env.TERAPAY_SERVICE_TOKEN || ''

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Identifiant de paiement invalide.' }, { status: 400 })
  const base = terapayUrl(); const token = terapayToken()
  if (!base || !token) return NextResponse.json({ error: 'Le paiement est momentanément indisponible.' }, { status: 503 })
  try {
    const response = await fetch(`${base}/api/document-deposits/${id}`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok) return NextResponse.json({ error: 'Impossible de vérifier le paiement.' }, { status: 502 })
    const result = await updatePaymentStatus(id, String(payload.status || 'PENDING'), String(checked.user?.id || ''))
    if (!result) return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 })
    return NextResponse.json({ success: true, depositId: id, status: String(payload.status || 'PENDING').toUpperCase(), credited: result.credited })
  } catch { return NextResponse.json({ error: 'Impossible de vérifier le paiement.' }, { status: 503 }) }
}
