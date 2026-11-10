import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../api/documents/[id]/pdf/route'

const botToken = 'test-telegram-bot-token'
const owner = '123456789'
const documentId = '72'
const params = { params: Promise.resolve({ id: documentId }) }
const base = `https://app.terainterface.com/api/documents/${documentId}/pdf`

function initData() {
  const data = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: Number(owner) }) })
  const entries: [string, string][] = []
  data.forEach((value, key) => entries.push([key, value]))
  const check = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = Uint8Array.from(crypto.createHmac('sha256', 'WebAppData').update(botToken).digest())
  data.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'))
  return data.toString()
}
const authenticated = (method: 'POST' | 'GET') => new NextRequest(base, { method, headers: { 'x-telegram-init-data': initData() } })

const original = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TERAMINI_ADMIN_SESSION_SECRET: process.env.TERAMINI_ADMIN_SESSION_SECRET,
  INVOICE_API_URL: process.env.INVOICE_API_URL,
  INVOICE_API_KEY: process.env.INVOICE_API_KEY,
  INVOICE_OWNER_SIGNING_SECRET: process.env.INVOICE_OWNER_SIGNING_SECRET,
}

afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  vi.unstubAllGlobals()
})

describe('owner-scoped Telegram PDF download ticket', () => {
  it('rejects an unauthenticated request, then permits a short-lived signed download without exposing the invoice key', async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken
    process.env.TERAMINI_ADMIN_SESSION_SECRET = 'test-admin-session-secret-with-enough-entropy'
    process.env.INVOICE_API_URL = 'https://invoice.test'
    process.env.INVOICE_API_KEY = 'private-api-key'
    process.env.INVOICE_OWNER_SIGNING_SECRET = 'test-owner-signing-secret-32-bytes-minimum'
    const upstream = vi.fn(() => Promise.resolve(new Response(new Uint8Array([37, 80, 68, 70, 45]), { status: 200, headers: { 'content-disposition': 'inline; filename="DEV-72.pdf"' } })))
    vi.stubGlobal('fetch', upstream)

    expect((await POST(new NextRequest(base, { method: 'POST' }), params)).status).toBe(401)
    const ticketResponse = await POST(authenticated('POST'), params)
    expect(ticketResponse.status).toBe(200)
    const { url } = await ticketResponse.json()
    expect(url).toMatch(/^https:\/\/app\.terainterface\.com\/api\/documents\/72\/pdf\?download_ticket=/)
    expect(url).toContain(`owner_telegram_id=${owner}`)
    expect(url).not.toContain('private-api-key')
    const signed = new URL(url)
    const reply = await GET(new NextRequest(signed), params)
    expect(reply.status).toBe(200)
    expect(reply.headers.get('content-disposition')).toContain('attachment')
    expect(reply.headers.get('access-control-allow-origin')).toBe('*')
    expect(new Uint8Array(await reply.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70, 45]))
    expect(upstream).toHaveBeenCalledOnce()
    expect((upstream.mock.calls as unknown as Array<[RequestInfo | URL]>)[0][0]).toContain(`owner_telegram_id=${owner}`)

    signed.searchParams.set('owner_telegram_id', '987654321')
    expect((await GET(new NextRequest(signed), params)).status).toBe(401)
    signed.searchParams.set('owner_telegram_id', owner)
    signed.searchParams.set('download_ticket', '0000000000.' + 'a'.repeat(64))
    expect((await GET(new NextRequest(signed), params)).status).toBe(401)
    expect(upstream).toHaveBeenCalledOnce()
  })
})
