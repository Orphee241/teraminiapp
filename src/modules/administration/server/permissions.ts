export const STAFF_ROLES = ['admin', 'manager', 'operator', 'supervisor'] as const
export type StaffRole = typeof STAFF_ROLES[number]
export type StaffAction = 'read' | 'create' | 'update' | 'delete' | 'cancel' | 'assign-role'

const permissions: Record<StaffRole, ReadonlySet<StaffAction>> = {
  admin: new Set<StaffAction>(['read', 'create', 'update', 'cancel', 'assign-role']),
  manager: new Set<StaffAction>(['read', 'create', 'update', 'assign-role']),
  operator: new Set<StaffAction>(['read', 'create', 'update']),
  supervisor: new Set<StaffAction>(['read']),
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value)
}

export function canPerform(role: StaffRole, action: StaffAction): boolean {
  return permissions[role].has(action)
}

export function canAssignRole(actorRole: StaffRole, targetRole: StaffRole): boolean {
  if (!canPerform(actorRole, 'assign-role')) return false
  return actorRole === 'admin' || targetRole === 'manager' || targetRole === 'operator'
}
