// Telegram controls its host window. The Web App can request a larger viewport
// or close itself, but there is no supported native minimize-window method.
export type TelegramWindow = {
  platform?: string
  ready: () => void
  expand: () => void
  isVersionAtLeast?: (version: string) => boolean
  requestFullscreen?: () => void
  exitFullscreen?: () => void
  requestSafeArea?: () => void
  requestContentSafeArea?: () => void
  safeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number }
  contentSafeAreaInset?: { top?: number; right?: number; bottom?: number; left?: number }
  isFullscreen?: boolean
  onEvent?: (event: string, callback: () => void) => void
  offEvent?: (event: string, callback: () => void) => void
  close?: () => void
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
  }
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
  // Prefer the native fullscreen capability whenever the client exposes it.
  // Some Telegram clients expose the method without a reliable version helper.
  if (webApp.isVersionAtLeast?.('8.0') || webApp.requestFullscreen) {
    // Opening/re-entering a page must be idempotent: toggle would exit fullscreen
    // when Telegram reports that the Mini App is already fullscreen.
    if (!webApp.isFullscreen) toggleTelegramFullscreen(webApp)
    webApp.requestSafeArea?.()
    webApp.requestContentSafeArea?.()
  }
  return desktop
}

export function configureTelegramBackButton(
  webApp: Pick< TelegramWindow, 'BackButton'>,
  visible: boolean,
  onBack: () => void,
): () => void {
  const button = webApp.BackButton
  if (!button) return () => undefined
  if (visible) {
    button.show()
    button.onClick(onBack)
  } else {
    button.hide()
  }
  return () => {
    button.offClick(onBack)
    button.hide()
  }
}

export function closeTelegramWindow(webApp: Pick<TelegramWindow, 'close'>): boolean {
  if (!webApp.close) return false
  webApp.close()
  return true
}
