import * as storage from '../../../lib/storage'

/** Media persistence boundary for uploads and attachment metadata. */
export function uploadObject(userId: string, file: File) { return storage.uploadObject(userId, file) }
export function saveMessage(userId: string, role: 'user' | 'assistant', text: string, attachment?: Record<string, unknown>) { return storage.saveMessage(userId, role, text, attachment) }
