'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import { saveBodyMeasurement, getBodyMeasurements } from '@/lib/gamification'

const EXTRA_FIELDS = [
  { key: 'taille_cm', label: 'Tour de taille', unit: 'cm' },
  { key: 'poitrine_cm', label: 'Tour de poitrine', unit: 'cm' },
  { key: 'bras_cm', label: 'Tour de bras', unit: 'cm' }
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CorpsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', taille_cm: '', poitrine_cm: '', bras_cm: '' })

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)
      const data = await getBodyMeasurements(supabase, u.id)
      setEntries(data)
      setLoading(false)
    }
    init()
  }, [])

  const save = async () => {
    if (!form.weight_kg && !form.taille_cm && !form.poitrine_cm && !form.bras_cm) return
    setSaving(true)
    const measurements = {}
    for (const f of EXTRA_FIELDS) if (form[f.key]) measurements[f.key] = Number(form[f.key])

    await saveBodyMeasurement(supabase, user.id, {
      measuredAt: todayISO(),
      weightKg: form.weight_kg ? Number(form.weight_kg) : null,
      measurements
    })
    const data = await getBodyMeasurements(supabase, user.id)
    setEntries(data)
    setForm({ weight_kg: '', taille_cm: '', poitrine_cm: '', bras_cm: '' })
    setSaving(false)
  }

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  const weightPoints = entries.filter(e => e.weight_kg != null).map(e => ({
    date: new Date(e.measured_at).toLocaleDateString('fr-FR'),
    value: e.weight_kg
  }))

  const last = entries[entries.length - 1]

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Mensurations</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>Aujourd'hui</p>
        <div style={{ marginBottom: 10 }}>
          <label className="muted" style={{ fontSize: 12 }}>Poids (kg)</label>
          <input
            type="number" inputMode="decimal" step="0.1"
            value={form.weight_kg}
            placeholder={last?.weight_kg ? `${last.weight_kg} kg la dernière fois` : ''}
            onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {EXTRA_FIELDS.map(f => (
            <div key={f.key}>
              <label className="muted" style={{ fontSize: 11 }}>{f.label} ({f.unit})</label>
              <input
                type="number" inputMode="decimal" step="0.5"
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-block" disabled={saving} onClick={save}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>

      {weightPoints.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <MetricChart title="Poids de corps" unit="kg" points={weightPoints} color="var(--accent-rest)" />
        </div>
      )}

      {entries.length === 0 && <p className="muted">Pas encore de mesure enregistrée.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...entries].reverse().map(e => (
          <div key={e.measured_at} className="card" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted" style={{ fontSize: 13 }}>{new Date(e.measured_at).toLocaleDateString('fr-FR')}</span>
            <span className="tabular" style={{ fontSize: 14 }}>
              {e.weight_kg ? `${e.weight_kg} kg` : '—'}
              {Object.keys(e.measurements || {}).length > 0 && (
                <span className="muted"> · {Object.entries(e.measurements).map(([k, v]) => `${v}`).join(' / ')}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricChart({ title, unit, points, color }) {
  const width = 320
  const height = 100
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
        <p className="tabular" style={{ fontSize: 14, fontWeight: 600, color }}>{last.value} {unit}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={title}>
        <path d={areaPath} fill={color} opacity="0.15" stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 3.5 : 2} fill={color} />)}
        <text x="0" y={height} fontSize="9" fill="var(--text-muted)">{points[0].date}</text>
        <text x={width} y={height} fontSize="9" fill="var(--text-muted)" textAnchor="end">{last.date}</text>
        <text x={width} y={padTop} fontSize="9" fill="var(--text-muted)" textAnchor="end">{Math.round(max * 10) / 10}</text>
        <text x={width} y={padTop + plotH} fontSize="9" fill="var(--text-muted)" textAnchor="end">{Math.round(min * 10) / 10}</text>
      </svg>
    </div>
  )
}
