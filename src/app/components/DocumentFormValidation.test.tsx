import { describe, expect, it } from 'vitest'
import { validateDocumentLines } from '../../lib/document-form-validation'

describe('validateDocumentLines', () => {
  it('rejects a blank unit price before sending the API request', () => {
    expect(validateDocumentLines([{ designation: 'iPhone', quantity: '5', unit_price: '' }]).error).toMatch(/prix unitaire/i)
  })

  it('rejects non-numeric and non-finite quantities or prices', () => {
    expect(validateDocumentLines([{ designation: 'Article', quantity: '5', unit_price: '100 000' }]).error).toMatch(/prix unitaire/i)
    expect(validateDocumentLines([{ designation: 'Article', quantity: 'NaN', unit_price: '1000' }]).error).toMatch(/quantité/i)
  })

  it('rejects fractional amounts because the document API requires integer XAF values', () => {
    expect(validateDocumentLines([{ designation: 'Article', quantity: '1', unit_price: '10.5' }]).error).toMatch(/prix unitaire/i)
  })

  it('returns normalized complete lines for valid input', () => {
    expect(validateDocumentLines([{ designation: '  iPhone  ', quantity: '5', unit_price: '100000' }])).toEqual({
      items: [{ designation: 'iPhone', quantity: 5, unit_price: 100000 }], error: '',
    })
  })
})
