'use client'
import { useEffect, useRef, useState } from 'react'

// Joue un petit bip synthétisé (aucun fichier audio nécessaire).
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    osc.onended = () => ctx.close()
  } catch (e) { /* audio non disponible, tant pis */ }
}

export default function RestTimer({ seconds, onDone, resetKey }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)
  const wakeLockRef = useRef(null)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds, resetKey])

  useEffect(() => {
    if (remaining <= 0) {
      clearInterval(intervalRef.current)
      if (remaining === 0) onDone?.()
      return
    }
    if (remaining <= 5) playBeep()
    intervalRef.current = setInterval(() => {
      setRemaining(r => r - 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [remaining])

  // Empêche l'écran de se verrouiller pendant le repos (utile sur téléphone :
  // sinon l'écran s'éteint et on rate le décompte). Relâché à la fin du
  // repos ou si l'écran se remet en veille (revient automatiquement si
  // l'onglet redevient visible pendant qu'on est encore en repos).
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) { lock.release(); return }
        wakeLockRef.current = lock
      } catch (e) { /* refusé (économie de batterie, etc.) - tant pis */ }
    }
    acquire()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])

  const pct = Math.max(0, Math.min(1, remaining / seconds))
  const mm = Math.floor(Math.max(remaining, 0) / 60)
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0')

  return (
    <div
      className="card"
      style={{
        textAlign: 'center',
        borderColor: remaining <= 5 ? 'var(--accent)' : 'var(--accent-rest)',
        borderWidth: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0, bottom: 0, right: 0,
          height: `${pct * 100}%`,
          background: 'color-mix(in srgb, var(--accent-rest) 18%, transparent)',
          transition: 'height 1s linear'
        }}
      />
      <div style={{ position: 'relative' }}>
        <p className="muted" style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Repos
        </p>
        <p className="display tabular" style={{ fontSize: 48, lineHeight: 1 }}>
          {mm}:{ss}
        </p>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setRemaining(0)}>
          Passer le repos
        </button>
      </div>
    </div>
  )
}
