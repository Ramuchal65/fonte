'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import AvatarBuilder from '@/components/AvatarBuilder'
import TopNav from '@/components/TopNav'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { recordAvatarSaved } from '@/lib/gamification'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)
      const { data } = await supabase.from('profiles').select('*').eq('user_id', u.id).maybeSingle()
      if (!data) { router.push('/onboarding'); return }
      setProfile(data)
    }
    load()
  }, [])

  const save = async (pseudo, avatar) => {
    setSaving(true)
    setError('')
    setSaved(false)
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ pseudo, avatar, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    setSaving(false)
    if (updateErr) {
      if (updateErr.code === '23505') setError('Ce pseudo est déjà pris, essaie-en un autre.')
      else if (updateErr.code === '23514') setError('Le pseudo doit faire 3 à 20 caractères (lettres, chiffres, - ou _).')
      else setError(updateErr.message)
      return
    }
    setSaved(true)
    await recordAvatarSaved(supabase, user.id, avatar.outfit)
  }

  if (profile === null) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Mon profil</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Modifie ton pseudo ou ton avatar quand tu veux.</p>
      <AvatarBuilder
        initialAvatar={{ ...DEFAULT_AVATAR, ...profile.avatar }}
        initialPseudo={profile.pseudo}
        showPseudoField
        onSave={save}
        saving={saving}
        error={error}
        submitLabel="Mettre à jour"
      />
      {saved && <p style={{ color: 'var(--accent-rest)', marginTop: 12, textAlign: 'center' }}>Profil mis à jour ✓</p>}
    </div>
  )
}
