'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import AvatarBuilder from '@/components/AvatarBuilder'
import TopNav from '@/components/TopNav'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { recordAvatarSaved } from '@/lib/gamification'
import { useTheme } from '@/lib/useTheme'
import { pushSupported, getPushSubscriptionState, subscribeToPush, unsubscribeFromPush } from '@/lib/push'

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const { theme, toggle: toggleTheme } = useTheme()
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [pushState, setPushState] = useState('checking') // unsupported | not-subscribed | subscribed | checking
  const [pushBusy, setPushBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getPushSubscriptionState().then(setPushState)
  }, [])

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

      <div className="card" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>{theme === 'dark' ? '🌙 Thème sombre' : '☀️ Thème clair'}</span>
        <button className="btn btn-secondary" style={{ padding: '8px 14px', minHeight: 36, fontSize: 13 }} onClick={toggleTheme}>
          Passer en {theme === 'dark' ? 'clair' : 'sombre'}
        </button>
      </div>

      {pushState !== 'unsupported' && pushState !== 'checking' && (
        <div className="card" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>🔔 Rappel de séance</span>
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 14px', minHeight: 36, fontSize: 13 }}
            disabled={pushBusy}
            onClick={async () => {
              setPushBusy(true)
              try {
                if (pushState === 'subscribed') {
                  await unsubscribeFromPush(supabase)
                  setPushState('not-subscribed')
                } else {
                  await subscribeToPush(supabase, user.id)
                  setPushState('subscribed')
                }
              } catch (e) {
                console.error(e)
              }
              setPushBusy(false)
            }}
          >
            {pushBusy ? '…' : pushState === 'subscribed' ? 'Désactiver' : 'Activer'}
          </button>
        </div>
      )}

      <button
        className="link-action"
        style={{ fontSize: 13, display: 'block', margin: '16px auto 0' }}
        disabled={exporting}
        onClick={async () => {
          setExporting(true)
          try {
            const [{ data: programs }, { data: sessions }, { data: measurements }] = await Promise.all([
              supabase.from('programs').select('*, program_days(*, exercise_groups(*, group_exercises(*)))').eq('user_id', user.id),
              supabase.from('sessions').select('*, logged_sets(*)').eq('user_id', user.id),
              supabase.from('body_measurements').select('*').eq('user_id', user.id)
            ])
            const payload = { exported_at: new Date().toISOString(), programs, sessions, body_measurements: measurements }
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `fonte-export-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
          } finally {
            setExporting(false)
          }
        }}
      >
        {exporting ? 'Préparation…' : '⬇️ Exporter mes données (JSON)'}
      </button>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link href="/corps" className="link-action" style={{ fontSize: 13 }}>
          ⚖️ Suivi du poids et des mensurations
        </Link>
      </div>
    </div>
  )
}
