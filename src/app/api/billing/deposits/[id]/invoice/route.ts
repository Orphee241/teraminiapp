import { NextRequest, NextResponse } from 'next/server'
import { authenticate, requireSameOrigin } from '../../../../_auth'
import { takeRateLimit } from '../../../../../../lib/rate-limit'
import { getPayment } from '../../../../../../modules/billing/server/billing-repository'

function pdfText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '\\$&')
}

function buildInvoicePdf(payment: { deposit_id: string; pack_code: string; documents: number; amount: number; currency: string; provider: string; phone_number: string; status: string; created_at: string }) {
  // Keep this payment receipt on the same visual system as the official
  // devis/facture renderer: branded header, issuer/client blocks, rounded
  // line-item table, emphasized net payable amount and footer.
  const date = new Date(payment.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
  const total = `${payment.amount.toLocaleString('fr-FR')} ${payment.currency}`
  const text = (value: string, x: number, y: number, size = 10, font = '/F1') => `${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(value)}) Tj`
  const rect = (x: number, y: number, width: number, height: number, color: string) => `${color} sc ${x} ${y} ${width} ${height} re f`
  const line = (x1: number, y1: number, x2: number, y2: number, color = '0.88 0.89 0.92') => `${color} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`
  const stream = [
    rect(0, 766, 595, 76, '0.27 0.04 0.12'),
    '1 1 1 sc',
    text('TERAINTERFACE', 42, 806, 18, '/F2'),
    text('FACTURE', 42, 785, 10, '/F2'),
    text('FACTURE DE PAIEMENT', 390, 807, 12, '/F2'),
    text(`N° ${payment.deposit_id}`, 390, 788, 8, '/F1'),
    text(`Date : ${date}`, 390, 774, 8, '/F1'),
    '0.15 0.16 0.2 sc',
    text('ÉMETTEUR', 42, 730, 8, '/F2'),
    text('Terainterface', 42, 712, 13, '/F2'),
    text('Service de documents numériques', 42, 696, 9),
    text('CLIENT', 316, 730, 8, '/F2'),
    text('Compte Terainterface', 316, 712, 13, '/F2'),
    text('Mise à disposition de crédits', 316, 696, 9),
    rect(42, 626, 511, 38, '0.27 0.04 0.12'),
    text('DÉSIGNATION', 54, 641, 8, '/F2'),
    text('QTÉ', 360, 641, 8, '/F2'),
    text('PRIX UNITAIRE', 410, 641, 8, '/F2'),
    text('TOTAL', 505, 641, 8, '/F2'),
    text(`Pack ${payment.pack_code} - documents`, 54, 600, 10),
    text(String(payment.documents), 366, 600, 10),
    text(total, 410, 600, 10),
    text(total, 505, 600, 10),
    line(42, 580, 553, 580),
    text('Statut du paiement', 54, 552, 9),
    text(payment.status, 410, 552, 10, '/F2'),
    text('Opérateur', 54, 530, 9),
    text(payment.provider, 410, 530, 10, '/F2'),
    text('Numéro de paiement', 54, 508, 9),
    text(payment.phone_number, 410, 508, 10),
    rect(330, 438, 223, 44, '0.97 0.91 0.94'),
    text('NET À PAYER', 346, 462, 8, '/F2'),
    text(total, 449, 446, 15, '/F2'),
    text('Paiement confirmé pour la mise à disposition de crédits de documents.', 42, 388, 9),
    line(42, 350, 553, 350),
    text('Signature / cachet Terainterface', 54, 326, 8),
    text('Validation électronique', 410, 326, 8),
    rect(0, 0, 595, 42, '0.96 0.96 0.97'),
    text('Terainterface · Documents numériques · Merci pour votre confiance', 147, 17, 8),
    '0.15 0.16 0.2 sc',
    'ET',
  ].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
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
  const owner = String(checked.user?.id || '')
  if (!takeRateLimit(`payment-invoice:user:${owner}`, 20, 60_000)) return NextResponse.json({ error: 'Trop de générations rapprochées.' }, { status: 429 })
  try {
    const payment = await getPayment(owner, id)
    if (!payment) return NextResponse.json({ error: 'Transaction introuvable.' }, { status: 404 })
    if (String(payment.status).toUpperCase() !== 'COMPLETED') return NextResponse.json({ error: 'La facture sera disponible après confirmation du paiement.' }, { status: 409 })
    const pdf = buildInvoicePdf(payment)
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="terainterface-${id}.pdf"`, 'cache-control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Impossible de générer la facture.' }, { status: 503 }) }
}
