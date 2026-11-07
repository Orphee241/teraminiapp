import { NextRequest, NextResponse } from 'next/server'
import { authenticate, authHeaders, requireSameOrigin } from '../_auth'
import { validMessage } from '../../../lib/input-security'
import { saveMessage } from '../../../lib/storage'
const michelleUrl = () => (process.env.MICHELLE_API_URL || '').replace(/\/$/, '')
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const body = await request.json().catch(() => null); let message = ''; try { message = validMessage(body?.message) } catch { return NextResponse.json({ error: 'Message requis ou trop long.' }, { status: 400 }) }
  const url = michelleUrl(); const key = process.env.MICHELLE_API_KEY || ''; if (!url || !key) return NextResponse.json({ error: 'Service Michelle non configuré.' }, { status: 503 })
  const telegramId = String(auth.user?.id || '')
  try { const response = await fetch(`${url}/v1/assist`, { method: 'POST', headers: authHeaders(request), body: JSON.stringify({ application: 'terainterface-miniapp', tenant_id: `telegram:${telegramId}`, user_id: telegramId, message, context: { screen: 'miniapp_michelle', channel: 'telegram' }, scopes: ['company:public', 'services:read'] }), cache: 'no-store' }); const payload = await response.json().catch(() => ({})); const reply = response.ok && typeof payload.reply === 'string' ? payload.reply.slice(0, 6000) : ''; if (reply) await saveMessage(telegramId, 'assistant', reply); return response.ok && reply ? NextResponse.json({ reply }, { status: 200 }) : NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 }) } catch { return NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 }) }
}
