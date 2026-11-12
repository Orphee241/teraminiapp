import * as storage from '../../../lib/storage'

/** Conversation persistence boundary. Keep storage implementation private to this module. */
export function listMessages(userId: string) { return storage.listMessages(userId) }
export function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) { return storage.saveMessage(userId, role, text, attachment) }
export function editMessage(userId: string, id: string, text: string) { return storage.editMessage(userId, id, text) }
export function deleteMessage(userId: string, id: string) { return storage.deleteMessage(userId, id) }
