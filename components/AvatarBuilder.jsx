'use client'
import { useState } from 'react'
import PixelAvatar from './PixelAvatar'
import { HAIRSTYLES, HAIR_COLORS, FACIAL_HAIR, OUTFITS, BODY_SIZES, SKIN_TONES, DEFAULT_AVATAR } from '@/lib/avatarOptions'

function SwatchButton({ active, onClick, children, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 8,
        padding: '8px 10px',
        background: active ? 'var(--surface-raised)' : 'var(--surface)',
        fontSize: 13,
        color: 'var(--text)',
        ...style
      }}
    >
      {children}
    </button>
  )
}

export default function AvatarBuilder({
  initialAvatar = DEFAULT_AVATAR,
  initialPseudo = '',
  showPseudoField = true,
  onSave,
  saving = false,
  error = '',
  submitLabel = 'Enregistrer'
}) {
  const [avatar, setAvatar] = useState(initialAvatar)
  const [pseudo, setPseudo] = useState(initialPseudo)

  const set = (field, value) => setAvatar(prev => ({ ...prev, [field]: value }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <PixelAvatar avatar={avatar} size={140} />
      </div>

      {showPseudoField && (
        <div style={{ marginBottom: 20 }}>
          <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Pseudo (unique, 3-20 caractères)
          </label>
          <input
            type="text"
            value={pseudo}
            onChange={e => setPseudo(e.target.value)}
            placeholder="ex : floran_fonte"
          />
        </div>
      )}

      <Section label="Couleur de peau">
        <div style={{ display: 'flex', gap: 10 }}>
          {SKIN_TONES.map(s => (
            <button
              key={s.id}
              aria-label={s.label}
              onClick={() => set('skinTone', s.id)}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: s.hex,
                border: avatar.skinTone === s.id ? '3px solid var(--accent)' : '3px solid var(--border)'
              }}
            />
          ))}
        </div>
      </Section>

      <Section label="Coiffure">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HAIRSTYLES.map(h => (
            <SwatchButton key={h.id} active={avatar.hairstyle === h.id} onClick={() => set('hairstyle', h.id)}>
              {h.label}
            </SwatchButton>
          ))}
        </div>
      </Section>

      <Section label="Couleur de cheveux">
        <div style={{ display: 'flex', gap: 10 }}>
          {HAIR_COLORS.map(c => (
            <button
              key={c.id}
              aria-label={c.label}
              onClick={() => set('hairColor', c.id)}
              style={{
                width: 36, height: 36, borderRadius: '50%', background: c.hex,
                border: avatar.hairColor === c.id ? '3px solid var(--accent)' : '3px solid var(--border)'
              }}
            />
          ))}
        </div>
      </Section>

      <Section label="Lunettes">
        <div style={{ display: 'flex', gap: 8 }}>
          <SwatchButton active={!avatar.glasses} onClick={() => set('glasses', false)}>Sans</SwatchButton>
          <SwatchButton active={avatar.glasses} onClick={() => set('glasses', true)}>Avec</SwatchButton>
        </div>
      </Section>

      <Section label="Pilosité faciale">
        <div style={{ display: 'flex', gap: 8 }}>
          {FACIAL_HAIR.map(f => (
            <SwatchButton key={f.id} active={avatar.facialHair === f.id} onClick={() => set('facialHair', f.id)}>
              {f.label}
            </SwatchButton>
          ))}
        </div>
      </Section>

      <Section label="Tenue de sport">
        <div style={{ display: 'flex', gap: 10 }}>
          {OUTFITS.map(o => (
            <button
              key={o.id}
              aria-label={o.label}
              onClick={() => set('outfit', o.id)}
              style={{
                width: 44, height: 36, borderRadius: 6, background: o.primary,
                border: avatar.outfit === o.id ? '3px solid var(--accent)' : '3px solid var(--border)',
                position: 'relative', overflow: 'hidden'
              }}
            >
              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: o.secondary }} />
            </button>
          ))}
        </div>
      </Section>

      <Section label="Carrure">
        <div style={{ display: 'flex', gap: 8 }}>
          {BODY_SIZES.map(s => (
            <SwatchButton key={s.id} active={avatar.bodySize === s.id} onClick={() => set('bodySize', s.id)}>
              {s.label}
            </SwatchButton>
          ))}
        </div>
      </Section>

      {error && <p style={{ color: 'var(--accent)', marginTop: 8, marginBottom: 8 }}>{error}</p>}

      <button
        className="btn btn-primary btn-block"
        style={{ marginTop: 12 }}
        disabled={saving || (showPseudoField && pseudo.trim().length < 3)}
        onClick={() => onSave(pseudo.trim(), avatar)}
      >
        {saving ? 'Enregistrement…' : submitLabel}
      </button>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{label}</p>
      {children}
    </div>
  )
}
