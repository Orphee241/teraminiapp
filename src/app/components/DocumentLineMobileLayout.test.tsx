import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('mobile document line layout', () => {
  it('keeps designation, quantity, and unit price on separate full-width rows', () => {
    const mobileRules = Array.from(css.matchAll(/@media \(max-width: 460px\) \{([\s\S]*?)\n\}/g))
    const mobileRule = mobileRules.at(-1)?.[1] ?? ''

    expect(mobileRule).toMatch(/\.document-line\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/)
    expect(mobileRule).toMatch(/\.document-line\s*\{[^}]*grid-template-areas:\s*"number"\s*"designation"\s*"quantity"\s*"price"\s*"actions"/)
  })
})
