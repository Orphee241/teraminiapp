import { NextRequest, NextResponse } from 'next/server'
import { authenticate, telegramProfile } from '../_auth'
import { getProfile, updateProfile, upsertProfile } from '../../../lib/storage'
import { boundedText } from '../../../lib/input-security'

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try { await upsertProfile(telegramProfile(auth.user!)); return NextResponse.json({ profile: await getProfile(String(auth.user!.id)) }) } catch { return NextResponse.json({ error: 'Profil indisponible.' }, { status: 503 }) }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Données du profil invalides.' }, { status: 400 })
    const profile = await updateProfile(String(auth.user!.id), { company_name: boundedText(body.company_name, 160), phone: boundedText(body.phone, 40), address: boundedText(body.address, 240), nif: boundedText(body.nif, 80), rccm: boundedText(body.rccm, 120), logo_url: boundedText(body.logo_url, 500), brand_color: boundedText(body.brand_color || '#D71920', 7) })
    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof Error && error.message === 'logo_reference_invalid') return NextResponse.json({ error: 'Le logo enregistré est invalide. Importez-le à nouveau.' }, { status: 400 })
    if (error instanceof Error && error.message === 'brand_color_invalid') return NextResponse.json({ error: 'La couleur sélectionnée est invalide.' }, { status: 400 })
    return NextResponse.json({ error: 'Enregistrement du profil impossible.' }, { status: 503 })
  }
}
