import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { documentOperationError } from '../../../../lib/document-errors'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { invoiceOwnerHeaders } from '../../../../lib/invoice-owner-signature'

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
  if (!takeRateLimit(`document-detail:user:${owner}`, 120, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  return proxy(request, `/v1/documents/${id}?owner_telegram_id=${encodeURIComponent(owner)}`, owner)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const id = (await params).id
  if (!validDocumentId(id)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  if (!takeRateLimit(`document-mutate:user:${owner}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de modifications rapprochées.' }, { status: 429 })
  let body: any
  try { body = await readBoundedJson(request, 64 * 1024) } catch (error) { return bodyFailure(error) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Données du document invalides.' }, { status: 400 })
  body.owner_telegram_id = owner
  return proxy(request, `/v1/documents/${id}?owner_telegram_id=${encodeURIComponent(owner)}`, owner, body)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const id = (await params).id
  if (!validDocumentId(id)) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })
  if (!takeRateLimit(`document-mutate:user:${owner}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de suppressions rapprochées.' }, { status: 429 })
  return proxy(request, `/v1/documents/${id}?owner_telegram_id=${encodeURIComponent(owner)}`, owner)
}
