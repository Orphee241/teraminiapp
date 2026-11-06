import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('admin responsive layout regression', () => {
  it('keeps statistic cards visibly separated from the mobile carousel panels', () => {
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*margin-bottom:\s*30px/)
    expect(css).toMatch(/@media\s*\(max-width:\s*650px\)\s*\{\s*\.stat-grid\s*\{[^}]*margin-bottom:\s*14px/)
    expect(css).toMatch(/\.admin-mobile-carousel\s*\{[^}]*gap:\s*18px/)
  })

  it('keeps the add-admin form at a bounded two-column desktop width and compact mobile width', () => {
    expect(css).toMatch(/\.admin-admin-form\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
    expect(css).toMatch(/\.admin-admin-form\s*\{[^}]*max-width:\s*560px/)
    expect(css).toMatch(/@media\s*\(max-width:\s*650px\)[^{]*\{[^}]*\.admin-admin-form\s*\{[^}]*grid-template-columns:\s*1fr/)
  })

  it('keeps invoice creation below Telegram chrome at every narrow-screen override', () => {
    expect(css).toMatch(/\.sheet-backdrop\s*\{[^}]*padding:\s*calc\(12px\s*\+\s*var\(--telegram-top-inset\)\)/)
    expect(css).toMatch(/\.form-sheet\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--telegram-top-inset\)\s*-\s*24px\)/)
    expect(css).toMatch(/\.sheet-backdrop\s*\{\s*align-items:\s*flex-start;\s*padding:\s*calc\(8px\s*\+\s*var\(--telegram-top-inset\)\)/)
    expect(css).toMatch(/\.form-sheet\s*\{\s*width:\s*100%;\s*max-height:\s*calc\(100dvh\s*-\s*var\(--telegram-top-inset\)\s*-\s*16px\)/)
  })
})
