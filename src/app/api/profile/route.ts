import { NextRequest, NextResponse } from 'next/server'
import { authenticate, telegramProfile, requireSameOrigin } from '../_auth'
import { getProfile, updateProfile, upsertProfile } from '../../../lib/storage'
import { boundedText } from '../../../lib/input-security'
import { readBoundedJson, RequestBodyLimitError } from '../../../lib/request-body'
import { takeRateLimit } from '../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../lib/request-security'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user!.id)
  if (!takeRateLimit(`profile-bootstrap:user:${userId}`, 12, 60 * 60_000) || !takeRateLimit('profile-bootstrap:global', 1200, 60 * 60_000)) return NextResponse.json({ error: 'Trop de requêtes rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'profile-bootstrap', 12, 1200, 60 * 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Profil momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de requêtes rapprochées.' }, { status: 429 })
  try { await upsertProfile(telegramProfile(auth.user!)); return NextResponse.json({ profile: await getProfile(userId) }) } catch { return NextResponse.json({ error: 'Profil indisponible.' }, { status: 503 }) }
}

export async function PUT(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try {
    const userId = String(auth.user!.id)
    if (!takeRateLimit(`profile-update:user:${userId}`, 10, 60 * 60_000) || !takeRateLimit('profile-update:global', 1200, 60 * 60_000)) return NextResponse.json({ error: 'Trop d’enregistrements rapprochés.' }, { status: 429 })
    let body: any
    try { body = await readBoundedJson(request, 16 * 1024) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Données du profil trop volumineuses.' : 'Données du profil invalides.' }, { status: tooLarge ? 413 : 400 }) }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Données du profil invalides.' }, { status: 400 })
    const profile = await updateProfile(userId, { company_name: boundedText(body.company_name, 160), phone: boundedText(body.phone, 40), address: boundedText(body.address, 240), nif: boundedText(body.nif, 80), rccm: boundedText(body.rccm, 120), logo_url: boundedText(body.logo_url, 500), brand_color: boundedText(body.brand_color || '#D71920', 7) })
    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof Error && error.message === 'logo_reference_invalid') return NextResponse.json({ error: 'Le logo enregistré est invalide. Importez-le à nouveau.' }, { status: 400 })
    if (error instanceof Error && error.message === 'brand_color_invalid') return NextResponse.json({ error: 'La couleur sélectionnée est invalide.' }, { status: 400 })
    return NextResponse.json({ error: 'Enregistrement du profil impossible.' }, { status: 503 })
  }
}
