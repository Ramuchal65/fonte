'use client'
import { createClient } from '@/lib/supabase-browser'

export default function LoginButton() {
  const supabase = createClient()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <button className="btn btn-primary btn-block" onClick={signIn}>
      Se connecter avec Google
    </button>
  )
}
