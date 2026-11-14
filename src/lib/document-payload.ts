import type { ValidatedDocumentLine } from './document-form-validation'

export function buildDocumentPayload<T extends Record<string, unknown>>(payload: T, items: ValidatedDocumentLine[]) {
  return { ...payload, items }
}
