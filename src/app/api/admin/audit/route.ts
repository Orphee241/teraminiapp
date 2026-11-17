import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasAdminSession, userStaffRole } from '../../_auth'
import { adminAuditLog } from '../../../../modules/administration/server/repository'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const actor = String(auth.user?.id || '')
  const role = await userStaffRole(actor)
  if (!role || !hasAdminSession(request, actor)) return NextResponse.json({ error: 'Accès au journal refusé.' }, { status: 403 })
  const limit = Number(request.nextUrl.searchParams.get('limit') || 200)
  try { return NextResponse.json({ events: await adminAuditLog(Number.isFinite(limit) ? limit : 200), actor_role: role }) }
  catch { return NextResponse.json({ error: 'Journal momentanément indisponible.' }, { status: 503 }) }
}
