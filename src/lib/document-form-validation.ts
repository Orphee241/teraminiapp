export type DocumentLineInput = { designation: string; quantity: string; unit_price: string }
export type ValidatedDocumentLine = { designation: string; quantity: number; unit_price: number }
export function validateDocumentLines(rows: DocumentLineInput[]): { items: ValidatedDocumentLine[]; error: string } {
  if (!rows.length) return { items: [], error: 'Ajoutez au moins une ligne complète.' }
  const items: ValidatedDocumentLine[] = []
  for (const row of rows) {
    const designation = row.designation.trim()
    const quantity = Number(row.quantity)
    const unitPrice = Number(row.unit_price)
    if (!designation) return { items: [], error: 'Ajoutez une désignation pour chaque ligne.' }
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) return { items: [], error: 'La quantité doit être un nombre entier supérieur à zéro.' }
    if (!Number.isFinite(unitPrice) || !Number.isInteger(unitPrice) || unitPrice <= 0) return { items: [], error: 'Le prix unitaire doit être un montant entier supérieur à zéro en FCFA.' }
    items.push({ designation, quantity, unit_price: unitPrice })
  }
  return { items, error: '' }
}

