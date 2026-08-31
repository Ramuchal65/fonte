'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import TopNav from '@/components/TopNav'

// Un programme supprimé depuis moins de 30 jours reste récupérable dans
// la corbeille. Au-delà, il n'apparaît plus (mais reste en base — pas de
// purge automatique, pas grave à l'échelle d'un usage perso).
const TRASH_RETENTION_DAYS = 30

export default function ProgramsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState(undefined)
  const [programs, setPrograms] = useState([])
  const [showTrash, setShowTrash] = useState(false)
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
      .select('id, name, created_at, archived_at, deleted_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setPrograms(data ?? [])
    setLoading(false)
  }

  const reactivate = async (programId) => {
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

  // Suppression douce : on marque deleted_at au lieu d'effacer, récupérable
  // depuis la corbeille pendant 30 jours.
  const deleteProgram = async (programId) => {
    await supabase.from('programs').update({ deleted_at: new Date().toISOString() }).eq('id', programId)
    setConfirmingDelete(null)
    load()
  }

  const restoreProgram = async (programId) => {
    await supabase.from('programs').update({ deleted_at: null }).eq('id', programId)
    load()
  }

  const deleteForever = async (programId) => {
    await supabase.from('programs').delete().eq('id', programId)
    load()
  }

  if (loading) return <div className="container"><p className="muted">Chargement…</p></div>

  const now = Date.now()
  const isTrashedRecently = (p) => p.deleted_at && (now - new Date(p.deleted_at).getTime()) < TRASH_RETENTION_DAYS * 86400000

  const visible = programs.filter(p => !p.deleted_at)
  const trashed = programs.filter(isTrashedRecently)

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
        {visible.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <p style={{ fontWeight: 600, overflowWrap: 'break-word' }}>{p.name}</p>
                <p className="muted" style={{ fontSize: 13 }}>
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  {!p.archived_at && ' · actif'}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                    className="link-action"
                    style={{ fontSize: 13 }}
                    onClick={() => setConfirmingDelete(p.id)}
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="muted">Aucun programme pour l'instant.</p>}
      </div>

      {trashed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button className="link-action" style={{ fontSize: 13 }} onClick={() => setShowTrash(v => !v)}>
            🗑 Corbeille ({trashed.length}) {showTrash ? '▲' : '▼'}
          </button>
          {showTrash && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {trashed.map(p => {
                const daysLeft = TRASH_RETENTION_DAYS - Math.floor((now - new Date(p.deleted_at).getTime()) / 86400000)
                return (
                  <div key={p.id} className="card" style={{ opacity: 0.8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                        <p style={{ fontWeight: 600 }}>{p.name}</p>
                        <p className="muted" style={{ fontSize: 12 }}>Supprimé — {daysLeft} jour{daysLeft > 1 ? 's' : ''} avant purge définitive</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 12px', minHeight: 'auto' }} onClick={() => restoreProgram(p.id)}>
                          Restaurer
                        </button>
                        <button className="link-action" style={{ fontSize: 13 }} onClick={() => deleteForever(p.id)}>
                          Supprimer définitivement
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
