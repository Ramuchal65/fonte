'use client'
import { LAYER_POS, CANVAS_W, CANVAS_H } from '@/lib/avatarLayers'

// Affiche une pièce (public/avatar/{piece}.png, déjà en niveaux de gris)
// teintée par-dessus avec `color`, en préservant les ombres/reliefs du
// dessin d'origine (technique : calque de couleur en mode "multiply",
// masqué par la silhouette de l'image elle-même via mask-image).
// Si `color` est absent, l'image s'affiche telle quelle (pas de teinte :
// lunettes, goutte de sueur...).
export default function AvatarLayer({ piece, color }) {
  const pos = LAYER_POS[piece]
  if (!pos) return null

  const style = {
    position: 'absolute',
    left: `${(pos.x / CANVAS_W) * 100}%`,
    top: `${(pos.y / CANVAS_H) * 100}%`,
    width: `${(pos.w / CANVAS_W) * 100}%`,
    height: `${(pos.h / CANVAS_H) * 100}%`
  }

  const src = `/avatar/${piece}.png`

  if (!color) {
    return (
      <img
        src={src}
        alt=""
        style={{ ...style, imageRendering: 'pixelated' }}
        draggable={false}
      />
    )
  }

  return (
    <div style={style}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} draggable={false} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: color,
          mixBlendMode: 'multiply',
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat'
        }}
      />
    </div>
  )
}
