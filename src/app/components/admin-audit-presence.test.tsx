import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(process.cwd(), 'src')
const storage = readFileSync(resolve(root, 'lib/storage.ts'), 'utf8')
const adminRepo = readFileSync(resolve(root, 'modules/administration/server/infrastructure.ts'), 'utf8')
const adminPage = readFileSync(resolve(root, 'app/adm/page.tsx'), 'utf8')
const adminRoute = readFileSync(resolve(root, 'app/api/admin/conversations/route.ts'), 'utf8')
const invoice = readFileSync(resolve(root, 'app/components/InvoiceCenter.tsx'), 'utf8')
const home = readFileSync(resolve(root, 'app/page.tsx'), 'utf8')
describe('presence, audit and cancellation contracts', () => {
  it('uses a server heartbeat window and an audit log table', () => {
    expect(storage).toContain('miniapp_audit_log')
    expect(adminRepo).toContain('adminAuditLog')
    expect(adminPage).toContain('Journal des opérations')
    expect(adminPage).toContain("/api/admin/audit")
    expect(adminPage).toContain('admin-section-tabs')
    expect(adminPage).toContain('aria-label="Onglets administration"')
    expect(adminPage).not.toContain('ESPACE ADMINISTRATION')
    expect(adminPage).not.toContain('Accès, utilisateurs et conversations')
    expect(adminPage).toContain('Journal des opérations')
    expect(adminPage).toContain('audit-grid')
    expect(adminRepo).toContain('actor_name')
    expect(adminRoute).toContain('staff.role.assign')
    expect(invoice).toContain("downloadDisabled={selected.statut === 'annule'}")
    expect(invoice).toContain('watermarkText={selected.statut === \'annule\' ? \'ANNULÉ\' : undefined}')  })
  it('replaces archive deletion with role-gated cancellation and reason', () => {
    expect(invoice).toContain("method: 'POST'")
    expect(invoice).toContain('owner_telegram_id')
    expect(invoice).toContain('Motif')
    expect(invoice).toContain('Annuler le document')
    expect(invoice).not.toContain('Supprimer le')
  })
})
