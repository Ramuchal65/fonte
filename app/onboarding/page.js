'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import AvatarBuilder from '@/components/AvatarBuilder'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('user_id', u.id).maybeSingle()
      if (profile) { router.push('/'); return } // déjà onboardé
      setUser(u)
    }
    check()
  }, [])

  const save = async (pseudo, avatar) => {
    setSaving(true)
    setError('')
    const { error: insertErr } = await supabase.from('profiles').insert({ user_id: user.id, pseudo, avatar })
    setSaving(false)
    if (insertErr) {
      if (insertErr.code === '23505') setError('Ce pseudo est déjà pris, essaie-en un autre.')
      else if (insertErr.code === '23514') setError('Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, - ou _).')
      else setError(insertErr.message)
      return
    }
    router.push('/')
  }

  if (user === undefined) return null

  return (
    <div className="container" style={{ paddingTop: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Bienvenue 👋</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Choisis ton pseudo et personnalise ton avatar. Tu pourras le modifier à tout moment depuis ton profil.
      </p>
      <AvatarBuilder
        initialAvatar={DEFAULT_AVATAR}
        showPseudoField
        onSave={save}
        saving={saving}
        error={error}
        submitLabel="C'est parti"
      />
    </div>
  )
}
