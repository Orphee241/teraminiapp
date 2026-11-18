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
  it('produces a valid A4 document with selectable text and French accents', () => {
    const pdf = renderCvPdf(cv).toString('latin1')
    expect(pdf.startsWith('%PDF-')).toBe(true)
    expect(pdf).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(pdf).toContain('/WinAnsiEncoding')
    expect(pdf).toContain('BT')
    expect(pdf).toContain('ET')
    expect(pdf).toContain('Aline Mba')
    expect(pdf).toContain('Responsable administrative')
    expect(pdf).toContain('op\\351rations')
  })

  it('is readable by a PDF parser at real A4 dimensions', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const document = await pdfjs.getDocument({ data: new Uint8Array(renderCvPdf(cv)), useSystemFonts: true }).promise
    expect(document.numPages).toBe(1)
    const page = await document.getPage(1)
    const viewport = page.getViewport({ scale: 1 })
    expect(viewport.width).toBeCloseTo(595.28, 1)
    expect(viewport.height).toBeCloseTo(841.89, 1)
    const content = await page.getTextContent()
    const extractedText = content.items.map(item => 'str' in item ? item.str : '').join(' ')
    expect(extractedText).toContain('Aline Mba')
    expect(extractedText).toContain('opérations')
    expect(extractedText).toContain('Université Test')
  })

  it('adds pages when long CV content no longer fits on one A4 sheet', () => {
    const longCv = { ...cv, experience: Array.from({ length: 12 }, (_, index) => ({ role: `Poste ${index + 1}`, company: 'Entreprise', startDate: '2010-01', description: `Responsabilités professionnelles ${index + 1}. `.repeat(12) })) }
    const pdf = renderCvPdf(longCv).toString('latin1')
    expect(Number(pdf.match(/\/Count (\d+)/)?.[1])).toBeGreaterThan(1)
    expect(pdf).toContain('Poste 12')
  })
})
