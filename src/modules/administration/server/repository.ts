import * as administration from './infrastructure'

/** Administration persistence boundary. Admin routes do not reach storage directly. */
export function adminConversations() { return administration.adminConversations() }
export function adminMessages(id: string) { return administration.adminMessages(id) }
export function adminProfiles() { return administration.adminProfiles() }
export function adminConversationStats() { return administration.adminConversationStats() }
export function listAdmins() { return administration.listAdmins() }
export function lookupTelegramUser(telegramId: string) { return administration.lookupTelegramUser(telegramId) }
export function upsertAdmin(admin: Record<string, string>) { return administration.upsertAdmin(admin) }
export function deleteAdmin(telegramId: string) { return administration.deleteAdmin(telegramId) }
export function markProfileOfflineBefore(cutoffIso: string) { return administration.markProfileOfflineBefore(cutoffIso) }
export function isStoredAdmin(telegramId: string) { return administration.isStoredAdmin(telegramId) }
