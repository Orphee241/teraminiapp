import { describe, expect, it } from 'vitest'
import { COUNTRY_OPTIONS, findCountry } from '../../modules/profiles/country-catalog'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('country catalogue', () => {
  it('derives Gabon phone code and XAF from the ISO country code', () => {
    expect(findCountry('ga')).toEqual(expect.objectContaining({ code: 'GA', phoneCode: '+241', currency: 'XAF' }))
  })

  it('keeps West African CFA countries on XOF', () => {
    expect(findCountry('CI')).toEqual(expect.objectContaining({ phoneCode: '+225', currency: 'XOF' }))
  })

  it('contains all 24 PawaPay African markets', () => {
    const required = ['BJ', 'BF', 'CM', 'GH', 'CI', 'LR', 'ML', 'NG', 'SN', 'SL', 'CG', 'CD', 'GA', 'LS', 'MW', 'MZ', 'ZM', 'ZW', 'ET', 'KE', 'RW', 'SS', 'TZ', 'UG']
    expect(required).toHaveLength(24)
    expect(required.every(code => COUNTRY_OPTIONS.some(country => country.code === code))).toBe(true)
  })

  it('rejects countries outside the controlled catalogue', () => {
    expect(findCountry('ZZ')).toBeNull()
  })

  it('keeps the onboarding card compact and removes the red security eyebrow', () => {
    const component = readFileSync(resolve(process.cwd(), 'src/app/components/CountryOnboarding.tsx'), 'utf8')
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(component).not.toContain('CONFIGURATION SÉCURISÉE')
    expect(css).toContain('width:min(364px,100%)')
    expect(css).toContain('@media (max-width:899px) { .country-card select { min-height:37px; } }')
  })
})
