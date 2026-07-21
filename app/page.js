'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import LoginButton from '@/components/LoginButton'
import AppHeader from '@/components/AppHeader'
import { DEFAULT_AVATAR } from '@/lib/avatarOptions'
import { getRoomState } from '@/lib/gamification'

export default function Home() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined) // undefined = pas encore chargé
  const [profile, setProfile] = useState(undefined)
  const [program, setProgram] = useState(null)
  const [days, setDays] = useState([])
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
        navItems={[
          { href: '/salle', label: 'Ma salle', icon: 'salle' },
          ...(program ? [{ href: '/programs', label: 'Mes programmes', icon: 'programmes' }] : []),
          { href: '/history', label: 'Historique', icon: 'historique' },
          { href: '/import', label: program ? 'Nouveau programme' : 'Importer un programme', icon: 'nouveau' }
        ]}
      />

      {loading && <p className="muted">Chargement…</p>}

      {!loading && !program && (
        <div className="card">
          <p style={{ marginBottom: 16 }}>Aucun programme actif pour l'instant.</p>
          <Link href="/import" className="btn btn-primary btn-block">Importer mon premier programme</Link>
        </div>
      )}

      {!loading && program && (
        <>
          <p className="muted" style={{ marginBottom: 16 }}>{program.name}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {days.map(day => (
              <Link
                key={day.id}
                href={`/session/${day.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className="display" style={{ fontSize: 20 }}>{day.label}</span>
                <span className="muted">Démarrer →</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
