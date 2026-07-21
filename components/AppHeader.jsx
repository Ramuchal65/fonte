'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PixelAvatar from './PixelAvatar'

const NAV_ICONS = {
  salle: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4M21 10v4M6 7v10M18 7v10M6 12h12" />
    </svg>
  ),
  programmes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8a1 1 0 0 1 1 1v15l-5-3-5 3V5a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  historique: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5M9 2h6" />
    </svg>
  ),
  nouveau: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// Anneau de progression XP autour de l'avatar (0 à 1). Purement décoratif
// si xpProgress est absent (pages où on n'a pas chargé l'état de la salle).
function AvatarRing({ size, xpProgress }) {
  const stroke = 2.5
  const r = (size + 10) / 2 - stroke
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, xpProgress ?? 0))
  return (
    <svg width={size + 10} height={size + 10} style={{ position: 'absolute', inset: -5, transform: 'rotate(-90deg)' }}>
      <circle cx={(size + 10) / 2} cy={(size + 10) / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {xpProgress != null && (
        <circle
          cx={(size + 10) / 2} cy={(size + 10) / 2} r={r} fill="none"
          stroke="var(--accent-rest)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      )}
    </svg>
  )
}

export default function AppHeader({ pseudo, avatar, xpProgress, navItems }) {
  const pathname = usePathname()
  const avatarSize = 40

  return (
    <header className="app-header">
      <Link href="/profile" className="app-header__profile">
        <span className="app-header__avatar-wrap" style={{ width: avatarSize, height: avatarSize }}>
          <AvatarRing size={avatarSize} xpProgress={xpProgress} />
          <PixelAvatar avatar={avatar} size={avatarSize} />
        </span>
        <span className="app-header__pseudo">{pseudo}</span>
      </Link>

      <nav className="app-header__nav">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`app-header__link${active ? ' app-header__link--active' : ''}`}
            >
              {NAV_ICONS[item.icon]}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <style jsx>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border);
        }
        .app-header__profile {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .app-header__avatar-wrap {
          position: relative;
          display: block;
          flex-shrink: 0;
        }
        .app-header__pseudo {
          font-family: var(--font-display);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          display: none;
        }
        .app-header__nav {
          display: flex;
          gap: 2px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .app-header__nav::-webkit-scrollbar { display: none; }
        .app-header__link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .app-header__link span {
          display: none;
        }
        .app-header__link:hover {
          background: var(--surface-raised);
          color: var(--text);
        }
        .app-header__link--active {
          color: var(--accent-rest);
          background: var(--surface-raised);
        }

        @media (min-width: 480px) {
          .app-header__pseudo { display: block; }
          .app-header__link span { display: inline; }
        }
      `}</style>
    </header>
  )
}
