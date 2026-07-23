'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

export default function EditProgramPage() {
  const supabase = createClient()
  const router = useRouter()
  const { id } = useParams()

  const [programName, setProgramName] = useState('')
  const [days, setDays] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'saving' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    setStatus('loading')
    const { data: program, error: progErr } = await supabase
      .from('programs')
      .select('id, name')
      .eq('id', id)
      .single()

    if (progErr || !program) { setErrorMsg('Programme introuvable.'); setStatus('error'); return }
    setProgramName(program.name)

    const { data: dayRows, error: dayErr } = await supabase
      .from('program_days')
      .select(`
        id, label, position,
        exercise_groups (
          id, type, rounds, rest_seconds, position,
          group_exercises ( id, name, target_reps, target_weight_kg, position )
        )
      `)
      .eq('program_id', id)
      .order('position')

    if (dayErr) { setErrorMsg(dayErr.message); setStatus('error'); return }

    const shaped = (dayRows ?? []).map(d => ({
      id: d.id,
      label: d.label,
      groups: [...(d.exercise_groups ?? [])]
        .sort((a, b) => a.position - b.position)
        .map(g => ({
          type: g.type,
          rounds: g.rounds,
          rest_seconds: g.rest_seconds,
          exercises: [...(g.group_exercises ?? [])]
            .sort((a, b) => a.position - b.position)
            .map(ex => ({
              name: ex.name,
              target_reps: ex.target_reps,
              target_weight_kg: ex.target_weight_kg
            }))
        }))
    }))

    setDays(shaped)
    setStatus('ready')
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

  const addGroup = (dayIdx) => {
    setDays(prev => {
      const next = structuredClone(prev)
      next[dayIdx].groups.push({
        type: 'classique', rounds: 3, rest_seconds: 90,
        exercises: [{ name: '', target_reps: '8-12', target_weight_kg: null }]
      })
      return next
    })
  }

  // Les jours eux-mêmes (leur id) sont préservés : c'est ce qui permet de
  // comparer une séance à "la dernière fois sur ce même jour" dans le bilan.
  // Seuls les groupes/exercices sont remplacés à chaque sauvegarde.
  const save = async () => {
    setStatus('saving')

    const { error: nameErr } = await supabase
      .from('programs')
      .update({ name: programName || 'Programme sans nom' })
      .eq('id', id)
    if (nameErr) { setErrorMsg(nameErr.message); setStatus('error'); return }

    for (const day of days) {
      const { error: delErr } = await supabase.from('exercise_groups').delete().eq('program_day_id', day.id)
      if (delErr) { setErrorMsg(delErr.message); setStatus('error'); return }

      for (let g = 0; g < day.groups.length; g++) {
        const group = day.groups[g]
        const { data: groupRow, error: groupErr } = await supabase
          .from('exercise_groups')
          .insert({
            program_day_id: day.id,
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

    router.push('/programs')
  }

  if (status === 'loading') return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  if (status === 'error' && !days) {
    return (
      <div className="container">
        <TopNav />
        <p style={{ color: 'var(--accent)' }}>{errorMsg}</p>
      </div>
    )
  }

  return (
    <div className="container">
      <TopNav />
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Modifier le programme</h1>

      <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
        Nom du programme
      </label>
      <input
        type="text"
        value={programName}
        onChange={e => setProgramName(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      {errorMsg && status === 'error' && (
        <p style={{ color: 'var(--accent)', marginBottom: 16 }}>{errorMsg}</p>
      )}

      {days.map((day, dayIdx) => (
        <div key={day.id} className="card" style={{ marginBottom: 16 }}>
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
                  style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto' }}
                  onClick={() => addExerciseToGroup(dayIdx, groupIdx)}
                >
                  + Exercice dans ce circuit
                </button>
              )}
            </div>
          ))}

          <button
            className="btn btn-secondary"
            style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto', marginTop: day.groups.length > 0 ? 12 : 0 }}
            onClick={() => addGroup(dayIdx)}
          >
            + Groupe d'exercices
          </button>
        </div>
      ))}

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 8 }}
        disabled={status === 'saving'}
        onClick={save}
      >
        {status === 'saving' ? 'Enregistrement…' : 'Enregistrer les modifications'}
      </button>
    </div>
  )
}
