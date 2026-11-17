import crypto from 'node:crypto'
import { ensureSchema, query } from '../../../lib/storage'
import type { StaffRole } from '../../administration/server/permissions'

export type TeamScope = 'client'

let teamSchemaReady: Promise<void> | null = null

async function ensureTeamSchema() {
  if (teamSchemaReady) return teamSchemaReady
  teamSchemaReady = (async () => {
    await ensureSchema()
    await query(`CREATE TABLE IF NOT EXISTS miniapp_organizations (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL CHECK(scope IN ('client')),
      owner_telegram_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await query(`CREATE TABLE IF NOT EXISTS miniapp_organization_memberships (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES miniapp_organizations(id),
      telegram_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','operator','supervisor')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
      assigned_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(organization_id, telegram_id)
    )`)
    await query('CREATE INDEX IF NOT EXISTS idx_miniapp_org_members_org_status ON miniapp_organization_memberships(organization_id, status)')
  })().catch(error => { teamSchemaReady = null; throw error })
  return teamSchemaReady
}

export async function ensureClientOrganization(ownerTelegramId: string, name = '') {
  if (!/^\d{1,20}$/.test(ownerTelegramId)) throw new Error('invalid_owner')
  await ensureTeamSchema()
  const now = new Date().toISOString()
  const organizationId = `client:${ownerTelegramId}`
  await query(`INSERT INTO miniapp_organizations (id,scope,owner_telegram_id,name,created_at,updated_at)
    VALUES (?,?,?,?,?,?) ON CONFLICT(owner_telegram_id) DO UPDATE SET name=CASE WHEN excluded.name <> '' THEN excluded.name ELSE miniapp_organizations.name END,updated_at=excluded.updated_at`, [organizationId, 'client', ownerTelegramId, name.slice(0, 160), now, now])
  await query(`INSERT INTO miniapp_organization_memberships (id,organization_id,telegram_id,role,status,assigned_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(organization_id,telegram_id) DO UPDATE SET status='active',role='admin',updated_at=excluded.updated_at`, [crypto.randomUUID(), organizationId, ownerTelegramId, 'admin', 'active', ownerTelegramId, now, now])
  return organizationId
}

export async function listOrganizationMembers(ownerTelegramId: string) {
  const organizationId = await ensureClientOrganization(ownerTelegramId)
  return query(`SELECT m.telegram_id,m.role,m.status,m.assigned_by,m.created_at,p.username,p.first_name,p.last_name
    FROM miniapp_organization_memberships m LEFT JOIN miniapp_profiles p ON p.telegram_id=m.telegram_id
    WHERE m.organization_id=? AND m.status='active' ORDER BY m.created_at ASC`, [organizationId])
}

export async function upsertOrganizationMember(ownerTelegramId: string, actorTelegramId: string, memberTelegramId: string, role: StaffRole) {
  if (!/^\d{1,20}$/.test(memberTelegramId)) throw new Error('invalid_member')
  const organizationId = await ensureClientOrganization(ownerTelegramId)
  const members = await query('SELECT role FROM miniapp_organization_memberships WHERE organization_id=? AND telegram_id=? AND status=\'active\' LIMIT 1', [organizationId, actorTelegramId])
  if (String(members[0]?.role || '') !== 'admin' || actorTelegramId !== ownerTelegramId) throw new Error('team_admin_required')
  const now = new Date().toISOString()
  await query(`INSERT INTO miniapp_organization_memberships (id,organization_id,telegram_id,role,status,assigned_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(organization_id,telegram_id) DO UPDATE SET role=excluded.role,status='active',assigned_by=excluded.assigned_by,updated_at=excluded.updated_at`, [crypto.randomUUID(), organizationId, memberTelegramId, role, 'active', actorTelegramId, now, now])
  return { telegram_id: memberTelegramId, role, organization_id: organizationId }
}

export async function revokeOrganizationMember(ownerTelegramId: string, actorTelegramId: string, memberTelegramId: string) {
  const organizationId = await ensureClientOrganization(ownerTelegramId)
  if (actorTelegramId !== ownerTelegramId || memberTelegramId === ownerTelegramId) throw new Error('team_admin_required')
  await query("UPDATE miniapp_organization_memberships SET status='revoked',updated_at=? WHERE organization_id=? AND telegram_id=?", [new Date().toISOString(), organizationId, memberTelegramId])
}

export async function notificationRecipientsForOwner(ownerTelegramId: string): Promise<string[]> {
  const organizationId = await ensureClientOrganization(ownerTelegramId)
  const rows = await query(`SELECT telegram_id,role FROM miniapp_organization_memberships
    WHERE organization_id=? AND status='active' AND role IN ('admin','manager','supervisor')`, [organizationId])
  const recipients = (rows as Array<Record<string, unknown>>).map((row: Record<string, unknown>) => String(row.telegram_id || '')).filter((id: string) => /^\d{1,20}$/.test(id))
  return Array.from(new Set(recipients.length ? recipients : [ownerTelegramId]))
}
