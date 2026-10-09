import type { Metadata } from 'next'
import { Oswald, Bebas_Neue } from 'next/font/google'
import './globals.css'

const oswald = Oswald({ subsets:['latin'], variable:'--font-oswald', weight:['300','400','500','600','700'], display:'swap' })
const bebas = Bebas_Neue({ subsets:['latin'], variable:'--font-bebas', weight:'400', display:'swap' })

export const metadata: Metadata = {
  title: { default:'Terainterface — Mini-app', template:'%s | Terainterface' },
  description:'Accédez aux services Terainterface, demandez un devis et suivez vos demandes depuis la mini-app.',
  applicationName:'Terainterface Mini-app',
}

export default function RootLayout({ children }:{children:React.ReactNode}) {
  return <html lang="fr"><body className={`${oswald.variable} ${bebas.variable}`}>{children}</body></html>
}
