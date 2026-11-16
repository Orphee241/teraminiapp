// Relocated into configured test include path by project convention.
import { describe, expect, it } from 'vitest'
import { resolveDocumentOwner } from './document-access'

describe('resolveDocumentOwner', () => {
  it('keeps ordinary users scoped to their authenticated identity despite supplied owner', () => {
    expect(resolveDocumentOwner('100', '200', null, 'read')).toEqual({ owner: '100', allowed: true })
  })
  it('lets authorized staff target an explicitly selected owner', () => {
    expect(resolveDocumentOwner('100', '200', 'manager', 'update')).toEqual({ owner: '200', allowed: true })
  })
  it('does not treat an omitted target as cross-owner authorization', () => {
    expect(resolveDocumentOwner('100', '', 'manager', 'read')).toEqual({ owner: '100', allowed: true })
  })
  it('denies staff actions outside their role permission', () => {
    expect(resolveDocumentOwner('100', '200', 'operator', 'cancel')).toEqual({ owner: '100', allowed: false })
  })
  it('rejects malformed explicit owner identifiers for staff', () => {
    expect(resolveDocumentOwner('100', 'not-an-id', 'admin', 'read')).toEqual({ owner: '100', allowed: false })
  })
})
