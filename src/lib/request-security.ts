import { consumePersistentRateLimit, resetPersistentRateLimit } from './storage'

export async function enforcePersistentRateLimit(userId: string, action: string, perUserMax: number, globalMax: number, windowMs: number) {
  try {
    const userAllowed = await consumePersistentRateLimit(`${action}:user:${userId}`, perUserMax, windowMs)
    if (!userAllowed) return { available: true, allowed: false }
    const globalAllowed = await consumePersistentRateLimit(`${action}:global`, globalMax, windowMs)
    return { available: true, allowed: globalAllowed }
  } catch {
    return { available: false, allowed: false }
  }
}

export async function resetPersistentRateLimitForUser(userId: string, action: string) {
  return resetPersistentRateLimit(`${action}:user:${userId}`)
}
