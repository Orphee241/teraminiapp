import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { updateProfile, uploadLogo, getProfile, freshLogoUrl } from '../../../../lib/storage'
import { readBoundedFormData, RequestBodyLimitError } from '../../../../lib/request-body'
import { takeRateLimit } from '../../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user!.id)
  if (!takeRateLimit(`logo-read:user:${userId}`, 120, 60_000)) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'logo-read', 120, 3000, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Logo temporairement indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  try { return NextResponse.json({ logo_url: await freshLogoUrl(userId) }) }
  catch { return NextResponse.json({ error: 'Logo temporairement indisponible.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user!.id)
  if (!takeRateLimit(`logo:user:${userId}`, 5, 60_000) || !takeRateLimit('logo:global', 120, 60_000)) return NextResponse.json({ error: 'Trop d’imports rapprochés. Réessayez dans un instant.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'logo-upload', 5, 120, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Stockage du logo momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop d’imports rapprochés. Réessayez dans un instant.' }, { status: 429 })
  let form: FormData
  try { form = await readBoundedFormData(request, 6 * 1024 * 1024) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Logo trop volumineux.' : 'Fichier invalide.' }, { status: tooLarge ? 413 : 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Logo requis.' }, { status: 400 })
  try {
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
