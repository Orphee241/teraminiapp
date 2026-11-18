import type { TeraDocCv } from '../cv-schema'
import { findTeraDocTemplate } from '../templates'

function pdfText(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '\\$&') }
function wrap(value: string, max = 92) { const words = value.split(/\s+/); const lines: string[] = []; let line = ''; for (const word of words) { if (!word) continue; if ((line + ' ' + word).trim().length > max && line) { lines.push(line); line = word } else line = (line + ' ' + word).trim() } if (line) lines.push(line); return lines }
function color(hex: string) { const value = hex.replace('#', ''); return [0, 2, 4].map(index => (parseInt(value.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ') }

export function renderCvPdf(cv: TeraDocCv): Buffer {
  const template = findTeraDocTemplate(cv.templateId) || findTeraDocTemplate('essential')!
  const accent = color(template.accent); const commands: string[] = []
  const text = (value: string, x: number, y: number, size = 9, font = '/F1', fill = '0.12 0.14 0.18') => { commands.push(`BT ${fill} rg ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj ET`) }
  const rule = (x: number, y: number, width: number) => commands.push(`${accent} RG 1.2 w ${x} ${y} m ${x + width} ${y} l S`)
  let y = 790
  commands.push(`${accent} rg 0 760 595 82 re f`)
  text(cv.fullName, 42, y, 25, '/F2', '1 1 1'); y -= 23
  text(cv.headline, 42, y, 11, '/F1', '1 1 1'); y -= 18
  text([cv.email, cv.phone, cv.location].filter(Boolean).join('  ·  '), 42, y, 8, '/F1', '0.94 0.95 0.97')
  y = 710
  const section = (title: string) => { y -= 24; text(title.toUpperCase(), 42, y, 10, '/F2', accent); y -= 7; rule(42, y, 511); y -= 16 }
  const paragraph = (value: string) => { for (const line of wrap(value, 94)) { text(line, 42, y, 9); y -= 13 } }
  section('Profil'); paragraph(cv.summary)
  section('Expérience')
  for (const item of cv.experience) { text(item.role, 42, y, 10, '/F2'); text([item.company, item.location].filter(Boolean).join(' · '), 42, y - 13, 8); text(`${item.startDate}${item.endDate ? ` – ${item.endDate}` : ' – Aujourd’hui'}`, 445, y, 8, '/F1', '0.35 0.39 0.45'); y -= 28; for (const line of wrap(item.description, 92)) { text(line, 42, y, 8); y -= 12 } y -= 7 }
  section('Formation')
  for (const item of cv.education) { text(item.degree, 42, y, 9, '/F2'); text(item.institution, 42, y - 13, 8); y -= 31 }
  section('Compétences'); paragraph(cv.skills.join('  ·  '))
  if (cv.languages.length) { section('Langues'); paragraph(cv.languages.map(item => `${item.language} — ${item.level}`).join('  ·  ')) }
  if (cv.certifications.length) { section('Certifications'); paragraph(cv.certifications.join('  ·  ')) }
  if (cv.website || cv.linkedin) { section('Liens'); paragraph([cv.website, cv.linkedin].filter(Boolean).join('  ·  ')) }
  const stream = commands.join('\n')
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>', `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>']
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'latin1'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf, 'latin1'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
