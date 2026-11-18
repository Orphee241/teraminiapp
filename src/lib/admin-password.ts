import crypto from 'node:crypto'

function configuredPasswordHash() {
  const value = process.env.TERAMINI_ADMIN_PASSWORD_HASH || ''
  return value.startsWith('scrypt$') ? value : ''
}

export function isAdminPasswordConfigured() {
  return process.env.NODE_ENV !== 'production' ? Boolean(configuredPasswordHash() || process.env.TERAMINI_ADMIN_PASSWORD) : Boolean(configuredPasswordHash())
}

export function verifyAdminPassword(password: string): boolean {
  const encoded = configuredPasswordHash()
  if (!encoded) return process.env.NODE_ENV !== 'production' && Boolean(process.env.TERAMINI_ADMIN_PASSWORD) && password === process.env.TERAMINI_ADMIN_PASSWORD
  const [, nText, rText, pText, saltText, digestText] = encoded.split('$')
  const n = Number(nText); const r = Number(rText); const p = Number(pText)
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p) || n < 16_384 || r < 1 || p < 1 || !saltText || !/^[a-f0-9]+$/i.test(saltText) || !/^[a-f0-9]+$/i.test(digestText || '')) return false
  try {
    const salt = Uint8Array.from(Buffer.from(saltText, 'hex')); const expected = Uint8Array.from(Buffer.from(digestText, 'hex'))
    const actual = Uint8Array.from(crypto.scryptSync(password, salt, expected.length, { N: n, r, p, maxmem: Math.max(32 * 1024 * 1024, 128 * n * r + 1024) }))
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch { return false }
}
