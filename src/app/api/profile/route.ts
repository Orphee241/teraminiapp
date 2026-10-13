import { NextRequest, NextResponse } from 'next/server'
import { authenticate, telegramProfile } from '../_auth'
import { upsertProfile } from '../../../lib/storage'

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try { return NextResponse.json(await upsertProfile(telegramProfile(auth.user!))) } catch { return NextResponse.json({ error: 'Profil indisponible.' }, { status: 503 }) }
}
