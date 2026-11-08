import { describe, expect, it } from 'vitest'
import { readBoundedBytes, RequestBodyLimitError } from '../../lib/request-body'
import { takeRateLimit } from '../../lib/rate-limit'

describe('request body limits', () => {
  it('rejects chunked bodies that cross the cap before collecting the remainder', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(5)); controller.enqueue(new Uint8Array(5)); controller.close() },
    })
    const request = new Request('https://example.test', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' })
    await expect(readBoundedBytes(request, 8)).rejects.toBeInstanceOf(RequestBodyLimitError)
  })

  it('rejects malformed and oversized declared lengths', async () => {
    await expect(readBoundedBytes(new Request('https://example.test', { method: 'POST', headers: { 'content-length': 'not-a-number' }, body: '{}' }), 100)).rejects.toBeInstanceOf(RequestBodyLimitError)
    await expect(readBoundedBytes(new Request('https://example.test', { method: 'POST', body: '12345' }), 4)).rejects.toBeInstanceOf(RequestBodyLimitError)
  })
})

describe('per-process abuse limiter', () => {
  it('allows the configured number, blocks excess, then resets at window expiry', () => {
    expect(takeRateLimit('test-user', 2, 1000, 10000)).toBe(true)
    expect(takeRateLimit('test-user', 2, 1000, 10001)).toBe(true)
    expect(takeRateLimit('test-user', 2, 1000, 10002)).toBe(false)
    expect(takeRateLimit('test-user', 2, 1000, 11000)).toBe(true)
  })
})
