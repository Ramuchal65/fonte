'use client'
import { useEffect, useRef, useState } from 'react'

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const MUSCLE_GROUP_LABELS = {
  pectoraux: 'Pectoraux', dos: 'Dos', epaules: 'Épaules',
  biceps: 'Biceps', triceps: 'Triceps',
  quadriceps: 'Quadriceps', ischios_jambiers: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
  core: 'Core', cardio: 'Cardio', full_body: 'Full body'
}

// Champ texte avec suggestions issues du référentiel d'exercices (recherche
// par nom/alias, insensible aux accents/majuscules) + des raccourcis par
// groupe musculaire pour parcourir quand on ne sait pas quoi taper. Le champ
// reste libre : on peut toujours saisir un nom qui n'est pas dans la liste.
export default function ExercisePicker({ value, onChange, catalog }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(null)
  const wrapRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const groups = [...new Set(catalog.map(c => c.muscle_group))]

  let suggestions
  if (activeGroup) {
    suggestions = catalog.filter(c => c.muscle_group === activeGroup)
  } else if (query.trim().length > 0) {
    const q = normalize(query)
    suggestions = catalog.filter(c =>
      normalize(c.canonical_name).includes(q) ||
      (c.aliases || []).some(a => normalize(a).includes(q))
    )
  } else {
    suggestions = []
  }
  suggestions = suggestions.slice(0, 8)

  const pick = (name) => {
    setQuery(name)
    onChange(name)
    setOpen(false)
    setActiveGroup(null)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 2 }}>
      <input
        type="text"
        value={query}
        placeholder="Nom de l'exercice"
        onFocus={() => setOpen(true)}
        onChange={e => {
          setQuery(e.target.value)
          setActiveGroup(null)
          onChange(e.target.value)
          setOpen(true)
        }}
      />
      {open && (
        <div className="card" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          zIndex: 20, padding: 8, maxHeight: 260, overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: suggestions.length > 0 ? 8 : 0 }}>
            {groups.map(g => (
              <button
                key={g}
                type="button"
                className="btn btn-secondary"
                style={{
                  padding: '4px 8px', minHeight: 'auto', fontSize: 11,
                  background: activeGroup === g ? 'var(--accent-rest)' : undefined,
                  color: activeGroup === g ? '#14140F' : undefined
                }}
                onClick={() => setActiveGroup(prev => prev === g ? null : g)}
              >
                {MUSCLE_GROUP_LABELS[g] || g}
              </button>
            ))}
          </div>

          {suggestions.length === 0 && (
            <p className="muted" style={{ fontSize: 12, padding: '4px 4px' }}>
              {activeGroup ? 'Aucun exercice dans ce groupe.' : (query.trim() ? 'Aucune suggestion — le nom saisi sera gardé tel quel.' : 'Tape un nom ou choisis un groupe musculaire ci-dessus.')}
            </p>
          )}

          {suggestions.map(s => (
            <button
              key={s.canonical_name}
              type="button"
              onClick={() => pick(s.canonical_name)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '8px 6px', borderRadius: 6, cursor: 'pointer', color: 'var(--text)'
              }}
              onMouseDown={e => e.preventDefault()}
            >
              <span style={{ fontSize: 14 }}>{s.canonical_name}</span>
              <span className="muted" style={{ fontSize: 11 }}>{MUSCLE_GROUP_LABELS[s.muscle_group] || s.muscle_group}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
