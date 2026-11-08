export class RequestBodyLimitError extends Error {
  constructor() { super('request_body_invalid_or_too_large'); this.name = 'RequestBodyLimitError' }
}

export async function readBoundedBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = request.headers.get('content-length')
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new RequestBodyLimitError()
    const length = Number(declared)
    if (!Number.isSafeInteger(length) || length > maxBytes) throw new RequestBodyLimitError()
  }
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new RequestBodyLimitError()
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readBoundedBytes(request, maxBytes))) }
  catch (error) {
    if (error instanceof RequestBodyLimitError) throw error
    throw new Error('request_json_invalid')
  }
}

export async function readBoundedFormData(request: Request, maxBytes: number): Promise<FormData> {
  const body = await readBoundedBytes(request, maxBytes)
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  return new Request(request.url, { method: request.method, headers, body: body as BodyInit }).formData()
}
