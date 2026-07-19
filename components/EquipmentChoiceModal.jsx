'use client'
import { useEffect, useState } from 'react'
import { getEquipmentChoices, chooseEquipment } from '@/lib/gamification'

// Modal plein écran affiché tant que pending_choices > 0.
// Après chaque choix, se recharge automatiquement pour proposer
// le choix suivant s'il en reste (montée de plusieurs niveaux d'un coup).
export default function EquipmentChoiceModal({ supabase, userId, pendingChoices, onAllResolved }) {
  const [choices, setChoices] = useState(null)
  const [remaining, setRemaining] = useState(pendingChoices)
  const [choosing, setChoosing] = useState(false)

  useEffect(() => {
    setRemaining(pendingChoices)
  }, [pendingChoices])

  useEffect(() => {
    if (remaining <= 0) {
      onAllResolved?.()
      return
    }
    let cancelled = false
    getEquipmentChoices(supabase, userId).then(c => {
      if (!cancelled) setChoices(c)
    })
    return () => { cancelled = true }
  }, [remaining])

  if (remaining <= 0 || !choices) return null

  const pick = async (equipmentId) => {
    setChoosing(true)
    await chooseEquipment(supabase, userId, equipmentId)
    setChoices(null)
    setRemaining(r => r - 1)
    setChoosing(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,20,15,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 16
    }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <p className="muted" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Niveau supérieur !
        </p>
        <h2 style={{ fontSize: 22, marginBottom: 20 }}>Choisis ton équipement</h2>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {choices.map(eq => (
            <button
              key={eq.id}
              disabled={choosing}
              onClick={() => pick(eq.id)}
              className="card"
              style={{
                flex: 1, cursor: choosing ? 'default' : 'pointer',
                opacity: choosing ? 0.6 : 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 10, padding: 16
              }}
            >
              <img src={eq.image_path} alt={eq.display_name} style={{ width: '100%', maxWidth: 120, height: 'auto' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{eq.display_name}</span>
            </button>
          ))}
        </div>

        {remaining > 1 && (
          <p className="muted" style={{ fontSize: 13 }}>
            Encore {remaining - 1} choix après celui-ci
          </p>
        )}
      </div>
    </div>
  )
}
