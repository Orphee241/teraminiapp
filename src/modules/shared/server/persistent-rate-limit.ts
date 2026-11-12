/** Shared security adapter; only this boundary reaches persistent rate-limit storage. */
export {
  consumePersistentRateLimit,
  resetPersistentRateLimit,
} from '../../../lib/storage'
