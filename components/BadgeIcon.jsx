'use client'
import { useEffect, useRef } from 'react'

const TIER_COLORS = {
  bronze: '#B08D57',
  argent: '#C8CDD3',
  or: '#E8C34A'
}

// Affiche un badge (public/badges/{icon}) teinté selon son niveau
// (bronze/argent/or), via canvas multiply — même technique que AvatarLayer,
// éprouvée plus fiable qu'un filtre CSS. Si `locked` est vrai, le badge
// s'affiche en silhouette grisée à faible opacité (succès pas encore obtenu).
export default function BadgeIcon({ icon, tier = 'bronze', size = 64, locked = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !icon) return
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (cancelled) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = locked ? '#5A5A50' : (TIER_COLORS[tier] || TIER_COLORS.bronze)
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(img, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }
    img.src = `/badges/${icon}`
    return () => { cancelled = true }
  }, [icon, tier, locked])

  if (!icon) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        opacity: locked ? 0.35 : 1,
        filter: locked ? 'grayscale(1)' : 'none'
      }}
    />
  )
}
