'use client'
import { HAIR_COLORS, OUTFITS, SKIN_TONES, SHOE_COLORS } from '@/lib/avatarOptions'
import { CANVAS_W, CANVAS_H, getOutfitPieces } from '@/lib/avatarLayers'
import AvatarLayer from './AvatarLayer'

// Garde la même interface que l'ancien moteur procédural (avatar, size,
// pose: 'stand'|'lateral', sweat: bool) pour ne rien casser ailleurs
// (CoachAvatar, AvatarBuilder, page profil, onboarding).
export default function PixelAvatar({ avatar, size = 100, pose = 'stand', sweat = false }) {
  const skinHex = SKIN_TONES.find(s => s.id === avatar.skinTone)?.hex || SKIN_TONES[1].hex
  const hairHex = HAIR_COLORS.find(c => c.id === avatar.hairColor)?.hex || '#5C3A21'
  const shoeHex = SHOE_COLORS.find(s => s.id === avatar.shoeColor)?.hex || SHOE_COLORS[0].hex
  const outfit = OUTFITS[avatar.outfit] || OUTFITS[0]
  const armsPiece = pose === 'lateral' ? 'arms_elevation' : 'arms_idle'
  const { top, bottom } = getOutfitPieces(outfit.type, pose)

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size * (CANVAS_H / CANVAS_W),
        overflow: 'visible'
      }}
      role="img"
      aria-label="Avatar"
    >
      <AvatarLayer piece="body" color={skinHex} />
      <AvatarLayer piece={armsPiece} color={skinHex} />
      <AvatarLayer piece={`${bottom}_secondary`} color={outfit.secondary} />
      <AvatarLayer piece={`${bottom}_primary`} color={outfit.primary} />
      <AvatarLayer piece={`${top}_secondary`} color={outfit.secondary} />
      <AvatarLayer piece={`${top}_primary`} color={outfit.primary} />
      <AvatarLayer piece="shoe_left" color={shoeHex} />
      <AvatarLayer piece="shoe_right" color={shoeHex} />
      <AvatarLayer piece="face" color={skinHex} />

      {avatar.hairstyle === 'short' && <AvatarLayer piece="hair_short" color={hairHex} />}
      {avatar.hairstyle === 'long' && <AvatarLayer piece="hair_long" color={hairHex} />}
      {avatar.hairstyle === 'curly' && <AvatarLayer piece="hair_curly" color={hairHex} />}

      {avatar.facialHair === 'beard' && <AvatarLayer piece="beard" color={hairHex} />}
      {avatar.facialHair === 'moustache' && <AvatarLayer piece="moustache" color={hairHex} />}

      {avatar.glasses && <AvatarLayer piece="glasses" />}
      {sweat && <AvatarLayer piece="sweat_drop" />}
    </div>
  )
}
