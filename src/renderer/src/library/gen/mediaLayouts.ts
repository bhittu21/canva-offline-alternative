import { ellipse, frame, group, rect } from '../templateKit'
import { type Box, type Ctx, P, T, cols, inset, r, stack, textEl } from './core'
import { inkOn } from './color'
import { decorate } from './deco'
import type { Mood } from './themes'

/** Layouts for video thumbnails and wide banners (covers and headers). */

export interface MediaContent {
  id: string
  title: string
  kw: string
  mood: Mood[]
  label?: string
  head: string
  sub?: string
  /** A big number for list videos ("7", "TOP 10"). */
  big?: string
  /** Two names for comparison videos. */
  versus?: [string, string]
  foot?: string
  icon?: string
}

export type MediaLayout = (c: Ctx, p: MediaContent) => void

const SCRIPTS = new Set(['Pacifico', 'Lobster', 'Caveat', 'Great Vibes', 'Dancing Script'])

/** Thumbnails need heavy, readable type: script heading fonts are swapped for a bold display face. */
const loud = (c: Ctx) => (SCRIPTS.has(c.t.head.family) ? { family: 'Archivo Black', style: 'normal' as const } : {})

const photo = (b: Box, mask = 'rect', name = 'Photo') => frame(r(b.x), r(b.y), r(b.w), r(b.h), { mask, name })

// ------------------------------------------------------------ thumbnails (1280 x 720)

/** Photo on the right, a huge headline on the left. */
export const thumbSplit: MediaLayout = (c, p) => {
  const pw = c.W * 0.46
  c.els.push(photo({ x: c.W - pw, y: 0, w: pw, h: c.H }))
  c.els.push(rect(r(c.W - pw - c.u * 2), 0, r(c.u * 2), c.H, c.t.accent, { name: 'Accent bar' }))
  stack(
    c,
    { x: c.u * 7, y: c.u * 7, w: c.W - pw - c.u * 13, h: c.H - c.u * 14 },
    [
      P(p.label, { role: 'label', size: 4.2, color: c.t.onAccent }, { fill: c.t.accent, padX: 3, padY: 1.4, radius: 1, name: 'Label' }),
      T(p.big, { role: 'head', size: 24, color: c.t.accentText, upper: true, lineHeight: 0.95, ...loud(c) }),
      T(p.head, { role: 'head', size: 15, upper: true, lineHeight: 1, ...loud(c) }),
      T(p.sub, { role: 'body', size: 5, style: 'bold' })
    ],
    { valign: 'middle', gap: 3, maxGrow: 1.3 }
  )
}

/** A full photo with a solid panel holding the headline. */
export const thumbPanel: MediaLayout = (c, p) => {
  c.els.push(photo({ x: 0, y: 0, w: c.W, h: c.H }, 'rect', 'Background photo'))
  const pw = c.W * 0.56
  c.els.push(rect(0, 0, r(pw), c.H, c.t.bg, { name: 'Panel', opacity: 0.94 }))
  c.els.push(rect(r(pw), 0, r(c.u * 1.6), c.H, c.t.accent, { name: 'Accent bar' }))
  stack(
    c,
    inset({ x: 0, y: 0, w: pw, h: c.H }, c.u * 7),
    [
      T(p.label, { role: 'label', size: 4.4, color: c.t.accentText }),
      T(p.head, { role: 'head', size: 15, upper: true, lineHeight: 1, ...loud(c) }),
      T(p.sub, { role: 'body', size: 5, color: c.t.muted, style: 'bold' })
    ],
    { valign: 'middle', gap: 3, maxGrow: 1.3 }
  )
}

/** Big words on highlight bars, with a round photo. */
export const thumbHighlight: MediaLayout = (c, p) => {
  decorate(c, 0.8)
  const d = c.H * 0.62
  c.els.push(ellipse(r(c.W - d - c.u * 6 - c.u * 1.5), r((c.H - d) / 2 - c.u * 1.5), r(d + c.u * 3), r(d + c.u * 3), c.t.accent, { name: 'Photo ring' }))
  c.els.push(frame(r(c.W - d - c.u * 6), r((c.H - d) / 2), r(d), r(d), { mask: 'circle', name: 'Photo' }))
  const words = p.head.split(' ')
  const half = Math.ceil(words.length / 2)
  const lines = words.length > 2 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [p.head]
  stack(
    c,
    { x: c.u * 7, y: c.u * 7, w: c.W - d - c.u * 19, h: c.H - c.u * 14 },
    [
      T(p.label, { role: 'label', size: 4.2, color: c.t.accentText }),
      ...lines.map((line, i) => P(line, { role: 'head', size: 13, upper: true, ...loud(c), color: i === 0 ? c.t.onAccent : inkOn(c.t.ink), lineHeight: 1 }, { fill: i === 0 ? c.t.accent : c.t.ink, radius: 1, padX: 2.2, padY: 1, name: 'Highlight', gapAfter: 1.5 })),
      T(p.sub, { role: 'body', size: 5, style: 'bold', color: c.t.ink })
    ],
    { valign: 'middle', gap: 3, maxGrow: 1.2 }
  )
}

/** Two photos face off with a VS badge. */
export const thumbVersus: MediaLayout = (c, p) => {
  const [a, b] = cols(c, { x: 0, y: 0, w: c.W, h: c.H }, [1, 1], 0)
  c.els.push(photo(a, 'rect', 'Left photo'), photo(b, 'rect', 'Right photo'))
  const bandH = c.H * 0.3
  c.els.push(rect(0, r(c.H - bandH), c.W, r(bandH), c.t.bg, { name: 'Band', opacity: 0.96 }))
  const [l, rr] = cols(c, inset({ x: 0, y: c.H - bandH, w: c.W, h: bandH }, c.u * 5, c.u * 3), [1, 1], 30)
  const names = p.versus ?? ['This', 'That']
  stack(c, l, [T(names[0], { role: 'head', size: 11, upper: true, align: 'center', lineHeight: 1, ...loud(c) })], { valign: 'middle', align: 'center', maxGrow: 1.1 })
  stack(c, rr, [T(names[1], { role: 'head', size: 11, upper: true, align: 'center', lineHeight: 1, ...loud(c) })], { valign: 'middle', align: 'center', maxGrow: 1.1 })
  const d = c.H * 0.34
  const x = (c.W - d) / 2
  const y = c.H - bandH - d * 0.55
  const vs = textEl(c, 'VS', x, 0, d, { role: 'head', size: 12, align: 'center', color: c.t.onAccent, upper: true })
  vs.y = r(y + (d - vs.height) / 2)
  c.els.push(...group([ellipse(r(x), r(y), r(d), r(d), c.t.accent, { name: 'VS circle', stroke: c.t.bg, strokeWidth: r(c.u * 1.2) }), vs]))
  if (p.label) stack(c, { x: c.u * 5, y: c.u * 5, w: c.W * 0.4, h: c.u * 12 }, [P(p.label, { role: 'label', size: 4, color: c.t.onAccent }, { fill: c.t.accent, radius: 1, padX: 2.5, padY: 1.2, name: 'Label' })])
}

/** A giant number for list videos. */
export const thumbNumber: MediaLayout = (c, p) => {
  decorate(c, 0.8)
  const pw = c.W * 0.36
  c.els.push(frame(r(c.W - pw - c.u * 5), r(c.u * 8), r(pw), r(c.H - c.u * 16), { mask: 'rounded', name: 'Photo' }))
  const [n, t] = cols(c, { x: c.u * 6, y: c.u * 6, w: c.W - pw - c.u * 16, h: c.H - c.u * 12 }, [0.9, 1.4], 3)
  stack(c, n, [T(p.big ?? '5', { role: 'head', size: 60, align: 'center', color: c.t.accentText, upper: true, lineHeight: 0.9, ...loud(c) })], { valign: 'middle', align: 'center', maxGrow: 1 })
  stack(c, t, [T(p.label, { role: 'label', size: 4, color: c.t.accentText }), T(p.head, { role: 'head', size: 12, upper: true, lineHeight: 1, ...loud(c) }), T(p.sub, { role: 'body', size: 4.6, style: 'bold' })], { valign: 'middle', gap: 3, maxGrow: 1.2 })
}

// ------------------------------------------------------------ banners

/**
 * The area of a banner where text is safe: the middle for YouTube channel
 * art (TVs show all of it, phones only the centre), clear of the profile
 * photo for Facebook and LinkedIn.
 */
function safeArea(c: Ctx): Box {
  if (c.W === 2560) return { x: (c.W - 1546) / 2, y: (c.H - 423) / 2, w: 1546, h: 423 }
  if (c.W === 1584) return { x: c.W * 0.3, y: c.u * 10, w: c.W * 0.64, h: c.H - c.u * 20 }
  if (c.W === 1640) return { x: c.W * 0.06, y: c.u * 10, w: c.W * 0.88, h: c.H * 0.62 }
  return inset({ x: 0, y: 0, w: c.W, h: c.H }, c.u * 10)
}

/** Text on one side of the safe area, a photo filling the other side of the banner. */
export const bannerSplit: MediaLayout = (c, p) => {
  decorate(c, 0.7)
  const safe = safeArea(c)
  const pw = c.W * 0.36
  c.els.push(photo({ x: c.W - pw, y: 0, w: pw, h: c.H }))
  c.els.push(rect(r(c.W - pw - c.u * 1.5), 0, r(c.u * 1.5), c.H, c.t.accent, { name: 'Accent bar' }))
  const text: Box = { x: safe.x, y: safe.y, w: Math.max(safe.w * 0.4, c.W - pw - safe.x - c.u * 8), h: safe.h }
  stack(c, text, bannerBlocks(c, p, 'left'), { valign: 'middle', gap: 2.6, maxGrow: 1.3 })
}

/** Everything centred on a patterned background. */
export const bannerCenter: MediaLayout = (c, p) => {
  decorate(c, 1)
  stack(c, safeArea(c), bannerBlocks(c, p, 'center'), { valign: 'middle', align: 'center', gap: 2.6, maxGrow: 1.3 })
}

/** A bold colour block with the headline, contact details beside it. */
export const bannerBlock: MediaLayout = (c, p) => {
  const safe = safeArea(c)
  const bw = safe.x + safe.w * 0.58
  c.els.push(rect(0, 0, r(bw), c.H, c.t.accent, { name: 'Colour block' }))
  decorate(c, 0.5, 'dots')
  const [a, b] = cols(c, safe, [1.4, 1], 8)
  stack(c, { ...a, w: bw - safe.x - c.u * 6 }, [T(p.label, { role: 'label', size: 3.2, color: c.t.onAccent }), T(p.head, { role: 'head', size: 13, color: c.t.onAccent })], { valign: 'middle', gap: 2.4, maxGrow: 1.3 })
  stack(c, { ...b, x: bw + c.u * 6, w: c.W - bw - c.u * 12 }, [T(p.sub, { role: 'body', size: 4 }), T(p.foot, { role: 'body', size: 3.4, style: 'bold', color: c.t.ink })], { valign: 'middle', gap: 2.4, maxGrow: 1.2 })
}

function bannerBlocks(c: Ctx, p: MediaContent, align: 'left' | 'center') {
  return [
    T(p.label, { role: 'label', size: 3.4, align, color: c.t.accentText }),
    T(p.head, { role: 'head', size: 14, align }),
    T(p.sub, { role: 'body', size: 4.4, align }),
    T(p.foot, { role: 'body', size: 3.6, align, style: 'bold', color: c.t.ink })
  ]
}

export const mediaLayouts = { thumbSplit, thumbPanel, thumbHighlight, thumbVersus, thumbNumber, bannerSplit, bannerCenter, bannerBlock }
export type MediaLayoutId = keyof typeof mediaLayouts
