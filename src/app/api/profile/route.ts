import { NextRequest, NextResponse } from 'next/server'
import { authenticate, telegramProfile } from '../_auth'
import { getProfile, updateProfile, upsertProfile } from '../../../lib/storage'

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try { await upsertProfile(telegramProfile(auth.user!)); return NextResponse.json({ profile: await getProfile(String(auth.user!.id)) }) } catch { return NextResponse.json({ error: 'Profil indisponible.' }, { status: 503 }) }
}

export async function PUT(request: NextRequest) { const auth = await authenticate(request); if (auth.response) return auth.response; try { const body = await request.json(); const profile = await updateProfile(String(auth.user!.id), { company_name: String(body.company_name || '').trim(), phone: String(body.phone || '').trim(), address: String(body.address || '').trim(), nif: String(body.nif || '').trim(), rccm: String(body.rccm || '').trim(), logo_url: String(body.logo_url || '').trim() }); return NextResponse.json({ profile }); } catch { return NextResponse.json({ error: 'Enregistrement du profil impossible.' }, { status: 503 }) } }
