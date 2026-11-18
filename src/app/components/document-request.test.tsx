import { describe, expect, it } from 'vitest'
import { sanitizeDocumentRequest } from '../../lib/document-request'

const valid = {
  document_type: 'facture', issuer: { name: 'Terainterface', company: 'Terainterface', address: 'Libreville', phone: '077000000', tax_id: 'NIF', rccm: 'RCCM' },
  client: { name: 'Client', address: 'Libreville', phone: '077000001', tax_id: 'NIF', rccm: 'RCCM' },
  items: [{ designation: 'Service', quantity: 1, unit_price: 1000 }], service_type: 'Prestation', template_profile: 'client-zero', logo_enabled: true, vat_applied: false, persist_crm: true, brand_color: '#D71920', currency: 'XAF', idempotency_key: 'idem-12345678', owner_telegram_id: '999999999', actor: 'admin', tenant: 'other', status: 'COMPLETED', amount: 999999,
}

describe('document request boundary', () => {
  it('keeps only the strict downstream contract and never trusts owner/actor fields', () => {
    const result = sanitizeDocumentRequest(Object.fromEntries(Object.entries(valid).filter(([key]) => key !== 'owner_telegram_id' && key !== 'actor' && key !== 'tenant' && key !== 'status' && key !== 'amount')))
    expect(result).not.toHaveProperty('owner_telegram_id')
    expect(result).not.toHaveProperty('actor')
    expect(result).not.toHaveProperty('tenant')
    expect(result.items).toEqual([{ designation: 'Service', quantity: 1, unit_price: 1000 }])
  })
  it('rejects unknown fields, malformed lines and prototype keys', () => {
    expect(() => sanitizeDocumentRequest({ ...valid, unknown: true })).toThrow()
    expect(() => sanitizeDocumentRequest({ ...valid, items: [{ designation: 'x', quantity: 0, unit_price: 1 }] })).toThrow()
    expect(() => sanitizeDocumentRequest({ ...valid, items: [{ designation: 'x', quantity: 1, unit_price: 1, tenant: 'x' }] })).toThrow()
    expect(() => sanitizeDocumentRequest({ ...valid, ['__proto__']: { polluted: true } })).toThrow()
  })
})
