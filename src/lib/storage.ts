import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logoObjectKeyFromReference } from './logo-reference'

// Conversation storage belongs to Michelle's identity database. Do not fall
// back to a generic TURSO_* pair: in Coolify that pair may point to a tenant
// business database and would make persistence non-deterministic.
const tursoUrl = () => process.env.MICHELLE_TURSO_DATABASE_URL || ''
const tursoToken = () => process.env.MICHELLE_TURSO_AUTH_TOKEN || ''
const storageConfig = () => {
  const provider = String(process.env.OBJECT_STORAGE_PROVIDER || 'b2').toLowerCase()
  if (provider === 'b2' || provider === 'backblaze' || provider === 'backblaze-b2') return { endpoint: process.env.B2_ENDPOINT, region: process.env.B2_REGION || 'us-east-005', accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APPLICATION_KEY, bucket: process.env.B2_BUCKET || 'Terainterface' }
  return { endpoint: process.env.GARAGE_ENDPOINT, region: process.env.GARAGE_REGION || 'garage', accessKeyId: process.env.GARAGE_ACCESS_KEY_ID, secretAccessKey: process.env.GARAGE_SECRET_ACCESS_KEY, bucket: process.env.GARAGE_BUCKET || 'terainterface' }
}
const s3 = () => { const config = storageConfig(); return config.endpoint && config.accessKeyId && config.secretAccessKey ? new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }) : null }
const bucket = () => storageConfig().bucket
function internalTelegramIds() { return new Set(String(process.env.TERAMINI_INTERNAL_TELEGRAM_IDS || process.env.TERAINTERFACE_INTERNAL_TELEGRAM_IDS || '').split(',').map(value => value.trim()).filter(Boolean)) }
function logoNamespace(userId: string) { return internalTelegramIds().has(String(userId)) ? `terainterface/logos/${userId}` : `clients/${userId}/logos` }
function ownedLogoKey(userId: string, reference: string) {
  return logoObjectKeyFromReference(userId, reference, String(bucket() || ''), Array.from(internalTelegramIds()))
}
async function signedLogoUrl(userId: string, reference: string) {
  const key = ownedLogoKey(userId, reference)
  const client = s3()
  if (!key || !client) return ''
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 3600 })
}
const conversationSchema = `CREATE TABLE IF NOT EXISTS miniapp_profiles (telegram_id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', language_code TEXT NOT NULL DEFAULT '', photo_url TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL DEFAULT '', nif TEXT NOT NULL DEFAULT '', rccm TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '', brand_color TEXT NOT NULL DEFAULT '#D71920', last_app_visit_at TEXT NOT NULL DEFAULT '', is_online INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS miniapp_conversations (id TEXT PRIMARY KEY, application TEXT NOT NULL, tenant TEXT NOT NULL, external_user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'Michelle', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(application, external_user_id, status)); CREATE TABLE IF NOT EXISTS miniapp_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES miniapp_conversations(id), role TEXT NOT NULL CHECK(role IN ('user','assistant')), text TEXT NOT NULL, sent_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT, attachment_json TEXT); CREATE TABLE IF NOT EXISTS miniapp_admins (telegram_id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_miniapp_messages_conversation ON miniapp_messages(conversation_id, sent_at);`
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
export async function ensureSchema() { if (schemaReady) return schemaReady; schemaReady = (async () => { for (const statement of conversationSchema.split(';').map(x => x.trim()).filter(Boolean)) await query(statement); for (const column of ["company_name TEXT NOT NULL DEFAULT ''", "nif TEXT NOT NULL DEFAULT ''", "rccm TEXT NOT NULL DEFAULT ''", "logo_url TEXT NOT NULL DEFAULT ''", "brand_color TEXT NOT NULL DEFAULT '#D71920'", "last_app_visit_at TEXT NOT NULL DEFAULT ''", "is_online INTEGER NOT NULL DEFAULT 0"]) { try { await query(`ALTER TABLE miniapp_profiles ADD COLUMN ${column}`) } catch { /* Existing deployments already have this profile column. */ } } })().catch(error => { schemaReady = null; throw error }); return schemaReady }
export async function upsertProfile(profile: Record<string, string>) { await ensureSchema(); const now = new Date().toISOString(); await query("INSERT INTO miniapp_profiles (telegram_id,username,first_name,last_name,language_code,photo_url,last_app_visit_at,is_online,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,1,?7,?7) ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,language_code=excluded.language_code,photo_url=excluded.photo_url,last_app_visit_at=excluded.last_app_visit_at,is_online=1,updated_at=excluded.updated_at", [profile.telegram_id, profile.username, profile.first_name, profile.last_name, profile.language_code, profile.photo_url, now]); return profile }
export async function adminProfiles() { await ensureSchema(); return query("SELECT p.telegram_id,p.username,p.first_name,p.last_name,p.language_code,p.photo_url,p.email,p.phone,p.address,p.company_name,p.nif,p.rccm,p.created_at,p.updated_at,p.last_app_visit_at,CASE WHEN p.last_app_visit_at != '' AND (strftime('%s','now') - strftime('%s',p.last_app_visit_at)) < 300 THEN 1 ELSE 0 END AS is_online, COUNT(DISTINCT c.id) AS conversation_count FROM miniapp_profiles p LEFT JOIN miniapp_conversations c ON c.external_user_id=p.telegram_id AND c.application='terainterface-miniapp' AND c.tenant='terainterface' GROUP BY p.telegram_id ORDER BY COALESCE(p.last_app_visit_at,p.updated_at) DESC LIMIT 500") }
export async function markProfileOfflineBefore(cutoffIso: string) { await ensureSchema(); return query("UPDATE miniapp_profiles SET is_online=0 WHERE is_online=1 AND last_app_visit_at < ?1", [cutoffIso]) }
export async function lookupTelegramUser(telegramId: string) { await ensureSchema(); const rows = await query('SELECT telegram_id,username,first_name,last_name FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId]); if (rows[0] && (rows[0].username || rows[0].first_name || rows[0].last_name)) return rows[0]; const token = process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''; if (token) { try { const response = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(telegramId)}`, { cache: 'no-store' }); const payload = await response.json() as { ok?: boolean; result?: { username?: string; first_name?: string; last_name?: string } }; if (payload.ok && payload.result) { const profile = { telegram_id: telegramId, username: payload.result.username || '', first_name: payload.result.first_name || '', last_name: payload.result.last_name || '', language_code: '', photo_url: '' }; await upsertProfile(profile); return profile } } catch { /* Keep the ID usable when Telegram cannot resolve the chat. */ } } return rows[0] || { telegram_id: telegramId, username: '', first_name: '', last_name: '' } }
export async function adminConversationStats() { await ensureSchema(); const rows = await query("SELECT COUNT(*) AS conversations, COUNT(DISTINCT external_user_id) AS users FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface'"); const messages = await query("SELECT COUNT(*) AS messages FROM miniapp_messages m JOIN miniapp_conversations c ON c.id=m.conversation_id WHERE c.application='terainterface-miniapp' AND c.tenant='terainterface'"); return { ...(rows[0] || {}), ...(messages[0] || {}) } }
export async function getConversation(userId: string) { await ensureSchema(); const rows = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId]); if (rows[0]) return rows[0]; const now = new Date().toISOString(), id = crypto.randomUUID(); try { await query("INSERT INTO miniapp_conversations (id,application,tenant,external_user_id,created_at,updated_at) VALUES (?1,'terainterface-miniapp','terainterface',?2,?3,?3)", [id, userId, now]) } catch (error) { const existing = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId]); if (existing[0]) return existing[0]; throw error } return { id, application: 'terainterface-miniapp', tenant: 'terainterface', external_user_id: userId, title: 'Michelle', status: 'active', created_at: now, updated_at: now } }
export async function listMessages(userId: string) { const conversation = await getConversation(userId); return { conversation, messages: await query('SELECT id,role,text,sent_at,edited_at,deleted_at,attachment_json FROM miniapp_messages WHERE conversation_id=?1 ORDER BY sent_at ASC LIMIT 500', [String(conversation.id)]) } }
export async function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) { const clean = String(text || '').trim(); if (!clean) throw new Error('message_required'); const conversation = await getConversation(userId), sentAt = new Date().toISOString(), id = crypto.randomUUID(); await query('INSERT INTO miniapp_messages (id,conversation_id,role,text,sent_at,attachment_json) VALUES (?1,?2,?3,?4,?5,?6)', [id, String(conversation.id), role, clean, sentAt, attachment ? JSON.stringify(attachment) : null]); await query('UPDATE miniapp_conversations SET updated_at=?1 WHERE id=?2', [sentAt, String(conversation.id)]); return { id, role, text: clean, sent_at: sentAt, attachment_json: attachment ? JSON.stringify(attachment) : null } }
export async function editMessage(userId: string, id: string, text: string) { const conversation = await getConversation(userId); return query("UPDATE miniapp_messages SET text=?1, edited_at=?2 WHERE id=?3 AND conversation_id=?4 AND role='user' AND deleted_at IS NULL", [String(text).trim(), new Date().toISOString(), id, String(conversation.id)]) }
export async function deleteMessage(userId: string, id: string) { const conversation = await getConversation(userId); return query("UPDATE miniapp_messages SET text='[Message supprimé]', deleted_at=?1 WHERE id=?2 AND conversation_id=?3 AND role='user' AND deleted_at IS NULL", [new Date().toISOString(), id, String(conversation.id)]) }
export async function adminConversations() { await ensureSchema(); return query("SELECT c.id,c.external_user_id,c.title,c.status,c.created_at,c.updated_at,p.username AS username,p.first_name AS first_name,p.last_name AS last_name FROM miniapp_conversations c LEFT JOIN miniapp_profiles p ON p.telegram_id=c.external_user_id WHERE c.application='terainterface-miniapp' AND c.tenant='terainterface' ORDER BY c.updated_at DESC LIMIT 500") }
export async function adminMessages(id: string) { return query('SELECT id,role,text,sent_at,edited_at,deleted_at,attachment_json FROM miniapp_messages WHERE conversation_id=?1 ORDER BY sent_at ASC LIMIT 1000', [id]) }
export async function listAdmins() { await ensureSchema(); return query('SELECT telegram_id,username,first_name,last_name,created_at,updated_at FROM miniapp_admins ORDER BY created_at ASC LIMIT 500') }
export async function isStoredAdmin(telegramId: string) { await ensureSchema(); const rows = await query('SELECT telegram_id FROM miniapp_admins WHERE telegram_id=?1 LIMIT 1', [telegramId]); return Boolean(rows[0]) }
export async function upsertAdmin(admin: Record<string, string>) { await ensureSchema(); const now = new Date().toISOString(); await query("INSERT INTO miniapp_admins (telegram_id,username,first_name,last_name,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?5) ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,updated_at=excluded.updated_at", [admin.telegram_id, admin.username || '', admin.first_name || '', admin.last_name || '', now]); const admins = await listAdmins(); return admins.find((item: Record<string, unknown>) => item.telegram_id === admin.telegram_id) }
export async function deleteAdmin(telegramId: string) { await ensureSchema(); await query('DELETE FROM miniapp_admins WHERE telegram_id=?1', [telegramId]); return { ok: true } }
export async function uploadLogo(userId: string, file: File) {
  const client = s3(), targetBucket = bucket()
  if (!client) throw new Error('media_storage_unconfigured')
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) throw new Error('logo_type_forbidden')
  if (file.size > 5 * 1024 * 1024) throw new Error('logo_too_large')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const key = `${logoNamespace(userId)}/logo.${extension}`
  const internal = internalTelegramIds().has(String(userId))
  await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, CacheControl: 'public, max-age=31536000, immutable', Metadata: { owner: userId, application: 'terainterface-miniapp', asset: 'company-logo', ownerScope: internal ? 'terainterface' : 'client' } }))
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: targetBucket, Key: key }), { expiresIn: 86400 })
  return { key, url, type: file.type, size: file.size }
}

export async function uploadObject(userId: string, file: File) { const client = s3(), targetBucket = bucket(); if (!client) throw new Error('media_storage_unconfigured'); const allowed = new Set(['image/jpeg','image/png','image/webp','audio/ogg','audio/mpeg','audio/mp4','application/pdf']); if (!allowed.has(file.type)) throw new Error('media_type_forbidden'); if (file.size > 15 * 1024 * 1024) throw new Error('media_too_large'); const key = `teraminiapp/${userId}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`; await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type, Metadata: { owner: userId, application: 'terainterface-miniapp' } })); return { key, name: file.name, type: file.type, size: file.size, url: await getSignedUrl(client, new GetObjectCommand({ Bucket: targetBucket, Key: key }), { expiresIn: 900 }) } }

export async function getProfile(telegramId: string) {
  await ensureSchema()
  const rows = await query('SELECT telegram_id,username,first_name,last_name,language_code,photo_url,email,phone,address,company_name,nif,rccm,logo_url,brand_color FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId])
  const profile = rows[0] || { telegram_id: telegramId, username: '', first_name: '', last_name: '', language_code: '', photo_url: '', email: '', company_name: '', phone: '', address: '', nif: '', rccm: '', logo_url: '', brand_color: '#D71920' }
  const storedLogo = String(profile.logo_url || '')
  const key = ownedLogoKey(telegramId, storedLogo)
  if (!key) return { ...profile, logo_url: '' }
  if (storedLogo !== key) await query('UPDATE miniapp_profiles SET logo_url=?1 WHERE telegram_id=?2', [key, telegramId])
  return { ...profile, logo_url: await signedLogoUrl(telegramId, key) }
}
export async function updateProfile(telegramId: string, profile: Record<string, string>) {
  await ensureSchema()
  const brandColor = String(profile.brand_color || '#D71920').trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) throw new Error('brand_color_invalid')
  const logoReference = String(profile.logo_url || '').trim()
  const logoKey = logoReference ? ownedLogoKey(telegramId, logoReference) : ''
  if (logoReference && !logoKey) throw new Error('logo_reference_invalid')
  await query('UPDATE miniapp_profiles SET company_name=?1,phone=?2,address=?3,nif=?4,rccm=?5,logo_url=?6,brand_color=?7,updated_at=?8 WHERE telegram_id=?9', [profile.company_name || '', profile.phone || '', profile.address || '', profile.nif || '', profile.rccm || '', logoKey, brandColor.toUpperCase(), new Date().toISOString(), telegramId])
  return getProfile(telegramId)
}
export async function freshLogoUrl(telegramId: string) {
  await ensureSchema()
  const rows = await query('SELECT logo_url FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId])
  const reference = String(rows[0]?.logo_url || '')
  const key = ownedLogoKey(telegramId, reference)
  if (!key) return ''
  if (reference !== key) await query('UPDATE miniapp_profiles SET logo_url=?1 WHERE telegram_id=?2', [key, telegramId])
  return signedLogoUrl(telegramId, key)
}
