import * as conversation from './infrastructure'

/** Conversation persistence boundary. Routes depend on this module, not the storage kernel. */
export function listMessages(userId: string) { return conversation.listMessages(userId) }
export function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) { return conversation.saveMessage(userId, role, text, attachment) }
export function editMessage(userId: string, id: string, text: string) { return conversation.editMessage(userId, id, text) }
export function deleteMessage(userId: string, id: string) { return conversation.deleteMessage(userId, id) }
