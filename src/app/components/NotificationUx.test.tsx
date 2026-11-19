import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
const constants = fs.readFileSync(path.join(process.cwd(), 'src/lib/notification-constants.ts'), 'utf8')
const workspace = fs.readFileSync(path.join(process.cwd(), 'src/app/components/TeraDocWorkspace.tsx'), 'utf8')
const center = fs.readFileSync(path.join(process.cwd(), 'src/app/components/TeraDocCenter.tsx'), 'utf8')

const notificationSelectors = ['.toast', '.form-message', '.teradoc-inline-notice']

describe('global notification UX', () => {
  it('uses one exact eight-second dismissal constant for app notices', () => {
    expect(constants).toContain('NOTIFICATION_DISMISS_MS = 8_000')
    expect(constants).not.toMatch(/setTimeout\([^\n]*,\s*(?!NOTIFICATION_DISMISS_MS)\d{3,}/)
    expect(workspace).toContain('NOTIFICATION_DISMISS_MS')
    expect(center).toContain('NOTIFICATION_DISMISS_MS')
  })

  it('keeps notification surfaces intrinsic, bounded, and wrapping', () => {
    for (const selector of notificationSelectors) expect(css).toMatch(new RegExp(`${selector.replace('.', '\\.')}[^}]*width:\s*max-content`))
    expect(css).toMatch(/\.notification-surface[^}]*max-width:min\(420px,calc\(100vw - 32px\)\)/)
    expect(css).toMatch(/\.notification-surface[^}]*overflow-wrap:anywhere/)
  })

  it('increases notification text by five pixels on mobile only', () => {
    expect(css).toMatch(/@media\s*\(max-width:650px\)[^}]*\.notification-surface[^}]*font-size:calc\(13px \+ 5px\)/s)
  })
})
