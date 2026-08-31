'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import BottomNav from './BottomNav'
import { useTheme } from '@/lib/useTheme'
import { getRoomState } from '@/lib/gamification'

// Masque la nav sur les écrans plein écran où elle distrairait plus
// qu'elle n'aide : séance en cours, onboarding.
const HIDDEN_PREFIXES = ['/session/', '/onboarding']

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [hasNotification, setHasNotification] = useState(false)

  useTheme() // applique le thème sauvegardé dès le premier rendu, sur toutes les pages

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* pas grave, juste pas de push */ })
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Petit point rouge sur l'onglet "Ma salle" s'il y a un choix
  // d'équipement en attente — évite d'avoir à y penser pour aller voir.
  useEffect(() => {
    if (!loggedIn) return
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      try {
        const room = await getRoomState(supabase, data.user.id)
        setHasNotification((room?.pending_choices ?? 0) > 0)
      } catch (e) { /* purement décoratif */ }
    })
  }, [loggedIn, pathname])

  const hideNav = HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))
  const showNav = loggedIn && !hideNav

  return (
    <>
      <div style={{ paddingBottom: showNav ? 64 : 0 }}>{children}</div>
      <BottomNav visible={showNav} notifyPaths={hasNotification ? ['/salle'] : []} />
    </>
  )
}
