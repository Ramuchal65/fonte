'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'
import EquipmentChoiceModal from '@/components/EquipmentChoiceModal'
import { getRoomState } from '@/lib/gamification'

export default function SallePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [room, setRoom] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (uid) => {
    const state = await getRoomState(supabase, uid)
    setRoom(state)
    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/'); return }
      setUser(u)
      await load(u.id)
    }
    init()
  }, [load])

  if (loading || !room) {
    return (
      <div className="container">
        <TopNav />
        <p className="muted">Chargement…</p>
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
    </div>
  )
}
