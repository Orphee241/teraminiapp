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

  it('aligns the desktop welcome heading with the top of the sidebar logo', () => {
    expect(css).toMatch(/\.content\s*\{[^}]*margin:\s*0\s+auto;[^}]*padding:\s*36px\s+clamp\(32px,6vw,88px\)/)
    expect(css).toMatch(/@media \(min-width:900px\) and \(max-height:700px\) \{ \.content \{ padding-top:36px;/)
  })
})
