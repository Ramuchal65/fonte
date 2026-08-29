'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const SORT_LABELS = {
  recent: 'Dernière réalisation',
  frequency: 'Nombre de séances',
  alpha: 'Alphabétique'
}

export default function HistoryPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [exerciseStats, setExerciseStats] = useState([]) // [{name, lastDate, sessionCount}]
  const [selected, setSelected] = useState(null)
  const [entries, setEntries] = useState([])
  const [notesBySession, setNotesBySession] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('recent')
  const [query, setQuery] = useState('')

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
        .select('exercise_name, session_id, logged_at, sessions!inner(user_id)')
        .eq('sessions.user_id', user.id)

      const byName = {}
      for (const row of data ?? []) {
        const s = byName[row.exercise_name] ??= { name: row.exercise_name, lastDate: row.logged_at, sessionIds: new Set() }
        if (row.logged_at > s.lastDate) s.lastDate = row.logged_at
        s.sessionIds.add(row.session_id)
      }
      const stats = Object.values(byName).map(s => ({
        name: s.name, lastDate: s.lastDate, sessionCount: s.sessionIds.size
      }))
      setExerciseStats(stats)
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!selected || !user) return
    async function loadEntries() {
      const { data } = await supabase
        .from('logged_sets')
        .select('reps, weight_kg, duration_seconds, rpe, set_number, logged_at, session_id, sessions!inner(user_id)')
        .eq('exercise_name', selected)
        .eq('sessions.user_id', user.id)
        .order('logged_at', { ascending: true })
      setEntries(data ?? [])

      const sessionIds = [...new Set((data ?? []).map(e => e.session_id))]
      if (sessionIds.length > 0) {
        const { data: noteRows } = await supabase
          .from('session_exercise_notes')
          .select('session_id, note')
          .eq('exercise_name', selected)
          .in('session_id', sessionIds)
        const map = {}
        for (const n of noteRows ?? []) map[n.session_id] = n.note
        setNotesBySession(map)
      } else {
        setNotesBySession({})
      }
    }
    loadEntries()
  }, [selected, user])

  const sortedFiltered = useMemo(() => {
    let list = exerciseStats
    if (query.trim()) {
      const q = normalize(query)
      list = list.filter(s => normalize(s.name).includes(q))
    }
    const sorted = [...list]
    if (sortBy === 'recent') sorted.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
    else if (sortBy === 'frequency') sorted.sort((a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name))
    else sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [exerciseStats, sortBy, query])

  // Type d'exercice déduit des données réellement loggées : chronométré
  // (durée), poids du corps (jamais de charge), ou classique (charge+reps).
  // Les métriques "charge" n'ont aucun sens pour les deux premiers cas —
  // c'est ce qui donnait des graphes vides/plats à 0 pour le poids du corps.
  const exerciseType = useMemo(() => {
    if (entries.length === 0) return 'classique'
    if (entries.some(e => e.duration_seconds != null)) return 'temps'
    if (entries.every(e => !e.weight_kg)) return 'poids_du_corps'
    return 'classique'
  }, [entries])

  // Regroupe les séries par séance (même jour)
  const bySession = entries.reduce((acc, e) => {
    const dateKey = new Date(e.logged_at).toLocaleDateString('fr-FR')
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(e)
    return acc
  }, {})

  // Notes agrégées par date (concatène si jamais plusieurs séances le même jour)
  const notesByDate = {}
  for (const [dateKey, sets] of Object.entries(bySession)) {
    const notes = [...new Set(sets.map(s => notesBySession[s.session_id]).filter(Boolean))]
    if (notes.length > 0) notesByDate[dateKey] = notes.join(' · ')
  }

  // Métriques par séance, adaptées au type d'exercice :
  // - classique : 1RM estimé (Epley), charge totale, reps max
  // - poids du corps : reps max + reps totales (pas de kg, toujours 0)
  // - temps : durée max tenue + durée totale
  const metricsPerSession = Object.entries(bySession).map(([date, sets]) => {
    if (exerciseType === 'temps') {
      const maxDuration = Math.max(...sets.map(s => s.duration_seconds || 0))
      const totalDuration = sets.reduce((sum, s) => sum + (s.duration_seconds || 0), 0)
      return { date, maxDuration, totalDuration }
    }
    const maxReps = Math.max(...sets.map(s => s.reps || 0))
    const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0)
    if (exerciseType === 'poids_du_corps') {
      return { date, maxReps, totalReps }
    }
    const totalVolume = sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight_kg || 0), 0)
    const maxE1RM = Math.max(...sets.map(s => (s.weight_kg || 0) * (1 + (s.reps || 0) / 30)))
    return { date, maxReps, totalVolume, maxE1RM: Math.round(maxE1RM * 10) / 10 }
  })

  // "Il y a X mois" : compare la toute première séance connue à la plus
  // récente, sur la métrique la plus parlante selon le type d'exercice.
  const progressComparison = useMemo(() => {
    if (metricsPerSession.length < 2) return null
    const first = metricsPerSession[0]
    const last = metricsPerSession[metricsPerSession.length - 1]
    const firstDate = new Date(entries[0].logged_at)
    const lastDate = new Date(entries[entries.length - 1].logged_at)
    const monthsApart = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24 * 30))
    if (monthsApart < 1) return null

    const metricKey = exerciseType === 'temps' ? 'maxDuration' : exerciseType === 'poids_du_corps' ? 'maxReps' : 'maxE1RM'
    const unit = exerciseType === 'temps' ? 's' : exerciseType === 'poids_du_corps' ? 'reps' : 'kg'
    const before = first[metricKey]
    const now = last[metricKey]
    if (!before) return null
    const pct = Math.round(((now - before) / before) * 100)
    return { monthsApart, before, now, unit, pct }
  }, [metricsPerSession, entries, exerciseType])

  // Détection de plateau : sur les 4 dernières séances (classique
  // uniquement, où le 1RM estimé est la métrique la plus fiable), le
  // 1RM n'a pas progressé -> suggestion de semaine plus légère.
  const plateauDetected = useMemo(() => {
    if (exerciseType !== 'classique' || metricsPerSession.length < 4) return false
    const last4 = metricsPerSession.slice(-4).map(m => m.maxE1RM)
    return last4[last4.length - 1] <= last4[0]
  }, [metricsPerSession, exerciseType])

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Historique des performances</h1>

      {exerciseStats.length === 0 && (
        <p className="muted">Pas encore de séries loggées.</p>
      )}

      {!selected && exerciseStats.length > 0 && (
        <>
          <input
            type="text"
            placeholder="Rechercher un exercice…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <button
                key={key}
                className="btn btn-secondary"
                style={{
                  padding: '6px 12px', minHeight: 'auto', fontSize: 12,
                  background: sortBy === key ? 'var(--accent-rest)' : undefined,
                  color: sortBy === key ? '#14140F' : undefined
                }}
                onClick={() => setSortBy(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedFiltered.map(s => (
              <button
                key={s.name}
                className="card"
                style={{ textAlign: 'left', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                onClick={() => setSelected(s.name)}
              >
                <span>{s.name}</span>
                <span className="muted tabular" style={{ fontSize: 12, flexShrink: 0, textAlign: 'right' }}>
                  {new Date(s.lastDate).toLocaleDateString('fr-FR')}
                  <br />{s.sessionCount} séance{s.sessionCount > 1 ? 's' : ''}
                </span>
              </button>
            ))}
            {sortedFiltered.length === 0 && <p className="muted">Aucun exercice ne correspond à "{query}".</p>}
          </div>
        </>
      )}

      {selected && (
        <>
          <button
            className="muted"
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            onClick={() => { setSelected(null); setEntries([]) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Tous les exercices
          </button>

          <h2 style={{ fontSize: 20, marginBottom: 16 }}>{selected}</h2>

          {progressComparison && (
            <div className="card" style={{ marginBottom: 12, borderColor: progressComparison.pct > 0 ? 'var(--accent-rest)' : undefined }}>
              <p style={{ fontSize: 13 }}>
                Il y a {progressComparison.monthsApart} mois : <strong className="tabular">{progressComparison.before} {progressComparison.unit}</strong>.
                {' '}Aujourd'hui : <strong className="tabular">{progressComparison.now} {progressComparison.unit}</strong>
                {progressComparison.pct !== 0 && (
                  <span style={{ color: progressComparison.pct > 0 ? 'var(--accent-rest)' : 'var(--accent)' }}>
                    {' '}({progressComparison.pct > 0 ? '+' : ''}{progressComparison.pct}%)
                  </span>
                )}
              </p>
            </div>
          )}

          {plateauDetected && (
            <div className="card" style={{ marginBottom: 12, borderColor: 'var(--accent)' }}>
              <p style={{ fontSize: 13 }}>
                📉 Pas de progression sur les 4 dernières séances — une semaine plus légère (deload) pourrait aider à repartir de l'avant.
              </p>
            </div>
          )}

          {metricsPerSession.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              {exerciseType === 'temps' ? (
                <>
                  <MetricChart
                    title="Durée max tenue sur une série"
                    unit="s"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.maxDuration }))}
                    color="var(--accent)"
                  />
                  <MetricChart
                    title="Durée totale de la séance"
                    unit="s"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.totalDuration }))}
                    color="var(--accent-rest)"
                  />
                </>
              ) : exerciseType === 'poids_du_corps' ? (
                <>
                  <MetricChart
                    title="Répétitions max sur une série"
                    unit="reps"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.maxReps }))}
                    color="var(--accent)"
                  />
                  <MetricChart
                    title="Répétitions totales de la séance"
                    unit="reps"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.totalReps }))}
                    color="var(--accent-rest)"
                  />
                  <p className="muted" style={{ fontSize: 12, marginTop: -8 }}>
                    Poids du corps : pas de charge à afficher ici (toujours à 0).
                  </p>
                </>
              ) : (
                <>
                  <MetricChart
                    title="Charge max estimée pour 1 répétition"
                    unit="kg"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.maxE1RM }))}
                    color="var(--accent)"
                  />
                  <MetricChart
                    title="Charge totale soulevée"
                    unit="kg"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.totalVolume }))}
                    color="var(--accent-rest)"
                  />
                  <MetricChart
                    title="Répétitions max sur une série"
                    unit="reps"
                    points={metricsPerSession.map(m => ({ date: m.date, value: m.maxReps }))}
                    color="#C9A84C"
                  />
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(bySession).reverse().map(([date, sets]) => (
              <div key={date} className="card">
                <p className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{date}</p>
                {sets.map((s, i) => (
                  <p key={i} className="tabular" style={{ fontSize: 15 }}>
                    {s.duration_seconds != null
                      ? `Série ${s.set_number} — ${s.duration_seconds} s`
                      : exerciseType === 'poids_du_corps'
                        ? `Série ${s.set_number} — ${s.reps} reps`
                        : `Série ${s.set_number} — ${s.weight_kg} kg × ${s.reps}`}
                    {s.rpe && <span className="muted"> · RPE {s.rpe}</span>}
                  </p>
                ))}
                {notesByDate[date] && (
                  <p className="muted" style={{ fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>
                    📝 {notesByDate[date]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Petit graphe en aire, avec repères min/max et dernière valeur mise en avant.
function MetricChart({ title, unit, points, color }) {
  const width = 320
  const height = 90
  const padTop = 14
  const padBottom = 18
  const values = points.map(p => p.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = points.length > 1 ? width / (points.length - 1) : 0
  const plotH = height - padTop - padBottom

  const coords = points.map((p, i) => ({
    x: i * stepX,
    y: padTop + plotH - ((p.value - min) / range) * plotH
  }))

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${padTop + plotH} L0,${padTop + plotH} Z`
  const last = points[points.length - 1]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</p>
        <p className="tabular" style={{ fontSize: 14, fontWeight: 600, color }}>
          {last.value} {unit}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
        <path d={areaPath} fill={color} opacity="0.15" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2} fill={color} />
        ))}
        <text x="0" y={height} fontSize="9" fill="var(--text-muted)">{points[0].date}</text>
        <text x={width} y={height} fontSize="9" fill="var(--text-muted)" textAnchor="end">{last.date}</text>
        <text x={width} y={padTop} fontSize="9" fill="var(--text-muted)" textAnchor="end">{Math.round(max)}</text>
        <text x={width} y={padTop + plotH} fontSize="9" fill="var(--text-muted)" textAnchor="end">{Math.round(min)}</text>
      </svg>
    </div>
  )
}
