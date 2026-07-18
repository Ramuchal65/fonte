'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RestTimer from '@/components/RestTimer'

export default function SessionPage() {
  const { dayId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [dayLabel, setDayLabel] = useState('')
  const [exercises, setExercises] = useState([])
  const [previousPerf, setPreviousPerf] = useState({}) // { exerciseName: [{reps, weight_kg, set_number}] }
  const [logged, setLogged] = useState({}) // { exerciseName: { setNumber: {reps, weight_kg} } }
  const [sessionId, setSessionId] = useState(null)
  const [restFor, setRestFor] = useState(null) // { seconds, key } | null
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)

      const { data: day } = await supabase
        .from('program_days')
        .select('id, label')
        .eq('id', dayId)
        .single()
      setDayLabel(day?.label ?? '')

      const { data: ex } = await supabase
        .from('planned_exercises')
        .select('*')
        .eq('program_day_id', dayId)
        .order('position')
      setExercises(ex ?? [])

      const { data: sess } = await supabase
        .from('sessions')
        .insert({ user_id: u.id, program_day_id: dayId })
        .select()
        .single()
      setSessionId(sess.id)

      const perfs = {}
      for (const e of ex ?? []) {
        const { data: sets } = await supabase
          .from('logged_sets')
          .select('reps, weight_kg, set_number, logged_at, sessions!inner(user_id)')
          .eq('exercise_name', e.name)
          .eq('sessions.user_id', u.id)
          .order('logged_at', { ascending: false })
          .limit(e.target_sets)
        perfs[e.name] = (sets ?? []).slice().reverse()
      }
      setPreviousPerf(perfs)
      setLoading(false)
    }
    init()
  }, [dayId])

  const logSet = async (exercise, setNumber, reps, weightKg) => {
    if (!reps || !weightKg) return
    await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: exercise.name,
      set_number: setNumber,
      reps: Number(reps),
      weight_kg: Number(weightKg)
    })
    setLogged(prev => ({
      ...prev,
      [exercise.name]: { ...(prev[exercise.name] || {}), [setNumber]: { reps, weight_kg: weightKg } }
    }))
    setRestFor({ seconds: exercise.rest_seconds, key: `${exercise.name}-${setNumber}-${Date.now()}` })
  }

  const finishSession = async () => {
    await supabase.from('sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    router.push('/')
  }

  if (loading) return <div className="container"><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{dayLabel}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>Séance en cours</p>

      {restFor && (
        <div style={{ marginBottom: 20 }}>
          <RestTimer seconds={restFor.seconds} resetKey={restFor.key} onDone={() => {}} />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {exercises.map(ex => (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            previous={previousPerf[ex.name] || []}
            loggedSets={logged[ex.name] || {}}
            onLogSet={(setNumber, reps, weight) => logSet(ex, setNumber, reps, weight)}
          />
        ))}
      </div>

      <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={finishSession}>
        Terminer la séance
      </button>
    </div>
  )
}

function ExerciseBlock({ exercise, previous, loggedSets, onLogSet }) {
  const [inputs, setInputs] = useState({}) // { setNumber: {reps, weight} }

  const setInput = (setNumber, field, value) => {
    setInputs(prev => ({ ...prev, [setNumber]: { ...prev[setNumber], [field]: value } }))
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h3 style={{ fontSize: 17 }}>{exercise.name}</h3>
        <span className="muted" style={{ fontSize: 13 }}>
          {exercise.target_sets} × {exercise.target_reps}
          {exercise.superset_group ? ` · superset ${exercise.superset_group}` : ''}
        </span>
      </div>

      {Array.from({ length: exercise.target_sets }, (_, i) => i + 1).map(setNumber => {
        const prev = previous[setNumber - 1]
        const done = loggedSets[setNumber]
        return (
          <div key={setNumber} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span className="muted tabular" style={{ width: 18, fontSize: 13 }}>{setNumber}</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder={prev ? `${prev.weight_kg} kg` : 'kg'}
              defaultValue={done?.weight_kg ?? ''}
              disabled={!!done}
              onChange={e => setInput(setNumber, 'weight', e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              inputMode="numeric"
              placeholder={prev ? `${prev.reps} reps` : 'reps'}
              defaultValue={done?.reps ?? ''}
              disabled={!!done}
              onChange={e => setInput(setNumber, 'reps', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              disabled={!!done}
              onClick={() => onLogSet(setNumber, inputs[setNumber]?.reps, inputs[setNumber]?.weight)}
              style={{ minWidth: 44, padding: '10px 12px' }}
            >
              {done ? '✓' : 'OK'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
