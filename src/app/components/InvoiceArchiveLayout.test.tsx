import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('document archive visual layout', () => {
  it('bounds document rows and truncates long identifiers and statuses on mobile', () => {
    expect(css).toMatch(/\.invoice-page\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.invoice-row\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.invoice-row\s*>\s*span:nth-child\(2\)\s*\{[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.invoice-row strong\s*\{[^}]*text-overflow:\s*ellipsis/)
    expect(css).toMatch(/\.invoice-row-status\s*\{[^}]*max-width:\s*28%/)
    expect(css).toMatch(/\.invoice-row-status\s*\{[^}]*text-overflow:\s*ellipsis/)
  })

})
