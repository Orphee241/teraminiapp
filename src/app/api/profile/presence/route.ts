import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin, telegramProfile } from '../../_auth'
import { upsertProfile } from '../../../../modules/profiles/server/repository'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError

  const auth = await authenticate(request)
  if (auth.response) return auth.response

  const userId = String(auth.user!.id)
  if (!takeRateLimit(`profile-presence:user:${userId}`, 12, 60_000) || !takeRateLimit('profile-presence:global', 3000, 60_000)) {
    return NextResponse.json({ error: 'Trop de signaux de présence rapprochés.' }, { status: 429 })
  }

  const persistedLimit = await enforcePersistentRateLimit(userId, 'profile-presence', 120, 6000, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Présence momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de signaux de présence rapprochés.' }, { status: 429 })

  try {
    const profile = telegramProfile(auth.user!)
    const last_app_visit_at = new Date().toISOString()
    await upsertProfile(profile)
    return NextResponse.json({ telegram_id: userId, last_app_visit_at })
  } catch {
    return NextResponse.json({ error: 'Présence momentanément indisponible.' }, { status: 503 })
  }
}
