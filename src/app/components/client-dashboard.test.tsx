import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('client dashboard tabs', () => {
  it('replaces the account subscription entry with a dashboard', () => {
    expect(page).toContain('title="Tableau de bord"')
    expect(page).toContain("type AccountPage = 'menu' | 'dashboard'")
  })

  it('exposes billing and services as accessible dashboard tabs', () => {
    expect(page).toContain('role="tablist" aria-label="Sections du tableau de bord"')
    expect(page).toContain('role="tab" aria-selected={dashboardTab === \'billing\'}')
    expect(page).toContain('role="tab" aria-selected={dashboardTab === \'services\'}')
    expect(page).toContain('>Facturation</button>')
    expect(page).toContain('title="Génération de devis et factures"')
  })

  it('styles the tabs for mobile and desktop without horizontal overflow', () => {
    expect(css).toContain('.dashboard-tabs { display:flex;')
    expect(css).toContain('.dashboard-tabs button[aria-selected="true"]')
    expect(css).toContain('flex:1;')
  })
})
