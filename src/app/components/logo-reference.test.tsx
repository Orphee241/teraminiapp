import { describe, expect, it } from 'vitest'
import { logoObjectKeyFromReference } from '../../lib/logo-reference'

describe('durable client logo references', () => {
  it('recovers an owned object key from an expired signed URL', () => {
    const url = 'https://s3.example/Terainterface/clients/123/logos/logo.png?X-Amz-Signature=expired'
    expect(logoObjectKeyFromReference('123', url, 'Terainterface')).toBe('clients/123/logos/logo.png')
  })

  it('rejects another user’s logo and does not mistake a URL query for the object key', () => {
    expect(logoObjectKeyFromReference('123', 'clients/456/logos/logo.png', 'Terainterface')).toBe('')
    expect(logoObjectKeyFromReference('123', 'clients/123/logos/../other.png', 'Terainterface')).toBe('')
  })

  it('uses the separate internal-company logo namespace when configured', () => {
    const key = 'terainterface/logos/2104178683/logo.webp'
    expect(logoObjectKeyFromReference('2104178683', key, 'Terainterface', ['2104178683'])).toBe(key)
    expect(logoObjectKeyFromReference('2104178683', 'clients/2104178683/logos/logo.webp', 'Terainterface', ['2104178683'])).toBe('')
  })
})
