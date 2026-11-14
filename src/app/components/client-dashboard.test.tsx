import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const invoiceRoute = readFileSync(resolve(process.cwd(), 'src/app/api/billing/deposits/[id]/invoice/route.ts'), 'utf8')
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
    expect(page).toContain('billingPage - 1) * 5')
    expect(page).toContain('billingPageCount > 1')
    expect(page).toContain('Télécharger la facture PDF')
    expect(page).toContain('Détail de la transaction')
    expect(page).toContain('Devis et Factures')
    expect(page).toContain('setSelectedPayment(payment)')
    expect(invoiceRoute).toContain('application/pdf')
    expect(invoiceRoute).toContain("status).toUpperCase() !== 'COMPLETED'")
    expect(page).toContain('invoice_id')
  })

  it('uses French payment status labels and keeps billing and service rows in panels', () => {
    expect(page).toContain("return 'Succès'")
    expect(page).toContain("return 'Échec'")
    expect(page).toContain('dashboard-list')
    expect(page).not.toContain('crédit(s) confirmé(s)')
    expect(page).toContain('Devis et Factures')
  })

  it('styles the dashboard tabs and panels', () => {
    expect(css).toContain('.dashboard-tabs { display:flex;')
    expect(css).toContain('.dashboard-tabs button[aria-selected="true"]')
    expect(css).toContain('flex:1;')
  })
})
