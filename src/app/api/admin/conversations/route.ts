import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdmin, hasAdminSession, requireSameOrigin } from '../../_auth'
import { adminConversations, adminMessages, adminProfiles, adminConversationStats, listAdmins, lookupTelegramUser, upsertAdmin, deleteAdmin, markProfileOfflineBefore } from '../../../../lib/storage'
import { validTelegramId } from '../../../../lib/input-security'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'
export async function GET(request: NextRequest) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (!takeRateLimit(`admin-read:user:${userId}`, 120, 60_000) || !takeRateLimit('admin-read:global', 3000, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-read', 120, 3000, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Espace administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  try { const url = new URL(request.url); const id = url.searchParams.get('conversation_id'); const view = url.searchParams.get('view'); if (view === 'admins') return NextResponse.json({ admins: await listAdmins() }); if (view === 'profiles') { await markProfileOfflineBefore(new Date(Date.now() - 5 * 60 * 1000).toISOString()); return NextResponse.json({ profiles: await adminProfiles(), stats: await adminConversationStats() }) } await markProfileOfflineBefore(new Date(Date.now() - 5 * 60 * 1000).toISOString()); return NextResponse.json(id ? { messages: await adminMessages(id) } : { conversations: await adminConversations(), profiles: await adminProfiles(), stats: await adminConversationStats(), admins: await listAdmins() }) } catch { return NextResponse.json({ error: 'Espace administrateur indisponible.' }, { status: 503 }) }
}
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || ''); if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (!takeRateLimit(`admin-change:user:${userId}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de modifications rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-change', 20, 600, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Espace administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de modifications rapprochées.' }, { status: 429 })
  let body: unknown
  try { body = await readBoundedJson(request, 4096) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Demande trop volumineuse.' : 'Données invalides.' }, { status: tooLarge ? 413 : 400 }) }
  let telegramId = ''; try { telegramId = validTelegramId(body && typeof body === 'object' && 'telegram_id' in body ? body.telegram_id : undefined) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  try { const profile = await lookupTelegramUser(telegramId); return NextResponse.json({ admin: await upsertAdmin(profile) }) } catch { return NextResponse.json({ error: 'Administrateur impossible à enregistrer.' }, { status: 503 }) }
}
export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || ''); if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (!takeRateLimit(`admin-change:user:${userId}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de suppressions rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-change', 20, 600, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Espace administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de suppressions rapprochées.' }, { status: 429 })
  let telegramId = ''; try { telegramId = validTelegramId(new URL(request.url).searchParams.get('telegram_id')) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) } if (telegramId === userId) return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre accès.' }, { status: 400 })
  try { return NextResponse.json(await deleteAdmin(telegramId)) } catch { return NextResponse.json({ error: 'Administrateur impossible à supprimer.' }, { status: 503 }) }
}
