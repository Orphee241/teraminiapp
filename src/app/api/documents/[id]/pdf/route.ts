import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../../_auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const base = (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
  if (!base || !process.env.INVOICE_API_KEY) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  const id = (await params).id
  const response = await fetch(`${base}/v1/documents/${id}/pdf?owner_telegram_id=${encodeURIComponent(String(checked.user?.id || ''))}`, { headers: { 'x-api-key': process.env.INVOICE_API_KEY }, cache: 'no-store' })
  if (!response.ok) return NextResponse.json({ error: 'Document indisponible.' }, { status: response.status })
  return new NextResponse(await response.arrayBuffer(), { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': response.headers.get('content-disposition') || 'inline' } })
}
