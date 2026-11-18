const TOP_LEVEL = new Set(['document_type','number','issue_date','issuer','client','items','vat_applied','template_profile','service_title','service_type','reference','logo_enabled','client_logo_path','persist_crm','idempotency_key','brand_color','currency'])
const PARTY_FIELDS = new Set(['name','company','address','phone','tax_id','rccm'])
const PROTOTYPE_KEYS = new Set(['__proto__','constructor','prototype'])

function plainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('document_schema_invalid')
  return value as Record<string, unknown>
}
function boundedString(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('document_schema_invalid')
  return value.trim()
}
function optionalString(value: unknown, max: number) { return value === undefined ? undefined : boundedString(value, max) }

function party(value: unknown): Record<string, string> {
  const source = plainRecord(value); const output: Record<string, string> = {}
  for (const key of Object.keys(source)) {
    if (PROTOTYPE_KEYS.has(key) || !PARTY_FIELDS.has(key)) throw new Error('document_schema_invalid')
    output[key] = boundedString(source[key], 240)
  }
  return output
}

export function sanitizeDocumentRequest(input: unknown): Record<string, unknown> {
  const source = plainRecord(input); const output: Record<string, unknown> = {}
  for (const key of Object.keys(source)) if (PROTOTYPE_KEYS.has(key) || !TOP_LEVEL.has(key)) throw new Error('document_schema_invalid')
  if (source.document_type !== 'devis' && source.document_type !== 'facture') throw new Error('document_schema_invalid')
  output.document_type = source.document_type
  for (const [key, max] of [['number', 120], ['issue_date', 40], ['service_title', 180], ['service_type', 120], ['reference', 160], ['client_logo_path', 500], ['idempotency_key', 160]] as const) {
    const value = optionalString(source[key], max); if (value !== undefined) output[key] = value
  }
  for (const key of ['issuer','client'] as const) if (source[key] !== undefined) output[key] = party(source[key])
  if (!Array.isArray(source.items) || source.items.length < 1 || source.items.length > 100) throw new Error('document_schema_invalid')
  output.items = source.items.map(item => {
    const row = plainRecord(item); const keys = Object.keys(row)
    if (keys.some(key => PROTOTYPE_KEYS.has(key) || !['designation','quantity','unit_price'].includes(key))) throw new Error('document_schema_invalid')
    const designation = boundedString(row.designation, 180, true)
    const quantity = row.quantity; const unitPrice = row.unit_price
    if (typeof quantity !== 'number' || typeof unitPrice !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || !Number.isInteger(unitPrice) || unitPrice < 1 || unitPrice > 2_000_000_000) throw new Error('document_schema_invalid')
    return { designation, quantity, unit_price: unitPrice }
  })
  for (const key of ['vat_applied','logo_enabled','persist_crm'] as const) if (source[key] !== undefined) { if (typeof source[key] !== 'boolean') throw new Error('document_schema_invalid'); output[key] = source[key] }
  if (source.template_profile !== undefined) output.template_profile = boundedString(source.template_profile, 120)
  if (source.brand_color !== undefined) { const color = boundedString(source.brand_color, 7); if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('document_schema_invalid'); output.brand_color = color }
  if (source.currency !== undefined) { const currency = boundedString(source.currency, 3); if (!/^[A-Z]{3}$/.test(currency)) throw new Error('document_schema_invalid'); output.currency = currency }
  return output
}
