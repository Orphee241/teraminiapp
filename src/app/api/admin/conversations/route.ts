import { NextRequest, NextResponse } from 'next/server'
import { authenticate, userStaffRole, isTelegramAdmin, hasAdminSession, requireSameOrigin } from '../../_auth'
import { adminConversations, adminMessages, adminProfiles, adminConversationStats, listAdmins, lookupTelegramUser, upsertAdmin, assignUserRole, markProfileOfflineBefore, recordAuditEvent, deleteAdminRole } from '../../../../modules/administration/server/repository'
import { canAssignRole, isStaffRole } from '../../../../modules/administration/server/permissions'
import { validTelegramId } from '../../../../lib/input-security'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'
export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  const role = await userStaffRole(userId)
  if (!role) return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 })
  if (!hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (!takeRateLimit(`admin-read:user:${userId}`, 120, 60_000) || !takeRateLimit('admin-read:global', 3000, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-read', 120, 3000, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Espace administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('conversation_id')
    const view = url.searchParams.get('view')
    if (view === 'admins') return NextResponse.json({ admins: await listAdmins() })
    await markProfileOfflineBefore(new Date(Date.now() - 5 * 60 * 1000).toISOString())
    return NextResponse.json(id
      ? { messages: role === 'supervisor' ? [] : await adminMessages(id), actor_role: role }
      : { conversations: await adminConversations(), profiles: await adminProfiles(), stats: await adminConversationStats(), admins: await listAdmins(), actor_role: role })
  } catch { return NextResponse.json({ error: 'Espace administrateur indisponible.' }, { status: 503 }) }
}

export async function PATCH(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const actorId = String(auth.user?.id || '')
  const actorRole = await userStaffRole(actorId)
  if (!actorRole || !hasAdminSession(request, actorId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (!takeRateLimit(`admin-role:user:${actorId}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de changements de rôle rapprochés.' }, { status: 429 })
  let body: unknown
  try { body = await readBoundedJson(request, 4096) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Demande trop volumineuse.' : 'Données invalides.' }, { status: tooLarge ? 413 : 400 }) }
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  let telegramId = ''
  try { telegramId = validTelegramId(payload.telegram_id) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  if (telegramId === actorId) return NextResponse.json({ error: 'Vous ne pouvez pas modifier votre propre rôle.' }, { status: 403 })
  if (isTelegramAdmin(telegramId)) return NextResponse.json({ error: 'Le rôle du titulaire principal ne peut pas être modifié ici.' }, { status: 403 })
  if (!isStaffRole(payload.role) || !canAssignRole(actorRole, payload.role)) return NextResponse.json({ error: 'Vous ne pouvez pas attribuer ce rôle.' }, { status: 403 })
  try { const result = await assignUserRole(telegramId, payload.role, actorId); await recordAuditEvent({ actorId, actorRole, action: 'staff.role.assign', targetType: 'user', targetId: telegramId, metadata: { role: payload.role } }); return NextResponse.json({ user: result }) }
  catch { return NextResponse.json({ error: 'Utilisateur introuvable ou rôle impossible à enregistrer.' }, { status: 404 }) }
}
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (await userStaffRole(userId) !== 'admin' || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Seul un Admin peut créer un accès Admin.' }, { status: 403 })
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
  const userId = String(auth.user?.id || '')
  const actorRole = await userStaffRole(userId)
  if (!actorRole || !hasAdminSession(request, userId)) return NextResponse.json({ error: 'Authentification Administration requise.' }, { status: 403 })
  if (actorRole !== 'admin') return NextResponse.json({ error: 'Seul un Admin peut modifier les accès Admin.' }, { status: 403 })
  if (!takeRateLimit(`admin-change:user:${userId}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de suppressions rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'admin-change', 20, 600, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Espace administrateur momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de suppressions rapprochées.' }, { status: 429 })
  let telegramId = ''
  try { telegramId = validTelegramId(new URL(request.url).searchParams.get('telegram_id')) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  if (telegramId === userId) return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle.' }, { status: 400 })
  if (isTelegramAdmin(telegramId)) return NextResponse.json({ error: 'Le rôle du titulaire principal ne peut pas être retiré ici.' }, { status: 403 })
  try { await deleteAdminRole(telegramId); await recordAuditEvent({ actorId: userId, actorRole, action: 'staff.role_remove', targetType: 'user', targetId: telegramId }); return NextResponse.json({ ok: true, telegram_id: telegramId, role: null }) }
  catch { return NextResponse.json({ error: 'Rôle impossible à retirer.' }, { status: 404 }) }
}
