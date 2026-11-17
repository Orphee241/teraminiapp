import { describe, expect, it } from 'vitest'
import { canPerform, canAssignRole, type StaffRole } from '../../modules/administration/server/permissions'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const adminPage = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')
const documentListRoute = readFileSync(resolve(process.cwd(), 'src/app/api/documents/route.ts'), 'utf8')
const documentDetailRoute = readFileSync(resolve(process.cwd(), 'src/app/api/documents/[id]/route.ts'), 'utf8')
const profileRoute = readFileSync(resolve(process.cwd(), 'src/app/api/profile/route.ts'), 'utf8')
const adminRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/conversations/route.ts'), 'utf8')

describe('Teraminiapp staff role policy', () => {
  const roles: StaffRole[] = ['admin', 'manager', 'operator', 'supervisor']

  it.each(roles)('%s cannot permanently delete records', role => {
    expect(canPerform(role, 'delete')).toBe(false)
  })

  it('allows only Admin to cancel a document with a reason', () => {
    expect(canPerform('admin', 'cancel')).toBe(true)
    expect(canPerform('manager', 'cancel')).toBe(false)
    expect(canPerform('operator', 'cancel')).toBe(false)
    expect(canPerform('supervisor', 'cancel')).toBe(false)
  })

  it('gives Manager, Operator, and Admin read/write/update but keeps Supervisor read-only', () => {
    for (const role of ['admin', 'manager', 'operator'] as const) {
      expect(canPerform(role, 'read')).toBe(true)
      expect(canPerform(role, 'create')).toBe(true)
      expect(canPerform(role, 'update')).toBe(true)
    }
    expect(canPerform('supervisor', 'read')).toBe(true)
    expect(canPerform('supervisor', 'create')).toBe(false)
    expect(canPerform('supervisor', 'update')).toBe(false)
  })

  it('limits role assignment to Admin and Manager and constrains Manager assignments', () => {
    expect(canAssignRole('admin', 'admin')).toBe(true)
    expect(canAssignRole('admin', 'manager')).toBe(true)
    expect(canAssignRole('manager', 'manager')).toBe(true)
    expect(canAssignRole('manager', 'operator')).toBe(true)
    expect(canAssignRole('manager', 'admin')).toBe(false)
    expect(canAssignRole('manager', 'supervisor')).toBe(false)
    expect(canAssignRole('operator', 'operator')).toBe(false)
    expect(canAssignRole('supervisor', 'operator')).toBe(false)
  })

  it('shows online status with a green light and a role selector in the profile detail', () => {
    expect(adminPage).toContain('profile-detail-role')
    expect(adminPage).toContain('aria-label="Rôle utilisateur"')
    expect(adminPage).toContain('className="online-dot"')
    expect(adminPage).toContain('Admin')
    expect(adminPage).toContain('Manager')
    expect(adminPage).toContain('Opérateur')
    expect(adminPage).toContain('Superviseur')
  })

  it('enforces owner-scoped document and profile permissions in API routes', () => {
    expect(documentListRoute).toContain("staffPermission(checked.owner, 'read')")
    expect(documentListRoute).toContain("staffPermission(checked.owner, 'create')")
    expect(documentListRoute).toContain("const isInternalTerainterfaceMember = Boolean(actorRole && target === checked.owner)")
    expect(documentListRoute).toContain("const usedToday = isInternalTerainterfaceMember ? 0 : await dailyDocumentUsage(target, documentType)")
    expect(documentListRoute).toContain("if (!isInternalTerainterfaceMember && usedToday >= freeLimit)")
    expect(documentDetailRoute).toContain("staffPermission(owner, 'read')")
    expect(documentDetailRoute).toContain("staffPermission(owner, 'update')")
    expect(documentDetailRoute).toContain('La suppression définitive est désactivée')
    expect(profileRoute).toContain("staffPermission(userId, 'update')")
    const conversationsRoute = readFileSync(resolve(process.cwd(), 'src/app/api/conversations/route.ts'), 'utf8')
    expect(conversationsRoute).toContain("staffPermission(userId, 'read')")
    expect(conversationsRoute).toContain("staffPermission(userId, 'create')")
    expect(conversationsRoute).toContain("staffPermission(userId, 'update')")
    expect(conversationsRoute).toContain("staffPermission(userId, 'delete')")
  })

  it('requires admin-only cancellation with a reason and blocks permanent document deletion', () => {
    expect(documentDetailRoute).toContain("staffPermission(actor, 'cancel') !== true")
    expect(documentDetailRoute).toContain('reason.length > 1000')
    expect(documentDetailRoute).toContain('/cancel?owner_telegram_id=')
    expect(documentDetailRoute).toContain('La suppression définitive est désactivée')
  })
})
