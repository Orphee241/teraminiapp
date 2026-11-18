export type EntertainmentSection = 'audio' | 'video'

export const entertainmentSections: { id: EntertainmentSection; label: string; description: string }[] = [
  { id: 'audio', label: 'Audio', description: 'Télécharger un audio depuis un lien YouTube.' },
  { id: 'video', label: 'Vidéo', description: 'Espace vidéo — bientôt disponible.' },
]

export type AudioJobState = 'queued' | 'processing' | 'completed' | 'failed'
export type AudioJob = { id: string; sourceUrl: string; state: AudioJobState; title?: string; error?: string }

export function isSupportedYouTubeUrl(input: string): boolean {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) return false
    if (host === 'youtu.be') return url.pathname.replace(/^\/+/, '').length > 0
    return url.pathname === '/watch' ? Boolean(url.searchParams.get('v')) : /^\/(shorts|live|embed)\/[^/]+/.test(url.pathname)
  } catch { return false }
}
