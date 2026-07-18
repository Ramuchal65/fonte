export const HAIRSTYLES = [
  { id: 'bald', label: 'Crâne rasé' },
  { id: 'buzz', label: 'Coupe courte' },
  { id: 'short', label: 'Courte classique' },
  { id: 'long', label: 'Longue' },
  { id: 'curly', label: 'Bouclée' },
  { id: 'mohawk', label: 'Crête' },
  { id: 'ponytail', label: 'Queue de cheval' },
  { id: 'afro', label: 'Afro' },
  { id: 'bangs', label: 'Frange' },
  { id: 'spiky', label: 'Hérissée' }
]

export const HAIR_COLORS = [
  { id: 'black', label: 'Noir', hex: '#1A1A1A' },
  { id: 'brown', label: 'Châtain', hex: '#5C3A21' },
  { id: 'blonde', label: 'Blond', hex: '#D4A94C' },
  { id: 'red', label: 'Roux', hex: '#B5502E' },
  { id: 'gray', label: 'Gris', hex: '#9A9A9A' }
]

export const FACIAL_HAIR = [
  { id: 'none', label: 'Aucun' },
  { id: 'beard', label: 'Barbe' },
  { id: 'moustache', label: 'Moustache' }
]

export const OUTFITS = [
  { id: 0, label: 'Navy', primary: '#2B4D6B', secondary: '#1C2E3F', accent: '#EF4B3A' },
  { id: 1, label: 'Cramoisi', primary: '#8C2F2F', secondary: '#1E1E17', accent: '#F2F0E6' },
  { id: 2, label: 'Émeraude', primary: '#2F6B4F', secondary: '#1C2E24', accent: '#F2F0E6' },
  { id: 3, label: 'Violet', primary: '#5B3F7A', secondary: '#1E1E17', accent: '#D4A94C' }
]

export const BODY_SIZES = [
  { id: 'S', label: 'S' },
  { id: 'M', label: 'M' },
  { id: 'L', label: 'L' }
]

export const SKIN_TONES = [
  { id: 'porcelain', label: 'Porcelaine', hex: '#F7DCC4' },
  { id: 'light', label: 'Claire', hex: '#E8B98A' },
  { id: 'golden', label: 'Dorée', hex: '#D2955B' },
  { id: 'tan', label: 'Hâlée', hex: '#B97544' },
  { id: 'brown', label: 'Brune', hex: '#8B5A2B' },
  { id: 'deep', label: 'Foncée', hex: '#4A2F1C' }
]

export const DEFAULT_AVATAR = {
  skinTone: 'light',
  hairstyle: 'short',
  hairColor: 'brown',
  glasses: false,
  facialHair: 'none',
  outfit: 0,
  bodySize: 'M'
}
