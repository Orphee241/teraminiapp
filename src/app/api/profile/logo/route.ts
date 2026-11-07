import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { updateProfile, uploadLogo, getProfile, freshLogoUrl } from '../../../../lib/storage'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  try { return NextResponse.json({ logo_url: await freshLogoUrl(String(auth.user!.id)) }) }
  catch { return NextResponse.json({ error: 'Logo temporairement indisponible.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Logo requis.' }, { status: 400 })
  try {
    const userId = String(auth.user!.id)
    const logo = await uploadLogo(userId, file)
    const existing = await getProfile(userId)
    const profile = await updateProfile(userId, { ...existing, logo_url: logo.key })
    return NextResponse.json({ logo, profile })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const status = code === 'logo_type_forbidden' || code === 'logo_too_large' || code === 'media_signature_invalid' ? 400 : 503
    return NextResponse.json({ error: status === 400 ? code === 'media_signature_invalid' ? 'Le contenu du fichier ne correspond pas à son format.' : 'Choisissez un logo PNG, JPG ou WebP de 5 Mo maximum.' : 'Stockage du logo indisponible.' }, { status })
  }
}
