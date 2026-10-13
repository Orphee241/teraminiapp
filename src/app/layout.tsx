import type { Metadata } from 'next'
import Script from 'next/script'
import { Oswald, Bebas_Neue } from 'next/font/google'
import './globals.css'

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const oswald = Oswald({ subsets: ['latin'], variable: '--font-oswald', weight: ['300', '400', '500', '600', '700'], display: 'swap' })
const bebas = Bebas_Neue({ subsets: ['latin'], variable: '--font-bebas', weight: '400', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Terainterface — Mini-app', template: '%s | Terainterface' },
  description: 'Gérez vos devis et factures depuis Terainterface.',
  applicationName: 'Terainterface Mini-app',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body className={`${oswald.variable} ${bebas.variable}`}><Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />{children}</body></html>
}
