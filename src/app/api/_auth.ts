import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isStoredAdmin } from '../../modules/administration/server/repository'

export type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string; photo_url?: string }

if (process.env.NODE_ENV === 'production' && process.env.MINIAPP_DEV_MODE === 'true') {
  throw new Error('MINIAPP_DEV_MODE is forbidden in production')
}

export function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null
  const params = new URLSearchParams(initData); const hash = params.get('hash'); if (!hash) return null
  const seen = new Set<string>(); let duplicate = false; params.forEach((_value, key) => { if (seen.has(key)) duplicate = true; seen.add(key) }); if (duplicate) return null
  params.delete('hash'); const entries: [string, string][] = []; params.forEach((value, key) => entries.push([key, value]))
  const dataCheckString = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = Uint8Array.from(crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()); const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  if (expected.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null
  const authDate = Number(params.get('auth_date') || 0); const now = Date.now() / 1000; if (!Number.isSafeInteger(authDate) || authDate <= 0 || authDate > now + 60 || now - authDate > 86400) return null
  try { const user = JSON.parse(params.get('user') || '{}'); return Number.isSafeInteger(user.id) && user.id > 0 && user.id <= 9_999_999_999_999_999 ? user : null } catch { return null }
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  const expectedOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedOrigin = forwardedProto && forwardedHost ? `${forwardedProto}://${forwardedHost}` : ''
  const trustedOrigins = new Set([expectedOrigin, forwardedOrigin].filter(Boolean))

  // Reverse proxies may expose the app internally as HTTP while clients use HTTPS.
  // Accept the browser Origin only when it matches the proxy-asserted public host/scheme.
  const safeFetchSite = fetchSite && ['same-origin', 'same-site', 'none'].includes(fetchSite)
  if (origin ? !trustedOrigins.has(origin) : !safeFetchSite) {
    return NextResponse.json({ error: 'Origine de requête refusée.' }, { status: 403 })
  }
  return null
}

export async function authenticate(request: NextRequest) {
  const initData = request.headers.get('x-telegram-init-data') || ''
  const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || '')
  const developmentBypass = process.env.NODE_ENV !== 'production' && process.env.MINIAPP_DEV_MODE === 'true'
  if (!user && !developmentBypass) return { response: NextResponse.json({ error: 'Authentification Telegram requise.' }, { status: 401 }), user: null }
  return { response: null, user }
}

export function telegramProfile(user: TelegramUser) {
  return {
    telegram_id: String(user.id),
    username: user.username || '',
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    language_code: user.language_code || '',
    photo_url: user.photo_url || '',
  }
}

export function authHeaders(request: NextRequest) {
  return { authorization: `Bearer ${process.env.MICHELLE_API_KEY || ''}`, 'content-type': 'application/json', origin: request.headers.get('origin') || 'https://app.terainterface.com' }
}

const adminCookie = 'teramini_admin_session'
const adminSessionSecret = () => process.env.TERAMINI_ADMIN_SESSION_SECRET || ''
export function isAdminSessionConfigured() { return Buffer.byteLength(adminSessionSecret(), 'utf8') >= 32 }
export function isTelegramAdmin(id: string) { return (process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(value => value.trim()).includes(id) }
export async function isAdmin(id: string) { return isTelegramAdmin(id) || await isStoredAdmin(id) }
export function adminSessionValue(userId: string, expiresAt: number) { const payload = `${userId}.${expiresAt}`; return `${payload}.${crypto.createHmac('sha256', adminSessionSecret()).update(payload).digest('hex')}` }
export function hasAdminSession(request: NextRequest, userId: string) { if (!isAdminSessionConfigured()) return false; const raw = request.cookies.get(adminCookie)?.value || ''; const [sessionUser, expiry, signature] = raw.split('.'); if (!sessionUser || sessionUser !== userId || !expiry || !signature || !/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false; const expected = adminSessionValue(sessionUser, Number(expiry)).split('.').pop() || ''; const actualBytes = Uint8Array.from(Buffer.from(signature)); const expectedBytes = Uint8Array.from(Buffer.from(expected)); return actualBytes.length === expectedBytes.length && crypto.timingSafeEqual(actualBytes, expectedBytes) }
export const ADMIN_SESSION_COOKIE = adminCookie
