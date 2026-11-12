import crypto from 'node:crypto'
import { ensureSchema, query } from '../../../lib/storage'

export async function consumePersistentRateLimit(scope: string, maximum: number, windowMs: number, now = Date.now()) {
  await ensureSchema()
  const secret = process.env.TERAMINI_ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''
  if (!secret || !scope || scope.length > 256 || maximum < 1 || windowMs < 1) throw new Error('shared_rate_limit_unavailable')
  const scopeKey = crypto.createHmac('sha256', secret).update(scope).digest('hex')
  const rows = await query("INSERT INTO miniapp_rate_limits (scope_key,window_started_at,hits) VALUES (?1,?2,1) ON CONFLICT(scope_key) DO UPDATE SET hits=CASE WHEN miniapp_rate_limits.window_started_at<=?2-?3 THEN 1 ELSE miniapp_rate_limits.hits+1 END,window_started_at=CASE WHEN miniapp_rate_limits.window_started_at<=?2-?3 THEN ?2 ELSE miniapp_rate_limits.window_started_at END RETURNING hits", [scopeKey, now, windowMs])
  return Number(rows[0]?.hits || 0) <= maximum
}

export async function resetPersistentRateLimit(scope: string) {
  await ensureSchema()
  const secret = process.env.TERAMINI_ADMIN_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || ''
  if (!secret || !scope || scope.length > 256) throw new Error('shared_rate_limit_unavailable')
  const scopeKey = crypto.createHmac('sha256', secret).update(scope).digest('hex')
  await query('DELETE FROM miniapp_rate_limits WHERE scope_key=?1', [scopeKey])
}
