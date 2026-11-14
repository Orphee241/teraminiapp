import { describe, expect, it } from 'vitest'
import { boundedText, validMessage, validTelegramId } from '../../lib/input-security'

describe('input security', () => {
  it('bounds arbitrary text and message size', () => {
    expect(boundedText(' <script>alert(1)</script> ', 10)).toBe('<script>al')
    expect(() => validMessage('')).toThrow('message_required')
    expect(validMessage('a'.repeat(5000))).toHaveLength(4000)
  })

  it('accepts only bounded numeric Telegram identifiers', () => {
    expect(validTelegramId('12345')).toBe('12345')
    expect(() => validTelegramId('1 OR 1=1')).toThrow('telegram_id_invalid')
    expect(() => validTelegramId('')).toThrow('telegram_id_invalid')
  })
})
