'use client'
import Link from 'next/link'
import PixelAvatar from './PixelAvatar'

// Anneau de progression XP autour de l'avatar (0 à 1). Purement décoratif
// si xpProgress est absent.
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

// Identité compacte en haut de l'accueil : avatar (avec anneau XP) + pseudo,
// clique vers /profile. La navigation elle-même vit dans BottomNav.
export default function AppHeader({ pseudo, avatar, xpProgress }) {
  const avatarSize = 44
  return (
    <Link
      href="/profile"
      style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 24 }}
    >
      <span style={{ position: 'relative', display: 'block', width: avatarSize, height: avatarSize, flexShrink: 0 }}>
        <AvatarRing size={avatarSize} xpProgress={xpProgress} />
        <PixelAvatar avatar={avatar} size={avatarSize} />
      </span>
      <span style={{
        fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.03em',
        fontSize: 14, fontWeight: 600, color: 'var(--text)'
      }}>
        {pseudo}
      </span>
    </Link>
  )
}
