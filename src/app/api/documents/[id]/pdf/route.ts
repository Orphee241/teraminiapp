import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { authenticate } from '../../../_auth'
import { takeRateLimit } from '../../../../../lib/rate-limit'
import { invoiceOwnerHeaders } from '../../../../../lib/invoice-owner-signature'

const downloadSecret = () => process.env.TERAMINI_ADMIN_SESSION_SECRET || ''
const issueDownloadTicket = (id: string, owner: string) => {
  const expiry = Math.floor(Date.now() / 1000) + 300
  const payload = `${id}.${owner}.${expiry}`
  const secret = downloadSecret()
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('download ticket signing is not configured')
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${expiry}.${signature}`
}
const verifyDownloadTicket = (id: string, owner: string, ticket: string) => {
  const [expiryText, signature] = ticket.split('.')
  if (!/^\d{10}$/.test(expiryText || '') || !/^[a-f0-9]{64}$/.test(signature || '')) return false
  const expiry = Number(expiryText)
  if (expiry < Math.floor(Date.now() / 1000) || expiry > Math.floor(Date.now() / 1000) + 300) return false
  const expected = new Uint8Array(createHmac('sha256', downloadSecret()).update(`${id}.${owner}.${expiry}`).digest())
  const actual = new Uint8Array(Buffer.from(signature, 'hex'))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const id = (await params).id
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ error: 'Document indisponible.' }, { status: 404 })
  const owner = String(checked.user?.id || '')
  if (!takeRateLimit(`document-download-ticket:user:${owner}`, 10, 60_000)) return NextResponse.json({ error: 'Trop de demandes rapprochées.' }, { status: 429 })
  try {
    const ticket = issueDownloadTicket(id, owner)
    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.terainterface.com'
    const origin = new URL(configuredOrigin).origin
    const url = new URL(`/api/documents/${id}/pdf?download_ticket=${encodeURIComponent(ticket)}&owner_telegram_id=${encodeURIComponent(owner)}`, origin)
    return NextResponse.json({ url: url.toString() }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Téléchargement indisponible.' }, { status: 503 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id
  if (!/^\d{1,18}$/.test(id)) return NextResponse.json({ error: 'Document indisponible.' }, { status: 404 })
  const ticket = request.nextUrl.searchParams.get('download_ticket') || ''
  const ticketExpiry = Number(ticket.split('.')[0])
  const owner = String(request.nextUrl.searchParams.get('owner_telegram_id') || '')
  const validTicket = owner && verifyDownloadTicket(id, owner, ticket)
  if (validTicket) return streamPdf(request, id, owner, ticketExpiry)
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  return streamPdf(request, id, String(checked.user?.id || ''))
}

async function streamPdf(request: NextRequest, id: string, owner: string, ticketExpiry?: number) {
  if (!takeRateLimit(`document-pdf:user:${owner}`, 30, 60_000)) return NextResponse.json({ error: 'Trop de téléchargements rapprochés.' }, { status: 429 })

  const base = (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
  const key = process.env.INVOICE_API_KEY || ''
  if (!base || !key) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  try {
    const path = `/v1/documents/${id}/pdf?owner_telegram_id=${encodeURIComponent(owner)}`
    const proof = invoiceOwnerHeaders(owner, 'GET', path)
    const response = await fetch(`${base}${path}`, { headers: { 'x-api-key': key, ...proof }, cache: 'no-store' })
    if (!response.ok) return NextResponse.json({ error: 'Document indisponible.' }, { status: response.status })
    const pdf = await response.arrayBuffer()
    const headers = new Headers({
      'content-type': 'application/pdf',
      'content-disposition': ticketExpiry ? `attachment; filename="document-${id}.pdf"` : (response.headers.get('content-disposition') || 'inline'),
      'cache-control': 'private, no-store',
      'content-length': String(pdf.byteLength),
    })
    if (ticketExpiry) {
      headers.set('access-control-allow-origin', 'https://web.telegram.org')
      headers.set('access-control-expose-headers', 'Content-Disposition')
      headers.set('content-disposition', `attachment; filename="document-${id}.pdf"`)
    }
    return new NextResponse(pdf, { status: 200, headers })
  } catch {
    return NextResponse.json({ error: 'Service de documents momentanément indisponible.' }, { status: 503 })
  }
}
