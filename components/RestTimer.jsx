'use client'
import { useEffect, useRef, useState } from 'react'

export default function RestTimer({ seconds, onDone, resetKey }) {
  const [remaining, setRemaining] = useState(seconds)
  const intervalRef = useRef(null)

  useEffect(() => {
    setRemaining(seconds)
  }, [seconds, resetKey])

  useEffect(() => {
    if (remaining <= 0) {
      clearInterval(intervalRef.current)
      if (remaining === 0) onDone?.()
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(r => r - 1)
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [remaining])

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
