import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const admin = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')
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

  it('keeps the desktop welcome title twenty percent smaller and preserves short-screen spacing', () => {
    expect(css).toMatch(/\.hero-title\s*\{\s*font-size:clamp\(25\.6px,7\.14vw,42\.4px\)/)
    expect(css).toMatch(/@media \(min-width:900px\) and \(max-height:700px\) \{ \.content \{ padding-top:66px; \} \.hero-title \{ font-size:32\.8px; \} \}/)
  })

  it('shows the Michelle close control on desktop only', () => {
    expect(page).toContain('aria-label="Fermer la conversation"')
    expect(css).toMatch(/\.chat-header\s+\.close-button\s*\{\s*display:none;\s*\}/)
    expect(css).toMatch(/@media \(min-width:900px\)[\s\S]*?\.chat-header\s+\.close-button\s*\{\s*display:grid;\s*margin-left:auto;\s*flex:none;\s*\}/)
  })

  it('aligns customer page headings and reduces section titles by twenty percent', () => {
    expect(css).toMatch(/\.content\s*\{[^}]*padding:66px/)
    expect(css).toMatch(/\.screen\s*\{[^}]*max-width:1060px;\s*margin:0 auto/)
    expect(css).toMatch(/\.screen\s*>\s*\.eyebrow\s*\+\s*\.section-title\s*\{\s*display:none;\s*\}/)
    expect(css).toMatch(/\.section-title\s*\{\s*font-size:clamp\(27\.2px,7\.28vw,41\.6px\)/)
  })

  it('reduces authenticated admin dashboard titles by twenty percent', () => {
    expect(css).toMatch(/\.admin-intro h2\s*\{[^}]*font-size:clamp\(41\.6px,6\.4vw,68\.8px\)/)
  })
})
