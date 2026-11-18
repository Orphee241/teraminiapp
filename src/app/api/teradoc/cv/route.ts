import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../_auth'
import { readBoundedJson, RequestBodyLimitError } from '../../../../lib/request-body'
import { enforcePersistentRateLimit } from '../../../../lib/request-security'
import { createCvDraft, listCvDocuments } from '../../../../modules/teradoc/server/repository'

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const limit = await enforcePersistentRateLimit(owner, 'teradoc-cv-list', 60, 1200, 60_000)
  if (!limit.available) return NextResponse.json({ error: 'TeraDoc est momentanément indisponible.' }, { status: 503 })
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de consultations rapprochées.' }, { status: 429 })
  try { return NextResponse.json({ documents: await listCvDocuments(owner) }, { headers: { 'cache-control': 'no-store' } }) }
  catch { return NextResponse.json({ error: 'Impossible de charger vos CV.' }, { status: 503 }) }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request)
  if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const limit = await enforcePersistentRateLimit(owner, 'teradoc-cv-write', 20, 600, 60 * 60_000)
  if (!limit.available) return NextResponse.json({ error: 'TeraDoc est momentanément indisponible.' }, { status: 503 })
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de sauvegardes rapprochées.' }, { status: 429 })
  let body: unknown
  try { body = await readBoundedJson(request, 128 * 1024) }
  catch (error) { return NextResponse.json({ error: error instanceof RequestBodyLimitError ? 'CV trop volumineux.' : 'Données du CV invalides.' }, { status: error instanceof RequestBodyLimitError ? 413 : 400 }) }
  try { return NextResponse.json({ document: await createCvDraft(owner, body) }, { status: 201 }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'teradoc_template_invalid' ? 'Modèle de CV invalide.' : 'Données du CV invalides.' }, { status: 400 }) }
}
