import { describe, expect, it } from 'vitest'
import { documentOperationError } from '../../lib/document-errors'

describe('document generation error messages', () => {
  it('returns a professional French message without exposing upstream details', () => {
    const message = documentOperationError(422)
    expect(message).toBe('Un problème est survenu lors de la génération du document. Vérifiez les informations saisies puis réessayez.')
    expect(message).not.toMatch(/failed|HTTP|401|token|logo|storage|traceback/i)
  })

  it('uses a distinct French message for document edits and service outages', () => {
    expect(documentOperationError(422, 'modification')).toContain('modification du document')
    expect(documentOperationError(503)).toBe('Le service de documents est momentanément indisponible. Réessayez dans quelques instants.')
  })
})
