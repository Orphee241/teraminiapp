import { describe, expect, it } from 'vitest'
import { configuredServiceUrl } from '../../lib/external-service'

describe('configured external service URLs', () => {
  it('accepts HTTPS public service URLs', () => {
    expect(configuredServiceUrl('https://invoice.example.test/')).toBe('https://invoice.example.test')
  })

  it('accepts HTTP only for internal Docker-style service names', () => {
    expect(configuredServiceUrl('http://terainterface-invoice-api-0wyhoa:8091')).toBe('http://terainterface-invoice-api-0wyhoa:8091')
    expect(configuredServiceUrl('http://invoice.example.test:8091')).toBe('')
  })

  it('rejects credentials, query strings, fragments, and malformed values', () => {
    expect(configuredServiceUrl('https://user:pass@invoice.example.test')).toBe('')
    expect(configuredServiceUrl('https://invoice.example.test?token=secret')).toBe('')
    expect(configuredServiceUrl('not-a-url')).toBe('')
  })
})
