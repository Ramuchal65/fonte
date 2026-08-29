'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RestTimer from '@/components/RestTimer'
import ExerciseTimer from '@/components/ExerciseTimer'
import TopNav from '@/components/TopNav'
import CoachAvatar from '@/components/CoachAvatar'
import SessionSummary from '@/components/SessionSummary'
import PlateCalculator from '@/components/PlateCalculator'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { finishSessionAndAwardXp, saveExerciseNote } from '@/lib/gamification'

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

// Petit sélecteur numérique avec boutons +/-, pour ajuster sans avoir à
// ouvrir le clavier. step=0.5 pour le poids, 1 pour les répétitions.
function StepperInput({ value, onChange, step, placeholder, suffix }) {
  const bump = (delta) => {
    const current = parseFloat(value) || 0
    const next = Math.max(0, Math.round((current + delta) / step) * step)
    onChange(String(Number(next.toFixed(2))))
  }
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => bump(-step)}
        aria-label="Diminuer"
        style={{ width: 40, flexShrink: 0, background: 'var(--surface-raised)', border: 'none', color: 'var(--text)', fontSize: 18 }}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, border: 'none', borderRadius: 0, textAlign: 'center', minWidth: 0 }}
      />
      <button
        type="button"
        onClick={() => bump(step)}
        aria-label="Augmenter"
        style={{ width: 40, flexShrink: 0, background: 'var(--surface-raised)', border: 'none', color: 'var(--text)', fontSize: 18 }}
      >
        +
      </button>
    </div>
  )
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
  const [exerciseInstructions, setExerciseInstructions] = useState({})
  const [sessionId, setSessionId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [stepIdx, setStepIdx] = useState(0)
  const [showDemo, setShowDemo] = useState(false)
  const [phase, setPhase] = useState('exercise') // 'exercise' | 'resting' | 'done'
  const [elapsed, setElapsed] = useState(0)
  const [inputs, setInputs] = useState({ reps: '', weight: '' })
  const [rpe, setRpe] = useState(null)
  const [showMore, setShowMore] = useState(false)
  const [notesByExercise, setNotesByExercise] = useState({})
  const [showPlateCalc, setShowPlateCalc] = useState(false)
  const [sessionVolume, setSessionVolume] = useState(0)
  // Pile de navigation : permet de revenir à l'écran précédent (repos ou
  // exercice). Si l'étape qu'on annule avait déjà été loggée, on supprime
  // la série en base pour éviter un doublon si on la reloggue.
  const [history, setHistory] = useState([])

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
        .select('canonical_name, gif_filename, instructions_fr')
        .in('canonical_name', uniqueNames)
      const gifMap = {}
      const instructionsMap = {}
      for (const row of gifRows ?? []) {
        if (row.gif_filename) gifMap[row.canonical_name] = row.gif_filename
        if (row.instructions_fr) instructionsMap[row.canonical_name] = row.instructions_fr
      }
      setExerciseGifs(gifMap)
      setExerciseInstructions(instructionsMap)

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

  const previousForCurrent = useMemo(() => {
    if (!currentStep) return null
    const bySetNumber = previousPerf[currentStep.exerciseName] || {}
    return bySetNumber[currentStep.round] || null
  }, [currentStep, previousPerf])

  // Pré-remplit répétitions (minimum de l'objectif, "8-12" -> 8) ET poids
  // (dernière performance connue sur cette série) à chaque nouvel exercice.
  // Dépend de currentStep lui-même (pas juste stepIdx) : "Mettre de côté"
  // réordonne le tableau sans changer stepIdx, il faut donc détecter le
  // changement de CONTENU à cette position, pas juste le numéro d'étape.
  useEffect(() => {
    if (!currentStep || currentStep.targetType === 'time') return
    const match = String(currentStep.targetReps ?? '').match(/\d+/)
    setInputs({
      reps: match ? match[0] : '',
      weight: previousForCurrent ? String(previousForCurrent.weight_kg) : ''
    })
  }, [currentStep, previousForCurrent])

  useEffect(() => {
    setShowDemo(false)
    setShowMore(false)
    setRpe(null)
  }, [currentStep])

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
    const { data: inserted } = await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: currentStep.exerciseName,
      set_number: currentStep.round,
      reps: Number(inputs.reps),
      weight_kg: inputs.weight ? Number(inputs.weight) : 0,
      rpe: rpe
    }).select().single()
    const volumeDelta = Number(inputs.reps) * (inputs.weight ? Number(inputs.weight) : 0)
    setHistory(h => [...h, { stepIdx, phase, loggedSetId: inserted?.id ?? null, volumeDelta }])
    setInputs({ reps: '', weight: '' })
    setRpe(null)
    setSessionVolume(v => v + volumeDelta)
    advanceAfterLogging()
  }

  const finishTimedStep = async (actualSeconds) => {
    const { data: inserted } = await supabase.from('logged_sets').insert({
      session_id: sessionId,
      exercise_name: currentStep.exerciseName,
      set_number: currentStep.round,
      duration_seconds: actualSeconds
    }).select().single()
    setHistory(h => [...h, { stepIdx, phase, loggedSetId: inserted?.id ?? null }])
    advanceAfterLogging()
  }

  const afterRest = () => {
    setHistory(h => [...h, { stepIdx, phase, loggedSetId: null }])
    setStepIdx(i => i + 1)
    setPhase('exercise')
  }

  // Renvoie l'exercice courant à la toute fin de la file, sans le logger ni
  // passer par le repos — pour le cas classique "la machine est prise, j'y
  // reviendrai plus tard dans la séance". stepIdx ne bouge pas : comme
  // l'étape courante quitte cette position, c'est l'étape suivante qui
  // vient naturellement s'y placer.
  const setAsideStep = () => {
    setSteps(prev => {
      const next = [...prev]
      const [moved] = next.splice(stepIdx, 1)
      next.push(moved)
      return next
    })
  }

  const goBack = async () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    if (last.loggedSetId) {
      await supabase.from('logged_sets').delete().eq('id', last.loggedSetId)
    }
    if (last.volumeDelta) {
      setSessionVolume(v => v - last.volumeDelta)
    }
    setStepIdx(last.stepIdx)
    setPhase(last.phase)
  }

  const [summary, setSummary] = useState(null)
  const [finishing, setFinishing] = useState(false)

  // Termine la séance et calcule le bilan/XP à partir de ce qui a déjà été
  // loggé (utilisé aussi bien par la fin normale que par "Abandonner").
  const wrapUpSession = async () => {
    setFinishing(true)
    await supabase.from('sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId)
    try {
      const data = await finishSessionAndAwardXp(supabase, user.id, sessionId)
      setSummary(data)
    } catch (e) {
      console.error('Bilan de séance indisponible :', e)
      router.push('/salle')
    }
    setFinishing(false)
  }

  // "Abandonner" = arrêter maintenant, mais GARDER et compter ce qui a déjà
  // été fait (rien n'est supprimé, contrairement à avant).
  const abandonSession = () => wrapUpSession()

  // "Accueil" en cours de séance = quitter SANS terminer : la séance reste
  // ouverte (finished_at à null) en base, sans calcul d'XP. Les séries déjà
  // loggées restent enregistrées telles quelles.
  const leaveWithoutFinishing = async () => {}

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
      <TopNav
        title={dayLabel}
        onAbandon={abandonSession}
        abandonLabel="Terminer la séance ici"
        confirmHome
        homeConfirmMessage="Quitter sans terminer la séance ? Les séries déjà faites restent enregistrées, mais cette séance ne comptera pas dans ton bilan tant que tu ne la termines pas."
        onBeforeHome={leaveWithoutFinishing}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        {history.length > 0 ? (
          <button
            onClick={goBack}
            className="muted"
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Précédent
          </button>
        ) : <span />}
        <p className="muted tabular" style={{ fontSize: 13 }}>
          Étape {Math.min(stepIdx + 1, steps.length)} / {steps.length}
          {sessionVolume > 0 && <> · {Math.round(sessionVolume)} kg soulevés</>}
        </p>
      </div>

      {phase === 'resting' && currentStep && (
        <div key={`rest-${stepIdx}`} className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <CoachAvatar avatar={profileAvatar} mode="resting" size={110} />
          </div>
          <RestTimer seconds={currentStep.restSeconds} resetKey={stepIdx} onDone={afterRest} />
          {nextStep && (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13, marginTop: 12 }}>
              Ensuite : <strong style={{ color: 'var(--text)' }}>{nextStep.exerciseName}</strong>
            </p>
          )}
        </div>
      )}

      {phase === 'exercise' && currentStep && (
        <div key={`exo-${stepIdx}-${currentStep.exerciseName}-${currentStep.round}`} className="card fade-in">
          {(() => {
            const gifFile = exerciseGifs[currentStep.exerciseName]
            if (gifFile && showDemo) {
              return (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowDemo(false)}
                    className="exo-demo-toggle"
                    aria-label="Revenir à l'entraîneur"
                    style={{ flex: '0 0 auto', width: 'auto' }}
                  >
                    <img
                      src={`/exercise-gifs/${gifFile}`}
                      alt={currentStep.exerciseName}
                      style={{ width: 150, display: 'block', borderRadius: 10, border: '1px solid var(--border)' }}
                    />
                    <span className="muted" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
                      ◀ Retour
                    </span>
                  </button>
                  {exerciseInstructions[currentStep.exerciseName] && (
                    <p style={{ fontSize: 13, lineHeight: 1.5, flex: '1 1 180px', minWidth: 180, paddingTop: 2 }}>
                      {exerciseInstructions[currentStep.exerciseName]}
                    </p>
                  )}
                </div>
              )
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {gifFile && (
                  <button onClick={() => setShowDemo(true)} className="speech-bubble">
                    👀 Voir comment faire
                  </button>
                )}
                <CoachAvatar avatar={profileAvatar} mode="exercise" size={110} />
              </div>
            )
          })()}
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
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <StepperInput
                  value={inputs.weight}
                  onChange={v => setInputs(prev => ({ ...prev, weight: v }))}
                  step={0.5}
                  placeholder={previousForCurrent ? `${previousForCurrent.weight_kg} kg` : 'kg'}
                />
                <StepperInput
                  value={inputs.reps}
                  onChange={v => setInputs(prev => ({ ...prev, reps: v }))}
                  step={1}
                  placeholder={previousForCurrent ? `${previousForCurrent.reps} reps` : 'reps'}
                />
                <button
                  type="button"
                  onClick={() => setShowPlateCalc(true)}
                  aria-label="Calculateur de plaques"
                  title="Calculateur de plaques"
                  style={{ flex: '0 0 auto', width: 44, background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 18 }}
                >
                  🏋️
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowMore(v => !v)}
                className="muted"
                style={{ background: 'none', border: 'none', fontSize: 12, padding: 0, marginBottom: 12, display: 'block' }}
              >
                {showMore ? '▲ Moins d\'options' : '⋯ Plus d\'options (RPE, note)'}
                {(rpe || notesByExercise[currentStep.exerciseName]) && !showMore && ' ✓'}
              </button>

              {showMore && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>RPE (difficulté ressentie)</p>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRpe(n === rpe ? null : n)}
                          className="tabular"
                          style={{
                            width: 28, height: 28, borderRadius: 6, fontSize: 12,
                            border: '1px solid var(--border)',
                            background: rpe === n ? 'var(--accent-rest)' : 'var(--surface-raised)',
                            color: rpe === n ? '#14140F' : 'var(--text)'
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={notesByExercise[currentStep.exerciseName] || ''}
                    onChange={e => setNotesByExercise(prev => ({ ...prev, [currentStep.exerciseName]: e.target.value }))}
                    onBlur={e => saveExerciseNote(supabase, sessionId, currentStep.exerciseName, e.target.value)}
                    placeholder="Note (ex : épaule qui tirait un peu, à surveiller…)"
                    rows={2}
                    style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
                  />
                </>
              )}

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

          {stepIdx < steps.length - 1 && (
            <button
              onClick={setAsideStep}
              className="muted"
              style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 'none', fontSize: 12, padding: 0 }}
            >
              ⏭ Machine prise — mettre de côté, j'y reviens plus tard
            </button>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Séance terminée</h2>
          <button className="btn btn-primary btn-block" onClick={wrapUpSession} disabled={finishing}>
            {finishing ? 'Calcul du bilan…' : 'Voir mon bilan'}
          </button>
        </div>
      )}

      {showPlateCalc && (
        <PlateCalculator targetWeight={inputs.weight} onClose={() => setShowPlateCalc(false)} />
      )}
    </div>
  )
}
