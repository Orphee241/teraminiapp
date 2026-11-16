import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { invoiceActorHeaders, invoiceOwnerHeaders } from '../../lib/invoice-owner-signature'

describe('signed invoice owner assertion', () => {
  it('binds method, exact path/query, owner, time, nonce and body digest', () => {
    const previous = process.env.INVOICE_OWNER_SIGNING_SECRET
    const secret = 'local-test-secret-for-owner-proof-32-bytes'
    process.env.INVOICE_OWNER_SIGNING_SECRET = secret
    try {
      const path = '/v1/documents?owner_telegram_id=123&search=photo+test'
      const body = '{"owner_telegram_id":"123"}'
      const headers = invoiceOwnerHeaders('123', 'GET', path, body)
      const canonical = ['GET', '/v1/documents', 'owner_telegram_id=123&search=photo+test', '123', headers['x-invoice-owner-timestamp'], headers['x-invoice-owner-nonce'], crypto.createHash('sha256').update(body).digest('hex')].join('\n')
      const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex')
      expect(headers['x-invoice-owner-signature']).toBe(expected)
      expect(headers['x-invoice-owner-nonce']).toMatch(/^[a-f0-9]{32}$/)
    } finally {
      if (previous === undefined) delete process.env.INVOICE_OWNER_SIGNING_SECRET
      else process.env.INVOICE_OWNER_SIGNING_SECRET = previous
    }
  })

  it('binds a verified actor assertion to the same exact method, path/query, owner and body', () => {
    const previous = process.env.INVOICE_OWNER_SIGNING_SECRET
    const secret = 'local-test-secret-for-owner-proof-32-bytes'
    process.env.INVOICE_OWNER_SIGNING_SECRET = secret
    try {
      const path = '/v1/documents/42/cancel?owner_telegram_id=123'
      const body = '{"reason":"Correction"}'
      const headers = invoiceActorHeaders('123', '987', 'POST', path, body)
      const canonical = ['POST', '/v1/documents/42/cancel', 'owner_telegram_id=123', '123', '987', headers['x-invoice-actor-timestamp'], headers['x-invoice-actor-nonce'], crypto.createHash('sha256').update(body).digest('hex')].join('\n')
      expect(headers['x-invoice-actor-signature']).toBe(crypto.createHmac('sha256', secret).update(canonical).digest('hex'))
      expect(headers['x-invoice-actor-id']).toBe('987')
      expect(headers['x-invoice-actor-nonce']).toMatch(/^[a-f0-9]{32}$/)
    } finally {
      if (previous === undefined) delete process.env.INVOICE_OWNER_SIGNING_SECRET
      else process.env.INVOICE_OWNER_SIGNING_SECRET = previous
    }
  })
})
