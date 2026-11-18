import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../_auth'
import { readBoundedJson, RequestBodyLimitError } from '../../../../../lib/request-body'
import { enforcePersistentRateLimit } from '../../../../../lib/request-security'
import { getCvDocument, markCvGenerated, updateCvDraft } from '../../../../../modules/teradoc/server/repository'

const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const { id } = await params
  if (!validId(id)) return NextResponse.json({ error: 'Identifiant de CV invalide.' }, { status: 400 })
  const document = await getCvDocument(String(auth.user?.id || ''), id)
  return document ? NextResponse.json({ document }, { headers: { 'cache-control': 'no-store' } }) : NextResponse.json({ error: 'CV introuvable.' }, { status: 404 })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const { id } = await params
  if (!validId(id)) return NextResponse.json({ error: 'Identifiant de CV invalide.' }, { status: 400 })
  const limit = await enforcePersistentRateLimit(owner, 'teradoc-cv-write', 20, 600, 60 * 60_000)
  if (!limit.available) return NextResponse.json({ error: 'TeraDoc est momentanément indisponible.' }, { status: 503 })
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de sauvegardes rapprochées.' }, { status: 429 })
  let body: unknown
  try { body = await readBoundedJson(request, 128 * 1024) }
  catch (error) { return NextResponse.json({ error: error instanceof RequestBodyLimitError ? 'CV trop volumineux.' : 'Données du CV invalides.' }, { status: error instanceof RequestBodyLimitError ? 413 : 400 }) }
  try {
    const document = await updateCvDraft(owner, id, body)
    return document ? NextResponse.json({ document }) : NextResponse.json({ error: 'CV introuvable.' }, { status: 404 })
  } catch { return NextResponse.json({ error: 'Données du CV invalides.' }, { status: 400 }) }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const auth = await authenticate(request); if (auth.response) return auth.response
  const owner = String(auth.user?.id || '')
  const { id } = await params
  if (!validId(id)) return NextResponse.json({ error: 'Identifiant de CV invalide.' }, { status: 400 })
  const limit = await enforcePersistentRateLimit(owner, 'teradoc-cv-generate', 10, 300, 60 * 60_000)
  if (!limit.available) return NextResponse.json({ error: 'TeraDoc est momentanément indisponible.' }, { status: 503 })
  if (!limit.allowed) return NextResponse.json({ error: 'Trop de générations rapprochées.' }, { status: 429 })
  const generated = await markCvGenerated(owner, id)
  return generated ? NextResponse.json({ success: true, status: 'GENERATED' }) : NextResponse.json({ error: 'CV introuvable.' }, { status: 404 })
}
