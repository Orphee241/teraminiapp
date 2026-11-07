import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyTelegramInitData } from '../api/_auth'

const token = 'test-only-bot-token'
function signedData(authDate = Math.floor(Date.now() / 1000), user: { id: number; first_name?: string } = { id: 123456789, first_name: 'Test' }) {
  const params = new URLSearchParams({ auth_date: String(authDate), user: JSON.stringify(user) })
  const entries: [string, string][] = []; params.forEach((value, key) => entries.push([key, value]))
  const check = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = Uint8Array.from(crypto.createHmac('sha256', token).update('WebAppData').digest())
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'))
  return params.toString()
}

describe('Telegram initData security', () => {
  it('accepts valid fresh signed data', () => expect(verifyTelegramInitData(signedData(), token)?.id).toBe(123456789))
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
