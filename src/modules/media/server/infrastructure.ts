import crypto from 'node:crypto'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { bucket, s3 } from '../../../lib/storage'
import { matchesDeclaredMediaType } from '../../../lib/media-validation'

export async function uploadObject(userId: string, file: File) {
  const client = s3()
  const targetBucket = bucket()
  if (!client) throw new Error('media_storage_unconfigured')
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'application/pdf'])
  if (!allowed.has(file.type)) throw new Error('media_type_forbidden')
  if (file.size > 15 * 1024 * 1024) throw new Error('media_too_large')
  const bytes = Buffer.from(await file.arrayBuffer())
  if (!matchesDeclaredMediaType(file.type, Uint8Array.from(bytes))) throw new Error('media_signature_invalid')
  const key = `teraminiapp/${userId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: key, Body: bytes, ContentType: file.type, Metadata: { owner: userId, application: 'terainterface-miniapp' } }))
  return { key, name: file.name.slice(0, 180).replace(/[^a-zA-Z0-9._-]/g, '-'), type: file.type, size: file.size, url: await getSignedUrl(client, new GetObjectCommand({ Bucket: targetBucket, Key: key }), { expiresIn: 900 }) }
}
