export type TeraDocTemplateId = 'essential' | 'editorial' | 'executive'

export type TeraDocTemplate = {
  id: TeraDocTemplateId
  name: string
  description: string
  atsLevel: 'high' | 'standard'
  accent: string
  columns: 1 | 2
  supportsPhoto: boolean
}

export const TERADOC_TEMPLATES: readonly TeraDocTemplate[] = [
  { id: 'essential', name: 'Essential', description: 'Sobre, lisible et optimisé pour une lecture ATS.', atsLevel: 'high', accent: '#7a243c', columns: 1, supportsPhoto: false },
  { id: 'editorial', name: 'Editorial', description: 'Hiérarchie typographique élégante pour les profils expérimentés.', atsLevel: 'high', accent: '#405466', columns: 1, supportsPhoto: false },
  { id: 'executive', name: 'Executive', description: 'Deux colonnes équilibrées pour un CV plus affirmé.', atsLevel: 'standard', accent: '#27364a', columns: 2, supportsPhoto: true },
] as const

export function findTeraDocTemplate(value: unknown): TeraDocTemplate | null {
  const id = String(value || '').trim() as TeraDocTemplateId
  return TERADOC_TEMPLATES.find(template => template.id === id) || null
}
