import type { TeraDocCv } from '../cv-schema'
import { findTeraDocTemplate } from '../templates'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 42
const RIGHT_X = PAGE_WIDTH - MARGIN_X
const BOTTOM_Y = 48

const CP1252_SPECIAL: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
}

function pdfText(value: string) {
  return Array.from(value).map(character => {
    const point = character.codePointAt(0) || 0x3f
    let byte = CP1252_SPECIAL[point] ?? (point <= 0xff ? point : 0x3f)
    if (byte < 0x20 || byte === 0x7f) byte = 0x20
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) return `\\${String.fromCharCode(byte)}`
    return byte > 0x7e ? `\\${byte.toString(8).padStart(3, '0')}` : String.fromCharCode(byte)
  }).join('')
}

function wrap(value: string, maxChars: number) {
  const lines: string[] = []
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) { lines.push(''); continue }
    let line = ''
    for (const word of words) {
      if (!line) { line = word; continue }
      if (`${line} ${word}`.length > maxChars) { lines.push(line); line = word } else line += ` ${word}`
    }
    if (line) lines.push(line)
  }
  return lines
}

function wrapToWidth(value: string, width: number, size: number) {
  const maxChars = Math.max(1, Math.floor(width / (size * 0.62)))
  const lines: string[] = []
  for (const sourceLine of wrap(value, maxChars)) {
    let line = ''
    for (const word of sourceLine.split(' ')) {
      if (!word) continue
      if (word.length > maxChars) {
        if (line) { lines.push(line); line = '' }
        for (let index = 0; index < word.length; index += maxChars) lines.push(word.slice(index, index + maxChars))
      } else if (!line) line = word
      else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`
      else { lines.push(line); line = word }
    }
    if (line) lines.push(line)
  }
  return lines
}

function rgb(hex: string) { const value = hex.replace('#', ''); return [0, 2, 4].map(index => (parseInt(value.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ') }

export function renderCvPdf(cv: TeraDocCv): Buffer {
  if (cv.templateId === 'essential') return renderProfessionalModelPdf(cv)
  return renderCvPdfLegacy(cv)
}

function renderCvPdfLegacy(cv: TeraDocCv): Buffer {
  const template = findTeraDocTemplate(cv.templateId) || findTeraDocTemplate('essential')!
  const accent = rgb(template.accent)
  const pages: string[][] = [[]]
  let pageIndex = 0
  let y = 0
  const push = (command: string) => pages[pageIndex].push(command)
  const text = (value: string, x: number, top: number, size = 9, font = '/F1', fill = '0.12 0.14 0.18') => {
    push(`BT ${fill} rg ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${top.toFixed(2)} Tm (${pdfText(value)}) Tj ET`)
  }
  const line = (x1: number, top: number, x2: number, color = accent) => push(`${color} RG 0.8 w ${x1} ${top.toFixed(2)} m ${x2} ${top.toFixed(2)} l S`)
  const startNextPage = () => {
    pages.push([]); pageIndex += 1
    text(`CV · ${cv.fullName}`, MARGIN_X, 816, 9, '/F2', '0.40 0.43 0.48')
    line(MARGIN_X, 801, RIGHT_X, '0.82 0.84 0.87')
    y = 780
  }
  const ensureSpace = (height: number) => { if (y - height < BOTTOM_Y) startNextPage() }
  const paragraph = (value: string, size = 9, lineHeight = 13, maxChars = 94, bullet = false) => {
    const lines = wrap(value, maxChars)
    for (let index = 0; index < lines.length; index += 1) {
      ensureSpace(lineHeight)
      const lineText = bullet && index === 0 ? `• ${lines[index]}` : bullet ? `  ${lines[index]}` : lines[index]
      text(lineText, MARGIN_X, y, size)
      y -= lineHeight
    }
  }
  const section = (title: string) => {
    ensureSpace(42)
    y -= 13
    text(title.toLocaleUpperCase('fr-FR'), MARGIN_X, y, 10, '/F2', accent)
    y -= 7
    line(MARGIN_X, y, RIGHT_X)
    y -= 16
  }

  push(`${accent} rg 0 742 ${PAGE_WIDTH} 100 re f`)
  const nameLines = wrap(cv.fullName, 44).slice(0, 2)
  nameLines.forEach((value, index) => text(value, MARGIN_X, 808 - index * 25, 22, '/F2', '1 1 1'))
  const nameOffset = nameLines.length > 1 ? 25 : 0
  text(cv.headline, MARGIN_X, 779 - nameOffset, 11, '/F1', '1 1 1')
  const contacts = [cv.email, cv.phone, cv.location, cv.website, cv.linkedin].filter(Boolean).join('  ·  ')
  const contactLines = wrap(contacts, 110).slice(0, 2)
  contactLines.forEach((value, index) => text(value, MARGIN_X, 760 - nameOffset - index * 11, 8, '/F1', '0.96 0.96 0.97'))
  y = 719 - nameOffset - (contactLines.length > 1 ? 10 : 0)

  section('Profil')
  paragraph(cv.summary)
  section('Expérience')
  for (const item of cv.experience) {
    ensureSpace(42)
    text(item.role, MARGIN_X, y, 10, '/F2')
    text(`${item.startDate} – ${item.endDate || 'Aujourd’hui'}`, 425, y, 8, '/F1', '0.35 0.39 0.45')
    y -= 14
    text([item.company, item.location].filter(Boolean).join(' · '), MARGIN_X, y, 8, '/F1', '0.35 0.39 0.45')
    y -= 13
    paragraph(item.description, 8.5, 12, 100, true)
    y -= 7
  }
  section('Formation')
  for (const item of cv.education) {
    ensureSpace(34)
    text(item.degree, MARGIN_X, y, 9, '/F2')
    const dates = [item.startDate, item.endDate].filter(Boolean).join(' – ')
    if (dates) text(dates, 445, y, 8, '/F1', '0.35 0.39 0.45')
    y -= 13
    text([item.institution, item.location].filter(Boolean).join(' · '), MARGIN_X, y, 8, '/F1', '0.35 0.39 0.45')
    y -= 21
  }
  section('Compétences')
  paragraph(cv.skills.join('  ·  '))
  if (cv.languages.length) { section('Langues'); paragraph(cv.languages.map(item => `${item.language} — ${item.level}`).join('  ·  ')) }
  if (cv.certifications.length) { section('Certifications'); paragraph(cv.certifications.join('  ·  ')) }
  if (cv.website || cv.linkedin) { section('Liens'); paragraph([cv.website, cv.linkedin].filter(Boolean).join('  ·  ')) }

  const pageCount = pages.length
  pages.forEach((commands, index) => text(`${index + 1} / ${pageCount}`, RIGHT_X - 30, 25, 8, '/F1', '0.45 0.47 0.51'))
  const fontRegularId = 3 + 2 * pageCount
  const fontBoldId = fontRegularId + 1
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>']
  const pageIds = pages.map((_, index) => `${3 + 2 * index} 0 R`).join(' ')
  objects.push(`<< /Type /Pages /Kids [${pageIds}] /Count ${pageCount} >>`)
  pages.forEach((commands, index) => {
    const pageId = 3 + 2 * index
    const contentId = pageId + 1
    const stream = commands.join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'latin1'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

function renderProfessionalModelPdf(cv: TeraDocCv): Buffer {
  const accent = '0.478 0.141 0.235'
  const sidebar = '0.965 0.953 0.945'
  const pages: string[][] = [[]]
  let page = 0
  let y = 780
  const push = (value: string) => pages[page].push(value)
  const text = (value: string, x: number, top: number, size = 12, font = '/F1', fill = '0.12 0.14 0.18') => push(`BT ${fill} rg ${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${top.toFixed(2)} Tm (${pdfText(value)}) Tj ET`)
  const rule = (x1: number, top: number, x2: number, fill = accent) => push(`${fill} RG 0.7 w ${x1} ${top.toFixed(2)} m ${x2} ${top.toFixed(2)} l S`)
  const fillRect = (x: number, bottom: number, width: number, height: number, fill: string) => push(`${fill} rg ${x} ${bottom} ${width} ${height} re f`)
  // Maintain the requested 0.5 cm text inset from the outer page edges and the center divider.
  const TEXT_MARGIN = 14.17
  const SIDEBAR_LEFT = TEXT_MARGIN
  const SIDEBAR_RULE_RIGHT = 204
  const RIGHT_LEFT = 218 + TEXT_MARGIN
  const RIGHT_EDGE = PAGE_WIDTH - TEXT_MARGIN
  const RIGHT_WIDTH = RIGHT_EDGE - RIGHT_LEFT
  const SIDEBAR_WIDTH = SIDEBAR_RULE_RIGHT - SIDEBAR_LEFT
  const wrapLines = (value: string, width: number, size: number) => wrapToWidth(value, width, size)
  const nextPage = () => { pages.push([]); page += 1; y = 790; wrapToWidth(`CV · ${cv.fullName}`, RIGHT_WIDTH, 12).slice(0, 2).forEach((lineText, index) => text(lineText, RIGHT_LEFT, 815 - index * 14, 12, '/F2', '0.40 0.43 0.48')); rule(RIGHT_LEFT, 802, RIGHT_EDGE, '0.82 0.84 0.87') }
  const ensure = (height: number) => { if (y - height < 48) nextPage() }
  const section = (title: string) => { ensure(34); y -= 12; text(title.toUpperCase(), RIGHT_LEFT, y, 14, '/F2', accent); y -= 6; rule(RIGHT_LEFT, y, RIGHT_EDGE); y -= 15 }
  const paragraph = (value: string, width = RIGHT_WIDTH, size = 12, leading = 14) => { for (const lineText of wrapLines(value, width, size)) { ensure(leading); text(lineText, RIGHT_LEFT, y, size); y -= leading } }

  // Reproduction of the supplied one-page PDF: warm left sidebar, compact right content.
  fillRect(-1, 0, 219, PAGE_HEIGHT, sidebar)
  fillRect(218, 0, 2, PAGE_HEIGHT, accent)
  const name = wrapLines(cv.fullName, SIDEBAR_WIDTH, 15).slice(0, 3)
  name.forEach((lineText, index) => text(lineText, SIDEBAR_LEFT, 790 - index * 25, 15, '/F2', accent))
  const titleY = 790 - (name.length - 1) * 25 - 23
  const headlineLines = wrapLines(cv.headline, SIDEBAR_WIDTH, 12).slice(0, 4)
  headlineLines.forEach((lineText, index) => text(lineText, SIDEBAR_LEFT, titleY - index * 14, 12, '/F2'))
  let leftY = titleY - 34 - Math.max(0, headlineLines.length - 1) * 14
  const leftSection = (title: string) => { leftY -= 14; text(title, SIDEBAR_LEFT, leftY, 14, '/F2', accent); leftY -= 7; rule(SIDEBAR_LEFT, leftY, SIDEBAR_RULE_RIGHT, accent); leftY -= 13 }
  const leftLines = (value: string, size = 12, leading = 14) => { for (const lineText of wrapLines(value, SIDEBAR_WIDTH, size)) { if (leftY > 48) { text(lineText, SIDEBAR_LEFT, leftY, size); leftY -= leading } } }
  leftSection('FORMATION')
  for (const item of cv.education.slice(0, 4)) { leftLines([item.startDate, item.endDate].filter(Boolean).join(' – ')); leftLines(item.degree); leftLines([item.institution, item.location].filter(Boolean).join(' · ')); leftY -= 6 }
  leftSection('COMPÉTENCES')
  for (const skill of cv.skills.slice(0, 9)) { leftLines(`• ${skill}`) }
  if (cv.languages.length) { leftSection('LANGUES'); for (const item of cv.languages.slice(0, 5)) { leftLines(item.language); leftLines(item.level); leftY -= 3 } }
  if (cv.certifications.length) { leftSection('RÉFÉRENCES'); for (const item of cv.certifications.slice(0, 3)) { leftLines(item); leftY -= 3 } }

  y = 790
  section('Profil')
  paragraph(cv.summary)
  section('Expérience professionnelle')
  for (const item of cv.experience) {
    ensure(48)
    for (const lineText of wrapLines(item.company.toUpperCase(), RIGHT_WIDTH, 12)) { ensure(15); text(lineText, RIGHT_LEFT, y, 12, '/F2', accent); y -= 15 }
    if (item.location) for (const lineText of wrapLines(item.location, RIGHT_WIDTH, 12)) { ensure(15); text(lineText, RIGHT_LEFT, y, 12, '/F1', '0.35 0.39 0.45'); y -= 15 }
    for (const lineText of wrapLines(item.role, RIGHT_WIDTH, 12)) { ensure(15); text(lineText, RIGHT_LEFT, y, 12, '/F2'); y -= 15 }
    for (const lineText of wrapLines(`${item.startDate} – ${item.endDate || 'Présent'}`, RIGHT_WIDTH, 12)) { ensure(15); text(lineText, RIGHT_LEFT, y, 12, '/F1', '0.35 0.39 0.45'); y -= 15 }
    for (const lineText of wrapLines(item.description, RIGHT_WIDTH, 12)) { ensure(15); text(`• ${lineText}`, RIGHT_LEFT, y, 12); y -= 15 }
    y -= 6
  }
  if (cv.website || cv.linkedin) { section('Contact en ligne'); paragraph([cv.website, cv.linkedin].filter(Boolean).join(' · ')) }
  pages.forEach((commands, index) => text(`${index + 1} / ${pages.length}`, RIGHT_EDGE - 25, 25, 12, '/F1', '0.45 0.47 0.51'))

  const regularId = 3 + 2 * pages.length
  const boldId = regularId + 1
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>']
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + 2 * index} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  pages.forEach((commands, index) => {
    const pageId = 3 + 2 * index; const contentId = pageId + 1; const stream = commands.join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'latin1'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
