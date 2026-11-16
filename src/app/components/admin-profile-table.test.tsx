import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
const admin = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')

describe('admin profile table responsive layout', () => {
  it('fits compact profile identity and activity columns without horizontal scrolling', () => {
    expect(css).toContain('.profile-table { width:100%; min-width:0; overflow:visible; }')
    expect(css).toContain('grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)')
    expect(css).toContain('.profile-table-head,.profile-card { min-width:0; }')
    expect(css).toContain('.profile-card,.conversation-card { min-width:0; max-width:100%; overflow:hidden; }')
  })

  it('renders status and last connection columns for every profile', () => {
    expect(admin).toContain('>Statut / dernière connexion</span>')
    expect(admin).not.toContain('<span>Statut</span><span>Dernière connexion</span><span>Action</span>')
    expect(admin).toContain('En ligne')
    expect(admin).toContain('Hors ligne')
    expect(admin).toContain('relativeDate(profile.last_app_visit_at || profile.created_at)')
    expect(admin).toContain('onClick={() => setSelectedProfile(profile)}')
    const recentUsersSection = admin.slice(admin.indexOf('<h3>Utilisateurs récents</h3>'), admin.indexOf('<h3>Conversations</h3>'))
    expect(recentUsersSection).not.toContain('conversation_count')
    expect(recentUsersSection).not.toContain('Ajouter admin')
  })
})
