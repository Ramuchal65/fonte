import { useEffect, useRef } from 'react'

// Empêche l'écran de se verrouiller tant que `active` est vrai (utile
// pendant un repos ou un exercice chronométré — sinon l'écran s'éteint et
// on rate le décompte). Se relâche automatiquement dès que `active` passe
// à faux, et se reprend tout seul si l'écran se rallume entre-temps.
export function useWakeLock(active) {
  const wakeLockRef = useRef(null)

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) { lock.release(); return }
        wakeLockRef.current = lock
      } catch (e) { /* refusé (économie de batterie, etc.) - tant pis */ }
    }
    acquire()

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [active])
}
