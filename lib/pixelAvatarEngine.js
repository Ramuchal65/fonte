import { shade, toHex, OUTLINE } from './pixelShade'

// Le personnage est dessine dans un espace local de 48 de large (inchange, toutes
// les coordonnees ci-dessous restent celles deja validees). On l'inscrit ensuite
// dans un canevas plus large, decale de X_OFFSET de chaque cote, pour laisser la
// place aux bras totalement tendus a l'horizontale sans les rogner.
const CONTENT_W = 48
const X_OFFSET = 10
export const GRID_W = CONTENT_W + X_OFFSET * 2
export const GRID_H = 100

const GLASSES_COLOR = 'rgb(90,90,96)'

function newCanvas() {
  return Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null))
}

function set(canvas, x, y, color) {
  const gx = x + X_OFFSET
  if (gx < 0 || gx >= GRID_W || y < 0 || y >= GRID_H) return
  canvas[y][gx] = color
}

function get(canvas, x, y) {
  const gx = x + X_OFFSET
  if (gx < 0 || gx >= GRID_W || y < 0 || y >= GRID_H) return undefined
  return canvas[y][gx]
}

function rectPairs(x0, y0, w, h) {
  const pairs = []
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pairs.push([x, y])
  return pairs
}

function ellipsePairs(cx, cy, rx, ry) {
  const pairs = []
  for (let y = 0; y < GRID_H; y++) {
    for (let x = -X_OFFSET; x < CONTENT_W + X_OFFSET; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry
      if (dx * dx + dy * dy <= 1) pairs.push([x, y])
    }
  }
  return pairs
}

function polyPairs(points) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const minx = Math.min(...xs), maxx = Math.max(...xs)
  const miny = Math.min(...ys), maxy = Math.max(...ys)
  const pairs = []
  const n = points.length
  for (let y = Math.floor(miny); y <= Math.ceil(maxy); y++) {
    for (let x = Math.floor(minx); x <= Math.ceil(maxx); x++) {
      let inside = false
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j]
        if ((yi > y) !== (yj > y) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi)) {
          inside = !inside
        }
      }
      if (inside) pairs.push([x, y])
    }
  }
  return pairs
}

function cellSet(pairs) {
  const s = new Set(pairs.map(([x, y]) => `${x},${y}`))
  s.pairs = pairs
  return s
}

function paintCells(canvas, cellsObj, baseHex, shadowFn, outline = true) {
  const base = shade(baseHex, 0.05)
  const dark = shade(baseHex, -0.16)
  cellsObj.pairs.forEach(([x, y]) => {
    const isEdge = outline && [[-1, 0], [1, 0], [0, -1], [0, 1]].some(
      ([dx, dy]) => !cellsObj.has(`${x + dx},${y + dy}`)
    )
    set(canvas, x, y, isEdge ? OUTLINE : (shadowFn(x, y) ? dark : base))
  })
}

function fillRect(canvas, x0, y0, w, h, hex, { outline = true, shadow = true } = {}) {
  const cells = cellSet(rectPairs(x0, y0, w, h))
  paintCells(canvas, cells, hex, (x) => shadow && (x - x0) > w * 0.55, outline)
}

function fillEllipse(canvas, cx, cy, rx, ry, hex, { shadow = true, outline = true } = {}) {
  const cells = cellSet(ellipsePairs(cx, cy, rx, ry))
  paintCells(canvas, cells, hex, (x, y) => shadow && (x - cx) > 0 && (y - cy) > -1, outline)
}

function fillHalfEllipse(canvas, cx, cy, rx, ry, hex) {
  const pairs = ellipsePairs(cx, cy, rx, ry).filter(([, y]) => y >= cy)
  const cells = cellSet(pairs)
  paintCells(canvas, cells, hex, () => false, true)
}

function fillPoly(canvas, points, hex, { outline = true, shadow = true } = {}) {
  const cells = cellSet(polyPairs(points))
  const xs = points.map(p => p[0])
  const minx = Math.min(...xs), maxx = Math.max(...xs)
  paintCells(canvas, cells, hex, (x) => shadow && (x - minx) > (maxx - minx) * 0.55, outline)
}

// ============================================================
// Chaussures
// ============================================================
function drawShoe(canvas, x0, shoeHex) {
  const body = [[x0 - 2, 82], [x0 + 8, 82], [x0 + 9, 86], [x0 + 7, 88], [x0 - 1, 88], [x0 - 3, 86]]
  fillPoly(canvas, body, shoeHex)
  fillRect(canvas, x0 - 3, 88, 12, 2, '#FAF8F2', { outline: true, shadow: false })
  set(canvas, x0 + 2, 84, OUTLINE)
  set(canvas, x0 + 3, 84, OUTLINE)
}

// ============================================================
// Bras : debout, ou tourne a 90° (elevation laterale) autour de l'epaule
// ============================================================
function drawArmStand(canvas, shoulderX, skinHex) {
  fillEllipse(canvas, shoulderX, 46, 4.5, 5, skinHex)
  fillEllipse(canvas, shoulderX, 54, 4, 6, skinHex)
  fillEllipse(canvas, shoulderX, 61, 4.6, 4.6, skinHex, { shadow: false })
}

function drawArmLateral(canvas, shoulderX, dir, skinHex) {
  const pivotY = 46
  fillEllipse(canvas, shoulderX, pivotY, 5, 4.5, skinHex)
  fillEllipse(canvas, shoulderX + dir * 8, pivotY, 6, 4, skinHex)
  fillEllipse(canvas, shoulderX + dir * 15, pivotY, 4.6, 4.6, skinHex, { shadow: false })
}

// ============================================================
// Corps (fixe, une seule carrure)
// ============================================================
function drawBody(canvas, skinHex, outfit, shoeHex, pose = 'stand') {
  const { type, primary, secondary } = outfit

  // jambes
  ;[[14, -1], [27, 1]].forEach(([x0]) => {
    let thighCol = primary, calfCol = primary
    if (type === 'legging_bra') { thighCol = secondary; calfCol = secondary }
    else if (type === 'tank_short') { thighCol = secondary; calfCol = skinHex }
    fillEllipse(canvas, x0 + 3, 66, 6, 8, thighCol)
    const pts = [[x0, 72], [x0 + 6, 72], [x0 + 7, 74], [x0 + 6, 84], [x0 + 1, 84], [x0 - 1, 82], [x0 - 1, 74]]
    fillPoly(canvas, pts, calfCol)
    drawShoe(canvas, x0, shoeHex)
  })

  // bras
  ;[[11, -1], [37, 1]].forEach(([shoulderX, dir]) => {
    const armCol = type === 'tracksuit' ? primary : skinHex
    if (pose === 'lateral') drawArmLateral(canvas, shoulderX, dir, armCol)
    else drawArmStand(canvas, shoulderX, armCol)
  })

  // torse
  const torsoPts = [[16, 43], [32, 43], [35, 46], [33, 61], [31, 64], [17, 64], [15, 61], [13, 46]]
  if (type === 'legging_bra') {
    fillPoly(canvas, [[16, 43], [32, 43], [34, 50], [14, 50]], primary)
    fillPoly(canvas, [[14, 50], [34, 50], [34, 56], [14, 56]], skinHex)
    fillPoly(canvas, [[14, 56], [34, 56], [33, 61], [31, 64], [17, 64], [15, 61]], secondary)
  } else {
    fillPoly(canvas, torsoPts, primary)
  }

  fillRect(canvas, 21, 41, 6, 4, skinHex) // cou
}

// ============================================================
// Coiffures
// ============================================================
const CAP_PTS = [[12, 21], [12, 10], [16, 4], [18, 8], [21, 2], [24, 7], [27, 1], [31, 8], [33, 3], [36, 10], [36, 21], [30, 14], [24, 13], [18, 14]]

function drawCap(canvas, hex, hexLight) {
  fillPoly(canvas, CAP_PTS, hex)
  ;[[13, 14, 16, 6, 19, 14], [21, 13, 24, 4, 27, 14], [30, 14, 33, 7, 36, 14]].forEach(([x0, y0, x1, y1, x2, y2]) => {
    const pairs = polyPairs([[x0, y0], [x1, y1], [x2, y2]])
    pairs.forEach(([x, y]) => { set(canvas, x, y, shade(hexLight, 0.08)) })
  })
}

function drawHair(canvas, style, hex, hexLight) {
  if (style === 'bald') return
  if (style === 'short') { drawCap(canvas, hex, hexLight); return }
  if (style === 'long') {
    fillEllipse(canvas, 24, 13, 15, 5, hex)
    const left = [[9, 17], [15, 15], [16, 22], [15, 33], [13, 42], [10, 45], [7, 42], [8, 33], [8, 22]]
    const right = [[39, 17], [33, 15], [32, 22], [33, 33], [35, 42], [38, 45], [41, 42], [40, 33], [40, 22]]
    fillPoly(canvas, left, hex)
    fillPoly(canvas, right, hex)
    return
  }
  if (style === 'curly') {
    fillEllipse(canvas, 24, 10, 15.5, 9, hex)
    ;[[10, 10], [14, 5], [18, 3], [22, 2], [26, 2], [30, 3], [34, 5], [38, 10], [12, 17], [36, 17]].forEach(([cx, cy]) => {
      fillEllipse(canvas, cx, cy, 6, 6, hex)
    })
    return
  }
}

// ============================================================
// Tête
// ============================================================
function drawMouth(canvas) {
  for (let x = 20; x < 29; x++) set(canvas, x, 35, OUTLINE)
  for (let x = 21; x < 28; x++) set(canvas, x, 36, 'rgb(200,90,80)')
}

function drawEye(canvas, cx, cy) {
  fillHalfEllipse(canvas, cx, cy, 6, 4.5, '#F5F3ED')
  fillRect(canvas, Math.round(cx - 1), Math.round(cy), 3, 3, '#14140F', { outline: false, shadow: false })
  set(canvas, Math.round(cx), Math.round(cy - 1), 'rgb(255,255,255)')
}

function drawHead(canvas, skinHex, hairStyle, hairHex) {
  const hexLight = toHex(shade(hairHex, 0.2))
  fillEllipse(canvas, 24, 26, 15, 15, skinHex)

  drawEye(canvas, 18, 24)
  drawEye(canvas, 30, 24)

  fillRect(canvas, 13, 22, 8, 2, hexLight, { outline: false, shadow: false })
  fillRect(canvas, 27, 22, 8, 2, hexLight, { outline: false, shadow: false })

  set(canvas, 23, 30, OUTLINE); set(canvas, 24, 30, OUTLINE)
  set(canvas, 23, 31, OUTLINE); set(canvas, 24, 31, OUTLINE)

  drawMouth(canvas)
  drawHair(canvas, hairStyle, hairHex, hexLight)
}

// ============================================================
// Calques : lunettes, barbe, moustache, transpiration
// ============================================================
function drawGlasses(canvas) {
  for (let x = 11; x < 25; x++) { set(canvas, x, 22, GLASSES_COLOR); set(canvas, x, 29, GLASSES_COLOR) }
  for (let y = 22; y < 30; y++) { set(canvas, 11, y, GLASSES_COLOR); set(canvas, 24, y, GLASSES_COLOR) }
  for (let x = 24; x < 38; x++) { set(canvas, x, 22, GLASSES_COLOR); set(canvas, x, 29, GLASSES_COLOR) }
  for (let y = 22; y < 30; y++) { set(canvas, 24, y, GLASSES_COLOR); set(canvas, 37, y, GLASSES_COLOR) }
}

function drawFacialHair(canvas, style, hex) {
  if (style === 'beard') {
    const base = shade(hex, 0.05)
    const dark = shade(hex, -0.16)
    ellipsePairs(24, 26, 15, 15).forEach(([x, y]) => {
      if (y < 32) return
      if (y >= 35 && y <= 36 && x >= 20 && x <= 28) return
      if (get(canvas, x, y) === OUTLINE) return
      set(canvas, x, y, (x - 24) > 0 ? dark : base)
    })
    drawMouth(canvas)
  } else if (style === 'moustache') {
    fillRect(canvas, 20, 31, 8, 2, hex, { outline: false, shadow: false })
  }
}

function drawSweat(canvas) {
  fillEllipse(canvas, 36, 30, 2.5, 3.5, '#8FCFEF', { shadow: false })
}

// ============================================================
// Assemblage complet
// ============================================================
export function buildAvatarCanvas({ skinHex, hairStyle, hairHex, glasses, facialHair, outfit, shoeHex, pose = 'stand', sweat = false }) {
  const canvas = newCanvas()
  drawBody(canvas, skinHex, outfit, shoeHex, pose)
  drawHead(canvas, skinHex, hairStyle, hairHex)
  if (glasses) drawGlasses(canvas)
  if (facialHair && facialHair !== 'none') drawFacialHair(canvas, facialHair, hairHex)
  if (sweat) drawSweat(canvas)
  return canvas
}
