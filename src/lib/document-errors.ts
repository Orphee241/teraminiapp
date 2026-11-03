export type DocumentOperation = 'generation' | 'modification'

export function documentOperationError(status: number, operation: DocumentOperation = 'generation'): string {
  if (status === 401 || status === 403) return 'Votre session n’est plus valide. Fermez puis rouvrez l’application.'
  if (status === 409) return 'Cette opération ne peut pas être effectuée pour le moment. Actualisez l’application puis réessayez.'
  if (status === 400 || status === 422) {
    return operation === 'modification'
      ? 'Un problème est survenu lors de la modification du document. Vérifiez les informations saisies puis réessayez.'
      : 'Un problème est survenu lors de la génération du document. Vérifiez les informations saisies puis réessayez.'
  }
  if (status >= 500) return 'Le service de documents est momentanément indisponible. Réessayez dans quelques instants.'
  return 'La demande n’a pas pu aboutir. Vérifiez les informations puis réessayez.'
}
