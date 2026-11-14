import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
const paymentRoute = readFileSync(resolve(process.cwd(), 'src/app/api/billing/deposits/[id]/route.ts'), 'utf8')

describe('payment modal regression contracts', () => {
  it('keeps the payment sheet vertically centered on narrow screens and the phone field full width', () => {
    expect(css).toContain('@media (max-width:460px) { .pack-offer-backdrop { align-items:center;')
    expect(css).toContain('.payment-form input { display:block; width:100%;')
    expect(css).toContain('background:#080a0f;')
  })

  it('keeps payment errors visible inside the payment modal', () => {
    expect(page).toContain("setPaymentStatus(error instanceof Error ? error.message : 'Le paiement n’a pas pu être confirmé.')")
    expect(page).toContain("{paymentStatus && <p role=\"alert\" className={`form-message ${paymentBusy ? '' : 'error'}`.trim()}>{paymentStatus}</p>}")
  })

  it('uses an explicit payment deadline and maps provider business statuses', () => {
    expect(page).toContain('const PAYMENT_DEADLINE_MS = 30_000')
    expect(page).toContain('Le délai de paiement est expiré')
    expect(page).toContain('status.message')
    expect(paymentRoute).toContain('message: typeof payload.message')
  })
})
