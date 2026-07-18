'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ImportPage() {
  const supabase = createClient()
  const router = useRouter()
  const [text, setText] = useState('')
  const [programName, setProgramName] = useState('')
  const [days, setDays] = useState(null) // résultat du parsing, éditable
  const [status, setStatus] = useState('idle') // idle | parsing | review | saving | error
  const [errorMsg, setErrorMsg] = useState('')

  const runParse = async () => {
    setStatus('parsing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/parse-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setDays(data.days)
      setStatus('review')
    } catch (e) {
      setErrorMsg(e.message)
      setStatus('error')
    }
  }

  const updateExercise = (dayIdx, exIdx, field, value) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].exercises[exIdx][field] = value
      return next
    })
  }

  const removeExercise = (dayIdx, exIdx) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].exercises.splice(exIdx, 1)
      return next
    })
  }

  const save = async () => {
    setStatus('saving')
    const { data: { user } } = await supabase.auth.getUser()

    const { data: program, error: progErr } = await supabase
      .from('programs')
      .insert({ user_id: user.id, name: programName || 'Programme sans nom', source_text: text })
      .select()
      .single()

    if (progErr) { setErrorMsg(progErr.message); setStatus('error'); return }

    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      const { data: dayRow, error: dayErr } = await supabase
        .from('program_days')
        .insert({ program_id: program.id, label: day.label, position: i })
        .select()
        .single()

      if (dayErr) { setErrorMsg(dayErr.message); setStatus('error'); return }

      const exercisesPayload = day.exercises.map((ex, idx) => ({
        program_day_id: dayRow.id,
        position: idx,
        name: ex.name,
        target_sets: ex.target_sets,
        target_reps: String(ex.target_reps),
        target_weight_kg: ex.target_weight_kg,
        rest_seconds: ex.rest_seconds,
        superset_group: ex.superset_group
      }))

      const { error: exErr } = await supabase.from('planned_exercises').insert(exercisesPayload)
      if (exErr) { setErrorMsg(exErr.message); setStatus('error'); return }
    }

    router.push('/')
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Importer un programme</h1>

      {status === 'idle' || status === 'parsing' || status === 'error' ? (
        <>
          <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Nom du programme
          </label>
          <input
            type="text"
            placeholder="ex : Prise de masse été 2026"
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Colle le texte de ton programme (ChatGPT ou autre)
          </label>
          <textarea value={text} onChange={e => setText(e.target.value)} />
          {status === 'error' && (
            <p style={{ color: 'var(--accent)', marginTop: 12 }}>{errorMsg}</p>
          )}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 16 }}
            disabled={status === 'parsing' || text.trim().length < 10}
            onClick={runParse}
          >
            {status === 'parsing' ? 'Analyse en cours…' : 'Analyser le programme'}
          </button>
        </>
      ) : null}

      {status === 'review' && days && (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>
            Vérifie et corrige si besoin, puis enregistre.
          </p>
          {days.map((day, dayIdx) => (
            <div key={dayIdx} className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>{day.label}</h3>
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} style={{ borderTop: exIdx > 0 ? '1px solid var(--border)' : 'none', paddingTop: exIdx > 0 ? 12 : 0, marginTop: exIdx > 0 ? 12 : 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={ex.name}
                      onChange={e => updateExercise(dayIdx, exIdx, 'name', e.target.value)}
                    />
                    <button className="btn btn-secondary" onClick={() => removeExercise(dayIdx, exIdx)} aria-label="Supprimer">✕</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label className="muted" style={{ fontSize: 11 }}>Séries</label>
                      <input type="number" value={ex.target_sets} onChange={e => updateExercise(dayIdx, exIdx, 'target_sets', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="muted" style={{ fontSize: 11 }}>Reps</label>
                      <input type="text" value={ex.target_reps} onChange={e => updateExercise(dayIdx, exIdx, 'target_reps', e.target.value)} />
                    </div>
                    <div>
                      <label className="muted" style={{ fontSize: 11 }}>Repos (s)</label>
                      <input type="number" value={ex.rest_seconds} onChange={e => updateExercise(dayIdx, exIdx, 'rest_seconds', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {status === 'error' && (
            <p style={{ color: 'var(--accent)', marginBottom: 12 }}>{errorMsg}</p>
          )}
          <button className="btn btn-primary btn-block" onClick={save} disabled={status === 'saving'}>
            {status === 'saving' ? 'Enregistrement…' : 'Enregistrer le programme'}
          </button>
        </>
      )}
    </div>
  )
}
