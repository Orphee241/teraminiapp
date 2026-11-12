import * as storage from '../../../lib/storage'

/** Administration persistence boundary. Admin routes do not reach storage directly. */
export function adminConversations() { return storage.adminConversations() }
export function adminMessages(id: string) { return storage.adminMessages(id) }
export function adminProfiles() { return storage.adminProfiles() }
export function adminConversationStats() { return storage.adminConversationStats() }
export function listAdmins() { return storage.listAdmins() }
export function lookupTelegramUser(telegramId: string) { return storage.lookupTelegramUser(telegramId) }
export function upsertAdmin(admin: Record<string, string>) { return storage.upsertAdmin(admin) }
export function deleteAdmin(telegramId: string) { return storage.deleteAdmin(telegramId) }
export function markProfileOfflineBefore(cutoffIso: string) { return storage.markProfileOfflineBefore(cutoffIso) }
export function isStoredAdmin(telegramId: string) { return storage.isStoredAdmin(telegramId) }
