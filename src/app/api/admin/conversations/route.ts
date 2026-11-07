import { NextRequest, NextResponse } from 'next/server'
import { authenticate, isAdmin, hasAdminSession, requireSameOrigin } from '../../_auth'
import { adminConversations, adminMessages, adminProfiles, adminConversationStats, listAdmins, lookupTelegramUser, upsertAdmin, deleteAdmin, markProfileOfflineBefore } from '../../../../lib/storage'
import { validTelegramId } from '../../../../lib/input-security'
export async function GET(request: NextRequest) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  try { const url = new URL(request.url); const id = url.searchParams.get('conversation_id'); const view = url.searchParams.get('view'); if (view === 'admins') return NextResponse.json({ admins: await listAdmins() }); if (view === 'profiles') { await markProfileOfflineBefore(new Date(Date.now() - 5 * 60 * 1000).toISOString()); return NextResponse.json({ profiles: await adminProfiles(), stats: await adminConversationStats() }) } await markProfileOfflineBefore(new Date(Date.now() - 5 * 60 * 1000).toISOString()); return NextResponse.json(id ? { messages: await adminMessages(id) } : { conversations: await adminConversations(), profiles: await adminProfiles(), stats: await adminConversationStats(), admins: await listAdmins() }) } catch { return NextResponse.json({ error: 'Espace administrateur indisponible.' }, { status: 503 }) }
}
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || ''); if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  const body = await request.json().catch(() => null); let telegramId = ''; try { telegramId = validTelegramId(body?.telegram_id) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  try { const profile = await lookupTelegramUser(telegramId); return NextResponse.json({ admin: await upsertAdmin(profile) }) } catch { return NextResponse.json({ error: 'Administrateur impossible à enregistrer.' }, { status: 503 }) }
}
export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || ''); if (!(await isAdmin(userId)) || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  let telegramId = ''; try { telegramId = validTelegramId(new URL(request.url).searchParams.get('telegram_id')) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) } if (telegramId === userId) return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre accès.' }, { status: 400 })
  try { return NextResponse.json(await deleteAdmin(telegramId)) } catch { return NextResponse.json({ error: 'Administrateur impossible à supprimer.' }, { status: 503 }) }
}
