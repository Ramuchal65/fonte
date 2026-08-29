'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import { getPeriodRecap } from '@/lib/gamification'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return `${h} h ${m}`
}

function BigStat({ value, label }) {
  return (
    <div style={{ textAlign: 'center', flex: '1 1 40%' }}>
      <p className="display tabular" style={{ fontSize: 32, lineHeight: 1 }}>{value}</p>
      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{label}</p>
    </div>
  )
}

export default function BilanPage() {
  const supabase = createClient()
  const router = useRouter()
  const [recap, setRecap] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const data = await getPeriodRecap(supabase, user.id, 30)
      setRecap(data)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  const hasActivity = recap.sessions_count > 0

  return (
    <div className="container">
      <TopNav />
      <p className="muted" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 4 }}>
        30 derniers jours
      </p>
      <h1 style={{ fontSize: 26, textAlign: 'center', marginBottom: 28 }}>Ton bilan</h1>

      {!hasActivity ? (
        <p className="muted" style={{ textAlign: 'center' }}>Pas encore de séance terminée sur cette période.</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <BigStat value={recap.sessions_count} label={`séance${recap.sessions_count > 1 ? 's' : ''}`} />
              <BigStat value={Math.round(recap.total_volume_kg).toLocaleString('fr-FR')} label="kg soulevés au total" />
              <BigStat value={recap.total_reps} label="répétitions" />
              <BigStat value={formatDuration(recap.total_duration_seconds)} label="passées à t'entraîner" />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 15, marginBottom: 4 }}>
              🔥 <strong className="tabular">{recap.total_xp}</strong> XP gagnée
            </p>
            {recap.achievements_unlocked > 0 && (
              <p style={{ fontSize: 15 }}>
                🏅 <strong className="tabular">{recap.achievements_unlocked}</strong> nouveau{recap.achievements_unlocked > 1 ? 'x' : ''} succès débloqué{recap.achievements_unlocked > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {recap.top_exercise && (
            <div className="card">
              <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                Exercice le plus travaillé
              </p>
              <p style={{ fontSize: 18, fontWeight: 600 }}>{recap.top_exercise}</p>
              <p className="muted tabular" style={{ fontSize: 13 }}>{recap.top_exercise_sets} séries</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
