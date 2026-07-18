'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function TopNav({ title, onAbandon, abandonLabel = 'Abandonner la séance' }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <Link href="/" className="muted" style={{ fontSize: 14, textDecoration: 'underline' }}>
        ← Accueil
      </Link>
      {title && <span className="muted" style={{ fontSize: 14 }}>{title}</span>}
      {onAbandon && (
        confirming ? (
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto', fontSize: 13 }} onClick={() => setConfirming(false)}>
              Non
            </button>
            <button
              className="btn"
              style={{ padding: '6px 10px', minHeight: 'auto', fontSize: 13, background: 'var(--accent)', color: '#14140F' }}
              onClick={onAbandon}
            >
              Confirmer
            </button>
          </span>
        ) : (
          <button
            className="muted"
            style={{ background: 'none', border: 'none', fontSize: 13, textDecoration: 'underline', padding: 0 }}
            onClick={() => setConfirming(true)}
          >
            {abandonLabel}
          </button>
        )
      )}
    </div>
  )
}
