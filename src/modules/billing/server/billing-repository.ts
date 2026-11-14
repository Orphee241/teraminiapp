import { query } from '../../../lib/storage'

let schemaReady: Promise<void> | null = null

async function ensureSchema() {
  if (schemaReady) return schemaReady
  schemaReady = (async () => {
    await query(`CREATE TABLE IF NOT EXISTS miniapp_billing_accounts (
      owner_telegram_id TEXT PRIMARY KEY,
      document_credits INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await query(`CREATE TABLE IF NOT EXISTS miniapp_billing_payments (
      deposit_id TEXT PRIMARY KEY,
      owner_telegram_id TEXT NOT NULL,
      pack_code TEXT NOT NULL,
      documents INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      provider TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      status TEXT NOT NULL,
      credited_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`)
    await query('CREATE TABLE IF NOT EXISTS miniapp_billing_credit_events (deposit_id TEXT PRIMARY KEY, owner_telegram_id TEXT NOT NULL, documents INTEGER NOT NULL, created_at TEXT NOT NULL)')
    await query('CREATE INDEX IF NOT EXISTS idx_miniapp_billing_payments_owner ON miniapp_billing_payments(owner_telegram_id, created_at)')
  })().catch(error => { schemaReady = null; throw error })
  return schemaReady
}

export async function availableDocumentCredits(owner: string): Promise<number> {
  await ensureSchema()
  const rows = await query('SELECT document_credits FROM miniapp_billing_accounts WHERE owner_telegram_id = ? LIMIT 1', [owner])
  return Number(rows[0]?.document_credits || 0)
}

export async function reserveDocumentCredit(owner: string): Promise<boolean> {
  await ensureSchema()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rows = await query('SELECT document_credits, version FROM miniapp_billing_accounts WHERE owner_telegram_id = ? LIMIT 1', [owner])
    const credits = Number(rows[0]?.document_credits || 0)
    const version = Number(rows[0]?.version || 0)
    if (credits < 1) return false
    await query('UPDATE miniapp_billing_accounts SET document_credits = document_credits - 1, version = version + 1, updated_at = ? WHERE owner_telegram_id = ? AND document_credits = ? AND version = ?', [new Date().toISOString(), owner, credits, version])
    const after = await query('SELECT document_credits, version FROM miniapp_billing_accounts WHERE owner_telegram_id = ? LIMIT 1', [owner])
    if (Number(after[0]?.version || 0) === version + 1 && Number(after[0]?.document_credits || 0) === credits - 1) return true
  }
  return false
}

export async function refundDocumentCredit(owner: string): Promise<void> {
  await ensureSchema()
  await query('INSERT INTO miniapp_billing_accounts (owner_telegram_id, document_credits, version, created_at, updated_at) VALUES (?, 1, 0, ?, ?) ON CONFLICT(owner_telegram_id) DO UPDATE SET document_credits = document_credits + 1, version = version + 1, updated_at = excluded.updated_at', [owner, new Date().toISOString(), new Date().toISOString()])
}

export async function createPendingPayment(input: { depositId: string; owner: string; packCode: string; documents: number; amount: number; currency: string; provider: string; phoneNumber: string }) {
  await ensureSchema()
  const now = new Date().toISOString()
  await query(`INSERT INTO miniapp_billing_payments
    (deposit_id, owner_telegram_id, pack_code, documents, amount, currency, provider, phone_number, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`, [input.depositId, input.owner, input.packCode, input.documents, input.amount, input.currency, input.provider, input.phoneNumber, now, now])
}

export async function updatePaymentStatus(depositId: string, status: string, owner: string): Promise<{ owner: string; documents: number; credited: boolean } | null> {
  await ensureSchema()
  const rows = await query('SELECT owner_telegram_id, documents, status, credited_at FROM miniapp_billing_payments WHERE deposit_id = ? LIMIT 1', [depositId])
  const payment = rows[0]
  if (!payment || String(payment.owner_telegram_id) !== owner) return null
  const normalized = String(status).toUpperCase()
  if (normalized !== 'COMPLETED') {
    await query('UPDATE miniapp_billing_payments SET status = ?, updated_at = ? WHERE deposit_id = ?', [normalized, new Date().toISOString(), depositId])
    return { owner: String(payment.owner_telegram_id), documents: Number(payment.documents), credited: Boolean(payment.credited_at) }
  }
  if (payment.credited_at) return { owner: String(payment.owner_telegram_id), documents: Number(payment.documents), credited: true }
  const now = new Date().toISOString()
  const inserted = await query('INSERT INTO miniapp_billing_credit_events (deposit_id, owner_telegram_id, documents, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(deposit_id) DO NOTHING RETURNING deposit_id', [depositId, String(payment.owner_telegram_id), Number(payment.documents), now])
  if (!inserted.length) return { owner: String(payment.owner_telegram_id), documents: Number(payment.documents), credited: true }
  await query('INSERT INTO miniapp_billing_accounts (owner_telegram_id, document_credits, version, created_at, updated_at) VALUES (?, ?, 0, ?, ?) ON CONFLICT(owner_telegram_id) DO UPDATE SET document_credits = document_credits + excluded.document_credits, version = version + 1, updated_at = excluded.updated_at', [String(payment.owner_telegram_id), Number(payment.documents), now, now])
  await query('UPDATE miniapp_billing_payments SET status = ?, credited_at = ?, updated_at = ? WHERE deposit_id = ? AND credited_at IS NULL', ['COMPLETED', now, now, depositId])
  return { owner: String(payment.owner_telegram_id), documents: Number(payment.documents), credited: true }
}
