import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../_auth'

const apiBase = () => (process.env.INVOICE_API_URL || '').replace(/\/$/, '')

async function proxy(request: NextRequest, path: string, body?: unknown) {
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: request.method,
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.INVOICE_API_KEY || '' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    })
    // The document service returns 204 after a successful DELETE. A 204 response cannot contain a JSON body.
    if (response.status === 204) return new NextResponse(null, { status: 204 })
    const text = await response.text()
    let payload: unknown
    try { payload = text ? JSON.parse(text) : {} } catch { payload = { error: `Service de documents indisponible (${response.status}).` } }
    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json({ error: 'Service de documents momentanément indisponible.' }, { status: 503 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  return proxy(request, `/v1/documents/${(await params).id}?owner_telegram_id=${encodeURIComponent(owner)}`)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const body = await request.json()
  body.owner_telegram_id = owner
  return proxy(request, `/v1/documents/${(await params).id}?owner_telegram_id=${encodeURIComponent(owner)}`, body)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  return proxy(request, `/v1/documents/${(await params).id}?owner_telegram_id=${encodeURIComponent(owner)}`)
}
