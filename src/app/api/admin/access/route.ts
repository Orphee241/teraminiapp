import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { authenticate, isAdmin, adminSessionValue, ADMIN_SESSION_COOKIE, hasAdminSession, telegramProfile, requireSameOrigin, isAdminSessionConfigured } from '../../_auth'
import { listAdmins, upsertAdmin } from '../../../../lib/storage'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { resetRateLimit, takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit, resetPersistentRateLimitForUser } from '../../../../lib/request-security'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (!takeRateLimit(`admin-access:user:${userId}`, 120, 60_000) || !takeRateLimit('admin-access:global', 3000, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-access', 120, 3000, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Service administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const allowed = await isAdmin(userId)
  if (allowed) { try { await upsertAdmin(telegramProfile(auth.user!)) } catch { /* Access remains governed by the existing allow-list. */ } }
  const unlocked = allowed && hasAdminSession(request, userId)
  const response = NextResponse.json({ allowed, unlocked })
  if (unlocked) response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' })
  return response
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  if (!isAdminSessionConfigured()) return NextResponse.json({ error: 'Service administrateur momentanément indisponible.' }, { status: 503 })
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  const userBucket = `admin-login:user:${userId}`
  if (!takeRateLimit(userBucket, 5, 15 * 60_000) || !takeRateLimit('admin-login:global', 80, 15 * 60_000)) return NextResponse.json({ error: 'Accès administrateur momentanément limité. Réessayez plus tard.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-login', 5, 80, 15 * 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Service administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Accès administrateur momentanément limité. Réessayez plus tard.' }, { status: 429 })
  let body: unknown
  try { body = await readBoundedJson(request, 4096) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Demande trop volumineuse.' : 'Demande invalide.' }, { status: tooLarge ? 413 : 400 }) }
  const supplied = body && typeof body === 'object' && 'password' in body && typeof body.password === 'string' ? body.password : ''; const configured = process.env.TERAMINI_ADMIN_PASSWORD || ''
  const allowed = await isAdmin(userId)
  let bootstrapAllowed = false
  if (!allowed) {
    const configuredIds = String(process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(value => value.trim()).filter(Boolean)
    const existingAdmins = await listAdmins()
    // Secure first-admin bootstrap: only the holder of the server-side admin
    // password can claim an empty administrator table. Existing admin setups
    // remain closed to unknown Telegram accounts.
    bootstrapAllowed = !configuredIds.length && existingAdmins.length === 0
  }
  const suppliedBytes = Uint8Array.from(Buffer.from(supplied)); const configuredBytes = Uint8Array.from(Buffer.from(configured))
  const passwordMatches = Boolean(configuredBytes.length && suppliedBytes.length > 0 && suppliedBytes.length === configuredBytes.length && crypto.timingSafeEqual(suppliedBytes, configuredBytes))
  if (!passwordMatches || (!allowed && !bootstrapAllowed)) return NextResponse.json({ error: 'Identifiants administrateur invalides.' }, { status: 401 })
  if (!allowed) await upsertAdmin({ telegram_id: userId, username: auth.user?.username || '', first_name: auth.user?.first_name || '', last_name: auth.user?.last_name || '' })
  resetRateLimit(userBucket)
  await resetPersistentRateLimitForUser(userId, 'admin-login').catch(() => undefined)
  const response = NextResponse.json({ ok: true }); response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' }); return response
}