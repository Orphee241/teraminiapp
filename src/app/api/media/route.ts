import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../_auth'
import { uploadObject, saveMessage } from '../../../lib/storage'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 16 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux.' }, { status: 413 })
  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ error: 'Fichier invalide.' }, { status: 400 }) }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Fichier requis.' }, { status: 400 })
  try {
    const userId = String(auth.user?.id || '')
    const media = await uploadObject(userId, file)
    const message = await saveMessage(userId, 'user', String(form.get('text') || file.name).slice(0, 180), media)
    return NextResponse.json({ media, message })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    const invalid = ['media_type_forbidden', 'media_too_large', 'media_signature_invalid'].includes(code)
    return NextResponse.json({ error: invalid ? 'Format de fichier invalide ou non pris en charge.' : 'Envoi du média impossible.' }, { status: invalid ? 400 : 503 })
  }
}
