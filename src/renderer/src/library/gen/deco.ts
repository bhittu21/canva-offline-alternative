import type { DesignElement } from '@shared/model'
import { ellipse, group, path, rect } from '../templateKit'
import { type Ctx, r } from './core'
import type { Deco } from './themes'

/**
 * Background decorations. They sit behind the content, mostly at the edges,
 * in soft colours close to the background so text on top stays readable.
 * Every piece is a normal shape the user can move, recolour or delete.
 */

export const BLOB = 'M51 3C71 1 93 15 97 37C101 59 89 79 68 91C47 103 20 96 8 77C-3 59 2 35 16 20C26 9 37 4 51 3Z'
export const BLOB2 = 'M58 2C78 6 97 22 98 45C99 68 84 92 60 97C36 102 10 88 3 65C-4 42 8 16 28 6C38 1 48 0 58 2Z'
export const WAVE = 'M0 30C25 8 50 8 75 30S125 52 150 30S200 8 200 8V60H0Z'
export const SPARKLE = 'M50 0C54 34 66 46 100 50C66 54 54 66 50 100C46 66 34 54 0 50C34 46 46 34 50 0Z'
export const LEAF = 'M0 100C0 45 45 0 100 0C100 55 55 100 0 100Z'
export const ARCH = 'M0 100V50A50 50 0 0 1 100 50V100Z'
const CORNER = 'M0 0H100V10H10V100H0Z'

const D = 'Decoration'

function dots(cols: number, rows: number, gap: number, rad: number): { d: string; w: number; h: number } {
  let d = ''
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const x = rad + i * gap
      const y = rad + j * gap
      d += `M${x - rad} ${y}a${rad} ${rad} 0 1 0 ${rad * 2} 0a${rad} ${rad} 0 1 0 ${-rad * 2} 0Z`
    }
  return { d, w: rad * 2 + (cols - 1) * gap, h: rad * 2 + (rows - 1) * gap }
}

function stripes(n: number): string {
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = i * 20
    d += `M${x} 100L${x + 100} 0H${x + 108}L${x + 8} 100Z`
  }
  return d
}

function gridPath(cells: number): string {
  let d = ''
  for (let i = 0; i <= cells; i++) {
    const p = (i * 100) / cells
    d += `M${p} 0V100M0 ${p}H100`
  }
  return d
}

/**
 * Draws a theme's decoration. `strength` 0..1 scales how much of it appears
 * (documents use little, posters more). `kind` overrides the theme's choice.
 */
export function decorate(c: Ctx, strength = 1, kind: Deco = c.t.deco): void {
  if (strength <= 0 || kind === 'none') return
  const { W, H, u, t } = c
  const S = Math.min(W, H)
  const els: DesignElement[] = []
  const flip = c.rand() > 0.5
  switch (kind) {
    case 'blobs': {
      const a = S * 0.62 * strength
      els.push(path(BLOB, [100, 100], flip ? -a * 0.35 : W - a * 0.65, -a * 0.35, a, a, t.soft, { name: D }))
      els.push(path(BLOB2, [100, 100], flip ? W - a * 0.6 : -a * 0.4, H - a * 0.55, a * 0.9, a * 0.9, t.soft2, { name: D, rotation: 0 }))
      break
    }
    case 'circles': {
      const a = S * 0.55 * strength
      els.push(ellipse(flip ? -a * 0.4 : W - a * 0.6, -a * 0.4, a, a, t.soft, { name: D }))
      els.push(ellipse(flip ? W - a * 0.45 : -a * 0.3, H - a * 0.5, a * 0.75, a * 0.75, t.soft2, { name: D }))
      break
    }
    case 'rings': {
      const a = S * 0.7 * strength
      els.push(ellipse(W - a * 0.62, -a * 0.38, a, a, 'transparent', { name: D, stroke: t.accent, strokeWidth: r(u * 0.5), opacity: 0.45 }))
      els.push(ellipse(-a * 0.45, H - a * 0.5, a * 0.8, a * 0.8, 'transparent', { name: D, stroke: t.accent2, strokeWidth: r(u * 0.5), opacity: 0.4 }))
      break
    }
    case 'dots': {
      const g = dots(6, 6, 10, 2.2)
      const size = S * 0.26 * strength
      els.push(path(g.d, [g.w, g.h], flip ? W - size - u * 4 : u * 4, u * 4, size, size, t.soft, { name: D }))
      els.push(path(g.d, [g.w, g.h], flip ? u * 4 : W - size - u * 4, H - size - u * 4, size, size, t.soft2, { name: D }))
      break
    }
    case 'lines': {
      const len = S * 0.22 * strength
      els.push(rect(u * 5, u * 5, len, r(u * 0.5), t.accent, { name: D }))
      els.push(rect(W - u * 5 - len, H - u * 5.5, len, r(u * 0.5), t.accent, { name: D }))
      break
    }
    case 'corners': {
      const a = S * 0.11 * Math.max(0.6, strength)
      const m = u * 3.5
      const color = t.line
      els.push(path(CORNER, [100, 100], m, m, a, a, color, { name: D }))
      els.push(path(CORNER, [100, 100], W - m, m, a, a, color, { name: D, rotation: 90 }))
      els.push(path(CORNER, [100, 100], W - m, H - m, a, a, color, { name: D, rotation: 180 }))
      els.push(path(CORNER, [100, 100], m, H - m, a, a, color, { name: D, rotation: 270 }))
      break
    }
    case 'waves': {
      const h = Math.min(H * 0.2, S * 0.28) * strength
      els.push(path(WAVE, [200, 60], 0, H - h, W, h, t.soft, { name: D }))
      els.push(path(WAVE, [200, 60], 0, H - h * 0.7, W, h * 0.7, t.soft2, { name: D, opacity: 0.8 }))
      break
    }
    case 'stripes': {
      const a = S * 0.34 * strength
      els.push(path(stripes(6), [208, 100], flip ? -a * 0.2 : W - a * 0.95, -a * 0.1, a * 1.2, a * 0.55, t.soft, { name: D }))
      break
    }
    case 'arches': {
      const a = S * 0.36 * strength
      els.push(path(ARCH, [100, 100], flip ? W - a * 0.75 : -a * 0.25, H - a * 0.9, a, a * 1.1, t.soft, { name: D }))
      els.push(ellipse(flip ? u * 6 : W - u * 6 - a * 0.28, u * 6, a * 0.28, a * 0.28, t.soft2, { name: D }))
      break
    }
    case 'sparkles': {
      const a = S * 0.13 * strength
      const color = t.dark ? t.accent : t.accent2
      els.push(path(SPARKLE, [100, 100], flip ? u * 6 : W - u * 6 - a, u * 6, a, a, color, { name: D, opacity: 0.85 }))
      els.push(path(SPARKLE, [100, 100], flip ? u * 6 + a * 1.1 : W - u * 6 - a * 1.6, u * 6 + a * 0.9, a * 0.45, a * 0.45, color, { name: D, opacity: 0.6 }))
      els.push(path(SPARKLE, [100, 100], flip ? W - u * 8 - a * 0.6 : u * 8, H - u * 8 - a * 0.6, a * 0.6, a * 0.6, color, { name: D, opacity: 0.6 }))
      break
    }
    case 'confetti': {
      const colors = [t.accent, t.accent2, t.soft2, t.accentText]
      const n = Math.round(10 * strength) + 2
      for (let i = 0; i < n; i++) {
        const edge = i % 2 === 0
        const x = edge ? c.rand() * W : (c.rand() > 0.5 ? c.rand() * 0.12 : 0.88 + c.rand() * 0.12) * W
        const y = edge ? (c.rand() > 0.5 ? c.rand() * 0.1 : 0.9 + c.rand() * 0.1) * H : c.rand() * H
        const s = u * (1.2 + c.rand() * 1.6)
        const color = colors[i % colors.length]
        els.push(i % 3 === 0 ? ellipse(x, y, s, s, color, { name: D }) : rect(x, y, s * 0.6, s * 1.6, color, { name: D, rotation: Math.round(c.rand() * 180), cornerRadius: s * 0.2 }))
      }
      break
    }
    case 'leaves': {
      const a = S * 0.22 * strength
      els.push(path(LEAF, [100, 100], flip ? W - a * 0.9 : -a * 0.1, -a * 0.1, a, a, t.soft, { name: D, rotation: 0 }))
      els.push(path(LEAF, [100, 100], flip ? W - a * 0.4 : a * 0.4, -a * 0.2, a * 0.7, a * 0.7, t.soft2, { name: D, rotation: 35 }))
      els.push(path(LEAF, [100, 100], flip ? a * 0.9 : W + a * 0.1, H + a * 0.1, a, a, t.soft, { name: D, rotation: 180 }))
      break
    }
    case 'grid': {
      const a = S * 0.36 * strength
      els.push(path(gridPath(6), [100, 100], flip ? -a * 0.15 : W - a * 0.85, -a * 0.15, a, a, 'transparent', { name: D, stroke: t.soft, strokeWidth: r(u * 0.25) }))
      break
    }
  }
  c.els.push(...(els.length > 1 ? group(els) : els))
}
