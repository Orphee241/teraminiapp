import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
const admin = readFileSync(resolve(process.cwd(), 'src/app/adm/page.tsx'), 'utf8')

describe('admin responsive boundaries', () => {
  it('constrains desktop panels and their children to their grid columns', () => {
    expect(css).toContain('.admin-panel { min-width:0; min-height:0; overflow:hidden;')
    expect(css).toContain('.admin-panel > * { min-width:0; max-width:100%; }')
    expect(css).toContain('.admin-table,.profile-table,.conversation-list { width:100%; min-width:0; overflow-x:auto; }')
  })

  it('prevents long admin values and forms from escaping their sections', () => {
    expect(css).toContain('.admin-table-row > * { min-width:0; overflow-wrap:anywhere; word-break:break-word; }')
    expect(css).toContain('.admin-admin-form { width:min(100%,560px); max-width:100%;')
    expect(css).toContain('.admin-admin-form input,.admin-admin-form .primary-button { min-width:0; max-width:100%;')
  })

  it('keeps the three admin panels in a responsive desktop grid', () => {
    expect(css).toContain('.admin-mobile-carousel { display:grid; grid-template-columns:repeat(3,minmax(0,1fr));')
    expect(admin).toContain('className="admin-mobile-carousel"')
  })
})
