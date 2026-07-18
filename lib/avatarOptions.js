export const HAIRSTYLES = [
  { id: 'bald', label: 'Chauve' },
  { id: 'short', label: 'Courte' },
  { id: 'long', label: 'Longue' },
  { id: 'curly', label: 'Bouclée' }
]

export const HAIR_COLORS = [
  { id: 'black', label: 'Noir', hex: '#1A1A1A' },
  { id: 'brown', label: 'Châtain', hex: '#5C3A21' },
  { id: 'blonde', label: 'Blond', hex: '#D4A94C' },
  { id: 'red', label: 'Roux', hex: '#B5502E' },
  { id: 'gray', label: 'Gris', hex: '#9A9A9A' }
]

export const FACIAL_HAIR = [
  { id: 'none', label: 'Aucune' },
  { id: 'beard', label: 'Barbe' },
  { id: 'moustache', label: 'Moustache' }
]

export const OUTFITS = [
  { id: 0, type: 'legging_bra', label: 'Legging & brassière — rose', primary: '#C9557A', secondary: '#20303F' },
  { id: 1, type: 'legging_bra', label: 'Legging & brassière — bleu', primary: '#2B4D6B', secondary: '#1E1E17' },
  { id: 2, type: 'tank_short', label: 'Débardeur & short — rouge', primary: '#8C2F2F', secondary: '#D8D3C4' },
  { id: 3, type: 'tank_short', label: 'Débardeur & short — vert', primary: '#2F6B4F', secondary: '#1C2E17' },
  { id: 4, type: 'tracksuit', label: 'Survêtement — marine', primary: '#1C2E3F', secondary: '#EF4B3A' },
  { id: 5, type: 'tracksuit', label: 'Survêtement — gris', primary: '#4A4A44', secondary: '#14140F' }
]

export const SKIN_TONES = [
  { id: 'porcelain', label: 'Porcelaine', hex: '#F7DCC4' },
  { id: 'light', label: 'Claire', hex: '#E8B98A' },
  { id: 'golden', label: 'Dorée', hex: '#D2955B' },
  { id: 'tan', label: 'Hâlée', hex: '#B97544' },
  { id: 'brown', label: 'Brune', hex: '#8B5A2B' },
  { id: 'deep', label: 'Foncée', hex: '#4A2F1C' }
]

export const SHOE_COLORS = [
  { id: 'white', label: 'Blanc', hex: '#E4E0D4' },
  { id: 'black', label: 'Noir', hex: '#1A1A1A' },
  { id: 'red', label: 'Rouge', hex: '#8C2F2F' },
  { id: 'blue', label: 'Bleu', hex: '#2B4D6B' },
  { id: 'gray', label: 'Gris', hex: '#6B6B66' }
]

export const DEFAULT_AVATAR = {
  skinTone: 'light',
  hairstyle: 'short',
  hairColor: 'brown',
  glasses: false,
  facialHair: 'none',
  outfit: 0,
  shoeColor: 'white'
}
