import { findTeraDocTemplate, type TeraDocTemplateId } from './templates'

export type TeraDocSection = 'summary' | 'experience' | 'education' | 'skills' | 'languages' | 'certifications'
export type TeraDocExperience = { role: string; company: string; location?: string; startDate: string; endDate?: string; description: string }
export type TeraDocEducation = { degree: string; institution: string; location?: string; startDate?: string; endDate?: string; description?: string }
export type TeraDocLanguage = { language: string; level: string }

export type TeraDocCv = {
  templateId: TeraDocTemplateId
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  website?: string
  linkedin?: string
  summary: string
  experience: TeraDocExperience[]
  education: TeraDocEducation[]
  skills: string[]
  languages: TeraDocLanguage[]
  certifications: string[]
  photoUrl?: string
}

const MAX = { name: 120, short: 180, long: 2400, url: 300, items: 12, skills: 30 }
const URL_PROTOCOL = /^https:\/\/[^\s]+$/i
const DATE = /^\d{4}-(0[1-9]|1[0-2])$/

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('teradoc_cv_invalid')
  return value as Record<string, unknown>
}
function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('teradoc_cv_invalid')
  return value.trim()
}
function optionalUrl(value: unknown) {
  if (value === undefined || value === '') return undefined
  const result = text(value, MAX.url)
  if (!URL_PROTOCOL.test(result)) throw new Error('teradoc_cv_invalid')
  return result
}
function date(value: unknown, optional = false) {
  if (optional && (value === undefined || value === '')) return ''
  const result = text(value, 7, true)
  if (!DATE.test(result)) throw new Error('teradoc_cv_invalid')
  return result
}
function list(value: unknown, limit: number, itemMax: number, required = false): string[] {
  if (!Array.isArray(value) || value.length > limit || (required && value.length === 0)) throw new Error('teradoc_cv_invalid')
  return value.map(item => text(item, itemMax, true))
}

export function sanitizeTeraDocCv(input: unknown): TeraDocCv {
  const source = record(input)
  const template = findTeraDocTemplate(source.templateId)
  if (!template) throw new Error('teradoc_template_invalid')
  const experience = Array.isArray(source.experience) && source.experience.length <= MAX.items ? source.experience.map(value => {
    const item = record(value)
    return { role: text(item.role, MAX.short, true), company: text(item.company, MAX.short, true), location: text(item.location ?? '', MAX.short), startDate: date(item.startDate), endDate: date(item.endDate, true) || undefined, description: text(item.description, MAX.long, true) }
  }) : (() => { throw new Error('teradoc_cv_invalid') })()
  const education = Array.isArray(source.education) && source.education.length <= MAX.items ? source.education.map(value => {
    const item = record(value)
    return { degree: text(item.degree, MAX.short, true), institution: text(item.institution, MAX.short, true), location: text(item.location ?? '', MAX.short), startDate: date(item.startDate, true) || undefined, endDate: date(item.endDate, true) || undefined, description: text(item.description ?? '', MAX.long) || undefined }
  }) : (() => { throw new Error('teradoc_cv_invalid') })()
  const languages = Array.isArray(source.languages) && source.languages.length <= MAX.items ? source.languages.map(value => { const item = record(value); return { language: text(item.language, MAX.short, true), level: text(item.level, MAX.short, true) } }) : (() => { throw new Error('teradoc_cv_invalid') })()
  return {
    templateId: template.id,
    fullName: text(source.fullName, MAX.name, true),
    headline: text(source.headline, MAX.short, true),
    email: text(source.email, MAX.short, true),
    phone: text(source.phone, MAX.short, true),
    location: text(source.location, MAX.short, true),
    website: optionalUrl(source.website),
    linkedin: optionalUrl(source.linkedin),
    summary: text(source.summary, MAX.long, true),
    experience,
    education,
    skills: list(source.skills, MAX.skills, MAX.short, true),
    languages,
    certifications: list(source.certifications, MAX.items, MAX.short),
    photoUrl: optionalUrl(source.photoUrl),
  }
}
