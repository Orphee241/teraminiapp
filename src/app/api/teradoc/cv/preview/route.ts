import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../_auth'
import { readBoundedJson, RequestBodyLimitError } from '../../../../../lib/request-body'
import { enforcePersistentRateLimit } from '../../../../../lib/request-security'
import { sanitizeTeraDocCv } from '../../../../../modules/teradoc/cv-schema'
import { renderCvPdf } from '../../../../../modules/teradoc/server/render-cv'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const limit = await enforcePersistentRateLimit(owner, 'teradoc-cv-preview', 120, 2400, 10 * 60_000)
  if (!limit.available) return NextResponse.json({ error: 'TeraDoc est momentanément indisponible.' }, { status: 503 })
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de prévisualisations rapprochées.' }, { status: 429 })

  let body: unknown
  try { body = await readBoundedJson(request, 128 * 1024) }
  catch (error) {
    const tooLarge = error instanceof RequestBodyLimitError
    return NextResponse.json({ error: tooLarge ? 'CV trop volumineux.' : 'Données du CV invalides.' }, { status: tooLarge ? 413 : 400 })
  }
  try {
    const cv = sanitizeTeraDocCv(body)
    const pdf = renderCvPdf(cv)
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'inline; filename="teradoc-preview.pdf"',
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    } })
  } catch (error) {
    const invalidTemplate = error instanceof Error && error.message === 'teradoc_template_invalid'
    return NextResponse.json({ error: invalidTemplate ? 'Modèle de CV invalide.' : 'Données du CV invalides.' }, { status: 400, headers: { 'cache-control': 'no-store' } })
  }
}
