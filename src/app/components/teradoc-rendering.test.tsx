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
    expect(pdf).toContain('Responsable')
    expect(pdf).toContain('administrative')
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

  it('reproduces the supplied professional model structure with a sidebar and right content column', () => {
    const pdf = renderCvPdf(cv).toString('latin1')
    expect(pdf).toContain('0.965 0.953 0.945 rg -1 0 219 841.89 re f')
    expect(pdf).toContain('0.478 0.141 0.235 rg 218 0 2 841.89 re f')
    expect(pdf).toContain('(FORMATION)')
    expect(pdf).toContain('(COMP\\311TENCES)')
    expect(pdf).toContain('(PROFIL)')
    expect(pdf).toContain('(EXP\\311RIENCE PROFESSIONNELLE)')
  })

  it('uses 13pt regular text, 15pt bold name, and 14pt bold section titles', () => {
    const pdf = renderCvPdf(cv).toString('latin1')
    expect(pdf).not.toContain('/F1 7.2 Tf')
    expect(pdf).not.toContain('/F1 7.4 Tf')
    expect(pdf).not.toContain('/F1 7.5 Tf')
    expect(pdf).not.toContain('/F1 7.6 Tf')
    expect(pdf).toContain('/F1 13 Tf')

    expect(pdf).toContain('/F2 15 Tf')
    expect(pdf).toContain('/F2 14 Tf')
    expect(pdf).toContain('/BaseFont /Helvetica-Bold')
  })

  it('keeps the professional model candidate name lines close together', () => {
    const longNameCv = { ...cv, fullName: 'Aline Marie Claire Mba Ondo' }
    const pdf = renderCvPdf(longNameCv).toString('latin1')
    expect(pdf).toContain('/F2 15 Tf 1 0 0 1 14.17 790.00 Tm')
    expect(pdf).toContain('/F2 15 Tf 1 0 0 1 14.17 770.00 Tm')
    expect(pdf).not.toContain('/F2 15 Tf 1 0 0 1 14.17 765.00 Tm')
  })

  it('renders experience descriptions as plain text across the full content column', () => {
    const descriptionCv = {
      ...cv,
      experience: [{
        ...cv.experience[0],
        description: 'Coordination des opérations et suivi des résultats.\nTransmission des rapports à la direction.',
      }],
    }
    const pdf = renderCvPdf(descriptionCv).toString('latin1')
    expect(pdf).toContain('(Coordination des op\\351rations et suivi des)')
    expect(pdf).toContain('(r\\351sultats.)')
    expect(pdf).toContain('(Transmission des rapports \\340 la direction.)')
    expect(pdf).not.toContain('\\225 Coordination des')
    expect(pdf).not.toContain('\\225 r\\351sultats.')
    expect(pdf).toContain('232.17')
    expect(pdf).toContain('/F1 13 Tf 1 0 0 1 232.17')
  })

  it('adds pages when long CV content no longer fits on one A4 sheet', () => {
    const longCv = { ...cv, experience: Array.from({ length: 12 }, (_, index) => ({ role: `Poste ${index + 1}`, company: 'Entreprise', startDate: '2010-01', description: `Responsabilités professionnelles ${index + 1}. `.repeat(12) })) }
    const pdf = renderCvPdf(longCv).toString('latin1')
    expect(Number(pdf.match(/\/Count (\d+)/)?.[1])).toBeGreaterThan(1)
    expect(pdf).toContain('Poste 12')
  })

  it('keeps long French fields inside the A4 printable area on every page', async () => {
    const longCv: TeraDocCv = {
      ...cv,
      fullName: 'Alexandrine Marie-Claire Nguema Ondo Essono',
      headline: 'Directrice générale chargée des opérations internationales et de la transformation numérique',
      email: 'alexandrine.marie-claire.nguema.ondo.essono@example.com',
      location: 'Libreville, Estuaire, République gabonaise',
      summary: 'Expérience confirmée en pilotage stratégique et accompagnement d’équipes pluridisciplinaires. '.repeat(8),
      education: [{ degree: 'Master spécialisé en management des organisations et stratégie internationale', institution: 'Université internationale des sciences administratives de Libreville', location: 'Libreville, République gabonaise', startDate: '2014-01', endDate: '2016-12', description: 'Formation approfondie.' }],
      experience: Array.from({ length: 4 }, (_, index) => ({
        role: `Responsable principale des opérations et de la coordination régionale ${index + 1}`,
        company: 'Entreprise internationale de conseil et de transformation numérique',
        location: 'Libreville, Estuaire, République gabonaise', startDate: '2010-01', endDate: '2013-12',
        description: 'Coordination de projets complexes, amélioration continue des processus et accompagnement des collaborateurs. '.repeat(10),
      })),
      skills: ['Gestion de projets internationaux', 'Communication institutionnelle', 'Transformation numérique', 'Analyse stratégique'],
    }
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const document = await pdfjs.getDocument({ data: new Uint8Array(renderCvPdf(longCv)), useSystemFonts: true }).promise
    expect(document.numPages).toBeGreaterThan(1)
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const content = await (await document.getPage(pageNumber)).getTextContent()
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        expect(item.transform[4]).toBeGreaterThanOrEqual(13.5)
        expect(item.transform[4] + item.width).toBeLessThanOrEqual(581.6)
        if (item.transform[5] < 40) continue
        expect(item.transform[5]).toBeGreaterThanOrEqual(47)
        expect(item.transform[5]).toBeLessThanOrEqual(817)
      }
    }
  })
})
