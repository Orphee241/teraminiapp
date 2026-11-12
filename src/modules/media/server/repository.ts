import * as storage from '../../../lib/storage'
import { saveMessage } from '../../conversations/server/repository'

/** Media persistence boundary for uploads and attachment metadata. */
export function uploadObject(userId: string, file: File) { return storage.uploadObject(userId, file) }
export { saveMessage }
