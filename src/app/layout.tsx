import type { Metadata } from 'next'
import Script from 'next/script'
import localFont from 'next/font/local'
import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


const oswald = localFont({
  src: [
    { path: './fonts/oswald-300.ttf', weight: '300' },
    { path: './fonts/oswald-400.ttf', weight: '400' },
    { path: './fonts/oswald-500.ttf', weight: '500' },
    { path: './fonts/oswald-600.ttf', weight: '600' },
    { path: './fonts/oswald-700.ttf', weight: '700' },
  ],
  variable: '--font-oswald',
  display: 'swap',
})
const bebas = localFont({ src: './fonts/bebas-neue-400.ttf', variable: '--font-bebas', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Terainterface', template: '%s | Terainterface' },
  description: 'Accède plus rapidement à nos services via notre Application',
  applicationName: 'Terainterface',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body className={`${oswald.variable} ${bebas.variable}`}><Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />{children}</body></html>
}
