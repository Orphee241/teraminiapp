import { ensureSchema, query, ownedLogoKey, signedLogoUrl } from '../../../lib/storage'

export async function getProfile(telegramId: string) {
  await ensureSchema()
  const rows = await query('SELECT telegram_id,username,first_name,last_name,language_code,photo_url,email,phone,address,company_name,nif,rccm,logo_url,brand_color FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId])
  const profile = rows[0] || { telegram_id: telegramId, username: '', first_name: '', last_name: '', language_code: '', photo_url: '', email: '', company_name: '', phone: '', address: '', nif: '', rccm: '', logo_url: '', brand_color: '#D71920' }
  const storedLogo = String(profile.logo_url || '')
  const key = ownedLogoKey(telegramId, storedLogo)
  if (!key) return { ...profile, logo_url: '' }
  if (storedLogo !== key) await query('UPDATE miniapp_profiles SET logo_url=?1 WHERE telegram_id=?2', [key, telegramId])
  return { ...profile, logo_url: await signedLogoUrl(telegramId, key) }
}
export async function updateProfile(telegramId: string, profile: Record<string, string>) {
  await ensureSchema()
  const brandColor = String(profile.brand_color || '#D71920').trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) throw new Error('brand_color_invalid')
  const logoReference = String(profile.logo_url || '').trim()
  const logoKey = logoReference ? ownedLogoKey(telegramId, logoReference) : ''
  if (logoReference && !logoKey) throw new Error('logo_reference_invalid')
  await query('UPDATE miniapp_profiles SET company_name=?1,phone=?2,address=?3,nif=?4,rccm=?5,logo_url=?6,brand_color=?7,updated_at=?8 WHERE telegram_id=?9', [profile.company_name || '', profile.phone || '', profile.address || '', profile.nif || '', profile.rccm || '', logoKey, brandColor.toUpperCase(), new Date().toISOString(), telegramId])
  return getProfile(telegramId)
}
export async function updateProfileFields(telegramId: string, fields: Record<string, string>) {
  await ensureSchema()
  const allowed = ['company_name', 'phone', 'address', 'nif', 'rccm', 'logo_url', 'brand_color']
  const entries = Object.entries(fields).filter(([key, value]) => allowed.includes(key) && typeof value === 'string')
  if (!entries.length) return getProfile(telegramId)
  const next = { ...fields }
  if (next.brand_color !== undefined) {
    const color = String(next.brand_color).trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('brand_color_invalid')
    next.brand_color = color.toUpperCase()
  }
  if (next.logo_url !== undefined) {
    const reference = String(next.logo_url).trim()
    next.logo_url = reference ? ownedLogoKey(telegramId, reference) : ''
    if (reference && !next.logo_url) throw new Error('logo_reference_invalid')
  }
  const assignments: string[] = []
  const args: unknown[] = []
  for (const [key] of entries) { assignments.push(`${key}=?${args.length + 1}`); args.push(next[key]) }
  assignments.push(`updated_at=?${args.length + 1}`); args.push(new Date().toISOString()); args.push(telegramId)
  await query(`UPDATE miniapp_profiles SET ${assignments.join(',')} WHERE telegram_id=?${args.length}`, args)
  return getProfile(telegramId)
}
export async function freshLogoUrl(telegramId: string) {
  await ensureSchema()
  const rows = await query('SELECT logo_url FROM miniapp_profiles WHERE telegram_id=?1 LIMIT 1', [telegramId])
  const reference = String(rows[0]?.logo_url || '')
  const key = ownedLogoKey(telegramId, reference)
  if (!key) return ''
  if (reference !== key) await query('UPDATE miniapp_profiles SET logo_url=?1 WHERE telegram_id=?2', [key, telegramId])
  return signedLogoUrl(telegramId, key)
}
