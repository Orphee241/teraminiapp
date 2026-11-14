import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(process.cwd(), 'src/app/page.tsx'), 'utf8')
const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('payment modal regression contracts', () => {
  it('keeps the payment sheet vertically centered on narrow screens', () => {
    expect(css).toContain('@media (max-width:460px) { .pack-offer-backdrop { align-items:center;')
  })

  it('keeps payment errors visible inside the payment modal', () => {
    expect(page).toContain("setPaymentStatus(error instanceof Error ? error.message : 'Le paiement n’a pas pu être confirmé.')")
    expect(page).toContain("{paymentStatus && <p role=\"alert\" className={`form-message ${paymentBusy ? '' : 'error'}`.trim()}>{paymentStatus}</p>}")
  })
})
