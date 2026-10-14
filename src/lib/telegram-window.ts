// Telegram controls its host window. The Web App can request a larger viewport
// or close itself, but there is no supported native minimize-window method.
export type TelegramWindow = {
  platform?: string
  ready: () => void
  expand: () => void
  isVersionAtLeast?: (version: string) => boolean
  requestFullscreen?: () => void
  exitFullscreen?: () => void
  isFullscreen?: boolean
  onEvent?: (event: string, callback: () => void) => void
  offEvent?: (event: string, callback: () => void) => void
  close?: () => void
}

export function isDesktopTelegram(platform?: string): boolean {
  return ['tdesktop', 'windows', 'macos', 'linux', 'weba', 'webk', 'web'].includes(platform || '')
}

export function toggleTelegramFullscreen(webApp: Pick<TelegramWindow, 'isFullscreen' | 'requestFullscreen' | 'exitFullscreen'>): boolean {
  try {
    if (webApp.isFullscreen) {
      if (!webApp.exitFullscreen) return false
      webApp.exitFullscreen()
    } else {
      if (!webApp.requestFullscreen) return false
      webApp.requestFullscreen()
    }
    return true
  } catch {
    return false // Unsupported by the current Telegram client.
  }
}

export function openTelegramWindow(webApp: TelegramWindow): boolean {
  webApp.ready()
  webApp.expand()
  const desktop = isDesktopTelegram(webApp.platform)
  if (desktop && webApp.isVersionAtLeast?.('8.0')) {
    toggleTelegramFullscreen(webApp)
  }
  return desktop
}

export function closeTelegramWindow(webApp: Pick<TelegramWindow, 'close'>): boolean {
  if (!webApp.close) return false
  webApp.close()
  return true
}
