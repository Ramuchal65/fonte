'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

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

  const [confirmingDelete, setConfirmingDelete] = useState(null)

  const deleteProgram = async (programId) => {
    await supabase.from('programs').delete().eq('id', programId)
    setConfirmingDelete(null)
    load()
  }

  if (loading) return <div className="container"><p className="muted">Chargement…</p></div>

  return (
    <div className="container">
      <TopNav />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24 }}>Mes programmes</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/programs/new" className="btn btn-secondary" style={{ padding: '8px 14px', minHeight: 36, fontSize: 13 }}>
            + Créer
          </Link>
          <Link href="/import" className="btn btn-secondary" style={{ padding: '8px 14px', minHeight: 36, fontSize: 13 }}>
            + Importer
          </Link>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 20 }}>
        Un seul programme actif à la fois. Les anciens restent ici, ton historique de perfs est conservé.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programs.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 600 }}>{p.name}</p>
                <p className="muted" style={{ fontSize: 13 }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  {!p.archived_at && ' · actif'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {p.archived_at && (
                  <button className="btn btn-secondary" onClick={() => reactivate(p.id)}>
                    Rendre actif
                  </button>
                )}
                <Link href={`/programs/${p.id}/edit`} className="btn btn-secondary">
                  Modifier
                </Link>
                {confirmingDelete === p.id ? (
                  <button
                    className="btn"
                    style={{ background: 'var(--accent)', color: '#14140F' }}
                    onClick={() => deleteProgram(p.id)}
                  >
                    Confirmer
                  </button>
                ) : (
                  <button
                    className="muted"
                    style={{ background: 'none', border: 'none', fontSize: 13 }}
                    onClick={() => setConfirmingDelete(p.id)}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {programs.length === 0 && <p className="muted">Aucun programme pour l'instant.</p>}
      </div>
    </div>
  )
}
