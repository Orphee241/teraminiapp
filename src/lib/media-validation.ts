export function matchesDeclaredMediaType(type: string, bytes: Uint8Array): boolean {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
  switch (type) {
    case 'image/jpeg': return starts(0xff, 0xd8, 0xff)
    case 'image/png': return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'image/webp': return starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...Array.from(bytes.slice(8, 12))) === 'WEBP'
    case 'audio/ogg': return starts(0x4f, 0x67, 0x67, 0x53)
    case 'audio/mpeg': return starts(0x49, 0x44, 0x33) || (starts(0xff) && (bytes[1] & 0xe0) === 0xe0)
    case 'audio/mp4': return bytes.length >= 12 && String.fromCharCode(...Array.from(bytes.slice(4, 8))) === 'ftyp'
    case 'application/pdf': return starts(0x25, 0x50, 0x44, 0x46, 0x2d)
    default: return false
  }
}
