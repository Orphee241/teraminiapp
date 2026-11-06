import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('document archive visual layout', () => {
  it('keeps visible spacing between invoice and quote rows', () => {
    expect(css).toMatch(/\.invoice-list\s*\{[^}]*display:\s*grid/)
    expect(css).toMatch(/\.invoice-list\s*\{[^}]*gap:\s*10px/)
  })
})
