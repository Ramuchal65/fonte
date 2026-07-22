import './globals.css'
import AppShell from '@/components/AppShell'

export const metadata = {
  title: 'Fonte — suivi de musculation',
  description: 'Colle ton programme, on s\'occupe de la saisie.'
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
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
