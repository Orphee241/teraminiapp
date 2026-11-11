import { describe, expect, it } from 'vitest'
import { buildDocumentPayload } from '../../lib/document-payload'

describe('buildDocumentPayload', () => {
  it('includes all validated line items in the API request', () => {
    const payload = buildDocumentPayload({ document_type: 'devis' }, [
      { designation: 'Installation', quantity: 2, unit_price: 15000 },
      { designation: 'Transport', quantity: 1, unit_price: 5000 },
    ])

    expect(payload).toEqual({
      document_type: 'devis',
      items: [
        { designation: 'Installation', quantity: 2, unit_price: 15000 },
        { designation: 'Transport', quantity: 1, unit_price: 5000 },
      ],
    })
  })
})
