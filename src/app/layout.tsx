import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


export const metadata: Metadata = {
  title: { default: 'Terainterface', template: '%s | Terainterface' },
  description: 'Accède plus rapidement à nos services via notre Application',
  applicationName: 'Terainterface',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body><Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />{children}</body></html>
}
