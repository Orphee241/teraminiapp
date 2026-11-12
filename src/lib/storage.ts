import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logoObjectKeyFromReference } from './logo-reference'
import { matchesDeclaredMediaType } from './media-validation'

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
export const s3 = () => { const config = storageConfig(); return config.endpoint && config.accessKeyId && config.secretAccessKey ? new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true, credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } }) : null }
export const bucket = () => storageConfig().bucket
function internalTelegramIds() { return new Set(String(process.env.TERAMINI_INTERNAL_TELEGRAM_IDS || process.env.TERAINTERFACE_INTERNAL_TELEGRAM_IDS || '').split(',').map(value => value.trim()).filter(Boolean)) }
function logoNamespace(userId: string) { return internalTelegramIds().has(String(userId)) ? `terainterface/logos/${userId}` : `clients/${userId}/logos` }
export function ownedLogoKey(userId: string, reference: string) {
  return logoObjectKeyFromReference(userId, reference, String(bucket() || ''), Array.from(internalTelegramIds()))
}
export async function signedLogoUrl(userId: string, reference: string) {
  const key = ownedLogoKey(userId, reference)
  const client = s3()
  if (!key || !client) return ''
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 3600 })
}
const conversationSchema = `CREATE TABLE IF NOT EXISTS miniapp_profiles (telegram_id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', language_code TEXT NOT NULL DEFAULT '', photo_url TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', company_name TEXT NOT NULL DEFAULT '', nif TEXT NOT NULL DEFAULT '', rccm TEXT NOT NULL DEFAULT '', logo_url TEXT NOT NULL DEFAULT '', brand_color TEXT NOT NULL DEFAULT '#D71920', last_app_visit_at TEXT NOT NULL DEFAULT '', is_online INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS miniapp_conversations (id TEXT PRIMARY KEY, application TEXT NOT NULL, tenant TEXT NOT NULL, external_user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT 'Michelle', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(application, external_user_id, status)); CREATE TABLE IF NOT EXISTS miniapp_messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES miniapp_conversations(id), role TEXT NOT NULL CHECK(role IN ('user','assistant')), text TEXT NOT NULL, sent_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT, attachment_json TEXT); CREATE TABLE IF NOT EXISTS miniapp_admins (telegram_id TEXT PRIMARY KEY, username TEXT NOT NULL DEFAULT '', first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS miniapp_rate_limits (scope_key TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, hits INTEGER NOT NULL DEFAULT 0); CREATE INDEX IF NOT EXISTS idx_miniapp_messages_conversation ON miniapp_messages(conversation_id, sent_at);`
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
export async function query(sql: string, args: unknown[] = []) {
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
export async function consumePersistentRateLimit(scope: string, maximum: number, windowMs: number, now = Date.now()) {
  await ensureSchema()
  const secret = process.env.TERAMINI_ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''
  if (!secret || !scope || scope.length > 256 || maximum < 1 || windowMs < 1) throw new Error('shared_rate_limit_unavailable')
  const scopeKey = crypto.createHmac('sha256', secret).update(scope).digest('hex')
  const rows = await query("INSERT INTO miniapp_rate_limits (scope_key,window_started_at,hits) VALUES (?1,?2,1) ON CONFLICT(scope_key) DO UPDATE SET hits=CASE WHEN miniapp_rate_limits.window_started_at<=?2-?3 THEN 1 ELSE miniapp_rate_limits.hits+1 END,window_started_at=CASE WHEN miniapp_rate_limits.window_started_at<=?2-?3 THEN ?2 ELSE miniapp_rate_limits.window_started_at END RETURNING hits", [scopeKey, now, windowMs])
  return Number(rows[0]?.hits || 0) <= maximum
}

export async function resetPersistentRateLimit(scope: string) {
  await ensureSchema()
  const secret = process.env.TERAMINI_ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''
  if (!secret || !scope || scope.length > 256) throw new Error('shared_rate_limit_unavailable')
  const scopeKey = crypto.createHmac('sha256', secret).update(scope).digest('hex')
  await query('DELETE FROM miniapp_rate_limits WHERE scope_key=?1', [scopeKey])
}

export async function upsertProfile(profile: Record<string, string>) { await ensureSchema(); const now = new Date().toISOString(); await query("INSERT INTO miniapp_profiles (telegram_id,username,first_name,last_name,language_code,photo_url,last_app_visit_at,is_online,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,1,?7,?7) ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,language_code=excluded.language_code,photo_url=excluded.photo_url,last_app_visit_at=excluded.last_app_visit_at,is_online=1,updated_at=excluded.updated_at", [profile.telegram_id, profile.username, profile.first_name, profile.last_name, profile.language_code, profile.photo_url, now]); return profile }
export async function uploadLogo(userId: string, file: File) {
  const client = s3(), targetBucket = bucket()
  if (!client) throw new Error('media_storage_unconfigured')
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
  if (!allowed.has(file.type)) throw new Error('logo_type_forbidden')
  if (file.size > 5 * 1024 * 1024) throw new Error('logo_too_large')
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!matchesDeclaredMediaType(file.type, Uint8Array.from(bytes))) throw new Error('media_signature_invalid')
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const key = `${logoNamespace(userId)}/logo.${extension}`
  const internal = internalTelegramIds().has(String(userId))
  await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: key, Body: bytes, ContentType: file.type, CacheControl: 'public, max-age=31536000, immutable', Metadata: { owner: userId, application: 'terainterface-miniapp', asset: 'company-logo', ownerScope: internal ? 'terainterface' : 'client' } }))
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: targetBucket, Key: key }), { expiresIn: 86400 })
  return { key, url, type: file.type, size: file.size }
}
