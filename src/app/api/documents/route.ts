import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../_auth'

const apiBase = () => (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
const apiKey = () => process.env.INVOICE_API_KEY || ''

async function proxy(request: NextRequest, path: string, body?: unknown) {
  const base = apiBase()
  if (!base || !apiKey()) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })
  const response = await fetch(`${base}${path}`, {
    method: request.method,
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey() },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ error: 'Réponse invalide du service de documents.' }))
  return NextResponse.json(payload, { status: response.status })
}

async function auth(request: NextRequest) {
  const result = await authenticate(request)
  return result.response ? { response: result.response, owner: '' } : { response: null, owner: String(result.user?.id || '') }
}

export async function GET(request: NextRequest) {
  const checked = await auth(request)
  if (checked.response) return checked.response
  const params = request.nextUrl.searchParams
  const query = new URLSearchParams({ owner_telegram_id: checked.owner, search: params.get('search') || '', status_filter: params.get('status') || '' })
  return proxy(request, `/v1/documents?${query.toString()}`)
}

export async function POST(request: NextRequest) {
  const checked = await auth(request)
  if (checked.response) return checked.response
  const body = await request.json()
  body.owner_telegram_id = checked.owner
  return proxy(request, '/v1/documents', body)
}
