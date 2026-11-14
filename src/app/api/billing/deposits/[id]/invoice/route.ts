import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../../_auth'
import { getPayment } from '../../../../../../modules/billing/server/billing-repository'

function pdfText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '\\$&')
}

function buildInvoicePdf(payment: { deposit_id: string; pack_code: string; documents: number; amount: number; currency: string; provider: string; status: string; created_at: string }) {
  const date = new Date(payment.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  const total = `${payment.amount.toLocaleString('fr-FR')} ${payment.currency}`
  const lines = [
    'Terainterface',
    'FACTURE DE PAIEMENT',
    `Reference: ${payment.deposit_id}`,
    `Date: ${date}`,
    `Statut: ${payment.status}`,
    '',
    'Libelle                         Quantite    Prix unitaire       Total',
    `Pack ${payment.pack_code} - documents       ${payment.documents}       ${total}          ${total}`,
    '',
    `Net a payer: ${total}`,
    '',
    'Paiement confirme pour la mise a disposition de credits de documents.',
    `Operateur: ${payment.provider}`,
  ]
  const stream = ['BT', '/F1 12 Tf', '50 790 Td', ...lines.flatMap((line, index) => [index === 0 ? `(${pdfText(line)}) Tj` : '0 -24 Td', index === 0 ? '' : `(${pdfText(line)}) Tj`]).filter(Boolean), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'latin1'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const checked = await authenticate(request)
  if (checked.response) return checked.response
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Identifiant de paiement invalide.' }, { status: 400 })
  try {
    const payment = await getPayment(String(checked.user?.id || ''), id)
    if (!payment) return NextResponse.json({ error: 'Transaction introuvable.' }, { status: 404 })
    if (String(payment.status).toUpperCase() !== 'COMPLETED') return NextResponse.json({ error: 'La facture sera disponible après confirmation du paiement.' }, { status: 409 })
    const pdf = buildInvoicePdf(payment)
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="terainterface-${id}.pdf"`, 'cache-control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Impossible de générer la facture.' }, { status: 503 }) }
}
