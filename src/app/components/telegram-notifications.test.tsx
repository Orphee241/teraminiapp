import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd(), 'src')
const notificationModule = readFileSync(resolve(root, 'modules/notifications/server/notifications.ts'), 'utf8')
const documentRoute = readFileSync(resolve(root, 'app/api/documents/route.ts'), 'utf8')
const paymentRoute = readFileSync(resolve(root, 'app/api/billing/deposits/[id]/route.ts'), 'utf8')
const roleRoute = readFileSync(resolve(root, 'app/api/admin/conversations/route.ts'), 'utf8')
const cancellationRoute = readFileSync(resolve(root, 'app/api/documents/[id]/route.ts'), 'utf8')

describe('Telegram notification delivery boundaries', () => {
  it('uses a durable idempotent outbox and server-only Telegram sender', () => {
    expect(notificationModule).toContain('miniapp_notification_events')
    expect(notificationModule).toContain('miniapp_notification_deliveries')
    expect(notificationModule).toContain('UNIQUE(event_id, recipient_telegram_id)')
    expect(notificationModule).toContain('ON CONFLICT(idempotency_key) DO NOTHING')
    expect(notificationModule).toContain('/sendMessage')
    expect(notificationModule).toContain('TELEGRAM_BOT_TOKEN')
    expect(notificationModule).toContain('AbortSignal.timeout(5000)')
  })

  it('emits only after authoritative payment/document/role transitions', () => {
    expect(paymentRoute).toContain('if (result.newlyCredited)')
    expect(documentRoute).toContain("eventType: 'document.generated'")
    expect(cancellationRoute).toContain("eventType: 'document.cancelled'")
    expect(roleRoute).toContain("eventType: 'role.changed'")
  })
})
