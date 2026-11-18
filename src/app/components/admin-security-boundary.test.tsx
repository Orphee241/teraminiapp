import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('admin conversation tenant boundary', () => {
  it('qualifies conversation detail reads with the fixed application and tenant scope', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/modules/administration/server/infrastructure.ts'), 'utf8')
    expect(source).toContain('JOIN miniapp_conversations c ON c.id=m.conversation_id')
    expect(source).toContain("c.application='terainterface-miniapp'")
    expect(source).toContain("c.tenant='terainterface'")
  })
})
