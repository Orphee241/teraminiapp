import { describe, expect, it } from 'vitest'
import { getTeraDocOption, TERADOC_DOCUMENT_TYPES } from '../../modules/teradoc/document-catalog'

describe('TeraDoc document catalog', () => {
  it('exposes the first catalogue without mixing invoice documents', () => {
    expect(TERADOC_DOCUMENT_TYPES.map(item => item.documentType)).toEqual([
      'cv', 'cover-letter', 'job-application', 'internship-application', 'complaint', 'debt-acknowledgment', 'lease',
    ])
    expect(TERADOC_DOCUMENT_TYPES.some(item => String(item.documentType) === 'facture')).toBe(false)
  })

  it('marks only the implemented CV route as available', () => {
    expect(getTeraDocOption('cv-professional')?.available).toBe(true)
    expect(getTeraDocOption('complaint-standard')?.available).toBe(false)
    expect(getTeraDocOption('complaint-standard')?.legalNotice).toBe(true)
  })

  it('returns null for unknown or unsafe template identifiers', () => {
    expect(getTeraDocOption('')).toBeNull()
    expect(getTeraDocOption('../cv-professional')).toBeNull()
    expect(getTeraDocOption('<script>')).toBeNull()
  })
})
