import * as storage from '../../../lib/storage'

/** Profile persistence boundary for identity, presence, and branding. */
export function getProfile(telegramId: string) { return storage.getProfile(telegramId) }
export function updateProfile(telegramId: string, profile: Record<string, string>) { return storage.updateProfile(telegramId, profile) }
export function updateProfileFields(telegramId: string, fields: Record<string, string>) { return storage.updateProfileFields(telegramId, fields) }
export function upsertProfile(profile: Record<string, string>) { return storage.upsertProfile(profile) }
export function uploadLogo(userId: string, file: File) { return storage.uploadLogo(userId, file) }
export function freshLogoUrl(telegramId: string) { return storage.freshLogoUrl(telegramId) }
