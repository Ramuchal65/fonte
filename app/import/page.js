'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

export default function ImportPage() {
  const supabase = createClient()
  const router = useRouter()
  const [text, setText] = useState('')
  const [programName, setProgramName] = useState('')
  const [days, setDays] = useState(null)
  const [status, setStatus] = useState('idle')
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

  const updateGroup = (dayIdx, groupIdx, field, value) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups[groupIdx][field] = value
      return next
    })
  }

  const updateExercise = (dayIdx, groupIdx, exIdx, field, value) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups[groupIdx].exercises[exIdx][field] = value
      return next
    })
  }

  const addExerciseToGroup = (dayIdx, groupIdx) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups[groupIdx].exercises.push({ name: '', target_reps: '8-12', target_weight_kg: null })
      return next
    })
  }

  const removeExercise = (dayIdx, groupIdx, exIdx) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups[groupIdx].exercises.splice(exIdx, 1)
      return next
    })
  }

  const removeGroup = (dayIdx, groupIdx) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups.splice(groupIdx, 1)
      return next
    })
  }

  const save = async () => {
    setStatus('saving')
    const { data: { user } } = await supabase.auth.getUser()

    const { error: archiveErr } = await supabase
      .from('programs')
      .update({ archived_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('archived_at', null)

    if (archiveErr) { setErrorMsg(archiveErr.message); setStatus('error'); return }

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

      for (let g = 0; g < day.groups.length; g++) {
        const group = day.groups[g]
        const { data: groupRow, error: groupErr } = await supabase
          .from('exercise_groups')
          .insert({
            program_day_id: dayRow.id,
            position: g,
            type: group.type,
            rounds: group.rounds,
            rest_seconds: group.rest_seconds
          })
          .select()
          .single()

        if (groupErr) { setErrorMsg(groupErr.message); setStatus('error'); return }

        const exercisesPayload = group.exercises.map((ex, idx) => ({
          group_id: groupRow.id,
          position: idx,
          name: ex.name,
          target_reps: String(ex.target_reps),
          target_weight_kg: ex.target_weight_kg
        }))

        const { error: exErr } = await supabase.from('group_exercises').insert(exercisesPayload)
        if (exErr) { setErrorMsg(exErr.message); setStatus('error'); return }
      }
    }

    router.push('/')
  }

  return (
    <div className="container">
      <TopNav />
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
            Vérifie et corrige si besoin — notamment le type de chaque groupe (classique/circuit), c'est ce qui pilote le déroulé de la séance.
          </p>
          {days.map((day, dayIdx) => (
            <div key={dayIdx} className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 12 }}>{day.label}</h3>
              {day.groups.map((group, groupIdx) => (
                <div key={groupIdx} style={{ borderTop: groupIdx > 0 ? '1px solid var(--border)' : 'none', paddingTop: groupIdx > 0 ? 12 : 0, marginTop: groupIdx > 0 ? 12 : 0 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <select
                      value={group.type}
                      onChange={e => updateGroup(dayIdx, groupIdx, 'type', e.target.value)}
                      style={{ width: 'auto', flex: '0 0 auto' }}
                    >
                      <option value="classique">Classique</option>
                      <option value="circuit">Circuit</option>
                    </select>
                    <span className="muted" style={{ fontSize: 13, flex: 1 }}>
                      {group.type === 'circuit' ? 'plusieurs exercices enchaînés par tour' : '1 exercice répété sur plusieurs séries'}
                    </span>
                    <button className="btn btn-secondary" onClick={() => removeGroup(dayIdx, groupIdx)} aria-label="Supprimer le groupe">✕</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label className="muted" style={{ fontSize: 11 }}>{group.type === 'circuit' ? 'Tours' : 'Séries'}</label>
                      <input type="number" value={group.rounds} onChange={e => updateGroup(dayIdx, groupIdx, 'rounds', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="muted" style={{ fontSize: 11 }}>Repos après {group.type === 'circuit' ? 'un tour' : 'une série'} (s)</label>
                      <input type="number" value={group.rest_seconds} onChange={e => updateGroup(dayIdx, groupIdx, 'rest_seconds', Number(e.target.value))} />
                    </div>
                  </div>

                  {group.exercises.map((ex, exIdx) => (
                    <div key={exIdx} style={{ display: 'flex', gap: 8, marginBottom: 8, marginLeft: group.type === 'circuit' ? 12 : 0 }}>
                      <input
                        type="text"
                        value={ex.name}
                        placeholder="Nom de l'exercice"
                        onChange={e => updateExercise(dayIdx, groupIdx, exIdx, 'name', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input
                        type="text"
                        value={ex.target_reps}
                        placeholder="reps"
                        onChange={e => updateExercise(dayIdx, groupIdx, exIdx, 'target_reps', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      {group.exercises.length > 1 && (
                        <button className="btn btn-secondary" onClick={() => removeExercise(dayIdx, groupIdx, exIdx)} aria-label="Supprimer l'exercice">✕</button>
                      )}
                    </div>
                  ))}

                  {group.type === 'circuit' && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginLeft: 12, fontSize: 13, padding: '8px 12px', minHeight: 'auto' }}
                      onClick={() => addExerciseToGroup(dayIdx, groupIdx)}
                    >
                      + Ajouter un exercice au circuit
                    </button>
                  )}
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
