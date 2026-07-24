'use client'

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
    has_previous, is_better, comparable_exercises, improved_exercises,
    base_xp, bonus_xp, xp_earned,
    level_in_category, max_level, xp_into_level, xp_needed_for_next,
    new_achievements
  } = summary

  const xpPct = Math.min(100, Math.round((xp_into_level / xp_needed_for_next) * 100))

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

      <div className="card" style={{ marginBottom: 16, borderColor: is_better ? 'var(--accent-rest)' : undefined }}>
        {has_previous && comparable_exercises > 0 ? (
          improved_exercises === comparable_exercises ? (
            <p>
              <strong style={{ color: 'var(--accent-rest)' }}>Meilleure séance sur toute la ligne</strong> — progression sur les {comparable_exercises} exercice{comparable_exercises > 1 ? 's' : ''} comparé{comparable_exercises > 1 ? 's' : ''} à la dernière fois.
            </p>
          ) : improved_exercises > 0 ? (
            <p>
              <strong style={{ color: 'var(--accent-rest)' }}>Progression</strong> sur {improved_exercises} exercice{improved_exercises > 1 ? 's' : ''} sur {comparable_exercises} par rapport à la dernière fois
              {is_better ? ' — dans l\'ensemble, meilleure séance !' : '.'}
            </p>
          ) : (
            <p className="muted">
              Pas de progression détectée par rapport à la dernière fois sur cet entraînement — la prochaine sera la bonne.
            </p>
          )
        ) : (
          <p className="muted">Première séance enregistrée sur cet entraînement — bravo pour la référence !</p>
        )}
      </div>

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
        <div className="card" style={{ marginTop: 16, borderColor: 'var(--accent-rest)', textAlign: 'center' }}>
          <p>
            🏅 <strong style={{ color: 'var(--accent-rest)' }}>
              {new_achievements.length} nouveau{new_achievements.length > 1 ? 'x' : ''} succès débloqué{new_achievements.length > 1 ? 's' : ''} !
            </strong>
          </p>
        </div>
      )}

      <button className="btn btn-primary btn-block" style={{ marginTop: 24 }} onClick={onContinue}>
        Voir ma salle
      </button>
    </div>
  )
}
