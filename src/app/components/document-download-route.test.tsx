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

describe('owner-scoped Telegram PDF download', () => {
  it('rejects an unauthenticated ticket request and returns a short-lived private object URL without exposing service credentials', async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken
    process.env.TERAMINI_ADMIN_SESSION_SECRET = 'test-admin-session-secret-with-enough-entropy'
    process.env.INVOICE_API_URL = 'https://invoice.test'
    process.env.INVOICE_API_KEY = 'private-api-key'
    process.env.INVOICE_OWNER_SIGNING_SECRET = 'test-owner-signing-secret-32-bytes-minimum'
    const upstream = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      return Promise.resolve(url.includes('/download-url?')
        ? new Response(JSON.stringify({ url: 'https://b2.example/private.pdf?X-Amz-Signature=temporary' }), { status: 200 })
        : new Response(new Uint8Array([37, 80, 68, 70, 45]), { status: 200, headers: { 'content-disposition': 'inline; filename="DEV-72.pdf"' } }))
    })
    vi.stubGlobal('fetch', upstream)

    expect((await POST(new NextRequest(base, { method: 'POST' }), params)).status).toBe(401)
    const ticketResponse = await POST(authenticated('POST'), params)
    expect(ticketResponse.status).toBe(200)
    const { url } = await ticketResponse.json()
    expect(url).toBe('https://b2.example/private.pdf?X-Amz-Signature=temporary')
    expect(url).not.toContain('private-api-key')
    expect(String((upstream.mock.calls as unknown as Array<[RequestInfo | URL]>)[0][0])).toContain(`/v1/documents/${documentId}/download-url?owner_telegram_id=${owner}`)

    const reply = await GET(authenticated('GET'), params)
    expect(reply.status).toBe(200)
    expect(reply.headers.get('content-disposition')).toContain('inline')
    expect(reply.headers.get('content-length')).toBe('5')
    expect(new Uint8Array(await reply.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70, 45]))
    expect(upstream).toHaveBeenCalledTimes(2)
  })
})
