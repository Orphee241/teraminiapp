import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../../_auth'
import { takeRateLimit } from '../../../../../lib/rate-limit'
import { invoiceOwnerHeaders } from '../../../../../lib/invoice-owner-signature'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const id = (await params).id
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ error: 'Document indisponible.' }, { status: 404 })
  const owner = String(checked.user?.id || '')
  if (!takeRateLimit(`document-pdf:user:${owner}`, 30, 60_000)) return NextResponse.json({ error: 'Trop de téléchargements rapprochés.' }, { status: 429 })

  const base = (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
  const key = process.env.INVOICE_API_KEY || ''
  if (!base || !key) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  try {
    const path = `/v1/documents/${id}/pdf?owner_telegram_id=${encodeURIComponent(owner)}`
    const proof = invoiceOwnerHeaders(owner, 'GET', path)
    const response = await fetch(`${base}${path}`, { headers: { 'x-api-key': key, ...proof }, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'Document indisponible.' }, { status: response.status })
    return new NextResponse(await response.arrayBuffer(), { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': response.headers.get('content-disposition') || 'inline' } })
  } catch { return NextResponse.json({ error: 'Service de documents momentanément indisponible.' }, { status: 503 }) }
}
