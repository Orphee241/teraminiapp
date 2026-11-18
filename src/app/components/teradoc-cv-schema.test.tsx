import { describe, expect, it } from 'vitest'
import { sanitizeTeraDocCv } from '../../modules/teradoc/cv-schema'
import { findTeraDocTemplate, TERADOC_TEMPLATES } from '../../modules/teradoc/templates'

const validCv = {
  templateId: 'essential', fullName: 'Aline Mba', headline: 'Responsable administrative', email: 'aline@example.com', phone: '+241 06000000', location: 'Libreville',
  summary: 'Professionnelle organisée avec huit années d’expérience en gestion administrative.',
  experience: [{ role: 'Responsable administrative', company: 'Entreprise Test', startDate: '2021-01', description: 'Coordination des opérations et suivi des dossiers.' }],
  education: [{ degree: 'Licence en gestion', institution: 'Université Test' }],
  skills: ['Organisation', 'Excel'], languages: [{ language: 'Français', level: 'Courant' }], certifications: [],
}

describe('TeraDoc CV schema', () => {
  it('exposes restrained professional templates', () => {
    expect(TERADOC_TEMPLATES).toHaveLength(3)
    expect(findTeraDocTemplate('essential')?.atsLevel).toBe('high')
    expect(findTeraDocTemplate('unknown')).toBeNull()
  })

  it('sanitizes a valid CV while keeping optional fields optional', () => {
    const result = sanitizeTeraDocCv(validCv)
    expect(result.fullName).toBe('Aline Mba')
    expect(result.experience[0].location).toBe('')
    expect(result.education[0].startDate).toBeUndefined()
  })

  it('rejects unknown templates, malformed dates and unsafe URLs', () => {
    expect(() => sanitizeTeraDocCv({ ...validCv, templateId: 'rainbow' })).toThrow('teradoc_template_invalid')
    expect(() => sanitizeTeraDocCv({ ...validCv, experience: [{ ...validCv.experience[0], startDate: '2024' }] })).toThrow('teradoc_cv_invalid')
    expect(() => sanitizeTeraDocCv({ ...validCv, website: 'javascript:alert(1)' })).toThrow('teradoc_cv_invalid')
  })

  it('rejects unbounded content and prototype keys', () => {
    expect(() => sanitizeTeraDocCv({ ...validCv, skills: Array.from({ length: 31 }, () => 'skill') })).toThrow('teradoc_cv_invalid')
    const polluted = JSON.parse(JSON.stringify(validCv)) as Record<string, unknown>
    polluted.__proto__ = { polluted: true }
    expect(() => sanitizeTeraDocCv(polluted)).toThrow()
  })

  it('validates contact formats on the server, not only in the browser', () => {
    expect(() => sanitizeTeraDocCv({ ...validCv, email: 'not-an-email' })).toThrow('teradoc_cv_invalid')
    expect(() => sanitizeTeraDocCv({ ...validCv, phone: 'contact inconnu' })).toThrow('teradoc_cv_invalid')
    expect(sanitizeTeraDocCv({ ...validCv, phone: '+241 06 00 00 00' }).phone).toBe('+241 06 00 00 00')
  })
})
