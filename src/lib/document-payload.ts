import type { ValidatedDocumentLine } from './document-form-validation'
import { sanitizeDocumentRequest } from './document-request'

export function buildDocumentPayload<T extends Record<string, unknown>>(payload: T, items: ValidatedDocumentLine[]) {
  const { items: _ignored, owner_telegram_id: _owner, ...fields } = payload as T & { items?: unknown; owner_telegram_id?: unknown }
  return sanitizeDocumentRequest({ ...fields, items })
}
