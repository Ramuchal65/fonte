'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import BadgeIcon from '@/components/BadgeIcon'
import { getAchievementsState, debugUnlockRandomAchievement, debugResetAchievements } from '@/lib/gamification'

const CATEGORY_LABELS = {
  assiduite: 'Assiduité',
  performance: 'Performance',
  programme: 'Programme',
  avatar: 'Avatar',
  salle: 'Salle'
}

const DEBUG_TOOLS_ENABLED = process.env.NEXT_PUBLIC_DEBUG_TOOLS !== 'false'

export default function SuccesPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [achievements, setAchievements] = useState(null)
  const [selected, setSelected] = useState(null)
  const [debugBusy, setDebugBusy] = useState(false)

  const load = async (uid) => {
    const data = await getAchievementsState(supabase, uid)
    setAchievements(data)
  }

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)
      await load(u.id)
    }
    init()
  }, [])

  const handleDebugUnlock = async () => {
    if (!user || debugBusy) return
    setDebugBusy(true)
    await debugUnlockRandomAchievement(supabase, user.id)
    await load(user.id)
    setDebugBusy(false)
  }

  const handleDebugReset = async () => {
    if (!user || debugBusy) return
    if (!confirm('Reverrouiller tous tes succès (données de test uniquement) ?')) return
    setDebugBusy(true)
    await debugResetAchievements(supabase, user.id)
    await load(user.id)
    setDebugBusy(false)
  }

  if (!achievements) {
    return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>
  }

  const byCategory = {}
  for (const a of achievements) {
    (byCategory[a.category] ??= []).push(a)
  }
  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Mes succès</h1>
      <p className="muted tabular" style={{ marginBottom: 24 }}>
        {unlockedCount} / {achievements.length} débloqués
      </p>

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {CATEGORY_LABELS[cat] || cat}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 12 }}>
            {items.map(a => (
              <button
                key={a.slug}
                onClick={() => setSelected(a)}
                style={{ background: 'none', border: 'none', padding: 0, textAlign: 'center', cursor: 'pointer', color: 'inherit' }}
              >
                <BadgeIcon icon={a.badge_icon} tier={a.badge_tier} size={64} locked={!a.unlocked} />
                <p style={{ fontSize: 11, marginTop: 4, color: a.unlocked ? 'var(--text)' : 'var(--text-muted)' }}>
                  {a.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(20,20,15,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
          }}
        >
          <div className="card" style={{ maxWidth: 320, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <BadgeIcon icon={selected.badge_icon} tier={selected.badge_tier} size={88} locked={!selected.unlocked} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{selected.title}</p>
            <p className="muted" style={{ fontSize: 14, marginBottom: selected.unlocked ? 4 : 16 }}>{selected.description}</p>
            {selected.unlocked ? (
              <p className="muted tabular" style={{ fontSize: 12, marginBottom: 16 }}>
                Débloqué le {new Date(selected.unlocked_at).toLocaleDateString('fr-FR')}
              </p>
            ) : (
              <p className="muted" style={{ fontSize: 12, marginBottom: 16, fontStyle: 'italic' }}>Pas encore débloqué</p>
            )}
            <button className="btn btn-secondary btn-block" onClick={() => setSelected(null)}>Fermer</button>
          </div>
        </div>
      )}

      {DEBUG_TOOLS_ENABLED && (
        <div className="card" style={{ marginTop: 8, borderStyle: 'dashed' }}>
          <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Outils de test
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" disabled={debugBusy} onClick={handleDebugUnlock}>
              Débloquer un succès au hasard
            </button>
            <button className="btn btn-secondary" disabled={debugBusy} onClick={handleDebugReset}>
              Tout reverrouiller
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
