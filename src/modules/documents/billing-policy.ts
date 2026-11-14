export const DAILY_FREE_DOCUMENT_LIMITS = { devis: 1, facture: 1 } as const
export const DOCUMENT_PACKS = [
  { code: 'document-1', documents: 1, amount: 200, currency: 'XAF' },
  { code: 'document-50', documents: 50, amount: 5000, currency: 'XAF' },
  { code: 'document-100', documents: 100, amount: 15000, currency: 'XAF' },
  { code: 'document-250', documents: 250, amount: 35000, currency: 'XAF' },
  { code: 'document-500', documents: 500, amount: 60000, currency: 'XAF' },
] as const

export type DocumentPack = (typeof DOCUMENT_PACKS)[number]

export function findDocumentPack(code: unknown): DocumentPack | null {
  const value = String(code ?? '').trim()
  return DOCUMENT_PACKS.find(pack => pack.code === value) || null
}
