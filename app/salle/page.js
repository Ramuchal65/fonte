'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import EquipmentChoiceModal from '@/components/EquipmentChoiceModal'
import { getRoomState, debugAddXp, debugResetProgression } from '@/lib/gamification'

// Outils de test visibles tant que cette variable n'est pas explicitement
// mise à "false" dans les Environment Variables Vercel. Pense à la passer
// à "false" avant un lancement public.
const DEBUG_TOOLS_ENABLED = process.env.NEXT_PUBLIC_DEBUG_TOOLS !== 'false'

export default function SallePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (uid) => {
    setError(null)
    try {
      const state = await getRoomState(supabase, uid)
      setRoom(state)
    } catch (e) {
      console.error('Erreur chargement Ma salle :', e)
      setError(e.message || 'Erreur inconnue')
    }
    setLoading(false)
  }, [])

  const [debugBusy, setDebugBusy] = useState(false)

  const handleDebugAddXp = async (amount) => {
    if (!user || debugBusy) return
    setDebugBusy(true)
    await debugAddXp(supabase, user.id, amount)
    await load(user.id)
    setDebugBusy(false)
  }

  const handleDebugReset = async () => {
    if (!user || debugBusy) return
    if (!confirm('Réinitialiser toute ta progression (XP, niveau, équipements débloqués) ?')) return
    setDebugBusy(true)
    await debugResetProgression(supabase, user.id)
    await load(user.id)
    setDebugBusy(false)
  }

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)
      await load(u.id)
    }
    init()
  }, [load])

  if (loading) {
    return (
      <div className="container">
        <TopNav />
        <p className="muted">Chargement…</p>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="container">
        <TopNav />
        <div className="card">
          <p style={{ marginBottom: 12 }}>Impossible de charger ta salle.</p>
          {error && <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{error}</p>}
          <button className="btn btn-primary btn-block" onClick={() => { setLoading(true); load(user.id) }}>
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  const xpNeeded = room.xp_needed_for_next
  const xpPct = Math.min(100, Math.round((room.xp_into_level / xpNeeded) * 100))
  const isRoomComplete = room.level_in_category >= room.max_level

  return (
    <div className="container">
      <TopNav title="Ma salle" />

      {user && room.pending_choices > 0 && (
        <EquipmentChoiceModal
          supabase={supabase}
          userId={user.id}
          pendingChoices={room.pending_choices}
          onAllResolved={() => load(user.id)}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <h1 style={{ fontSize: 24 }}>{room.category_name}</h1>
          <span className="muted tabular" style={{ fontSize: 13 }}>
            Niveau {room.level_in_category} / {room.max_level}
          </span>
        </div>

        {!isRoomComplete ? (
          <div style={{ background: 'var(--surface-raised)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{ background: 'var(--accent)', height: '100%', width: `${xpPct}%`, transition: 'width 0.4s ease' }} />
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>Salle entièrement équipée 🎉</p>
        )}
        {!isRoomComplete && (
          <p className="muted tabular" style={{ fontSize: 12, marginTop: 4 }}>
            {room.xp_into_level} / {xpNeeded} XP jusqu'au prochain équipement
          </p>
        )}
      </div>

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1 / 1',
        borderRadius: 10, overflow: 'hidden', background: 'var(--surface)'
      }}>
        {room.room_image_path && (
          <img
            src={room.room_image_path}
            alt={room.category_name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}
        {room.unlocked_equipment.map(eq => (
          <img
            key={eq.slug}
            src={eq.image_path}
            alt={eq.display_name}
            style={{
              position: 'absolute',
              left: `${(eq.x_px / eq.canvas_size) * 100}%`,
              top: `${(eq.y_px / eq.canvas_size) * 100}%`,
              width: `${(eq.w_px / eq.canvas_size) * 100}%`,
              height: `${(eq.h_px / eq.canvas_size) * 100}%`
            }}
          />
        ))}
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 16, textAlign: 'center' }}>
        {room.unlocked_equipment.length} / {room.max_level} équipements débloqués
      </p>

      {DEBUG_TOOLS_ENABLED && (
        <div className="card" style={{ marginTop: 24, borderStyle: 'dashed' }}>
          <p className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Outils de test (à masquer avant lancement public)
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button className="btn btn-secondary" disabled={debugBusy} onClick={() => handleDebugAddXp(150)}>
              +150 XP
            </button>
            <button className="btn btn-secondary" disabled={debugBusy} onClick={() => handleDebugAddXp(1500)}>
              +1500 XP
            </button>
            <button className="btn btn-secondary" disabled={debugBusy} onClick={() => handleDebugAddXp(15000)}>
              +15000 XP
            </button>
          </div>
          <button
            className="btn"
            disabled={debugBusy}
            style={{ background: 'var(--accent)', color: '#14140F', width: '100%' }}
            onClick={handleDebugReset}
          >
            Réinitialiser ma progression
          </button>
        </div>
      )}
    </div>
  )
}
