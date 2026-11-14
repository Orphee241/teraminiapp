import crypto from 'node:crypto'
import { ensureSchema, query } from '../../../lib/storage'

export async function getConversation(userId: string) {
  await ensureSchema()
  const rows = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId])
  if (rows[0]) return rows[0]
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  try {
    await query("INSERT INTO miniapp_conversations (id,application,tenant,external_user_id,created_at,updated_at) VALUES (?1,'terainterface-miniapp','terainterface',?2,?3,?3)", [id, userId, now])
  } catch (error) {
    const existing = await query("SELECT * FROM miniapp_conversations WHERE application='terainterface-miniapp' AND tenant='terainterface' AND external_user_id=?1 AND status='active' LIMIT 1", [userId])
    if (existing[0]) return existing[0]
    throw error
  }
  return { id, application: 'terainterface-miniapp', tenant: 'terainterface', external_user_id: userId, title: 'Michelle', status: 'active', created_at: now, updated_at: now }
}

export async function listMessages(userId: string) {
  const conversation = await getConversation(userId)
  return { conversation, messages: await query('SELECT id,role,text,sent_at,edited_at,deleted_at,attachment_json FROM miniapp_messages WHERE conversation_id=?1 ORDER BY sent_at ASC LIMIT 500', [String(conversation.id)]) }
}

export async function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) {
  const clean = String(text || '').trim()
  if (!clean) throw new Error('message_required')
  const conversation = await getConversation(userId)
  const sentAt = new Date().toISOString()
  const id = crypto.randomUUID()
  await query('INSERT INTO miniapp_messages (id,conversation_id,role,text,sent_at,attachment_json) VALUES (?1,?2,?3,?4,?5,?6)', [id, String(conversation.id), role, clean, sentAt, attachment ? JSON.stringify(attachment) : null])
  await query('UPDATE miniapp_conversations SET updated_at=?1 WHERE id=?2', [sentAt, String(conversation.id)])
  return { id, role, text: clean, sent_at: sentAt, attachment_json: attachment ? JSON.stringify(attachment) : null }
}

export async function editMessage(userId: string, id: string, text: string) {
  const conversation = await getConversation(userId)
  return query("UPDATE miniapp_messages SET text=?1, edited_at=?2 WHERE id=?3 AND conversation_id=?4 AND role='user' AND deleted_at IS NULL", [String(text).trim(), new Date().toISOString(), id, String(conversation.id)])
}

export async function deleteMessage(userId: string, id: string) {
  const conversation = await getConversation(userId)
  return query("UPDATE miniapp_messages SET text='[Message supprimé]', deleted_at=?1 WHERE id=?2 AND conversation_id=?3 AND role='user' AND deleted_at IS NULL", [new Date().toISOString(), id, String(conversation.id)])
}
