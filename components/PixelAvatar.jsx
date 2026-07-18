'use client'
import { HAIR_COLORS, OUTFITS, SKIN_TONES } from '@/lib/avatarOptions'

const CX = 80
const HEAD = { x: 55, y: 28, w: 50, h: 52, rx: 14 }
const BODY_HALF = {
  S: { shoulder: 28, hip: 24 },
  M: { shoulder: 38, hip: 32 },
  L: { shoulder: 48, hip: 40 }
}
const TORSO_TOP = 118
const TORSO_BOTTOM = 195
const BAND_TOP = 165

function halfWidthAt(y, halfShoulder, halfHip) {
  const t = (y - TORSO_TOP) / (TORSO_BOTTOM - TORSO_TOP)
  return halfShoulder + (halfHip - halfShoulder) * t
}

function Hair({ style, color }) {
  if (style === 'bald') return null

  switch (style) {
    case 'buzz':
      return <rect x="53" y="26" width="54" height="14" rx="6" fill={color} />
    case 'short':
      return (
        <>
          <rect x="50" y="22" width="60" height="24" rx="10" fill={color} />
          <rect x="48" y="40" width="10" height="20" rx="4" fill={color} />
          <rect x="102" y="40" width="10" height="20" rx="4" fill={color} />
        </>
      )
    case 'long':
      return (
        <>
          <rect x="50" y="22" width="60" height="24" rx="10" fill={color} />
          <rect x="48" y="30" width="12" height="68" rx="5" fill={color} />
          <rect x="100" y="30" width="12" height="68" rx="5" fill={color} />
        </>
      )
    case 'curly':
      return (
        <>
          <rect x="52" y="28" width="56" height="16" rx="8" fill={color} />
          {[60, 68, 76, 84, 92, 100].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 === 0 ? 24 : 30} r="8" fill={color} />
          ))}
        </>
      )
    case 'mohawk':
      return <rect x="74" y="12" width="12" height="42" rx="4" fill={color} />
    case 'ponytail':
      return (
        <>
          <rect x="50" y="22" width="60" height="24" rx="10" fill={color} />
          <rect x="102" y="48" width="16" height="42" rx="7" fill={color} />
        </>
      )
    case 'afro':
      return <circle cx={CX} cy="48" r="42" fill={color} />
    case 'bangs':
      return (
        <>
          <rect x="50" y="22" width="60" height="24" rx="10" fill={color} />
          <rect x="55" y="46" width="50" height="10" rx="3" fill={color} />
        </>
      )
    case 'spiky':
      return (
        <polygon
          fill={color}
          points="50,32 58,14 64,32 72,12 80,32 88,12 96,32 102,14 110,32 110,44 50,44"
        />
      )
    default:
      return null
  }
}

function FacialHair({ style, color }) {
  if (style === 'beard') return <rect x="58" y="68" width="44" height="14" rx="6" fill={color} />
  if (style === 'moustache') return <rect x="70" y="62" width="20" height="6" rx="2" fill={color} />
  return null
}

function Glasses({ show }) {
  if (!show) return null
  return (
    <g stroke="#14140F" strokeWidth="3" fill="none">
      <rect x="64" y="52" width="14" height="10" rx="2" />
      <rect x="82" y="52" width="14" height="10" rx="2" />
      <line x1="78" y1="57" x2="82" y2="57" />
    </g>
  )
}

export default function PixelAvatar({ avatar, size = 140 }) {
  const hairColorHex = HAIR_COLORS.find(c => c.id === avatar.hairColor)?.hex || '#5C3A21'
  const skinHex = SKIN_TONES.find(s => s.id === avatar.skinTone)?.hex || SKIN_TONES[1].hex
  const outfit = OUTFITS[avatar.outfit] || OUTFITS[0]
  const half = BODY_HALF[avatar.bodySize] || BODY_HALF.M

  const bandHalfTop = halfWidthAt(BAND_TOP, half.shoulder, half.hip)

  const torsoPoints = `${CX - half.shoulder},${TORSO_TOP} ${CX + half.shoulder},${TORSO_TOP} ${CX + half.hip},${TORSO_BOTTOM} ${CX - half.hip},${TORSO_BOTTOM}`
  const bandPoints = `${CX - bandHalfTop},${BAND_TOP} ${CX + bandHalfTop},${BAND_TOP} ${CX + half.hip},${TORSO_BOTTOM} ${CX - half.hip},${TORSO_BOTTOM}`

  return (
    <svg
      viewBox="0 0 160 200"
      width={size}
      height={size * (200 / 160)}
      style={{ shapeRendering: 'geometricPrecision' }}
      role="img"
      aria-label="Avatar"
    >
      <rect x="70" y="95" width="20" height="25" fill={skinHex} />
      <polygon points={torsoPoints} fill={outfit.primary} />
      <rect
        x={CX - half.shoulder + 4}
        y={TORSO_TOP + 4}
        width={half.shoulder * 2 - 8}
        height="6"
        fill={outfit.accent}
      />
      <polygon points={bandPoints} fill={outfit.secondary} />

      <rect x={HEAD.x} y={HEAD.y} width={HEAD.w} height={HEAD.h} rx={HEAD.rx} fill={skinHex} />

      <rect x="68" y="55" width="6" height="6" fill="#14140F" />
      <rect x="88" y="55" width="6" height="6" fill="#14140F" />

      <Hair style={avatar.hairstyle} color={hairColorHex} />
      <FacialHair style={avatar.facialHair} color={hairColorHex} />
      <Glasses show={avatar.glasses} />
    </svg>
  )
}
