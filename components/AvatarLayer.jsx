'use client'
import { useEffect, useRef } from 'react'
import { LAYER_POS, CANVAS_W, CANVAS_H } from '@/lib/avatarLayers'

// Affiche une pièce (public/avatar/{piece}.png, déjà en niveaux de gris)
// teintée par-dessus avec `color`, en préservant les ombres/reliefs du
// dessin d'origine. Recolorisation faite via canvas (multiply + réapplication
// de l'alpha d'origine) plutôt qu'un filtre CSS, pour un rendu fiable sur
// tous les navigateurs. Si `color` est absent, l'image s'affiche telle
// quelle (lunettes, goutte de sueur...).
export default function AvatarLayer({ piece, color }) {
  // Les tenues utilisent 2 fichiers image par pièce (ex: outfit_legging_primary.png
  // / outfit_legging_secondary.png) mais partagent la MÊME position/taille — celle
  // de la pièce de base ("outfit_legging"), qui est la seule présente dans LAYER_POS.
  const basePiece = piece.replace(/_(primary|secondary)$/, '')
  const pos = LAYER_POS[basePiece]
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!pos || !color) return
    const canvas = canvasRef.current
    if (!canvas) return
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
      ctx.fillStyle = color
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(img, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }
    img.src = `/avatar/${piece}.png`
    return () => { cancelled = true }
  }, [piece, color])

  if (!pos) return null

  const style = {
    position: 'absolute',
    left: `${(pos.x / CANVAS_W) * 100}%`,
    top: `${(pos.y / CANVAS_H) * 100}%`,
    width: `${(pos.w / CANVAS_W) * 100}%`,
    height: `${(pos.h / CANVAS_H) * 100}%`,
    imageRendering: 'pixelated'
  }

  const src = `/avatar/${piece}.png`

  if (!color) {
    return <img src={src} alt="" style={style} draggable={false} />
  }

  return <canvas ref={canvasRef} style={style} />
}
