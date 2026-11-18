export type TeraDocDocumentType =
  | 'cv'
  | 'cover-letter'
  | 'job-application'
  | 'internship-application'
  | 'complaint'
  | 'debt-acknowledgment'
  | 'lease'

export type TeraDocTemplateOption = {
  id: string
  documentType: TeraDocDocumentType
  name: string
  description: string
  available: boolean
  legalNotice: boolean
}

export const TERADOC_DOCUMENT_TYPES: readonly TeraDocTemplateOption[] = [
  { id: 'cv-professional', documentType: 'cv', name: 'CV professionnel', description: 'CV A4 avec modèle avec ou sans photo.', available: true, legalNotice: false },
  { id: 'cover-letter-standard', documentType: 'cover-letter', name: 'Lettre de motivation', description: 'Lettre claire et adaptée à une candidature.', available: false, legalNotice: false },
  { id: 'job-application-standard', documentType: 'job-application', name: "Demande d'emploi", description: 'Demande d’emploi prête à relire et imprimer.', available: false, legalNotice: false },
  { id: 'internship-application-standard', documentType: 'internship-application', name: 'Demande de stage', description: 'Demande de stage avec les informations essentielles.', available: false, legalNotice: false },
  { id: 'complaint-standard', documentType: 'complaint', name: 'Plainte', description: 'Modèle de plainte à adapter à votre situation.', available: false, legalNotice: true },
  { id: 'debt-acknowledgment-standard', documentType: 'debt-acknowledgment', name: 'Reconnaissance de dette', description: 'Modèle à compléter et à faire relire.', available: false, legalNotice: true },
  { id: 'lease-standard', documentType: 'lease', name: 'Contrat de bail', description: 'Modèle de bail à relire et adapter.', available: false, legalNotice: true },
]

export function getTeraDocOption(id: string) {
  return TERADOC_DOCUMENT_TYPES.find(option => option.id === id) || null
}
