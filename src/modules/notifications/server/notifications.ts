import crypto from 'node:crypto'
import { ensureSchema, query } from '../../../lib/storage'

export type NotificationEventType = 'payment.completed' | 'document.generated' | 'document.cancelled' | 'role.changed'

type NotificationInput = {
  recipientId: string
  eventType: NotificationEventType
  entityType: 'payment' | 'document' | 'user'
  entityId: string
  idempotencyKey: string
  title: string
  body: string
  appUrl?: string
}

let notificationSchemaReady: Promise<void> | null = null

async function ensureNotificationSchema() {
  if (notificationSchemaReady) return notificationSchemaReady
  notificationSchemaReady = (async () => {
    await ensureSchema()
    await query(`CREATE TABLE IF NOT EXISTS miniapp_notification_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      app_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`)
    await query(`CREATE TABLE IF NOT EXISTS miniapp_notification_deliveries (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES miniapp_notification_events(id),
      recipient_telegram_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '',
      telegram_message_id TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(event_id, recipient_telegram_id)
    )`)
    await query('CREATE INDEX IF NOT EXISTS idx_miniapp_notification_delivery_status ON miniapp_notification_deliveries(status, updated_at)')
    await query('CREATE INDEX IF NOT EXISTS idx_miniapp_notification_delivery_recipient ON miniapp_notification_deliveries(recipient_telegram_id, created_at)')
  })().catch(error => { notificationSchemaReady = null; throw error })
  return notificationSchemaReady
}

const botToken = () => process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''
const bounded = (value: string, max: number) => value.slice(0, max)

async function telegramSendMessage(recipientId: string, title: string, body: string, appUrl: string) {
  const token = botToken()
  if (!token) throw new Error('telegram_bot_token_unconfigured')
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: recipientId,
      text: `${title}\n\n${body}`,
      disable_web_page_preview: true,
      ...(appUrl ? { reply_markup: { inline_keyboard: [[{ text: 'Ouvrir Teraminiapp', url: appUrl }]] } } : {}),
    }),
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; description?: string; result?: { message_id?: number } }
  if (!response.ok || !payload.ok) throw new Error(`telegram_send_failed:${response.status}:${bounded(String(payload.description || 'unknown'), 180)}`)
  return String(payload.result?.message_id || '')
}

export async function enqueueTelegramNotification(input: NotificationInput) {
  if (!/^\d{1,20}$/.test(input.recipientId)) return { queued: false, reason: 'invalid_recipient' }
  await ensureNotificationSchema()
  const now = new Date().toISOString()
  const eventId = crypto.randomUUID()
  const inserted = await query(`INSERT INTO miniapp_notification_events
    (id,event_type,entity_type,entity_id,idempotency_key,title,body,app_url,created_at)
    VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`, [eventId, input.eventType, input.entityType, input.entityId, bounded(input.idempotencyKey, 180), bounded(input.title, 120), bounded(input.body, 900), bounded(input.appUrl || '', 500), now])
  const actualEventId = String(inserted[0]?.id || '')
  if (!actualEventId) return { queued: false, duplicate: true }
  await query(`INSERT INTO miniapp_notification_deliveries
    (id,event_id,recipient_telegram_id,status,attempts,last_error,telegram_message_id,created_at,updated_at)
    VALUES (?,?,?,'PENDING',0,'','',?,?) ON CONFLICT(event_id,recipient_telegram_id) DO NOTHING`, [crypto.randomUUID(), actualEventId, input.recipientId, now, now])
  void deliverTelegramNotification(actualEventId, input.recipientId)
  return { queued: true, eventId: actualEventId }
}

export async function deliverTelegramNotification(eventId: string, recipientId: string) {
  await ensureNotificationSchema()
  const rows = await query('SELECT title,body,app_url FROM miniapp_notification_events WHERE id=? LIMIT 1', [eventId])
  const event = rows[0]
  if (!event) return false
  const now = new Date().toISOString()
  await query("UPDATE miniapp_notification_deliveries SET status='SENDING',attempts=attempts+1,updated_at=? WHERE event_id=? AND recipient_telegram_id=? AND status IN ('PENDING','FAILED')", [now, eventId, recipientId])
  try {
    const messageId = await telegramSendMessage(recipientId, String(event.title), String(event.body), String(event.app_url || ''))
    await query("UPDATE miniapp_notification_deliveries SET status='SENT',telegram_message_id=?,last_error='',updated_at=? WHERE event_id=? AND recipient_telegram_id=?", [messageId, now, eventId, recipientId])
    return true
  } catch (error) {
    await query("UPDATE miniapp_notification_deliveries SET status='FAILED',last_error=?,updated_at=? WHERE event_id=? AND recipient_telegram_id=?", [bounded(error instanceof Error ? error.message : 'telegram_delivery_failed', 240), new Date().toISOString(), eventId, recipientId])
    return false
  }
}
