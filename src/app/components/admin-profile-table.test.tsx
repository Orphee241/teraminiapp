import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
const admin = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')

describe('admin profile table responsive layout', () => {
  it('keeps the profile table horizontally scrollable inside its panel', () => {
    expect(css).toContain('.profile-table { width:100%; min-width:0; overflow-x:auto; }')
    expect(css).toContain('grid-template-columns:minmax(190px,1.5fr)')
    expect(css).toContain('min-width:760px')
  })

  it('renders status and last connection columns for every profile', () => {
    expect(admin).toContain('>Statut</span>')
    expect(admin).toContain('>Dernière connexion</span>')
    expect(admin).toContain('En ligne')
    expect(admin).toContain('Hors ligne')
    expect(admin).toContain('relativeDate(profile.last_app_visit_at || profile.created_at)')
  })
})
