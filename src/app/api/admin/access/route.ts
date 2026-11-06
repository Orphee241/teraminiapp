import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { authenticate, isAdmin, adminSessionValue, ADMIN_SESSION_COOKIE, hasAdminSession, telegramProfile } from '../../_auth'
import { listAdmins, upsertAdmin } from '../../../../lib/storage'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  const allowed = await isAdmin(userId)
  if (allowed) { try { await upsertAdmin(telegramProfile(auth.user!)) } catch { /* Access remains governed by the existing allow-list. */ } }
  const unlocked = allowed && hasAdminSession(request, userId)
  const response = NextResponse.json({ allowed, unlocked })
  if (unlocked) response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' })
  return response
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  const body = await request.json().catch(() => ({})) as { password?: string }; const supplied = String(body.password || ''); const configured = process.env.TERAMINI_ADMIN_PASSWORD || ''
  const allowed = await isAdmin(userId)
  if (!allowed) {
    const configuredIds = String(process.env.TERAMINI_ADMIN_TELEGRAM_IDS || '').split(',').map(value => value.trim()).filter(Boolean)
    const existingAdmins = await listAdmins()
    // Secure first-admin bootstrap: only the holder of the server-side admin
    // password can claim an empty administrator table. Existing admin setups
    // remain closed to unknown Telegram accounts.
    if (configuredIds.length || existingAdmins.length) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 })
  }
  if (!configured || supplied.length !== configured.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
  if (!allowed) await upsertAdmin({ telegram_id: userId, username: auth.user?.username || '', first_name: auth.user?.first_name || '', last_name: auth.user?.last_name || '' })
  const response = NextResponse.json({ ok: true }); response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' }); return response
}