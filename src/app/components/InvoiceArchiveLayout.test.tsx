import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('document archive visual layout', () => {
  it('keeps archive rows compact without rendering the document status label', () => {
    expect(css).toMatch(/\.invoice-page\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.invoice-row\s*\{[^}]*min-width:\s*0/)
    expect(css).toMatch(/\.invoice-row\s*>\s*span:nth-child\(2\)\s*\{[^}]*overflow:\s*hidden/)
    expect(css).toMatch(/\.invoice-row strong\s*\{[^}]*text-overflow:\s*ellipsis/)
    expect(css).not.toMatch(/\.invoice-row-status\s*\{/)
  })
})
