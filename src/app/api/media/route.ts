import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../_auth'
import { uploadObject, saveMessage } from '../../../modules/media/server/repository'
import { readBoundedFormData, RequestBodyLimitError } from '../../../lib/request-body'
import { takeRateLimit } from '../../../lib/rate-limit'
import { enforcePersistentRateLimit } from '../../../lib/request-security'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const userId = String(auth.user?.id || '')
  if (!takeRateLimit(`media:user:${userId}`, 8, 60_000) || !takeRateLimit('media:global', 240, 60_000)) return NextResponse.json({ error: 'Trop d’envois rapprochés. Réessayez dans un instant.' }, { status: 429 })
  const persistedLimit = await enforcePersistentRateLimit(userId, 'media', 8, 240, 60_000)
  if (!persistedLimit.available) return NextResponse.json({ error: 'Stockage des médias momentanément indisponible.' }, { status: 503 })
  if (!persistedLimit.allowed) return NextResponse.json({ error: 'Trop d’envois rapprochés. Réessayez dans un instant.' }, { status: 429 })
  let form: FormData
  try { form = await readBoundedFormData(request, 16 * 1024 * 1024) } catch (error) { const tooLarge = error instanceof RequestBodyLimitError; return NextResponse.json({ error: tooLarge ? 'Fichier trop volumineux.' : 'Fichier invalide.' }, { status: tooLarge ? 413 : 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 })
  try {
    const media = await uploadObject(userId, file)
    const message = await saveMessage(userId, 'user', String(form.get('text') || file.name).slice(0, 180), media)
    return NextResponse.json({ media, message })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const invalid = ['media_type_forbidden', 'media_too_large', 'media_signature_invalid'].includes(code)
    return NextResponse.json({ error: invalid ? 'Format de fichier invalide ou non pris en charge.' : 'Envoi du média impossible.' }, { status: invalid ? 400 : 503 })
  }
}
