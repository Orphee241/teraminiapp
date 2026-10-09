import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

function verifyTelegramInitData(initData: string, botToken: string): { id: number; username?: string; first_name?: string } | null {
  if (!initData || !botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const entries: [string, string][] = []
  params.forEach((value, key) => entries.push([key, value]))
  const dataCheckString = entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n')
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
  if (expected.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null
  const authDate = Number(params.get('auth_date') || 0)
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null
  try {
    const user = JSON.parse(params.get('user') || '{}')
    return Number.isInteger(user.id) ? user : null
  } catch { return null }
}

export async function POST(request: NextRequest) {
  const initData = request.headers.get('x-telegram-init-data') || ''
  const user = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || process.env.TERAINTERFACE_TELEGRAM_BOT_TOKEN || '')
  const devMode = process.env.MINIAPP_DEV_MODE === 'true'
  if (!user && !devMode) return NextResponse.json({ error: 'Authentification Telegram requise.' }, { status: 401 })

  const apiUrl = (process.env.INVOICE_API_URL || '').replace(/\/$/, '')
  const apiKey = process.env.INVOICE_API_KEY || ''
  if (!apiUrl || !apiKey) return NextResponse.json({ error: 'Service de documents non configuré.' }, { status: 503 })

  const body = await request.json()
  const response = await fetch(`${apiUrl}/v1/documents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({ error: 'Réponse invalide du service de documents.' }))
  return NextResponse.json(payload, { status: response.status })
}
