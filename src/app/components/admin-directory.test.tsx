import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'src')
const storage = readFileSync(resolve(root, 'lib/storage.ts'), 'utf8')
const administration = readFileSync(resolve(root, 'modules/administration/server/infrastructure.ts'), 'utf8')
const adminPage = readFileSync(resolve(root, 'app/adm/page.tsx'), 'utf8')
const adminRoute = readFileSync(resolve(root, 'app/api/admin/conversations/route.ts'), 'utf8')
const accessRoute = readFileSync(resolve(root, 'app/api/admin/access/route.ts'), 'utf8')
const presenceRoute = readFileSync(resolve(root, 'app/api/profile/presence/route.ts'), 'utf8')
const homePage = readFileSync(resolve(root, 'app/page.tsx'), 'utf8')
const auth = readFileSync(resolve(root, 'app/api/_auth.ts'), 'utf8')

describe('admin directory regression contracts', () => {
  it('renders the profile count and connection badge with dedicated breathing room', () => {
    const css = readFileSync(resolve(root, 'app/globals.css'), 'utf8')
    expect(css).toMatch(/\.admin-intro\s*\{[^}]*margin-bottom:\s*24px/)
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*margin-bottom:\s*42px/)
  })

  it('limits administrators, profiles, and conversations to their requested page sizes', () => {
    expect(adminPage).toContain('slice((adminPage - 1) * 4, adminPage * 4)')
    expect(adminPage).toContain('slice((profilePage - 1) * 3, profilePage * 3)')
    expect(adminPage).toContain('slice((conversationPage - 1) * 6, conversationPage * 6)')
    expect(adminPage).toContain('4 par page')
    expect(adminPage).toContain('3 par page')
    expect(adminPage).toContain('6 par page')
  })

  it('adds administrators by ID only and obtains their identity from the stored Telegram profile', () => {
    expect(adminPage).toContain('placeholder="ID Telegram *"')
    expect(adminPage).not.toContain('placeholder="Nom d’utilisateur"')
    expect(adminPage).not.toContain('placeholder="Prénom"')
    expect(adminPage).not.toContain('placeholder="Nom"')
    expect(adminRoute).toContain('lookupTelegramUser(telegramId)')
    expect(administration).toContain('async function lookupTelegramUser(telegramId: string)')
    expect(adminRoute).not.toMatch(/username:\s*String\(body\.username/)
  })

  it('reports online as Now only in Telegram live status window and never from conversation timestamps', () => {
    expect(administration).toContain('CASE WHEN p.last_app_visit_at')
    expect(administration).toContain("(strftime('%s','now') - strftime('%s',p.last_app_visit_at)) >= 0")
    expect(storage).not.toContain('MAX(c.updated_at) AS last_activity')
    expect(adminPage).toContain('const isProfileOnline = (profile: Profile)')
    expect(adminPage).toContain('age >= 0 && age < 5 * 60 * 1000')
    expect(adminPage).toContain("isProfileOnline(profile) ? 'Activité : maintenant'")
  })

  it('keeps profile presence fresh during active customer and admin sessions', () => {
    expect(presenceRoute).toContain('requireSameOrigin(request)')
    expect(presenceRoute).toContain('authenticate(request)')
    expect(presenceRoute).toContain('const profile = telegramProfile(auth.user!)')
    expect(presenceRoute).toContain('await upsertProfile(profile)')
    expect(presenceRoute).toContain('last_app_visit_at = new Date().toISOString()')
    expect(homePage).toContain("fetch('/api/profile/presence'")
    expect(adminPage).toContain("fetch('/api/profile/presence'")
    expect(adminPage).toContain('setInterval(heartbeatAndRefresh, 60_000)')
  })
  it('keeps profile detail in an in-page view and suppresses add-admin action for existing admins', () => {
    expect(adminPage).toContain('const onBack = () =>')
    expect(adminPage).toContain('if (selectedProfile) setSelectedProfile(null)')
    expect(adminPage).toContain("!isProfileAdmin(profile.telegram_id) &&")
    expect(adminPage).toContain('selectedProfile &&')
  })

  it('shows administration only to authorized users and keeps user status plus admin action on each profile row', () => {
    expect(homePage).toContain("const [adminAvailable, setAdminAvailable] = useState(false)")
    expect(homePage).toContain('{adminAvailable && <AccountRow icon={ShieldCheck}')
    expect(adminPage).toContain('aria-label={`Statut de ${displayName(profile)}`')
    expect(adminPage).toContain("? <>En ligne")
    expect(adminPage).toContain('Dernière activité')
    expect(adminPage).toContain('Ajouter admin')
  })

  it('creates the current Telegram user as the primary admin on first authenticated access', () => {
    expect(auth).toContain('export function telegramProfile')
    expect(accessRoute).toContain('upsertAdmin({ telegram_id: userId')
    expect(accessRoute).toContain("auth.user?.username || ''")
  })
})
