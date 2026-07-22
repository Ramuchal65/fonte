'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS = {
  home: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  salle: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4M21 10v4M6 7v10M18 7v10M6 12h12" />
    </svg>
  ),
  programmes: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8a1 1 0 0 1 1 1v15l-5-3-5 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  historique: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </svg>
  )
}

const ITEMS = [
  { href: '/', label: 'Accueil', icon: 'home' },
  { href: '/salle', label: 'Ma salle', icon: 'salle' },
  { href: '/programs', label: 'Programmes', icon: 'programmes' },
  { href: '/history', label: 'Historique', icon: 'historique' }
]

// Barre persistante en bas d'écran. Seul l'onglet actif affiche son
// libellé (dans une pastille teintée) ; les autres restent en icône
// seule et discrète — pattern Material 3 / la plupart des apps bien
// notées en 2026, qui réduit le bruit visuel d'une nav à 4 items.
export default function BottomNav({ visible }) {
  const pathname = usePathname()
  if (!visible) return null

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {ITEMS.map(item => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">{ICONS[item.icon]}</span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        )
      })}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: color-mix(in srgb, var(--surface) 82%, transparent);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border-top: 1px solid var(--border);
          padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
        }
        .bottom-nav__item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          text-decoration: none;
          color: var(--text-muted);
          border-radius: 999px;
          transition: color 0.2s ease, background 0.2s ease, padding 0.2s ease, transform 0.15s ease;
        }
        .bottom-nav__item:active {
          transform: scale(0.92);
        }
        .bottom-nav__icon {
          display: flex;
          transition: transform 0.2s ease;
        }
        .bottom-nav__label {
          font-size: 12.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          max-width: 0;
          overflow: hidden;
          white-space: nowrap;
          opacity: 0;
          transition: max-width 0.25s ease, opacity 0.2s ease;
        }
        .bottom-nav__item--active {
          color: var(--accent-rest);
          background: color-mix(in srgb, var(--accent-rest) 16%, transparent);
        }
        .bottom-nav__item--active .bottom-nav__icon {
          transform: scale(1.08);
        }
        .bottom-nav__item--active .bottom-nav__label {
          max-width: 120px;
          opacity: 1;
        }
      `}</style>
    </nav>
  )
}
