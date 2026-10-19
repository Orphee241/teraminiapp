import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Conversation storage belongs to Michelle's identity database. Do not fall
// back to a generic TURSO_* pair: in Coolify that pair may point to a tenant
// business database and would make persistence non-deterministic.
const tursoUrl = () => process.env.MICHELLE_TURSO_DATABASE_URL || ''
const tursoToken = () => process.env.MICHELLE_TURSO_AUTH_TOKEN || ''
const s3 = () => process.env.GARAGE_ENDPOINT && process.env.GARAGE_ACCESS_KEY_ID && process.env.GARAGE_SECRET_ACCESS_KEY ? new S3Client({ endpoint: process.env.GARAGE_ENDPOINT, region: process.env.GARAGE_REGION || 'garage', forcePathStyle: true, credentials: { accessKeyId: process.env.GARAGE_ACCESS_KEY_ID, secretAccessKey: process.env.GARAGE_SECRET_ACCESS_KEY } }) : null
export const conversationSchema = `CREATE TABLE IF NOT EXISTS miniapp_profiles (telegram_id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', language_code TEXT NOT NULL DEFAULT '', photo_url TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL DEFAULT '', nif TEXT NOT NULL DEFAULT '', rccm TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS miniapp_conversations (id TEXT PRIMARY KEY, application TEXT NOT NULL, tenant TEXT NOT NULL, external_user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'Michelle', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(application, external_user_id, status)); CREATE TABLE IF NOT EXISTS miniapp_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES miniapp_conversations(id), role TEXT NOT NULL CHECK(role IN ('user','assistant')), text TEXT NOT NULL, sent_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT, attachment_json TEXT); CREATE INDEX IF NOT EXISTS idx_miniapp_messages_conversation ON miniapp_messages(conversation_id, sent_at);`
function endpoint(raw: string) { return `${String(raw).replace(/^libsql:\/\//, 'https://').replace(/\/$/, '')}/v2/pipeline` }
function value(cell: any) { return cell?.type === 'null' ? null : cell?.value ?? cell }

type CacheEntry = { value: Record<string, unknown>[]; expiresAt: number; touchedAt: number }
const queryCache = new Map<string, CacheEntry>()
const pendingReads = new Map<string, Promise<Record<string, unknown>[]>>()
const cacheTtl = () => Math.max(1_000, Number(process.env.TURSO_QUERY_CACHE_TTL_MS || 30_000))
const cacheLimit = () => Math.max(50, Number(process.env.TURSO_QUERY_CACHE_MAX_ENTRIES || 500))
function cacheKey(sql: string, args: unknown[]) { return `${sql}\u0000${JSON.stringify(args)}` }
function evictCache() {
  while (queryCache.size > cacheLimit()) {
    const oldest = Array.from(queryCache.entries()).sort((a, b) => a[1].touchedAt - b[1].touchedAt)[0]
    if (!oldest) break
    queryCache.delete(oldest[0])
  }
}
function invalidateQueryCache(match?: (key: string) => boolean) {
  if (!match) { queryCache.clear(); return }
  for (const key of Array.from(queryCache.keys())) if (match(key)) queryCache.delete(key)
}
async function query(sql: string, args: unknown[] = []) {
  const normalized = sql.trim().toUpperCase()
  const cacheable = normalized.startsWith('SELECT')
  const key = cacheKey(sql, args)
  if (cacheable) {
    const cached = queryCache.get(key)
    if (cached && cached.expiresAt > Date.now()) { cached.touchedAt = Date.now(); return cached.value }
    const pending = pendingReads.get(key)
    if (pending) return pending
  }
  const run = (async () => {
    const url = tursoUrl(), token = tursoToken()
    if (!url || !token) throw new Error('storage_unconfigured_michelle_database')
    const response = await fetch(endpoint(url), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql, args: args.map(v => ({ type: typeof v === 'number' ? 'integer' : v == null ? 'null' : 'text', value: v == null ? undefined : String(v) })) } }] }), cache: 'no-store' })
    if (!response.ok) throw new Error(`storage_http_${response.status}`)
    const payload = await response.json() as any
    const failed = payload.results?.find((item: any) => item.type === 'error' || item.response?.type === 'error')
    if (failed) throw new Error(`storage_query_failed:${failed.error?.message || failed.response?.error?.message || 'unknown'}`)
    const result = payload.results?.[0]?.response?.result || {}
    const rows = (result.rows || []).map((row: any[]) => Object.fromEntries((result.cols || []).map((col: any, i: number) => [col.name, value(row[i])])))
    if (cacheable) { const now = Date.now(); queryCache.set(key, { value: rows, expiresAt: now + cacheTtl(), touchedAt: now }); evictCache() }
    else invalidateQueryCache()
    return rows
  })()
  if (!cacheable) return run
  pendingReads.set(key, run)
  try { return await run } finally { pendingReads.delete(key) }
}
let schemaReady: Promise<void> | null = null
export async function ensureSchema() { if (schemaReady) return schemaReady; schemaReady = (async () => { for (const statement of conversationSchema.split(';').map(x => x.trim()).filter(Boolean)) await query(statement); for (const column of ["company_name TEXT NOT NULL DEFAULT ''", "nif TEXT NOT NULL DEFAULT ''", "rccm TEXT NOT NULL DEFAULT ''", "logo_url TEXT NOT NULL DEFAULT ''"]) { try { await query(`ALTER TABLE miniapp_profiles ADD COLUMN ${column}`) } catch { /* Existing deployments already have this profile column. */ } } })().catch(error => { schemaReady = null; throw error }); return schemaReady }
export async function upsertProfile(profile: Record<string, string>) { await ensureSchema(); const now = new Date().toISOString(); await query("INSERT INTO miniapp_profiles (telegram_id,username,first_name,last_name,language_code,photo_url,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?7) ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,language_code=excluded.language_code,photo_url=excluded.photo_url,updated_at=excluded.updated_at", [profile.telegram_id, profile.username, profile.first_name, profile.last_name, profile.language_code, profile.photo_url, now]); return profile }
export async function adminProfiles() { await ensureSchema(); return query("SELECT p.*, COUNT(DISTINCT c.id) AS conversation_count, MAX(c.updated_at) AS last_activity FROM miniapp_profiles p LEFT JOIN miniapp_conversations c ON c.external_user_id=p.telegram_id AND c.application='terainterface-miniapp' AND c.tenant='terainterface' GROUP BY p.telegram_id ORDER BY COALESCE(last_activity,p.updated_at) DESC LIMIT 500") }
export async function adminConversationStats() { await ensureSchema(); const rows = await query("SELECT COUNT(*) AS conversations, COUNT(DISTINCT external_user_id) AS users FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface'"); const messages = await query("SELECT COUNT(*) AS messages FROM miniapp_messages m JOIN miniapp_conversations c ON c.id=m.conversation_id WHERE c.application='terainterface-miniapp' AND c.tenant='terainterface'"); return { ...(rows[0] || {}), ...(messages[0] || {}) } }
export async function getConversation(userId: string) { await ensureSchema(); const rows = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId]); if (rows[0]) return rows[0]; const now = new Date().toISOString(), id = crypto.randomUUID(); try { await query("INSERT INTO miniapp_conversations (id,application,tenant,external_user_id,created_at,updated_at) VALUES (?1,'terainterface-miniapp','terainterface',?2,?3,?3)", [id, userId, now]) } catch (error) { const existing = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId]); if (existing[0]) return existing[0]; throw error } return { id, application: 'terainterface-miniapp', tenant: 'terainterface', external_user_id: userId, title: 'Michelle', status: 'active', created_at: now, updated_at: now } }
export async function listMessages(userId: string) { const conversation = await getConversation(userId); return { conversation, messages: await query('SELECT id,role,text,sent_at,edited_at,deleted_at,attachment_json FROM miniapp_messages WHERE conversation_id=?1 ORDER BY sent_at ASC LIMIT 500', [String(conversation.id)]) } }
export async function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) { const clean = String(text || '').trim(); if (!clean) throw new Error('message_required'); const conversation = await getConversation(userId), sentAt = new Date().toISOString(), id = crypto.randomUUID(); await query('INSERT INTO miniapp_messages (id,conversation_id,role,text,sent_at,attachment_json) VALUES (?1,?2,?3,?4,?5,?6)', [id, String(conversation.id), role, clean, sentAt, attachment ? JSON.stringify(attachment) : null]); await query('UPDATE miniapp_conversations SET updated_at=?1 WHERE id=?2', [sentAt, String(conversation.id)]); return { id, role, text: clean, sent_at: sentAt, attachment_json: attachment ? JSON.stringify(attachment) : null } }
export async function editMessage(userId: string, id: string, text: string) { const conversation = await getConversation(userId); return query("UPDATE miniapp_messages SET text=?1, edited_at=?2 WHERE id=?3 AND conversation_id=?4 AND role='user' AND deleted_at IS NULL", [String(text).trim(), new Date().toISOString(), id, String(conversation.id)]) }
export async function deleteMessage(userId: string, id: string) { const conversation = await getConversation(userId); return query("UPDATE miniapp_messages SET text='[Message supprimé]', deleted_at=?1 WHERE id=?2 AND conversation_id=?3 AND role='user' AND deleted_at IS NULL", [new Date().toISOString(), id, String(conversation.id)]) }
export async function adminConversations() { await ensureSchema(); return query("SELECT id,external_user_id,title,status,created_at,updated_at FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' ORDER BY updated_at DESC LIMIT 500") }
export async function adminMessages(id: string) { return query('SELECT id,role,text,sent_at,edited_at,deleted_at,attachment_json FROM miniapp_messages WHERE conversation_id=?1 ORDER BY sent_at ASC LIMIT 1000', [id]) }
export async function uploadObject(userId: string, file: File) { const client = s3(), bucket = process.env.GARAGE_BUCKET || 'terainterface'; if (!client) throw new Error('media_storage_unconfigured'); const allowed = new Set(['image/jpeg','image/png','image/webp','audio/ogg','audio/mpeg','audio/mp4','application/pdf']); if (!allowed.has(file.type)) throw new Error('media_type_forbidden'); if (file.size > 15 * 1024 * 1024) throw new Error('media_too_large'); const key = `teraminiapp/${userId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`; await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, Metadata: { owner: userId, application: 'terainterface-miniapp' } })); return { key, name: file.name, type: file.type, size: file.size, url: await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 900 }) } }

export async function getProfile(telegramId: string) { await ensureSchema(); const rows = await query('SELECT telegram_id,username,first_name,last_name,language_code,photo_url,email,phone,address,company_name,nif,rccm,logo_url FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId]); return rows[0] || { telegram_id: telegramId, username: '', first_name: '', last_name: '', language_code: '', photo_url: '', email: '', company_name: '', phone: '', address: '', nif: '', rccm: '', logo_url: '' } }
export async function updateProfile(telegramId: string, profile: Record<string, string>) { await ensureSchema(); await query('UPDATE miniapp_profiles SET company_name=?1,phone=?2,address=?3,nif=?4,rccm=?5,logo_url=?6,updated_at=?7 WHERE telegram_id=?8', [profile.company_name || '', profile.phone || '', profile.address || '', profile.nif || '', profile.rccm || '', profile.logo_url || '', new Date().toISOString(), telegramId]); return getProfile(telegramId) }
