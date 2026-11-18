export function configuredServiceUrl(raw: string | undefined): string {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    const internalServiceName = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(url.hostname) && !url.hostname.includes('.')
    const localDevelopment = process.env.NODE_ENV !== 'production' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    const allowedHttp = url.protocol === 'http:' && (localDevelopment || internalServiceName)
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !allowedHttp)) return ''
    return url.toString().replace(/\/$/, '')
  } catch { return '' }
}

export function requestTimeout(milliseconds: number) {
  return AbortSignal.timeout(milliseconds)
}

export function isAllowedHttpsUrl(raw: unknown, allowedHosts: string[], allowAnyHttps = false) {
  if (typeof raw !== 'string') return false
  try { const url = new URL(raw); return url.protocol === 'https:' && (allowAnyHttps || allowedHosts.some(host => url.hostname === host)) } catch { return false }
}
