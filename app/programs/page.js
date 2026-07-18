'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ProgramsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser(data.user)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('programs')
      .select('id, name, created_at, archived_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPrograms(data ?? [])
    setLoading(false)
  }

  const reactivate = async (programId) => {
    // Archive tout ce qui est actif, puis réactive celui choisi
    await supabase
      .from('programs')
      .update({ archived_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('archived_at', null)

    await supabase
      .from('programs')
      .update({ archived_at: null })
      .eq('id', programId)

    router.push('/')
  }

  if (loading) return <div className="container"><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Mes programmes</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Un seul programme actif à la fois. Les anciens restent ici, ton historique de perfs est conservé.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programs.map(p => (
          <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 600 }}>{p.name}</p>
              <p className="muted" style={{ fontSize: 13 }}>
                {new Date(p.created_at).toLocaleDateString('fr-FR')}
                {!p.archived_at && ' · actif'}
              </p>
            </div>
            {p.archived_at && (
              <button className="btn btn-secondary" onClick={() => reactivate(p.id)}>
                Rendre actif
              </button>
            )}
          </div>
        ))}
        {programs.length === 0 && <p className="muted">Aucun programme pour l'instant.</p>}
      </div>
    </div>
  )
}
