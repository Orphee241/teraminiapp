export function logoObjectKeyFromReference(userId: string, reference: string, bucket: string, internalIds: string[] = []): string {
  let path = String(reference || '').trim()
  if (!path || !userId) return ''
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) path = new URL(path).pathname
    path = decodeURIComponent(path)
    while (path.startsWith('/')) path = path.slice(1)
    const bucketPrefix = `${bucket}/`
    if (path.startsWith(bucketPrefix)) path = path.slice(bucketPrefix.length)
    const internal = new Set(internalIds.map(value => value.trim()).filter(Boolean)).has(String(userId))
    const allowedPrefix = internal ? `terainterface/logos/${userId}/` : `clients/${userId}/logos/`
    if (!path.startsWith(allowedPrefix) || path.split('/').includes('..')) return ''
    return path
  } catch { return '' }
}
