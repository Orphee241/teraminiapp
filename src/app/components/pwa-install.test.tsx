import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())

describe('PWA installation entry point', () => {
  it('declares a standalone Teraminiapp manifest and service worker', () => {
    const manifest = readFileSync(resolve(root, 'public/manifest.webmanifest'), 'utf8')
    const worker = readFileSync(resolve(root, 'public/sw.js'), 'utf8')
    expect(manifest).toContain('"display": "standalone"')
    expect(manifest).toContain('"start_url": "/?source=pwa"')
    expect(manifest).toContain('/teraminiapp-icon.svg')
    expect(worker).toContain("self.addEventListener('fetch'")
  })

  it('offers the installation invitation only outside standalone mode', () => {
    const component = readFileSync(resolve(root, 'src/app/components/PwaInstallPrompt.tsx'), 'utf8')
    expect(component).toContain("beforeinstallprompt")
    expect(component).toContain("display-mode: standalone")
    expect(component).toContain('Installer Teraminiapp')
    expect(component).toContain('Ouvrir le navigateur pour installer')
    expect(component).not.toContain('teraminiapp-pwa-prompt-dismissed')
  })
})
