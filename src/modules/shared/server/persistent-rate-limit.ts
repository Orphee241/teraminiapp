import * as storage from '../../../lib/storage'

/** Shared security adapter; only this boundary reaches persistent rate-limit storage. */
export function consumePersistentRateLimit(scope: string, maximum: number, windowMs: number, now?: number) { return storage.consumePersistentRateLimit(scope, maximum, windowMs, now) }
export function resetPersistentRateLimit(scope: string) { return storage.resetPersistentRateLimit(scope) }
