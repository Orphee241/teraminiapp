import * as rateLimit from './rate-limit-infrastructure'

/** Shared security adapter; only this boundary reaches persistent rate-limit storage. */
export function consumePersistentRateLimit(scope: string, maximum: number, windowMs: number, now?: number) { return rateLimit.consumePersistentRateLimit(scope, maximum, windowMs, now) }
export function resetPersistentRateLimit(scope: string) { return rateLimit.resetPersistentRateLimit(scope) }
