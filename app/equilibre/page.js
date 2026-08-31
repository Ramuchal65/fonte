'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

const MUSCLE_GROUP_LABELS = {
  pectoraux: 'Pectoraux', dos: 'Dos', epaules: 'Épaules',
  biceps: 'Biceps', triceps: 'Triceps', avant_bras: 'Avant-bras',
  quadriceps: 'Quadriceps', ischios_jambiers: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
  hanches: 'Hanches', nuque: 'Nuque',
  core: 'Core', cardio: 'Cardio', etirements: 'Étirements', full_body: 'Full body'
}

const PERIODS = [
  { key: 7, label: '7 jours' },
  { key: 30, label: '30 jours' }
]

export default function EquilibrePage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)
  const [rows, setRows] = useState([]) // [{muscle_group, sets}]
  const [unmatchedCount, setUnmatchedCount] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const since = new Date(Date.now() - period * 86400000).toISOString()
      const { data: sets } = await supabase
        .from('logged_sets')
        .select('exercise_name, sessions!inner(user_id, finished_at)')
        .eq('sessions.user_id', user.id)
        .gte('sessions.finished_at', since)
        .not('sessions.finished_at', 'is', null)

      const names = [...new Set((sets ?? []).map(s => s.exercise_name))]
      const { data: catalog } = await supabase
        .from('exercise_catalog')
        .select('canonical_name, muscle_group')
        .in('canonical_name', names)
      const groupByName = {}
      for (const c of catalog ?? []) groupByName[c.canonical_name] = c.muscle_group

      const counts = {}
      let unmatched = 0
      for (const s of sets ?? []) {
        const group = groupByName[s.exercise_name]
        if (!group) { unmatched++; continue }
        counts[group] = (counts[group] || 0) + 1
      }
      const sorted = Object.entries(counts)
        .map(([muscle_group, sets]) => ({ muscle_group, sets }))
        .sort((a, b) => b.sets - a.sets)

      setRows(sorted)
      setUnmatchedCount(unmatched)
      setLoading(false)
    }
    setLoading(true)
    init()
  }, [period])

  const maxSets = Math.max(1, ...rows.map(r => r.sets))

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Équilibre musculaire</h1>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px', minHeight: 'auto', fontSize: 13,
              background: period === p.key ? 'var(--accent-rest)' : undefined,
              color: period === p.key ? '#14140F' : undefined
            }}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Pas de séries loggées sur cette période.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map(r => (
              <div key={r.muscle_group}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span>{MUSCLE_GROUP_LABELS[r.muscle_group] || r.muscle_group}</span>
                  <span className="muted tabular">{r.sets} série{r.sets > 1 ? 's' : ''}</span>
                </div>
                <div style={{ background: 'var(--surface-raised)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <div style={{
                    background: 'var(--accent-rest)', height: '100%',
                    width: `${(r.sets / maxSets) * 100}%`, transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {unmatchedCount > 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
              {unmatchedCount} série{unmatchedCount > 1 ? 's' : ''} sur un exercice non reconnu par le référentiel, non comptée{unmatchedCount > 1 ? 's' : ''} ici.
            </p>
          )}
        </>
      )}
    </div>
  )
}
