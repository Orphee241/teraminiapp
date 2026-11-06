import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('admin responsive layout regression', () => {
  it('keeps statistic cards visibly separated from the mobile carousel panels', () => {
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*display:\s*grid/)
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*gap:\s*16px/)
    expect(css).toMatch(/\.stat-grid\s*\{[^}]*margin-bottom:\s*42px/)
    expect(css).toMatch(/\.admin-mobile-carousel\s*\{[^}]*gap:\s*18px/)
    expect(css).toMatch(/\.admin-mobile-carousel\s*>\s*\.admin-panel\s*\{[^}]*margin-top:\s*0/)
    expect(css).toMatch(/\.admin-panel\s*\{[^}]*margin-top:\s*0/)
  })

  it('constrains the add-admin form and prevents mobile flex/grid overflow', () => {
    expect(css).toMatch(/\.admin-admin-form\s*\{[^}]*max-width:\s*560px/)
    expect(css).toMatch(/\.admin-admin-form\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.admin-admin-form\s*\{[^}]*box-sizing:\s*border-box/)
    expect(css).toMatch(/\.admin-mobile-carousel\s*>\s*\.admin-panel\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.admin-admin-form\s+\.primary-button\s*\{[^}]*overflow-wrap:\s*anywhere/)
  })

  it('keeps invoice creation below Telegram chrome at every narrow-screen override', () => {
    expect(css).toMatch(/\.sheet-backdrop\s*\{[^}]*padding:\s*calc\(12px\s*\+\s*var\(--telegram-top-inset\)\)/)
    expect(css).toMatch(/\.form-sheet\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*var\(--telegram-top-inset\)\s*-\s*24px\)/)
    expect(css).toMatch(/\.sheet-backdrop\s*\{\s*align-items:\s*flex-start;\s*padding:\s*calc\(8px\s*\+\s*var\(--telegram-top-inset\)\)/)
    expect(css).toMatch(/\.form-sheet\s*\{\s*width:\s*100%;\s*max-height:\s*calc\(100dvh\s*-\s*var\(--telegram-top-inset\)\s*-\s*16px\)/)
  })

  it('keeps the document submit action reachable after long mobile forms', () => {
    expect(css).toMatch(/\.form-sheet form\s*\{[^}]*padding-bottom:\s*32px/)
    expect(css).toMatch(/\.form-sheet form \.primary-button\s*\{[^}]*position:\s*sticky/)
    expect(css).toMatch(/\.form-sheet form \.primary-button\s*\{[^}]*bottom:\s*12px/)
  })
})