'use client'
import { useState } from 'react'

const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]

// Calcule, en glouton, quelles plaques charger de CHAQUE côté pour
// atteindre le poids total visé avec une barre donnée.
function computePlates(totalWeight, barWeight) {
  let perSide = (totalWeight - barWeight) / 2
  if (perSide <= 0) return { plates: [], remainder: 0 }
  const plates = []
  for (const p of STANDARD_PLATES) {
    while (perSide >= p - 0.001) {
      plates.push(p)
      perSide -= p
    }
  }
  return { plates, remainder: Math.round(perSide * 100) / 100 }
}

export default function PlateCalculator({ targetWeight, onClose }) {
  const [barWeight, setBarWeight] = useState(20)
  const weight = Number(targetWeight) || 0
  const { plates, remainder } = computePlates(weight, barWeight)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(20,20,15,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16
      }}
    >
      <div className="card" style={{ maxWidth: 340, width: '100%' }} onClick={e => e.stopPropagation()}>
        <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Chargement barre
        </p>
        <p style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>{weight} kg au total</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <label className="muted" style={{ fontSize: 13, flexShrink: 0 }}>Poids de la barre</label>
          <input
            type="number"
            inputMode="decimal"
            value={barWeight}
            onChange={e => setBarWeight(Number(e.target.value) || 0)}
            style={{ width: 80 }}
          />
          <span className="muted" style={{ fontSize: 13 }}>kg</span>
        </div>

        {weight <= barWeight ? (
          <p className="muted" style={{ fontSize: 14 }}>La barre seule suffit (ou dépasse déjà l'objectif).</p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>De chaque côté :</p>
            {plates.length === 0 ? (
              <p className="muted" style={{ fontSize: 14 }}>Rien à ajouter.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {plates.map((p, i) => (
                  <span
                    key={i}
                    className="tabular"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 44, padding: '6px 8px', borderRadius: 6,
                      background: 'var(--surface-raised)', border: '1px solid var(--border)',
                      fontSize: 14, fontWeight: 600
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            {remainder > 0 && (
              <p className="muted" style={{ fontSize: 12 }}>
                {remainder} kg non atteignables avec un jeu de plaques standard (25/20/15/10/5/2,5/1,25).
              </p>
            )}
          </>
        )}

        <button className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  )
}
