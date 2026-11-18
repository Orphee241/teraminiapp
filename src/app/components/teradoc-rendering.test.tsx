import { describe, expect, it } from 'vitest'
import { renderCvPdf } from '../../modules/teradoc/server/render-cv'
import type { TeraDocCv } from '../../modules/teradoc/cv-schema'

const cv: TeraDocCv = {
  templateId: 'essential', fullName: 'Aline Mba', headline: 'Responsable administrative', email: 'aline@example.com', phone: '+241 06000000', location: 'Libreville', summary: 'Profil professionnel de test.',
  experience: [{ role: 'Responsable', company: 'Entreprise Test', location: '', startDate: '2021-01', endDate: undefined, description: 'Coordination des opérations.' }],
  education: [{ degree: 'Licence', institution: 'Université Test', location: '', startDate: undefined, endDate: undefined, description: undefined }],
  skills: ['Organisation', 'Excel'], languages: [], certifications: [], website: undefined, linkedin: undefined, photoUrl: undefined,
}

describe('TeraDoc CV PDF renderer', () => {
  it('creates a text object so the PDF content is visible and selectable', () => {
    const pdf = renderCvPdf(cv).toString('latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf).toContain('BT')
    expect(pdf).toContain('ET')
    expect(pdf).toContain('Aline Mba')
    expect(pdf).toContain('Responsable administrative')
  })
})
