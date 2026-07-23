'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RestTimer from '@/components/RestTimer'
import ExerciseTimer from '@/components/ExerciseTimer'
import TopNav from '@/components/TopNav'
import CoachAvatar from '@/components/CoachAvatar'
import SessionSummary from '@/components/SessionSummary'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { finishSessionAndAwardXp } from '@/lib/gamification'

// Construit la séquence linéaire d'étapes à partir des groupes de la journée.
// Classique : exercice répété "rounds" fois d'affilée (repos après chaque série).
// Circuit : chaque exercice une fois par tour, dans l'ordre, répété "rounds" fois
// (pas de repos entre les exercices d'un même tour, repos après un tour complet).
function buildSteps(groups) {
  const steps = []
  groups.forEach(group => {
    for (let round = 1; round <= group.rounds; round++) {
      group.group_exercises
        .slice()
        .sort((a, b) => a.position - b.position)
        .forEach((ex, exIdx, arr) => {
          const isLastInRound = exIdx === arr.length - 1
          steps.push({
            exerciseName: ex.name,
            targetType: ex.target_type || 'reps',
            targetReps: ex.target_reps,
            targetSeconds: ex.target_seconds,
            targetWeightKg: ex.target_weight_kg,
            groupType: group.type,
            round,
            totalRounds: group.rounds,
            restSeconds: group.rest_seconds,
            // en classique, repos après chaque étape ; en circuit, seulement après le dernier exercice du tour
            restAfter: group.type === 'classique' || isLastInRound
          })
        })
    }
  })
  return steps
}

export default function SessionPage() {
  const { dayId } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState(null)
  const [profileAvatar, setProfileAvatar] = useState(null)
  const [dayLabel, setDayLabel] = useState('')
  const [steps, setSteps] = useState([])
  const [previousPerf, setPreviousPerf] = useState({})
  const [exerciseGifs, setExerciseGifs] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [stepIdx, setStepIdx] = useState(0)
  const [phase, setPhase] = useState('exercise') // 'exercise' | 'resting' | 'done'
  const [elapsed, setElapsed] = useState(0)
  const [inputs, setInputs] = useState({ reps: '', weight: '' })

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar')
        .eq('user_id', u.id)
        .maybeSingle()
      setProfileAvatar(profile?.avatar ? { ...DEFAULT_AVATAR, ...profile.avatar } : DEFAULT_AVATAR)

      const { data: day } = await supabase
        .from('program_days')
        .select('id, label')
        .eq('id', dayId)
        .single()
      setDayLabel(day?.label ?? '')

      const { data: groups } = await supabase
        .from('exercise_groups')
        .select('id, position, type, rounds, rest_seconds, group_exercises(*)')
        .eq('program_day_id', dayId)
        .order('position')

      const builtSteps = buildSteps(groups ?? [])
      setSteps(builtSteps)

      const { data: sess } = await supabase
        .from('sessions')
        .insert({ user_id: u.id, program_day_id: dayId })
        .select()
        .single()
      setSessionId(sess.id)

      const uniqueNames = [...new Set(builtSteps.map(s => s.exerciseName))]

      const { data: gifRows } = await supabase
        .from('exercise_catalog')
        .select('canonical_name, gif_filename')
        .in('canonical_name', uniqueNames)
        .not('gif_filename', 'is', null)
      const gifMap = {}
      for (const row of gifRows ?? []) gifMap[row.canonical_name] = row.gif_filename
      setExerciseGifs(gifMap)

      const perfs = {}
      for (const name of uniqueNames) {
        const { data: sets } = await supabase
          .from('logged_sets')
          .select('reps, weight_kg, set_number, logged_at, sessions!inner(user_id)')
          .eq('exercise_name', name)
          .eq('sessions.user_id', u.id)
          .order('logged_at', { ascending: false })
          .limit(50)
        // Pour chaque numéro de série/tour, on ne garde que l'entrée la plus récente
        const bySetNumber = {}
        for (const s of sets ?? []) {
          if (!(s.set_number in bySetNumber)) bySetNumber[s.set_number] = s
        }
        perfs[name] = bySetNumber
      }
      setPreviousPerf(perfs)
      setLoading(false)
    }
    init()
  }, [dayId])

  useEffect(() => {
    if (phase !== 'exercise') return
    setElapsed(0)
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [stepIdx, phase])

  const currentStep = steps[stepIdx]
  const nextStep = steps[stepIdx + 1]

  // Pré-remplit les répétitions avec le minimum de l'objectif ("8-12" -> 8,
  // "12" -> 12, "max"/"amrap" -> rien à préremplir).
  useEffect(() => {
    if (!currentStep || currentStep.targetType === 'time') return
    const match = String(currentStep.targetReps ?? '').match(/\d+/)
    setInputs({ reps: match ? match[0] : '', weight: '' })
  }, [stepIdx])

  const previousForCurrent = useMemo(() => {
    if (!currentStep) return null
    const bySetNumber = previousPerf[currentStep.exerciseName] || {}
    return bySetNumber[currentStep.round] || null
  }, [currentStep, previousPerf])

  const advanceAfterLogging = () => {
    const isLastStep = stepIdx === steps.length - 1
    if (isLastStep) {
      setPhase('done')
      return
    }
    if (currentStep.restAfter) {
      setPhase('resting')
    } else {
      setStepIdx(i => i + 1)
    }
  }

  const finishStep = async () => {
    if (!inputs.reps) return
    await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: currentStep.exerciseName,
      set_number: currentStep.round,
      reps: Number(inputs.reps),
      weight_kg: inputs.weight ? Number(inputs.weight) : 0
    })
    setInputs({ reps: '', weight: '' })
    advanceAfterLogging()
  }

  const finishTimedStep = async (actualSeconds) => {
    await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: currentStep.exerciseName,
      set_number: currentStep.round,
      duration_seconds: actualSeconds
    })
    advanceAfterLogging()
  }

  const afterRest = () => {
    setStepIdx(i => i + 1)
    setPhase('exercise')
  }

  const [summary, setSummary] = useState(null)
  const [finishing, setFinishing] = useState(false)

  const finishSession = async () => {
    setFinishing(true)
    await supabase.from('sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    try {
      const data = await finishSessionAndAwardXp(supabase, user.id, sessionId)
      setSummary(data)
    } catch (e) {
      console.error('Bilan de séance indisponible :', e)
      router.push('/salle') // on ne bloque pas l'utilisateur si le bilan échoue
    }
    setFinishing(false)
  }

  const abandonSession = async () => {
    await supabase.from('sessions').delete().eq('id', sessionId)
    router.push('/')
  }

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

  if (summary) {
    return <SessionSummary summary={summary} onContinue={() => router.push('/salle')} />
  }

  if (steps.length === 0) {
    return (
      <div className="container">
        <TopNav />
        <p className="muted">Ce jour n'a aucun exercice configuré.</p>
      </div>
    )
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="container">
      <TopNav title={dayLabel} onAbandon={abandonSession} />

      <p className="muted tabular" style={{ fontSize: 13, marginBottom: 16 }}>
        Étape {Math.min(stepIdx + 1, steps.length)} / {steps.length}
      </p>

      {phase === 'resting' && currentStep && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CoachAvatar avatar={profileAvatar} mode="resting" size={110} />
          </div>
          <RestTimer seconds={currentStep.restSeconds} resetKey={stepIdx} onDone={afterRest} />
          {nextStep && (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 12 }}>
              Ensuite : <strong style={{ color: 'var(--text)' }}>{nextStep.exerciseName}</strong>
            </p>
          )}
        </>
      )}

      {phase === 'exercise' && currentStep && (
        <div className="card">
          {exerciseGifs[currentStep.exerciseName] ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: 220, margin: '0 auto 8px' }}>
              <img
                src={`/exercise-gifs/${exerciseGifs[currentStep.exerciseName]}`}
                alt={currentStep.exerciseName}
                style={{ width: '100%', display: 'block', borderRadius: 10, border: '1px solid var(--border)' }}
              />
              <div style={{
                position: 'absolute', bottom: -10, right: -10,
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--surface)', border: '2px solid var(--bg)',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden'
              }}>
                <CoachAvatar avatar={profileAvatar} mode="exercise" size={62} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <CoachAvatar avatar={profileAvatar} mode="exercise" size={110} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {currentStep.groupType === 'circuit' ? `Circuit · tour ${currentStep.round}/${currentStep.totalRounds}` : `Série ${currentStep.round}/${currentStep.totalRounds}`}
            </span>
            <span className="muted tabular" style={{ fontSize: 13 }}>{mm}:{ss}</span>
          </div>

          <h2 style={{ fontSize: 24, marginBottom: 8 }}>{currentStep.exerciseName}</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
            {currentStep.targetType === 'time' ? (
              `Cible : ${Math.floor(currentStep.targetSeconds / 60) > 0 ? `${Math.floor(currentStep.targetSeconds / 60)} min ` : ''}${currentStep.targetSeconds % 60 ? `${currentStep.targetSeconds % 60} s` : ''}`.trim()
            ) : (
              <>
                Cible : {currentStep.targetReps} reps
                {currentStep.targetWeightKg ? ` @ ${currentStep.targetWeightKg} kg` : ''}
                {previousForCurrent ? ` · précédent : ${previousForCurrent.weight_kg} kg × ${previousForCurrent.reps}` : ''}
              </>
            )}
          </p>

          {currentStep.targetType === 'time' ? (
            <ExerciseTimer
              targetSeconds={currentStep.targetSeconds}
              resetKey={stepIdx}
              onComplete={finishTimedStep}
            />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={previousForCurrent ? `${previousForCurrent.weight_kg} kg` : 'kg'}
                  value={inputs.weight}
                  onChange={e => setInputs(prev => ({ ...prev, weight: e.target.value }))}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder={previousForCurrent ? `${previousForCurrent.reps} reps` : 'reps'}
                  value={inputs.reps}
                  onChange={e => setInputs(prev => ({ ...prev, reps: e.target.value }))}
                />
              </div>

              <button className="btn btn-primary btn-block" onClick={finishStep}>
                Exercice terminé
              </button>
            </>
          )}

          {nextStep && (
            <p className="muted" style={{ textAlign: 'center', fontSize: 12, marginTop: 12 }}>
              Ensuite : {nextStep.exerciseName}
            </p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Séance terminée</h2>
          <button className="btn btn-primary btn-block" onClick={finishSession} disabled={finishing}>
            {finishing ? 'Calcul du bilan…' : 'Voir mon bilan'}
          </button>
        </div>
      )}
    </div>
  )
}
