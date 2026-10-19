import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { authenticate, isAdmin, adminSessionValue, ADMIN_SESSION_COOKIE, hasAdminSession } from '../../_auth'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  const allowed = await isAdmin(userId)
  const unlocked = allowed && hasAdminSession(request, userId)
  const response = NextResponse.json({ allowed, unlocked })
  if (unlocked) response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' })
  return response
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || ''); if (!(await isAdmin(userId))) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 })
  const body = await request.json().catch(() => ({})) as { password?: string }; const supplied = String(body.password || ''); const configured = process.env.TERAMINI_ADMIN_PASSWORD || ''
  if (!configured || supplied.length !== configured.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(configured))) return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 })
  const response = NextResponse.json({ ok: true }); response.cookies.set(ADMIN_SESSION_COOKIE, adminSessionValue(userId, Date.now() + 30 * 60 * 1000), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' }); return response
}