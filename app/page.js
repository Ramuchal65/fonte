'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import LoginButton from '@/components/LoginButton'
import AppHeader from '@/components/AppHeader'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { getRoomState, duplicateLastSession } from '@/lib/gamification'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined) // undefined = pas encore chargé
  const [profile, setProfile] = useState(undefined)
  const [program, setProgram] = useState(null)
  const [days, setDays] = useState([])
  const [daysWithHistory, setDaysWithHistory] = useState(new Set())
  const [duplicating, setDuplicating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [xpProgress, setXpProgress] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data: prof } = await supabase
        .from('profiles')
        .select('pseudo, avatar')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (!prof) {
        router.push('/onboarding')
        return
      }
      setProfile(prof)

      getRoomState(supabase, user.id)
        .then(room => {
          if (cancelled || !room) return
          setXpProgress(room.xp_needed_for_next ? room.xp_into_level / room.xp_needed_for_next : 0)
        })
        .catch(() => { /* purement décoratif, on ignore silencieusement */ })

      const { data: prog } = await supabase
        .from('programs')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      setProgram(prog ?? null)

      if (prog) {
        const { data: d } = await supabase
          .from('program_days')
          .select('id, label, position')
          .eq('program_id', prog.id)
          .order('position')
        if (!cancelled) setDays(d ?? [])

        if (d?.length) {
          const { data: sessRows } = await supabase
            .from('sessions')
            .select('program_day_id')
            .in('program_day_id', d.map(x => x.id))
            .eq('user_id', user.id)
            .not('finished_at', 'is', null)
          if (!cancelled) setDaysWithHistory(new Set((sessRows ?? []).map(s => s.program_day_id)))
        }
      } else {
        setDays([])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  if (user === undefined) return null

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 96 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Fonte</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          Colle ton programme généré par IA. On le structure, tu t'entraînes.
        </p>
        <LoginButton />
      </div>
    )
  }

  if (!profile) return null // redirection vers /onboarding en cours

  return (
    <div className="container">
      <AppHeader
        pseudo={profile.pseudo}
        avatar={{ ...DEFAULT_AVATAR, ...profile.avatar }}
        xpProgress={xpProgress}
      />

      {loading && <p className="muted">Chargement…</p>}

      {!loading && !program && (
        <div className="card">
          <p style={{ marginBottom: 16 }}>Aucun programme actif pour l'instant.</p>
          <Link href="/import" className="btn btn-primary btn-block" style={{ marginBottom: 8 }}>Importer mon premier programme</Link>
          <Link href="/programs/new" className="btn btn-secondary btn-block">Créer un programme sans import</Link>
        </div>
      )}

      {!loading && program && (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>{program.name}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {days.map(day => (
              <div key={day.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link
                  href={`/session/${day.id}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className="display" style={{ fontSize: 20 }}>{day.label}</span>
                  <span className="muted">Démarrer →</span>
                </Link>
                {daysWithHistory.has(day.id) && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto' }}
                    disabled={duplicating === day.id}
                    onClick={async (e) => {
                      e.preventDefault()
                      setDuplicating(day.id)
                      try {
                        await duplicateLastSession(supabase, user.id, day.id)
                        router.push('/salle')
                      } catch (err) {
                        console.error(err)
                        setDuplicating(null)
                      }
                    }}
                  >
                    {duplicating === day.id ? 'Duplication…' : '⧉ Refaire la dernière séance à l\'identique'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
