import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authHeaders, requireSameOrigin } from '../_auth'
import { validMessage } from '../../../lib/input-security'
import { saveMessage } from '../../../lib/storage'
import { readBoundedJson, RequestBodyLimitError } from '../../../lib/request-body'
import { takeRateLimit } from '../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../lib/request-security'
const michelleUrl = () => (process.env.MICHELLE_API_URL || '').replace(/\/$/, '')
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (!takeRateLimit(`michelle:user:${userId}`, 20, 60_000) || !takeRateLimit('michelle:global', 600, 60_000)) return NextResponse.json({ error: 'Trop de messages rapprochés. Réessayez dans un instant.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'michelle', 20, 600, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de messages rapprochés. Réessayez dans un instant.' }, { status: 429 })
  let body: any
  try { body = await readBoundedJson(request, 16 * 1024) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Message trop volumineux.' : 'Message invalide.' }, { status: tooLarge ? 413 : 400 }) }
  let message = ''; try { message = validMessage(body?.message) } catch { return NextResponse.json({ error: 'Message requis ou trop long.' }, { status: 400 }) }
  const url = michelleUrl(); const key = process.env.MICHELLE_API_KEY || ''; if (!url || !key) return NextResponse.json({ error: 'Service Michelle non configuré.' }, { status: 503 })
  const telegramId = userId
  try { const response = await fetch(`${url}/v1/assist`, { method: 'POST', headers: authHeaders(request), body: JSON.stringify({ application: 'terainterface-miniapp', tenant_id: `telegram:${telegramId}`, user_id: telegramId, message, context: { screen: 'miniapp_michelle', channel: 'telegram' }, scopes: ['company:public', 'services:read'] }), cache: 'no-store' }); const payload = await response.json().catch(() => ({})); const reply = response.ok && typeof payload.reply === 'string' ? payload.reply.slice(0, 6000) : ''; if (reply) await saveMessage(telegramId, 'assistant', reply); return response.ok && reply ? NextResponse.json({ reply }, { status: 200 }) : NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 }) } catch { return NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 }) }
}
