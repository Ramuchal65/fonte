'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// title sur sa PROPRE ligne (plus de chevauchement avec "Accueil" quand le
// titre est long — c'était le bug signalé). "Accueil" peut lui aussi
// demander confirmation (confirmHome) en plus du bouton d'abandon.
export default function TopNav({
  title,
  onAbandon,
  abandonLabel = 'Abandonner la séance',
  confirmHome = false,
  homeConfirmMessage = 'Quitter sans terminer la séance ?',
  onBeforeHome
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(null) // null | 'abandon' | 'home'

  const goHome = async (e) => {
    if (!confirmHome) return // comportement normal du <Link>, rien à faire
    e.preventDefault()
    if (confirming === 'home') {
      await onBeforeHome?.()
      router.push('/')
    } else {
      setConfirming('home')
    }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <Link
          href="/"
          onClick={goHome}
          className="link-action"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Accueil
        </Link>

        {onAbandon && (
          confirming === 'abandon' ? (
            <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: 'auto', fontSize: 13 }} onClick={() => setConfirming(null)}>
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
              className="link-action"
              style={{ fontSize: 13, flexShrink: 0 }}
              onClick={() => setConfirming('abandon')}
            >
              {abandonLabel}
            </button>
          )
        )}
      </div>

      {title && (
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>{title}</p>
      )}

      {confirming === 'home' && (
        <div className="card" style={{ marginTop: 10, borderColor: 'var(--accent)' }}>
          <p style={{ fontSize: 13, marginBottom: 10 }}>{homeConfirmMessage}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '6px 10px', minHeight: 'auto', fontSize: 13 }} onClick={() => setConfirming(null)}>
              Rester
            </button>
            <button
              className="btn"
              style={{ flex: 1, padding: '6px 10px', minHeight: 'auto', fontSize: 13, background: 'var(--accent)', color: '#14140F' }}
              onClick={async () => { await onBeforeHome?.(); router.push('/') }}
            >
              Quitter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
