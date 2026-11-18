import crypto from 'node:crypto'
import { ensureSchema, query } from '../../../lib/storage'
import { sanitizeTeraDocCv, type TeraDocCv } from '../cv-schema'

let schemaReady: Promise<void> | null = null

async function ensureTeraDocSchema() {
  if (schemaReady) return schemaReady
  schemaReady = (async () => {
    await ensureSchema()
    await query(`CREATE TABLE IF NOT EXISTS teradoc_documents (
      id TEXT PRIMARY KEY,
      owner_telegram_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      template_id TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await query('CREATE INDEX IF NOT EXISTS idx_teradoc_documents_owner_updated ON teradoc_documents(owner_telegram_id, updated_at)')
  })().catch(error => { schemaReady = null; throw error })
  return schemaReady
}

export async function createCvDraft(ownerId: string, input: unknown) {
  const cv = sanitizeTeraDocCv(input)
  await ensureTeraDocSchema()
  const id = crypto.randomUUID(); const now = new Date().toISOString()
  await query('INSERT INTO teradoc_documents (id,owner_telegram_id,document_type,template_id,title,payload_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?,?)', [id, ownerId, 'cv', cv.templateId, cv.fullName, JSON.stringify(cv), 'DRAFT', now, now])
  return { id, owner_telegram_id: ownerId, document_type: 'cv', template_id: cv.templateId, title: cv.fullName, status: 'DRAFT', created_at: now, updated_at: now }
}

export async function updateCvDraft(ownerId: string, id: string, input: unknown) {
  const cv = sanitizeTeraDocCv(input)
  await ensureTeraDocSchema()
  const now = new Date().toISOString()
  const rows = await query('UPDATE teradoc_documents SET template_id=?,title=?,payload_json=?,updated_at=? WHERE id=? AND owner_telegram_id=? AND document_type=? RETURNING id', [cv.templateId, cv.fullName, JSON.stringify(cv), now, id, ownerId, 'cv'])
  if (!rows[0]) return null
  return getCvDocument(ownerId, id)
}

export async function getCvDocument(ownerId: string, id: string) {
  await ensureTeraDocSchema()
  const rows = await query('SELECT id,owner_telegram_id,document_type,template_id,title,payload_json,status,created_at,updated_at FROM teradoc_documents WHERE id=? AND owner_telegram_id=? AND document_type=? LIMIT 1', [id, ownerId, 'cv'])
  const row = rows[0] as Record<string, unknown> | undefined
  if (!row) return null
  return { ...row, payload: JSON.parse(String(row.payload_json)) as TeraDocCv }
}

export async function listCvDocuments(ownerId: string) {
  await ensureTeraDocSchema()
  return query('SELECT id,document_type,template_id,title,status,created_at,updated_at FROM teradoc_documents WHERE owner_telegram_id=? AND document_type=? ORDER BY updated_at DESC LIMIT 100', [ownerId, 'cv'])
}

export async function markCvGenerated(ownerId: string, id: string) {
  await ensureTeraDocSchema()
  const now = new Date().toISOString()
  const rows = await query("UPDATE teradoc_documents SET status='GENERATED',updated_at=? WHERE id=? AND owner_telegram_id=? AND document_type=? RETURNING id", [now, id, ownerId, 'cv'])
  return Boolean(rows[0])
}
