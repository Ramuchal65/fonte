'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RestTimer from '@/components/RestTimer'
import TopNav from '@/components/TopNav'
import CoachAvatar from '@/components/CoachAvatar'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'

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
            targetReps: ex.target_reps,
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

  const previousForCurrent = useMemo(() => {
    if (!currentStep) return null
    const bySetNumber = previousPerf[currentStep.exerciseName] || {}
    return bySetNumber[currentStep.round] || null
  }, [currentStep, previousPerf])

  const finishStep = async () => {
    if (!inputs.reps || !inputs.weight) return
    await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: currentStep.exerciseName,
      set_number: currentStep.round,
      reps: Number(inputs.reps),
      weight_kg: Number(inputs.weight)
    })
    setInputs({ reps: '', weight: '' })

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

  const afterRest = () => {
    setStepIdx(i => i + 1)
    setPhase('exercise')
  }

  const finishSession = async () => {
    await supabase.from('sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    router.push('/')
  }

  const abandonSession = async () => {
    await supabase.from('sessions').delete().eq('id', sessionId)
    router.push('/')
  }

  if (loading) return <div className="container"><TopNav /><p className="muted">Chargement…</p></div>

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
        </>
      )}

      {phase === 'exercise' && currentStep && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <CoachAvatar avatar={profileAvatar} mode="exercise" size={110} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {currentStep.groupType === 'circuit' ? `Circuit · tour ${currentStep.round}/${currentStep.totalRounds}` : `Série ${currentStep.round}/${currentStep.totalRounds}`}
            </span>
            <span className="muted tabular" style={{ fontSize: 13 }}>{mm}:{ss}</span>
          </div>

          <h2 style={{ fontSize: 24, marginBottom: 8 }}>{currentStep.exerciseName}</h2>
          <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
            Cible : {currentStep.targetReps} reps
            {currentStep.targetWeightKg ? ` @ ${currentStep.targetWeightKg} kg` : ''}
            {previousForCurrent ? ` · précédent : ${previousForCurrent.weight_kg} kg × ${previousForCurrent.reps}` : ''}
          </p>

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
        </div>
      )}

      {phase === 'done' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Séance terminée</h2>
          <button className="btn btn-primary btn-block" onClick={finishSession}>
            Retour à l'accueil
          </button>
        </div>
      )}
    </div>
  )
}
