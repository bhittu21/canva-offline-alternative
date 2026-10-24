/** Colour helpers for the template checks: parsing, blending and WCAG contrast. */

export type RGBA = [number, number, number, number]

export function parseColor(value: string): RGBA | null {
  const v = value.trim().toLowerCase()
  if (v === 'transparent') return [0, 0, 0, 0]
  const m = /^#([0-9a-f]{3,8})$/.exec(v)
  if (!m) return null
  let h = m[1]
  if (h.length === 3 || h.length === 4) h = [...h].map((ch) => ch + ch).join('')
  if (h.length !== 6 && h.length !== 8) return null
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16)
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1]
}

/** Paints `top` (with an extra opacity) over an opaque `under`. */
export function blend(top: RGBA, under: RGBA, opacity = 1): RGBA {
  const a = top[3] * opacity
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminance(c: RGBA): number {
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
}

export function contrast(a: RGBA, b: RGBA): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function contrastHex(a: string, b: string): number {
  const pa = parseColor(a)
  const pb = parseColor(b)
  return pa && pb ? contrast(pa, pb) : 0
}

/** Dark or white text, whichever reads better on a fill. */
export function inkOn(fill: string): string {
  return contrastHex('#ffffff', fill) >= contrastHex('#1f2329', fill) ? '#ffffff' : '#1f2329'
}
