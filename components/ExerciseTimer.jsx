'use client'
import { useEffect, useRef, useState } from 'react'

// Contrairement à RestTimer (qui démarre automatiquement), celui-ci attend
// un appui sur "Démarrer" — le temps de se mettre en position — puis
// décompte jusqu'à 0 et termine l'étape automatiquement. "Terminer
// maintenant" permet d'arrêter avant la fin si besoin (on loggue alors
// la durée réellement tenue plutôt que l'objectif).
export default function ExerciseTimer({ targetSeconds, onComplete, resetKey }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'running'
  const [remaining, setRemaining] = useState(targetSeconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    setStatus('idle')
    setRemaining(targetSeconds)
    clearInterval(intervalRef.current)
  }, [resetKey, targetSeconds])

  useEffect(() => {
    if (status !== 'running') return
    if (remaining <= 0) {
      clearInterval(intervalRef.current)
      onComplete(targetSeconds)
      return
    }
    intervalRef.current = setInterval(() => setRemaining(r => r - 1), 1000)
    return () => clearInterval(intervalRef.current)
  }, [status, remaining])

  const start = () => setStatus('running')

  const stopNow = () => {
    clearInterval(intervalRef.current)
    const actual = Math.max(1, targetSeconds - remaining)
    onComplete(actual)
  }

  const mm = Math.floor(Math.max(remaining, 0) / 60)
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0')

  return (
    <div style={{ textAlign: 'center' }}>
      <p className="display tabular" style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>
        {mm}:{ss}
      </p>
      {status === 'idle' ? (
        <button className="btn btn-primary btn-block" onClick={start}>
          Démarrer
        </button>
      ) : (
        <button className="btn btn-secondary btn-block" onClick={stopNow}>
          Terminer maintenant
        </button>
      )}
    </div>
  )
}
