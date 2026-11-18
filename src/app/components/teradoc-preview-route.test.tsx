import crypto from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../api/teradoc/cv/preview/route'

vi.mock('../../lib/request-security', () => ({ enforcePersistentRateLimit: vi.fn(async () => ({ available: true, allowed: true })) }))

const botToken = 'test-telegram-bot-token'
const cv = {
  templateId: 'essential', fullName: 'Aline Mba', headline: 'Responsable administrative', email: 'aline@example.com', phone: '+241 06000000', location: 'Libreville', summary: 'Profil professionnel.',
  experience: [{ role: 'Responsable', company: 'Entreprise Test', startDate: '2021-01', description: 'Coordination des opérations.' }],
  education: [{ degree: 'Licence', institution: 'Université Test' }], skills: ['Organisation', 'Excel'], languages: [], certifications: [],
}
function initData() {
  const data = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 123456789 }) })
  const entries: [string, string][] = []; data.forEach((value, key) => entries.push([key, value]))
  const check = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = Uint8Array.from(crypto.createHmac('sha256', 'WebAppData').update(botToken).digest())
  data.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'))
  return data.toString()
}
const makeRequest = (body: unknown, authenticated = true) => new NextRequest('https://app.terainterface.com/api/teradoc/cv/preview', {
  method: 'POST', headers: { origin: 'https://app.terainterface.com', ...(authenticated ? { 'x-telegram-init-data': initData() } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body),
})
const originalToken = process.env.TELEGRAM_BOT_TOKEN
afterEach(() => { if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN; else process.env.TELEGRAM_BOT_TOKEN = originalToken })

describe('TeraDoc live PDF preview route', () => {
  it('returns the same A4 PDF format used by the CV renderer without persisting a draft', async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken
    const response = await POST(makeRequest(cv))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
    expect(response.headers.get('content-disposition')).toContain('inline')
    expect(response.headers.get('cache-control')).toContain('no-store')
    const pdf = Buffer.from(await response.arrayBuffer()).toString('latin1')
    expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(pdf).toContain('Aline Mba')
  })

  it('rejects unauthenticated and invalid CV preview requests', async () => {
    process.env.TELEGRAM_BOT_TOKEN = botToken
    expect((await POST(makeRequest(cv, false))).status).toBe(401)
    expect((await POST(makeRequest({ ...cv, templateId: 'unknown' }))).status).toBe(400)
  })
})
