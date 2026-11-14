import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')
function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('modular monolith boundaries', () => {
  it('keeps API routes behind module adapters instead of importing the storage kernel', () => {
    const routeFiles = [
      'app/api/_auth.ts',
      'app/api/conversations/route.ts',
      'app/api/michelle/route.ts',
      'app/api/profile/route.ts',
      'app/api/profile/presence/route.ts',
      'app/api/profile/logo/route.ts',
      'app/api/media/route.ts',
      'app/api/admin/conversations/route.ts',
      'app/api/admin/access/route.ts',
    ]
    for (const file of routeFiles) expect(read(file)).not.toMatch(/from ['"].*lib\/storage['"]/) 
  })

  it('provides explicit server adapters for each business module', () => {
    expect(read('modules/conversations/server/repository.ts')).toContain('listMessages')
    expect(read('modules/conversations/server/infrastructure.ts')).toContain('getConversation')
    expect(read('modules/profiles/server/infrastructure.ts')).toContain('updateProfileFields')
    expect(read('modules/administration/server/infrastructure.ts')).toContain('adminProfiles')
    expect(read('modules/media/server/infrastructure.ts')).toContain('uploadObject')
    expect(read('lib/storage.ts')).not.toMatch(/export async function (uploadObject|getProfile|updateProfile|updateProfileFields|freshLogoUrl)/)
    expect(read('lib/storage.ts')).not.toMatch(/export async function (getConversation|listMessages|saveMessage|editMessage|deleteMessage|adminProfiles|adminConversations|adminMessages|listAdmins|isStoredAdmin|upsertAdmin|deleteAdmin)/)
  })

  it('keeps the storage kernel behind infrastructure adapters', () => {
    expect(read('modules/shared/server/rate-limit-infrastructure.ts')).toContain('consumePersistentRateLimit')
    expect(read('lib/storage.ts')).not.toMatch(/export async function (consumePersistentRateLimit|resetPersistentRateLimit)/)
  })
})
