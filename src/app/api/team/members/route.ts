import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin, userStaffRole } from '../../_auth'
import { isStaffRole } from '../../../../modules/administration/server/permissions'
import { listOrganizationMembers, revokeOrganizationMember, upsertOrganizationMember } from '../../../../modules/teams/server/team-repository'
import { enqueueTelegramNotification } from '../../../../modules/notifications/server/notifications'
import { validTelegramId } from '../../../../lib/input-security'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'

async function ownerAuth(request: NextRequest) {
  const checked = await authenticate(request)
  if (checked.response) return { response: checked.response, actor: '' }
  const actor = String(checked.user?.id || '')
  if (await userStaffRole(actor)) return { response: NextResponse.json({ error: 'Les membres internes Terainterface ne gèrent pas une équipe cliente.' }, { status: 403 }), actor }
  return { response: null, actor }
}

export async function GET(request: NextRequest) {
  const checked = await ownerAuth(request)
  if (checked.response) return checked.response
  try { return NextResponse.json({ members: await listOrganizationMembers(checked.actor) }) }
  catch { return NextResponse.json({ error: 'Équipe momentanément indisponible.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await ownerAuth(request)
  if (checked.response) return checked.response
  let body: unknown
  try { body = await readBoundedJson(request, 4096) } catch (error) { return NextResponse.json({ error: error instanceof RequestBodyLimitError ? 'Demande trop volumineuse.' : 'Données invalides.' }, { status: 400 }) }
  const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  let memberId = ''
  try { memberId = validTelegramId(payload.telegram_id) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  if (!isStaffRole(payload.role)) return NextResponse.json({ error: 'Rôle d’équipe invalide.' }, { status: 400 })
  if (memberId === checked.actor) return NextResponse.json({ error: 'Le propriétaire est déjà administrateur de son équipe.' }, { status: 400 })
  try {
    const member = await upsertOrganizationMember(checked.actor, checked.actor, memberId, payload.role)
    void enqueueTelegramNotification({ recipientId: memberId, eventType: 'role.changed', entityType: 'user', entityId: memberId, idempotencyKey: `client-team.role:${checked.actor}:${memberId}:${payload.role}`, title: 'Accès à une équipe', body: `Vous avez été ajouté à l’équipe cliente avec le rôle : ${payload.role}.`, appUrl: process.env.MINIAPP_PUBLIC_URL || 'https://t.me/Terainterface_bot?startapp' })
    return NextResponse.json({ member }, { status: 201 })
  } catch { return NextResponse.json({ error: 'Impossible d’ajouter ce membre à l’équipe.' }, { status: 403 }) }
}

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await ownerAuth(request)
  if (checked.response) return checked.response
  let memberId = ''
  try { memberId = validTelegramId(new URL(request.url).searchParams.get('telegram_id')) } catch { return NextResponse.json({ error: 'Identifiant Telegram invalide.' }, { status: 400 }) }
  try { await revokeOrganizationMember(checked.actor, checked.actor, memberId); void enqueueTelegramNotification({ recipientId: memberId, eventType: 'role.changed', entityType: 'user', entityId: memberId, idempotencyKey: `client-team.revoke:${checked.actor}:${memberId}:${Date.now()}`, title: 'Accès équipe retiré', body: 'Votre accès à cette équipe cliente a été retiré.', appUrl: process.env.MINIAPP_PUBLIC_URL || 'https://t.me/Terainterface_bot?startapp' }); return NextResponse.json({ ok: true }) }
  catch { return NextResponse.json({ error: 'Impossible de retirer ce membre.' }, { status: 403 }) }
}
