import { describe, expect, it } from 'vitest'
import { matchesDeclaredMediaType } from '../../lib/media-validation'

describe('uploaded media signature validation', () => {
  it('accepts matching image, audio and PDF signatures', () => {
    expect(matchesDeclaredMediaType('image/png', Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))).toBe(true)
    expect(matchesDeclaredMediaType('image/jpeg', Uint8Array.from([0xff,0xd8,0xff]))).toBe(true)
    expect(matchesDeclaredMediaType('audio/ogg', Uint8Array.from([0x4f,0x67,0x67,0x53]))).toBe(true)
    expect(matchesDeclaredMediaType('application/pdf', Uint8Array.from([0x25,0x50,0x44,0x46,0x2d]))).toBe(true)
  })
  it('rejects a spoofed MIME type and truncated signatures', () => {
    expect(matchesDeclaredMediaType('image/png', Uint8Array.from([0x25,0x50,0x44,0x46,0x2d]))).toBe(false)
    expect(matchesDeclaredMediaType('image/webp', Uint8Array.from([0x52,0x49,0x46,0x46]))).toBe(false)
    expect(matchesDeclaredMediaType('application/x-msdownload', new Uint8Array([1,2,3]))).toBe(false)
  })
})
