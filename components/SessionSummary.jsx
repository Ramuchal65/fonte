'use client'

import BadgeIcon from './BadgeIcon'

function formatDuration(seconds) {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h} h ${rem}` : `${h} h`
}

function StatBlock({ label, value }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 100 }}>
      <p className="display tabular" style={{ fontSize: 26 }}>{value}</p>
      <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  )
}

export default function SessionSummary({ summary, onContinue }) {
  const {
    duration_seconds, total_sets, total_reps, total_volume_kg,
    has_previous, is_better, comparable_sets, improved_sets, set_comparisons,
    base_xp, bonus_xp, xp_earned,
    level_in_category, max_level, xp_into_level, xp_needed_for_next,
    new_achievements
  } = summary

  const xpPct = Math.min(100, Math.round((xp_into_level / xp_needed_for_next) * 100))

  // Regroupe les lignes de comparaison par exercice, pour un affichage
  // façon écran de montée de niveau : nom de l'exercice en titre, puis
  // chaque série avec sa valeur avant -> après et une flèche de couleur.
  const byExercise = {}
  for (const s of set_comparisons ?? []) {
    (byExercise[s.exercise_name] ??= []).push(s)
  }

  function formatSetValues(s) {
    if (s.current_duration_seconds != null) {
      return { before: `${s.previous_duration_seconds ?? '—'} s`, after: `${s.current_duration_seconds} s` }
    }
    if (s.current_weight_kg > 0) {
      return { before: `${s.previous_weight_kg} kg × ${s.previous_reps}`, after: `${s.current_weight_kg} kg × ${s.current_reps}` }
    }
    return { before: `${s.previous_reps} reps`, after: `${s.current_reps} reps` }
  }

  return (
    <div className="container" style={{ paddingTop: 48 }}>
      <p className="muted" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', marginBottom: 4 }}>
        Séance terminée
      </p>
      <h1 style={{ fontSize: 28, textAlign: 'center', marginBottom: 28 }}>Bilan</h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 24 }}>
        <StatBlock label="Durée" value={formatDuration(duration_seconds)} />
        <StatBlock label="Répétitions" value={total_reps} />
        <StatBlock label="Séries" value={total_sets} />
        <StatBlock label="Charge totale" value={`${Math.round(total_volume_kg)} kg`} />
      </div>

      {has_previous && comparable_sets > 0 ? (
        <div className="card" style={{ marginBottom: 16, borderColor: is_better ? 'var(--accent-rest)' : undefined }}>
          <p style={{ marginBottom: 12 }}>
            {improved_sets === comparable_sets ? (
              <strong style={{ color: 'var(--accent-rest)' }}>Meilleure séance sur toute la ligne 🎉</strong>
            ) : improved_sets > 0 ? (
              <>
                <strong style={{ color: 'var(--accent-rest)' }}>Progression</strong> sur {improved_sets} série{improved_sets > 1 ? 's' : ''} sur {comparable_sets}
                {is_better ? ' — dans l\'ensemble, meilleure séance !' : '.'}
              </>
            ) : (
              <span className="muted">Pas de progression détectée cette fois — la prochaine sera la bonne.</span>
            )}
          </p>

          {/* Écran façon "montée de niveau" : chaque série comparée, avec
              flèche verte si progrès, grise si stable ou en retrait —
              jamais de rouge alarmant, juste un constat honnête. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(byExercise).map(([name, sets]) => (
              <div key={name}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{name}</p>
                {sets.map(s => {
                  const { before, after } = formatSetValues(s)
                  const arrow = s.improved ? '▲' : s.unchanged ? '=' : '▼'
                  const color = s.improved ? 'var(--accent-rest)' : 'var(--text-muted)'
                  return (
                    <div key={s.set_number} className="tabular" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 2, paddingLeft: 8 }}>
                      <span className="muted" style={{ minWidth: 54 }}>Série {s.set_number}</span>
                      <span className="muted">{before}</span>
                      <span style={{ color, fontWeight: 700 }}>{arrow}</span>
                      <span style={{ color, fontWeight: s.improved ? 700 : 400 }}>{after}</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="muted">Première séance enregistrée sur cet entraînement — bravo pour la référence !</p>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <p style={{ fontWeight: 600 }}>
            +{xp_earned} XP
            {bonus_xp > 0 && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}> ({base_xp} + {bonus_xp} bonus performance)</span>}
          </p>
          <span className="muted tabular" style={{ fontSize: 13 }}>Niveau {level_in_category} / {max_level}</span>
        </div>
        <div style={{ background: 'var(--surface-raised)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
          <div style={{ background: 'var(--accent-rest)', height: '100%', width: `${xpPct}%`, transition: 'width 0.6s ease' }} />
        </div>
      </div>

      {new_achievements?.length > 0 && (
        <div className="card" style={{ marginTop: 16, borderColor: 'var(--accent-rest)' }}>
          <p style={{ textAlign: 'center', marginBottom: 10 }}>
            🏅 <strong style={{ color: 'var(--accent-rest)' }}>
              {new_achievements.length} nouveau{new_achievements.length > 1 ? 'x' : ''} succès débloqué{new_achievements.length > 1 ? 's' : ''} !
            </strong>
          </p>
          {new_achievements.map(a => (
            <div key={a.slug} style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <BadgeIcon icon={a.badge_icon} tier={a.badge_tier} size={36} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</p>
                <p className="muted" style={{ fontSize: 12 }}>{a.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={onContinue}>
        Voir ma salle
      </button>
    </div>
  )
}
