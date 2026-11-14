type CacheEntry = { payload: unknown; expiresAt: number }

const entries = new Map<string, CacheEntry>()
const ttlMs = 30_000

export function cachedDocumentList(key: string): unknown | null {
  const entry = entries.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key)
    return null
  }
  return entry.payload
}

export function cacheDocumentList(key: string, payload: unknown) {
  entries.set(key, { payload, expiresAt: Date.now() + ttlMs })
}

export function invalidateDocumentLists(owner: string) {
  for (const key of Array.from(entries.keys())) if (key.startsWith(`${owner}:`)) entries.delete(key)
}
