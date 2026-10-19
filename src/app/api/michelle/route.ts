import { NextRequest, NextResponse } from 'next/server'
import { authHeaders, authenticate } from '../_auth'
import { saveMessage } from '../../../lib/storage'
const michelleUrl = () => (process.env.MICHELLE_API_URL || '').replace(/\/$/, '')
export async function POST(request: NextRequest) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const body = await request.json().catch(() => null); const message = String(body?.message || '').trim()
  if (!message) return NextResponse.json({ error: 'Message requis.' }, { status: 400 })
  const url = michelleUrl(); const key = process.env.MICHELLE_API_KEY || ''; if (!url || !key) return NextResponse.json({ error: 'Service Michelle non configuré.' }, { status: 503 })
  const telegramId = String(auth.user?.id || '')
  try { const response = await fetch(`${url}/v1/assist`, { method: 'POST', headers: authHeaders(request), body: JSON.stringify({ application: 'terainterface-miniapp', tenant_id: `telegram:${telegramId}`, user_id: telegramId, message, context: { screen: 'miniapp_michelle', channel: 'telegram' }, scopes: ['company:public', 'services:read'] }), cache: 'no-store' }); const payload = await response.json().catch(() => ({ error: 'Réponse invalide de Michelle.' })); if (response.ok && payload.reply) await saveMessage(telegramId, 'assistant', String(payload.reply)); return NextResponse.json(payload, { status: response.status }) } catch { return NextResponse.json({ error: 'Michelle est momentanément indisponible.' }, { status: 503 }) }
}
