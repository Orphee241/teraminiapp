import { createHash, createHmac, randomBytes } from 'node:crypto'

export function invoiceOwnerHeaders(owner: string, method: string, path: string, bodyText = ''): Record<string, string> {
  const secret = process.env.INVOICE_OWNER_SIGNING_SECRET || ''
  if (Buffer.byteLength(secret, 'utf8') < 32 || !/^\d{1,20}$/.test(owner)) throw new Error('invoice_owner_signing_unavailable')
  const target = new URL(path, 'https://invoice-api.invalid')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomBytes(16).toString('hex')
  const bodyHash = createHash('sha256').update(bodyText, 'utf8').digest('hex')
  const canonical = [method.toUpperCase(), target.pathname, target.search.slice(1), owner, timestamp, nonce, bodyHash].join('\n')
  const signature = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex')
  return {
    'x-invoice-owner-id': owner,
    'x-invoice-owner-timestamp': timestamp,
    'x-invoice-owner-nonce': nonce,
    'x-invoice-owner-signature': signature,
  }
}

export function invoiceActorHeaders(owner: string, actor: string, method: string, path: string, bodyText = ''): Record<string, string> {
  const secret = process.env.INVOICE_OWNER_SIGNING_SECRET || ''
  if (Buffer.byteLength(secret, 'utf8') < 32 || !/^\d{1,20}$/.test(owner) || !/^\d{1,20}$/.test(actor)) throw new Error('invoice_actor_signing_unavailable')
  const target = new URL(path, 'https://invoice-api.invalid')
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomBytes(16).toString('hex')
  const bodyHash = createHash('sha256').update(bodyText, 'utf8').digest('hex')
  const canonical = [method.toUpperCase(), target.pathname, target.search.slice(1), owner, actor, timestamp, nonce, bodyHash].join('\n')
  const signature = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex')
  return { 'x-invoice-actor-id': actor, 'x-invoice-actor-timestamp': timestamp, 'x-invoice-actor-nonce': nonce, 'x-invoice-actor-signature': signature }
}
