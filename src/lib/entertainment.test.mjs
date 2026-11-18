import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isSupportedYouTubeUrl } from './entertainment.ts'

test('accepts supported YouTube watch, short, live, embed and mobile URLs', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=abc123',
    'https://youtu.be/abc123',
    'https://youtube.com/shorts/abc123',
    'https://youtube.com/live/abc123',
    'https://youtube.com/embed/abc123',
    'https://m.youtube.com/watch?v=abc123',
  ]) assert.equal(isSupportedYouTubeUrl(url), true, url)
})

test('rejects non-YouTube hosts, missing IDs and malformed schemes', () => {
  for (const url of [
    'https://evil-youtube.com/watch?v=abc',
    'https://youtube.com/watch',
    'https://youtu.be/',
    'javascript:alert(1)',
    'not a URL',
  ]) assert.equal(isSupportedYouTubeUrl(url), false, url)
})
