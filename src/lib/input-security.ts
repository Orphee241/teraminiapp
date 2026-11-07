export const MAX_MESSAGE_LENGTH = 4000
export const MAX_PROFILE_TEXT_LENGTH = 240

export function boundedText(value: unknown, max = MAX_PROFILE_TEXT_LENGTH): string {
  return String(value ?? '').trim().slice(0, max)
}

export function validMessage(value: unknown): string {
  const text = boundedText(value, MAX_MESSAGE_LENGTH)
  if (!text) throw new Error('message_required')
  return text
}

export function validTelegramId(value: unknown): string {
  const id = String(value ?? '').trim()
  if (!/^\d{1,20}$/.test(id)) throw new Error('telegram_id_invalid')
  return id
}
