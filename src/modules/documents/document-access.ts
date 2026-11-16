import { canPerform, type StaffAction, type StaffRole } from '../administration/server/permissions'

export function resolveDocumentOwner(actorId: string, requestedOwner: string | null | undefined, role: StaffRole | null, action: StaffAction) {
  if (!role) return { owner: actorId, allowed: true }
  if (!canPerform(role, action)) return { owner: actorId, allowed: false }
  const target = (requestedOwner || '').trim()
  if (!target) return { owner: actorId, allowed: true }
  if (!/^\d{1,20}$/.test(target)) return { owner: actorId, allowed: false }
  return { owner: target, allowed: true }
}
