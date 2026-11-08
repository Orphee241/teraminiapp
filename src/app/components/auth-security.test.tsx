import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyTelegramInitData, requireSameOrigin, isAdminSessionConfigured, adminSessionValue, hasAdminSession } from '../api/_auth'
import { NextRequest } from 'next/server'

const token = 'test-only-bot-token'
function signedData(authDate = Math.floor(Date.now() / 1000), user: { id: number; first_name?: string } = { id: 123456789, first_name: 'Test' }) {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user) })
  const entries: [string, string][] = []; params.forEach((value, key) => entries.push([key, value]))
  const check = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = Uint8Array.from(crypto.createHmac('sha256', 'WebAppData').update(token).digest())
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'))
  return params.toString()
}

describe('Telegram initData security', () => {
  it('accepts valid fresh signed data', () => expect(verifyTelegramInitData(signedData(), token)?.id).toBe(123456789))

  it('requires a dedicated admin-session secret rather than the bot token', () => {
    const previousSession = process.env.TERAMINI_ADMIN_SESSION_SECRET
    const previousBot = process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TERAMINI_ADMIN_SESSION_SECRET
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token-is-not-a-cookie-secret'
    try {
      expect(isAdminSessionConfigured()).toBe(false)
      const request = new NextRequest('https://app.example/adm', { headers: { cookie: `teramini_admin_session=${adminSessionValue('123', Date.now() + 60_000)}` } })
      expect(hasAdminSession(request, '123')).toBe(false)
      process.env.TERAMINI_ADMIN_SESSION_SECRET = 'dedicated-test-admin-session-secret-32-bytes'
      expect(isAdminSessionConfigured()).toBe(true)
    } finally {
      if (previousSession === undefined) delete process.env.TERAMINI_ADMIN_SESSION_SECRET
      else process.env.TERAMINI_ADMIN_SESSION_SECRET = previousSession
      if (previousBot === undefined) delete process.env.TELEGRAM_BOT_TOKEN
      else process.env.TELEGRAM_BOT_TOKEN = previousBot
    }
  })


  it('requires same-origin metadata on mutations', () => {
    expect(requireSameOrigin(new NextRequest('https://app.example/api/save', { method: 'POST', headers: { origin: 'https://app.example', 'sec-fetch-site': 'same-origin' } }))).toBeNull()
    expect(requireSameOrigin(new NextRequest('https://app.example/api/save', { method: 'POST' }))).not.toBeNull()
    expect(requireSameOrigin(new NextRequest('https://app.example/api/save', { method: 'POST', headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } }))).not.toBeNull()
  })


  it('rejects data too old or implausibly in the future', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(verifyTelegramInitData(signedData(now - 86401), token)).toBeNull()
    expect(verifyTelegramInitData(signedData(now + 120), token)).toBeNull()
  })
  it('rejects duplicate fields and invalid user identifiers', () => {
    const duplicate = signedData() + '&auth_date=' + Math.floor(Date.now() / 1000)
    expect(verifyTelegramInitData(duplicate, token)).toBeNull()
    expect(verifyTelegramInitData(signedData(Math.floor(Date.now() / 1000), { id: -1 }), token)).toBeNull()
  })
  it('rejects a tampered signature', () => expect(verifyTelegramInitData(signedData().replace('first_name', 'last_name'), token)).toBeNull())
})
