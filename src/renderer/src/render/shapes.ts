import type { ShapeElement } from '@shared/model'

/**
 * Shape outlines as SVG path data, in the element's own coordinates
 * (0,0)-(width,height). The canvas, thumbnails and SVG export all draw from
 * these, so a shape looks the same everywhere.
 */

const f = (n: number) => Math.round(n * 100) / 100

export function rectPath(w: number, h: number, radius = 0, x = 0, y = 0): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  if (!r) return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`
  return (
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}` +
    `V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}` +
    `H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
    `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`
  )
}

export function ellipsePath(w: number, h: number, cx = w / 2, cy = h / 2): string {
  const rx = w / 2
  const ry = h / 2
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`
}

export function polygonPoints(w: number, h: number, sides: number): number[] {
  const pts: number[] = []
  for (let i = 0; i < sides; i++) {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2
    pts.push(w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2)
  }
  return pts
}

export function starPointList(w: number, h: number, points = 5, innerRatio = 0.45): number[] {
  const pts: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2
    const r = i % 2 === 0 ? 1 : innerRatio
    pts.push(w / 2 + (Math.cos(a) * r * w) / 2, h / 2 + (Math.sin(a) * r * h) / 2)
  }
  return pts
}

export function pointsPath(pts: number[], closed = true): string {
  let d = ''
  for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${f(pts[i])} ${f(pts[i + 1])}`
  return closed ? d + 'Z' : d
}

/** Polygon with rounded corners (quadratic curves at each vertex). */
export function roundedPointsPath(pts: number[], radius: number): string {
  if (radius <= 0) return pointsPath(pts)
  const n = pts.length / 2
  const p = (i: number) => ({ x: pts[((i + n) % n) * 2], y: pts[((i + n) % n) * 2 + 1] })
  let d = ''
  for (let i = 0; i < n; i++) {
    const prev = p(i - 1)
    const cur = p(i)
    const next = p(i + 1)
    const toward = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const r = Math.min(radius, len / 2)
      return { x: a.x + ((b.x - a.x) * r) / len, y: a.y + ((b.y - a.y) * r) / len }
    }
    const start = toward(cur, prev)
    const end = toward(cur, next)
    d += `${i === 0 ? 'M' : 'L'}${f(start.x)} ${f(start.y)}Q${f(cur.x)} ${f(cur.y)} ${f(end.x)} ${f(end.y)}`
  }
  return d + 'Z'
}

export interface ShapeGeometry {
  /** Path data in the element's coordinates, already scaled to its size. */
  d: string
  /** True when the path should be filled with the even-odd rule (rings, frames with holes). */
  evenOdd: boolean
}

/** The outline of a shape element at its current size. */
export function shapeGeometry(el: ShapeElement): ShapeGeometry {
  const { width: w, height: h } = el
  const r = el.cornerRadius
  switch (el.shape) {
    case 'rect':
      return { d: rectPath(w, h, r), evenOdd: false }
    case 'line':
      return { d: rectPath(w, h, Math.min(h / 2, r)), evenOdd: false }
    case 'ellipse':
      return { d: ellipsePath(w, h), evenOdd: false }
    case 'triangle':
      return { d: roundedPointsPath([w / 2, 0, w, h, 0, h], r), evenOdd: false }
    case 'diamond':
      return { d: roundedPointsPath([w / 2, 0, w, h / 2, w / 2, h, 0, h / 2], r), evenOdd: false }
    case 'polygon':
      return { d: roundedPointsPath(polygonPoints(w, h, el.sides ?? 6), r), evenOdd: false }
    case 'star':
      return { d: roundedPointsPath(starPointList(w, h, el.sides ?? 5, el.innerRatio ?? 0.45), r), evenOdd: false }
    case 'path': {
      const [vw, vh] = el.viewBox ?? [100, 100]
      return { d: scalePath(el.path ?? '', w / vw, h / vh), evenOdd: true }
    }
  }
}

/**
 * Scales absolute and relative path commands. Arcs scale their radii; arcs in
 * a non-uniformly scaled path stay elliptical, which matches how SVG renders a
 * scaled path.
 */
export function scalePath(d: string, sx: number, sy: number): string {
  if (sx === 1 && sy === 1) return d
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? []
  let out = ''
  let cmd = ''
  let i = 0
  const num = () => Number(tokens[i++])
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++]
      out += cmd
      if (cmd === 'Z' || cmd === 'z') continue
    }
    const upper = cmd.toUpperCase()
    const vals: number[] = []
    switch (upper) {
      case 'H':
        vals.push(num() * sx)
        break
      case 'V':
        vals.push(num() * sy)
        break
      case 'A': {
        const rx = num() * Math.abs(sx)
        const ry = num() * Math.abs(sy)
        const rot = num()
        const large = num()
        const sweep = num()
        vals.push(rx, ry, rot, large, sweep, num() * sx, num() * sy)
        break
      }
      case 'M':
      case 'L':
      case 'T':
        vals.push(num() * sx, num() * sy)
        break
      case 'S':
      case 'Q':
        vals.push(num() * sx, num() * sy, num() * sx, num() * sy)
        break
      case 'C':
        vals.push(num() * sx, num() * sy, num() * sx, num() * sy, num() * sx, num() * sy)
        break
      default:
        i++
        continue
    }
    out += vals.map(f).join(' ') + ' '
  }
  return out.trim()
}

/** Image frame shapes. Each returns path data for a frame of the given size. */
export const frameMasks: { id: string; label: string; path: (w: number, h: number) => string }[] = [
  { id: 'rect', label: 'Square', path: (w, h) => rectPath(w, h) },
  { id: 'rounded', label: 'Rounded', path: (w, h) => rectPath(w, h, Math.min(w, h) * 0.12) },
  { id: 'circle', label: 'Circle', path: (w, h) => ellipsePath(w, h) },
  { id: 'arch', label: 'Arch', path: (w, h) => `M0 ${f(h)}V${f(w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(w)} ${f(w / 2)}V${f(h)}Z` },
  { id: 'pill', label: 'Pill', path: (w, h) => rectPath(w, h, Math.min(w, h) / 2) },
  { id: 'hexagon', label: 'Hexagon', path: (w, h) => pointsPath(polygonPoints(w, h, 6)) },
  { id: 'diamond', label: 'Diamond', path: (w, h) => pointsPath([w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]) },
  { id: 'triangle', label: 'Triangle', path: (w, h) => pointsPath([w / 2, 0, w, h, 0, h]) },
  { id: 'star', label: 'Star', path: (w, h) => roundedPointsPath(starPointList(w, h, 5, 0.5), Math.min(w, h) * 0.02) },
  { id: 'heart', label: 'Heart', path: (w, h) => scalePath(HEART, w / 100, h / 100) },
  { id: 'blob', label: 'Blob', path: (w, h) => scalePath(BLOB, w / 100, h / 100) },
  { id: 'leaf', label: 'Leaf', path: (w, h) => scalePath('M0 100C0 45 45 0 100 0C100 55 55 100 0 100Z', w / 100, h / 100) },
  { id: 'squircle', label: 'Squircle', path: (w, h) => scalePath('M50 0C88 0 100 12 100 50S88 100 50 100 0 88 0 50 12 0 50 0Z', w / 100, h / 100) }
]

export const HEART = 'M50 92C20 70 2 52 2 31C2 15 14 4 29 4C39 4 46 10 50 17C54 10 61 4 71 4C86 4 98 15 98 31C98 52 80 70 50 92Z'
export const BLOB = 'M51 3C71 1 93 15 97 37C101 59 89 79 68 91C47 103 20 96 8 77C-3 59 2 35 16 20C26 9 37 4 51 3Z'

export function maskPath(mask: string | undefined, w: number, h: number, cornerRadius = 0): string | null {
  if ((!mask || mask === 'rect') && cornerRadius > 0) return rectPath(w, h, cornerRadius)
  if (!mask || mask === 'rect') return null
  return frameMasks.find((m) => m.id === mask)?.path(w, h) ?? null
}

/** Dash pattern for a stroke width. */
export function dashArray(dash: 'solid' | 'dashed' | 'dotted' | undefined, width: number): number[] {
  if (dash === 'dashed') return [width * 3, width * 2]
  if (dash === 'dotted') return [0.001, width * 2]
  return []
}
