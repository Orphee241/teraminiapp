'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

type TelegramWindow = { Telegram?: { WebApp?: { openLink?: (url: string) => void } } }

export default function PwaInstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [installable, setInstallable] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [standalone, setStandalone] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    if (isStandalone) { setStandalone(true); return }
    const timer = window.setTimeout(() => setVisible(true), 5000)
    const onBeforeInstall = (event: Event) => { event.preventDefault(); deferredPrompt.current = event as BeforeInstallPromptEvent; setInstallable(true) }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => { window.clearTimeout(timer); window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
  }, [])

  if (standalone || !visible) return null
  const openBrowser = () => {
    const url = window.location.href
    const telegram = (window as unknown as TelegramWindow).Telegram?.WebApp
    if (telegram?.openLink) telegram.openLink(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  const install = async () => {
    if (!deferredPrompt.current) { setFallback(true); openBrowser(); return }
    await deferredPrompt.current.prompt()
    const result = await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setInstallable(false)
    setVisible(false)
    if (result.outcome === 'dismissed') setFallback(true)
  }
  return <div className="pwa-install-backdrop" role="presentation"><section className="pwa-install-card" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title"><button type="button" className="pwa-install-close" aria-label="Fermer" onClick={() => setVisible(false)}><X size={17} /></button><span className="pwa-install-icon"><Download size={21} /></span><h2 id="pwa-install-title">Installer Teraminiapp</h2>{fallback ? <p>Telegram n’a pas pu ouvrir automatiquement le navigateur. Appuyez encore sur le bouton, puis confirmez l’installation dans le navigateur.</p> : <p>Ajoutez Teraminiapp à votre écran d’accueil pour l’ouvrir comme une application indépendante.</p>}{!installable && <small>Le téléphone pourra ouvrir le navigateur pour confirmer l’installation.</small>}<button type="button" className="primary-button pwa-install-action" onClick={() => void install}>{fallback ? 'Réessayer dans le navigateur' : 'Installer l’application'}</button><button type="button" className="pwa-install-later" onClick={() => setVisible(false)}>Plus tard</button></section></div>
}
