import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isStoredAdmin } from '../../lib/storage'

export type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string; language_code?: string; photo_url?: string }

function verifyTelegramInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null
  const params = new URLSearchParams(initData); const hash = params.get('hash'); if (!hash) return null
  params.delete('hash'); const entries: [string, string][] = []; params.forEach((value, key) => entries.push([key, value]))
  const dataCheckString = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest(); const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  if (expected.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null
  const authDate = Number(params.get('auth_date') || 0); if (!authDate || Date.now() / 1000 - authDate > 86400) return null
  try { const user = JSON.parse(params.get('user') || '{}'); return Number.isInteger(user.id) ? user : null } catch { return null }
}

export async function authenticate(request: NextRequest) {
  const initData = request.headers.get('x-telegram-init-data') || ''
  const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || '')
  if (!user && process.env.MINIAPP_DEV_MODE !== 'true') return { response: NextResponse.json({ error: 'Authentification Telegram requise.' }, { status: 401 }), user: null }
  return { response: null, user: user || { id: 0, first_name: 'Utilisateur' } }
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
const adminSessionSecret = () => process.env.TERAMINI_ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || ''
export function isTelegramAdmin(id: string) { return (process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(value => value.trim()).includes(id) }
export async function isAdmin(id: string) { return isTelegramAdmin(id) || await isStoredAdmin(id) }
export function adminSessionValue(userId: string, expiresAt: number) { const payload = `${userId}.${expiresAt}`; return `${payload}.${crypto.createHmac('sha256', adminSessionSecret()).update(payload).digest('hex')}` }
export function hasAdminSession(request: NextRequest, userId: string) { const raw = request.cookies.get(adminCookie)?.value || ''; const [sessionUser, expiry, signature] = raw.split('.'); if (!sessionUser || sessionUser !== userId || !expiry || !signature || Number(expiry) < Date.now()) return false; const expected = adminSessionValue(sessionUser, Number(expiry)).split('.').pop() || ''; return Boolean(adminSessionSecret()) && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) }
export const ADMIN_SESSION_COOKIE = adminCookie
