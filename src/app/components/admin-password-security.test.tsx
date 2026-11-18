import { afterEach, describe, expect, it } from 'vitest'
import { scryptSync } from 'node:crypto'
import { isAdminPasswordConfigured, verifyAdminPassword } from '../../lib/admin-password'

const previousNodeEnv = process.env.NODE_ENV
const previousHash = process.env.TERAMINI_ADMIN_PASSWORD_HASH
const previousPlain = process.env.TERAMINI_ADMIN_PASSWORD

afterEach(() => {
  Reflect.set(process.env, 'NODE_ENV', previousNodeEnv)
  if (previousHash === undefined) delete process.env.TERAMINI_ADMIN_PASSWORD_HASH
  else process.env.TERAMINI_ADMIN_PASSWORD_HASH = previousHash
  if (previousPlain === undefined) delete process.env.TERAMINI_ADMIN_PASSWORD
  else process.env.TERAMINI_ADMIN_PASSWORD = previousPlain
})

describe('Admin password hash policy', () => {
  it('verifies configured scrypt hashes and rejects wrong passwords', () => {
    const password = 'Strong-test-passphrase-123'
    const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex')
    const digest = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 })
    process.env.TERAMINI_ADMIN_PASSWORD_HASH = `scrypt$16384$8$1$${salt.toString('hex')}$${digest.toString('hex')}`
    Reflect.set(process.env, 'NODE_ENV', 'production')
    expect(isAdminPasswordConfigured()).toBe(true)
    expect(verifyAdminPassword(password)).toBe(true)
    expect(verifyAdminPassword('wrong-password')).toBe(false)
  })

  it('refuses plaintext fallback in production', () => {
    delete process.env.TERAMINI_ADMIN_PASSWORD_HASH
    process.env.TERAMINI_ADMIN_PASSWORD = 'legacy-password'
    Reflect.set(process.env, 'NODE_ENV', 'production')
    expect(isAdminPasswordConfigured()).toBe(false)
    expect(verifyAdminPassword('legacy-password')).toBe(false)
  })
})
