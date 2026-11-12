import { describe, expect, it } from 'vitest'
import { findCountry } from '../../modules/profiles/country-catalog'

describe('country catalogue', () => {
  it('derives Gabon phone code and XAF from the ISO country code', () => {
    expect(findCountry('ga')).toEqual(expect.objectContaining({ code: 'GA', phoneCode: '+241', currency: 'XAF' }))
  })

  it('keeps West African CFA countries on XOF', () => {
    expect(findCountry('CI')).toEqual(expect.objectContaining({ phoneCode: '+225', currency: 'XOF' }))
  })

  it('rejects countries outside the controlled catalogue', () => {
    expect(findCountry('ZZ')).toBeNull()
  })
})
