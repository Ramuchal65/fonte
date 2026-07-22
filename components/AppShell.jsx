'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import BottomNav from './BottomNav'

// Masque la nav sur les écrans plein écran où elle distrairait plus
// qu'elle n'aide : séance en cours, onboarding.
const HIDDEN_PREFIXES = ['/session/', '/onboarding']

export default function AppShell({ children }) {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const hideNav = HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))
  const showNav = loggedIn && !hideNav

  return (
    <>
      <div style={{ paddingBottom: showNav ? 64 : 0 }}>{children}</div>
      <BottomNav visible={showNav} />
    </>
  )
}
