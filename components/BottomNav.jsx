'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ICONS = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  salle: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4M21 10v4M6 7v10M18 7v10M6 12h12" />
    </svg>
  ),
  programmes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8a1 1 0 0 1 1 1v15l-5-3-5 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  historique: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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

// Barre persistante en bas d'écran : c'est le pattern recommandé pour 3-5
// destinations principales sur mobile (portée du pouce, pas de menu caché
// à ouvrir). Affichée uniquement quand `visible` est vrai (pages connectées,
// hors écrans plein écran comme la séance en cours).
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
            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
          >
            {ICONS[item.icon]}
            <span>{item.label}</span>
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
          background: var(--surface);
          border-top: 1px solid var(--border);
          padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
        }
        .bottom-nav__item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 12px;
          min-width: 64px;
          text-decoration: none;
          color: var(--text-muted);
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-radius: 10px;
          transition: color 0.15s ease;
        }
        .bottom-nav__item--active {
          color: var(--accent-rest);
        }
      `}</style>
    </nav>
  )
}
