import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../_auth'
import { updateProfile, uploadLogo } from '../../../../lib/storage'

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Logo requis.' }, { status: 400 })
  try {
    const userId = String(auth.user!.id)
    const logo = await uploadLogo(userId, file)
    const profile = await updateProfile(userId, { logo_url: logo.url })
    return NextResponse.json({ logo, profile })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const status = code === 'logo_type_forbidden' || code === 'logo_too_large' ? 400 : 503
    return NextResponse.json({ error: status === 400 ? 'Choisissez un logo PNG, JPG ou WebP de 5 Mo maximum.' : 'Stockage du logo indisponible.' }, { status })
  }
}
