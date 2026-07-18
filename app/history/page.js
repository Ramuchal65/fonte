'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

export default function HistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [exerciseNames, setExerciseNames] = useState([])
  const [selected, setSelected] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser(data.user)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('logged_sets')
        .select('exercise_name, sessions!inner(user_id)')
        .eq('sessions.user_id', user.id)
      const names = [...new Set((data ?? []).map(d => d.exercise_name))].sort((a, b) => a.localeCompare(b))
      setExerciseNames(names)
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!selected || !user) return
    async function loadEntries() {
      const { data } = await supabase
        .from('logged_sets')
        .select('reps, weight_kg, set_number, logged_at, sessions!inner(user_id)')
        .eq('exercise_name', selected)
        .eq('sessions.user_id', user.id)
        .order('logged_at', { ascending: true })
      setEntries(data ?? [])
    }
    loadEntries()
  }, [selected, user])

  // Regroupe les séries par séance (même jour + même heure à la minute près, via logged_at proche)
  const bySession = entries.reduce((acc, e) => {
    const dateKey = new Date(e.logged_at).toLocaleDateString('fr-FR')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(e)
    return acc
  }, {})

  const bestPerSession = Object.entries(bySession).map(([date, sets]) => ({
    date,
    maxWeight: Math.max(...sets.map(s => s.weight_kg))
  }))

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Historique des performances</h1>

      {exerciseNames.length === 0 && (
        <p className="muted">Pas encore de séries loggées.</p>
      )}

      {!selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exerciseNames.map(name => (
            <button
              key={name}
              className="card"
              style={{ textAlign: 'left', border: '1px solid var(--border)' }}
              onClick={() => setSelected(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <button
            className="muted"
            style={{ background: 'none', border: 'none', fontSize: 13, textDecoration: 'underline', marginBottom: 16, padding: 0 }}
            onClick={() => { setSelected(null); setEntries([]) }}
          >
            ← Tous les exercices
          </button>

          <h2 style={{ fontSize: 20, marginBottom: 12 }}>{selected}</h2>

          {bestPerSession.length > 1 && <Sparkline points={bestPerSession.map(s => s.maxWeight)} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            {Object.entries(bySession).reverse().map(([date, sets]) => (
              <div key={date} className="card">
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{date}</p>
                {sets.map((s, i) => (
                  <p key={i} className="tabular" style={{ fontSize: 15 }}>
                    Série {s.set_number} — {s.weight_kg} kg × {s.reps}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Sparkline({ points }) {
  const width = 300
  const height = 60
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const stepX = width / (points.length - 1)

  const path = points
    .map((p, i) => {
      const x = i * stepX
      const y = height - ((p - min) / range) * height
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Progression du poids maximal par séance">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  )
}
