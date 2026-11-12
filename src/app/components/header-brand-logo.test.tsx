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

  it('keeps the desktop welcome title sizing contract', () => {
    expect(css).toMatch(/\.hero-title\s*\{\s*font-size:clamp\(32px,8\.925vw,53px\)/)
    expect(css).toMatch(/@media \(min-width:900px\) and \(max-height:700px\) \{ \.content \{ padding-top:66px; \} \.hero-title \{ font-size:41px; \} \}/)
  })

  it('provides an accessible close control for the Michelle conversation', () => {
    expect(page).toContain('className="chat-sheet"')
    expect(page).toContain('className="close-button" type="button" onClick={() => setMichelleOpen(false)} aria-label="Fermer la conversation"><X size={20} />')
  })
})
