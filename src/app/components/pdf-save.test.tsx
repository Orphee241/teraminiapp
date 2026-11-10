import { afterEach, expect, it, vi } from 'vitest'
import { savePdf } from '../../lib/document-download'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
it('keeps the nonempty blob alive for 60 seconds then revokes it', async () => {
  vi.useFakeTimers()
  const create = vi.fn(() => 'blob:cleanup')
  const revoke = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await savePdf(new Uint8Array([37, 80, 68, 70, 45]).buffer, 'test.pdf')
  expect((create.mock.calls as unknown as Array<[Blob]>)[0][0].size).toBe(5)
  vi.advanceTimersByTime(59_999)
  expect(revoke).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(revoke).toHaveBeenCalledWith('blob:cleanup')
})
it('rejects empty bytes before creating a file', async () => {
  await expect(savePdf(new ArrayBuffer(0), 'empty.pdf')).rejects.toThrow('vide')
})
