function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

// navigator.serviceWorker.ready ne se résout QUE si un service worker a
// bien été enregistré et activé. Si l'enregistrement échoue ou traîne,
// cette promesse ne se résout jamais — sans filet, ça bloquait le bouton
// "Rappel de séance" indéfiniment sur un état de chargement invisible.
function serviceWorkerReadyWithTimeout(ms = 4000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker non prêt (timeout)')), ms))
  ])
}

export async function getPushSubscriptionState() {
  if (!pushSupported()) return 'unsupported'
  try {
    const reg = await serviceWorkerReadyWithTimeout()
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'subscribed' : 'not-subscribed'
  } catch (e) {
    console.error('Service worker indisponible :', e)
    // On affiche quand même le bouton plutôt que de le cacher indéfiniment —
    // l'erreur réelle ressortira clairement si l'utilisateur tente d'activer.
    return 'not-subscribed'
  }
}

// Demande la permission navigateur, s'abonne au push, et enregistre
// l'abonnement en base via l'API route (qui a besoin de la clé privée,
// jamais exposée côté client).
export async function subscribeToPush(supabase, userId) {
  const reg = await serviceWorkerReadyWithTimeout()
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permission refusée par le navigateur')

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) throw new Error('Clé VAPID absente — vérifie NEXT_PUBLIC_VAPID_PUBLIC_KEY sur Vercel')

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  })

  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ subscription: sub.toJSON() })
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Échec de l'enregistrement (${res.status})`)
  }
}

export async function unsubscribeFromPush(supabase) {
  const reg = await serviceWorkerReadyWithTimeout()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
