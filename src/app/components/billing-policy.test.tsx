import { describe, expect, it } from 'vitest'
import { DAILY_FREE_DOCUMENT_LIMITS, DOCUMENT_PACKS } from '../../modules/documents/billing-policy'

describe('document billing policy', () => {
  it('allows one free quote and one free invoice per day', () => {
    expect(DAILY_FREE_DOCUMENT_LIMITS).toEqual({ devis: 1, facture: 1 })
  })

  it('publishes the approved quote and invoice packs', () => {
    expect(DOCUMENT_PACKS.map(pack => [pack.code, pack.documents, pack.amount])).toEqual([
      ['document-1', 1, 200], ['document-50', 50, 5000], ['document-100', 100, 15000], ['document-250', 250, 35000], ['document-500', 500, 60000],
    ])
  })
})
