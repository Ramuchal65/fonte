'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import ExercisePicker from '@/components/ExercisePicker'

const emptyExercise = () => ({ name: '', target_type: 'reps', target_reps: '8-12', target_seconds: null, target_weight_kg: null })
const emptyGroup = () => ({ type: 'classique', rounds: 3, rest_seconds: 90, exercises: [emptyExercise()] })

export default function NewProgramPage() {
  const supabase = createClient()
  const router = useRouter()

  const [programName, setProgramName] = useState('')
  const [days, setDays] = useState([{ label: 'Jour 1', groups: [emptyGroup()] }])
  const [catalog, setCatalog] = useState([])
  const [status, setStatus] = useState('idle') // 'idle' | 'saving' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase
      .from('exercise_catalog')
      .select('canonical_name, muscle_group, aliases')
      .order('canonical_name')
      .then(({ data }) => setCatalog(data ?? []))
  }, [])

  const addDay = () => setDays(prev => [...prev, { label: `Jour ${prev.length + 1}`, groups: [emptyGroup()] }])
  const removeDay = (dayIdx) => setDays(prev => prev.filter((_, i) => i !== dayIdx))
  const updateDayLabel = (dayIdx, value) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].label = value
    return next
  })

  const addGroup = (dayIdx) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups.push(emptyGroup())
    return next
  })
  const removeGroup = (dayIdx, groupIdx) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups.splice(groupIdx, 1)
    return next
  })
  const updateGroup = (dayIdx, groupIdx, field, value) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups[groupIdx][field] = value
    return next
  })

  const addExercise = (dayIdx, groupIdx) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups[groupIdx].exercises.push(emptyExercise())
    return next
  })
  const removeExercise = (dayIdx, groupIdx, exIdx) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups[groupIdx].exercises.splice(exIdx, 1)
    return next
  })
  const updateExercise = (dayIdx, groupIdx, exIdx, field, value) => setDays(prev => {
    const next = structuredClone(prev)
    next[dayIdx].groups[groupIdx].exercises[exIdx][field] = value
    return next
  })

  const isValid = days.length > 0 && days.every(d =>
    d.label.trim() && d.groups.length > 0 && d.groups.every(g => g.exercises.every(ex => ex.name.trim()))
  )

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
      .insert({ user_id: user.id, name: programName || 'Programme sans nom', source_text: null })
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
          target_type: ex.target_type || 'reps',
          target_reps: String(ex.target_reps ?? ''),
          target_seconds: ex.target_seconds ?? null,
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
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Créer un programme</h1>

      <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        Nom du programme
      </label>
      <input
        type="text"
        placeholder="ex : Prise de masse été 2026"
        value={programName}
        onChange={e => setProgramName(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      {errorMsg && status === 'error' && (
        <p style={{ color: 'var(--accent)', marginBottom: 16 }}>{errorMsg}</p>
      )}

      {days.map((day, dayIdx) => (
        <div key={dayIdx} className="card" style={{ marginBottom: 16, overflow: 'visible' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <input
              type="text"
              value={day.label}
              placeholder="Nom du jour"
              onChange={e => updateDayLabel(dayIdx, e.target.value)}
              style={{ flex: 1, fontFamily: 'var(--font-display)', fontWeight: 600 }}
            />
            {days.length > 1 && (
              <button className="btn btn-secondary" onClick={() => removeDay(dayIdx)} aria-label="Supprimer le jour">✕</button>
            )}
          </div>

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
                  <ExercisePicker
                    value={ex.name}
                    catalog={catalog}
                    onChange={name => updateExercise(dayIdx, groupIdx, exIdx, 'name', name)}
                  />
                  <select
                    value={ex.target_type || 'reps'}
                    onChange={e => updateExercise(dayIdx, groupIdx, exIdx, 'target_type', e.target.value)}
                    style={{ flex: '0 0 auto', width: 'auto' }}
                  >
                    <option value="reps">Reps</option>
                    <option value="time">Temps</option>
                  </select>
                  {ex.target_type === 'time' ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={ex.target_seconds ?? ''}
                      placeholder="secondes"
                      onChange={e => updateExercise(dayIdx, groupIdx, exIdx, 'target_seconds', Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={ex.target_reps}
                      placeholder="reps"
                      onChange={e => updateExercise(dayIdx, groupIdx, exIdx, 'target_reps', e.target.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                  {group.exercises.length > 1 && (
                    <button className="btn btn-secondary" onClick={() => removeExercise(dayIdx, groupIdx, exIdx)} aria-label="Supprimer l'exercice">✕</button>
                  )}
                </div>
              ))}

              <button
                className="btn btn-secondary"
                style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto' }}
                onClick={() => addExercise(dayIdx, groupIdx)}
              >
                + Exercice
              </button>
            </div>
          ))}

          <button
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto', marginTop: 12 }}
            onClick={() => addGroup(dayIdx)}
          >
            + Groupe d'exercices
          </button>
        </div>
      ))}

      <button className="btn btn-secondary btn-block" style={{ marginBottom: 20 }} onClick={addDay}>
        + Ajouter un jour
      </button>

      <button
        className="btn btn-primary btn-block"
        disabled={status === 'saving' || !isValid}
        onClick={save}
      >
        {status === 'saving' ? 'Enregistrement…' : 'Créer le programme'}
      </button>
      {!isValid && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Chaque jour doit avoir un nom et chaque exercice un nom.
        </p>
      )}
    </div>
  )
}
