// Positions de chaque calque de l'avatar, exprimées en pixels sur un
// canvas de référence fixe (CANVAS_W x CANVAS_H). Extraites du fichier
// Avatars.pptx (lecture du XML, même méthode que pour la salle Garage).
// Ne pas modifier ces valeurs à la main : si les visuels sont retravaillés,
// on regénère ce fichier depuis un nouveau PowerPoint.

export const CANVAS_W = 310
export const CANVAS_H = 400

export const LAYER_POS = {
  body: { x: 40.0, y: 8.0, w: 210, h: 384 },
  face: { x: 58.0, y: 22.0, w: 179, h: 182 },
  arms_idle: { x: 71.0, y: 148.0, w: 163, h: 198 },
  arms_elevation: { x: 8.0, y: 175.0, w: 294, h: 87 },
  hair_short: { x: 69.0, y: 10.0, w: 170, h: 161 },
  hair_long: { x: 58.0, y: 13.0, w: 187, h: 269 },
  hair_curly: { x: 48.1, y: 1.8, w: 193, h: 211 },
  beard: { x: 73.0, y: 110.0, w: 151, h: 111 },
  moustache: { x: 114.9, y: 141.2, w: 69, h: 40 },
  glasses: { x: 68.0, y: 91.0, w: 163, h: 80 },
  shoe_left: { x: 80.0, y: 308.0, w: 78, h: 78 },
  shoe_right: { x: 142.0, y: 308.0, w: 78, h: 78 },
  sweat_drop: { x: 189.1, y: 86.8, w: 31, h: 49 },
  outfit_tank_top: { x: 89.0, y: 175.0, w: 121, h: 114 },
  outfit_short: { x: 90.0, y: 246.0, w: 122, h: 88 },
  outfit_bra: { x: 86.0, y: 180.0, w: 134, h: 76 },
  outfit_legging: { x: 71.0, y: 247.0, w: 149, h: 110 },
  outfit_tracksuit_top: { x: 62.9, y: 153.2, w: 174, h: 133 },
  outfit_tracksuit_top_elevation: { x: 4.1, y: 153.8, w: 295, h: 136 },
  outfit_tracksuit_bottom: { x: 49.9, y: 271.2, w: 200, h: 80 }
}

// Pièce(s) de tenue à afficher selon le type d'outfit et la pose des bras.
// "top"/"bottom" : nom du fichier PNG (sans _primary/_secondary) à utiliser
// pour chaque zone de couleur, dans public/avatar/.
export function getOutfitPieces(outfitType, pose) {
  if (outfitType === 'legging_bra') {
    return { top: 'outfit_bra', bottom: 'outfit_legging' }
  }
  if (outfitType === 'tank_short') {
    return { top: 'outfit_tank_top', bottom: 'outfit_short' }
  }
  // tracksuit : le haut change de forme en élévation latérale (manches),
  // le bas reste identique dans les deux poses.
  return {
    top: pose === 'lateral' ? 'outfit_tracksuit_top_elevation' : 'outfit_tracksuit_top',
    bottom: 'outfit_tracksuit_bottom'
  }
}
