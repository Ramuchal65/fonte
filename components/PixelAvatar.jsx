'use client'
import { HAIR_COLORS, OUTFITS, SKIN_TONES, SHOE_COLORS } from '@/lib/avatarOptions'
import { buildAvatarCanvas, GRID_W, GRID_H } from '@/lib/pixelAvatarEngine'

export default function PixelAvatar({ avatar, size = 100, pose = 'stand', sweat = false }) {
  const skinHex = SKIN_TONES.find(s => s.id === avatar.skinTone)?.hex || SKIN_TONES[1].hex
  const hairHex = HAIR_COLORS.find(c => c.id === avatar.hairColor)?.hex || '#5C3A21'
  const shoeHex = SHOE_COLORS.find(s => s.id === avatar.shoeColor)?.hex || SHOE_COLORS[0].hex
  const outfit = OUTFITS[avatar.outfit] || OUTFITS[0]

  const canvas = buildAvatarCanvas({
    skinHex,
    hairStyle: avatar.hairstyle,
    hairHex,
    glasses: avatar.glasses,
    facialHair: avatar.facialHair,
    outfit,
    shoeHex,
    pose,
    sweat
  })

  const rects = []
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const color = canvas[y][x]
      if (!color) continue
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} />)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      width={size}
      height={size * (GRID_H / GRID_W)}
      role="img"
      aria-label="Avatar"
      shapeRendering="crispEdges"
    >
      {rects}
    </svg>
  )
}
