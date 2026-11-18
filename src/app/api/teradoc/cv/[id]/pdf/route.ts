import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '../../../../_auth'
import { takeRateLimit } from '../../../../../../lib/rate-limit'
import { getCvDocument, markCvGenerated } from '../../../../../../modules/teradoc/server/repository'
import { renderCvPdf } from '../../../../../../modules/teradoc/server/render-cv'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request); if (auth.response) return auth.response
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Identifiant de CV invalide.' }, { status: 400 })
  const owner = String(auth.user?.id || '')
  if (!takeRateLimit(`teradoc-cv-pdf:user:${owner}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de téléchargements rapprochés.' }, { status: 429 })
  try {
    const document = await getCvDocument(owner, id)
    if (!document) return NextResponse.json({ error: 'CV introuvable.' }, { status: 404 })
    const pdf = renderCvPdf(document.payload)
    await markCvGenerated(owner, id)
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="teradoc-${id}.pdf"`, 'cache-control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Impossible de générer le CV.' }, { status: 503 }) }
}
