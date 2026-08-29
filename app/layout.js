import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata = {
  title: 'Fonte — suivi de musculation',
  description: 'Colle ton programme, on s\'occupe de la saisie.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png'
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fonte'
  }
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#14140F'
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
