import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const adminPage = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')
const admin = adminPage
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('Terainterface header brand asset', () => {
  it('uses the canonical logo asset instead of the text T in the app header and browser landing', () => {
    expect(page).toContain('src="/terainterface-logo.png"')
    expect(page).toContain('className="brand-mark brand-logo"')
    expect(page).not.toContain('<div className="brand-mark">T</div>')
  })

  it('uses the same logo in both locked and unlocked administration headers', () => {
    expect(admin).not.toContain('<div className="brand-mark">T</div>')
    expect(admin.match(/src="\/terainterface-logo\.png"/g)).toHaveLength(2)
  })

  it('does not render eyebrow labels above page headings', () => {
    expect(page).not.toMatch(/<p className="eyebrow accent">NOS SOLUTIONS<\/p><h2 className="section-title">Services<\/h2>/)
    expect(page).not.toMatch(/<p className="eyebrow accent">ESPACE PERSONNEL<\/p><h2 className="section-title">Mon compte<\/h2>/)
    expect(adminPage).not.toMatch(/<p className="eyebrow accent">TABLEAU DE BORD<\/p><h2>Vue d’ensemble<\/h2>/)
  })
  it('restores all page headings at a consistent 35px size', () => {
    expect(css).toMatch(/\.hero-title,\.section-title\s*\{[^}]*font-size:35px/)
    expect(css).not.toContain('.screen > .eyebrow + .section-title { display:none; }')
    expect(css).toMatch(/\.admin-header h1\s*\{[^}]*font-size:35px/)
    expect(css).toMatch(/\.admin-intro h2\s*\{[^}]*font-size:35px/)
  })

  it('shows the Michelle close control on desktop only', () => {
    expect(page).toContain('aria-label="Fermer la conversation"')
    expect(css).toMatch(/\.chat-header\s+\.close-button\s*\{\s*display:none;\s*\}/)
    expect(css).toMatch(/@media \(min-width:900px\)[\s\S]*?\.chat-header\s+\.close-button\s*\{\s*display:grid;\s*margin-left:auto;\s*flex:none;\s*\}/)
  })

  it('aligns customer page headings and reduces section titles by twenty percent', () => {
    expect(css).toMatch(/\.content\s*\{[^}]*padding:66px/)
    expect(css).toMatch(/\.screen\s*\{[^}]*max-width:1060px;\s*margin:0 auto/)
    expect(css).not.toMatch(/\.screen\s*>\s*\.eyebrow\s*\+\s*\.section-title\s*\{\s*display:none;\s*\}/)
    expect(css).toMatch(/\.section-title\s*\{\s*font-size:35px/)
  })

  it('uses the same 35px size for the authenticated admin dashboard title', () => {
    expect(css).toMatch(/\.admin-intro h2\s*\{[^}]*font-size:35px/)
  })
})
