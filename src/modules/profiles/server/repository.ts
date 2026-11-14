import * as profiles from './infrastructure'
import { upsertProfile, uploadLogo } from '../../../lib/storage'

/** Profile persistence boundary for identity, presence, and branding. */
export function getProfile(telegramId: string) { return profiles.getProfile(telegramId) }
export function updateProfile(telegramId: string, profile: Record<string, string>) { return profiles.updateProfile(telegramId, profile) }
export function updateProfileFields(telegramId: string, fields: Record<string, string>) { return profiles.updateProfileFields(telegramId, fields) }
export { upsertProfile, uploadLogo }
export function freshLogoUrl(telegramId: string) { return profiles.freshLogoUrl(telegramId) }
