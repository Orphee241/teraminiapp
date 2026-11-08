type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
let operations = 0
const maxBuckets = 20_000

function prune(now: number) {
  for (const [key, value] of Array.from(buckets.entries())) if (value.resetAt <= now) buckets.delete(key)
  if (buckets.size > maxBuckets) {
    const oldest = Array.from(buckets.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt)
    for (const [key] of oldest.slice(0, Math.max(1, buckets.size - maxBuckets))) buckets.delete(key)
  }
}

/** Per-process burst limiter. Add edge/shared-store limits for multi-instance deployments. */
export function takeRateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  if (!key || key.length > 256 || max < 1 || windowMs < 1) return false
  if ((operations++ & 127) === 0 || buckets.size > maxBuckets) prune(now)
  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  existing.count += 1
  return existing.count <= max
}

export function resetRateLimit(key: string) { buckets.delete(key) }
export function clearRateLimitsForTests() { buckets.clear(); operations = 0 }
