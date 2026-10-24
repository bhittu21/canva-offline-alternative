import type { DesignElement } from '@shared/model'
import { ellipse, frame, group, icon, path, rect } from '../templateKit'
import { type Block, type Box, type Ctx, E, P, R, S, T, cols, inset, isLandscape, isTall, pageBox, r, rows, stack } from './core'
import { inkOn } from './color'
import { decorate, SPARKLE } from './deco'
import type { Mood } from './themes'

/**
 * Layouts for single-message designs: social posts, stories, flyers, posters
 * and cards. Each one works at any page shape and leaves out the parts the
 * content does not have.
 */

export interface PostContent {
  id: string
  title: string
  kw: string
  mood: Mood[]
  label?: string
  head: string
  sub?: string
  /** A huge word or number: "50%", "OPEN", "3 DAYS". */
  big?: string
  cta?: string
  foot?: string
  items?: string[]
  icon?: string
  /** The head is a quote and the foot names who said it. */
  quote?: boolean
  /** A short script line for elegant layouts, e.g. "Save the date". */
  script?: string
}

export type PostLayout = (c: Ctx, p: PostContent) => void

const margin = (c: Ctx) => c.u * (isLandscape(c) ? 7 : 8)
const headSize = (c: Ctx, base = 11) => (isLandscape(c) ? base * 1.05 : isTall(c) ? base * 1.12 : base)

function labelPill(c: Ctx, p: PostContent, o: { onCard?: boolean; outline?: boolean } = {}): Block {
  if (o.outline) return P(p.label, { role: 'label', size: 2.9, color: c.t.accentText }, { fill: 'transparent', stroke: c.t.accentText, padX: 2.6, padY: 1.1, name: 'Label' })
  return P(p.label, { role: 'label', size: 2.9, color: c.t.onAccent }, { fill: c.t.accent, padX: 2.6, padY: 1.1, name: 'Label' })
}

function ctaPill(c: Ctx, p: PostContent, inverse = false): Block {
  const fill = inverse ? c.t.ink : c.t.accent
  const ink = inverse ? inkOn(c.t.ink) : c.t.onAccent
  return P(p.cta, { role: 'body', size: 3.3, style: 'bold', color: ink }, { fill, padX: 4, padY: 1.8, name: 'Button' })
}

const footText = (c: Ctx, p: PostContent, align: 'left' | 'center' | 'right' = 'center', color?: string): Block => T(p.foot, { role: 'body', size: 2.6, align, color: color ?? c.t.muted })

function photo(x: number, y: number, w: number, h: number, mask = 'rect', radius = 0, name = 'Photo'): DesignElement {
  return frame(r(x), r(y), r(w), r(h), { mask, ...(radius ? { cornerRadius: r(radius) } : {}), name })
}

function headBlock(_c: Ctx, p: PostContent, size: number, align: 'left' | 'center' | 'right', color?: string): Block {
  const value = p.quote ? `“${p.head}”` : p.head
  return T(value, { role: 'head', size: p.quote ? size * 0.62 : size, align, color, ...(p.quote ? { upper: false, lineHeight: 1.22 } : {}) })
}

// ------------------------------------------------------------ layouts

/** Everything centred on the page, with the theme's decoration around it. */
export const centered: PostLayout = (c, p) => {
  decorate(c, 1)
  const m = margin(c)
  const box = inset(pageBox(c, m), 0, isTall(c) ? c.u * 10 : 0)
  stack(
    c,
    box,
    [
      p.icon ? E(12, (x, y, _w, h) => [icon(p.icon!, x, y, h, c.t.accentText, { strokeWidth: 1.75 })], 12) : S(0),
      labelPill(c, p),
      headBlock(c, p, headSize(c, 12), 'center'),
      T(p.sub, { role: 'body', size: 4, align: 'center', widthShare: isLandscape(c) ? 0.8 : 1 }),
      T(p.items?.join('  ·  '), { role: 'body', size: 3, align: 'center', style: 'bold', color: c.t.ink }),
      ctaPill(c, p),
      footText(c, p)
    ],
    { valign: 'middle', align: 'center', gap: 3.4 }
  )
}

/** A photo on one side (or the top) and the message beside it. */
export const splitPhoto: PostLayout = (c, p) => {
  const m = margin(c)
  if (isLandscape(c) || c.W / c.H > 0.95) {
    const [a, b] = cols(c, { x: 0, y: 0, w: c.W, h: c.H }, [1, 1], 0)
    decorate(c, 0.5, c.t.deco === 'blobs' || c.t.deco === 'circles' ? 'dots' : c.t.deco)
    c.els.push(photo(a.x, a.y, a.w, a.h))
    stack(c, inset(b, m), contentBlocks(c, p, 'left', 10), { valign: 'middle', align: 'left', gap: 3 })
  } else {
    const ph = c.H * (isTall(c) ? 0.5 : 0.48)
    c.els.push(photo(m, m, c.W - m * 2, ph - m * 0.5, 'rounded', 0, 'Photo'))
    stack(c, { x: m, y: ph + m * 0.6, w: c.W - m * 2, h: c.H - ph - m * 1.6 }, contentBlocks(c, p, 'left', 9.5), { valign: 'middle', align: 'left', gap: 2.6 })
  }
}

function contentBlocks(c: Ctx, p: PostContent, align: 'left' | 'center', size: number, onSurface = false): Block[] {
  const ink = onSurface ? c.t.surfaceInk : undefined
  const muted = onSurface ? c.t.surfaceMuted : undefined
  return [
    labelPill(c, p),
    p.big ? T(p.big, { role: 'head', size: size * 1.5, align, color: onSurface ? c.t.surfaceInk : c.t.accentText, upper: true, lineHeight: 1 }) : S(0),
    headBlock(c, p, size, align, ink),
    T(p.sub, { role: 'body', size: 3.6, align, color: muted }),
    R(p.items, { spec: { role: 'body', size: 3, color: ink ?? c.t.ink }, badge: 'check', gap: 1.4 }),
    ctaPill(c, p),
    T(p.foot, { role: 'body', size: 2.5, align, color: muted ?? c.t.muted })
  ]
}

/** A white card floating on a coloured page. */
export const card: PostLayout = (c, p) => {
  decorate(c, 1)
  const m = margin(c) * (isLandscape(c) ? 0.9 : 1)
  const box = pageBox(c, m)
  c.els.push(rect(box.x, box.y, box.w, box.h, c.t.surface, { name: 'Card', cornerRadius: r(c.u * 3), shadow: { color: '#000000', blur: r(c.u * 4), offsetX: 0, offsetY: r(c.u), opacity: 0.12 } }))
  stack(c, inset(box, c.u * 7), contentBlocks(c, p, 'center', 10, true), { valign: 'middle', align: 'center', gap: 3 })
}

/** A full-width photo on top and the message on a panel below. */
export const photoTop: PostLayout = (c, p) => {
  const m = margin(c)
  if (isLandscape(c)) {
    const pw = c.W * 0.46
    c.els.push(photo(c.W - pw, 0, pw, c.H))
    c.els.push(rect(c.W - pw - c.u * 1.5, 0, r(c.u * 1.5), c.H, c.t.accent, { name: 'Accent bar' }))
    stack(c, { x: m, y: m, w: c.W - pw - m * 2, h: c.H - m * 2 }, contentBlocks(c, p, 'left', 10), { valign: 'middle', gap: 3 })
    return
  }
  const ph = c.H * (isTall(c) ? 0.56 : 0.52)
  c.els.push(photo(0, 0, c.W, ph))
  c.els.push(rect(0, ph - c.u * 1.2, c.W, r(c.u * 1.2), c.t.accent, { name: 'Accent bar' }))
  stack(c, { x: m, y: ph + m * 0.7, w: c.W - m * 2, h: c.H - ph - m * 1.5 }, contentBlocks(c, p, 'left', 9), { valign: 'middle', gap: 2.6 })
}

/** A huge number or word as the hero, for sales and stats. */
export const bigNumber: PostLayout = (c, p) => {
  if (!p.big) return centered(c, p)
  decorate(c, 0.9)
  const m = margin(c)
  const land = isLandscape(c)
  const box = inset(pageBox(c, m), 0, isTall(c) ? c.u * 8 : 0)
  const blocks: Block[] = [
    labelPill(c, p, { outline: true }),
    T(p.big, { role: 'head', size: land ? 30 : 34, align: 'center', color: c.t.accentText, upper: true, lineHeight: 0.95 }),
    T(p.head, { role: 'head', size: headSize(c, 7.5), align: 'center' }),
    T(p.sub, { role: 'body', size: 3.6, align: 'center' }),
    ctaPill(c, p, true),
    footText(c, p)
  ]
  stack(c, box, blocks, { valign: 'middle', align: 'center', gap: 2.6 })
}

/** A thin border and centred, elegant type: invitations, quotes, greetings. */
export const bordered: PostLayout = (c, p) => {
  const m = c.u * 4.5
  decorate(c, 0.8, c.t.deco === 'corners' ? 'corners' : c.t.deco === 'leaves' || c.t.deco === 'arches' ? c.t.deco : 'none')
  c.els.push(rect(m, m, c.W - m * 2, c.H - m * 2, 'transparent', { name: 'Border', stroke: c.t.line, strokeWidth: r(Math.max(2, c.u * 0.35)) }))
  const inner = inset(pageBox(c, m), c.u * (isLandscape(c) ? 9 : 8), c.u * (isTall(c) ? 14 : 9))
  stack(
    c,
    inner,
    [
      p.icon ? E(10, (x, y, _w, h) => [icon(p.icon!, x, y, h, c.t.accentText, { strokeWidth: 1.25 })], 10) : S(0),
      T(p.script, { role: 'accent', size: 7, align: 'center', color: c.t.accentText }),
      T(p.label, { role: 'label', size: 2.4, align: 'center', color: c.t.muted }),
      headBlock(c, p, headSize(c, 10), 'center'),
      E(1, (x, y, w) => [rect(x + w / 2 - c.u * 8, y, r(c.u * 16), r(Math.max(2, c.u * 0.3)), c.t.line, { name: 'Divider' })]),
      T(p.sub, { role: 'body', size: 3.4, align: 'center', lineHeight: 1.5 }),
      T(p.items?.join('\n'), { role: 'body', size: 3, align: 'center', style: 'bold', color: c.t.ink, lineHeight: 1.5 }),
      T(p.cta, { role: 'label', size: 2.6, align: 'center', color: c.t.accentText }),
      footText(c, p)
    ],
    { valign: 'middle', align: 'center', gap: 3 }
  )
}

/** Left-aligned editorial type with a strong rule and a footer row. */
export const editorial: PostLayout = (c, p) => {
  decorate(c, 0.7, 'lines')
  const m = margin(c)
  const box = pageBox(c, m)
  const land = isLandscape(c)
  stack(c, { x: box.x, y: box.y, w: box.w * 0.6, h: c.u * 6 }, [T('YOUR BRAND', { role: 'label', size: 2.8, color: c.t.ink, name: 'Brand' })])
  const body = { x: box.x, y: box.y + c.u * 10, w: land ? box.w * 0.78 : box.w, h: box.h - c.u * 18 }
  stack(
    c,
    body,
    [
      T(p.label, { role: 'label', size: 2.6, color: c.t.accentText }),
      p.big ? T(p.big, { role: 'head', size: 20, color: c.t.accentText, upper: true, lineHeight: 0.95 }) : S(0),
      headBlock(c, p, headSize(c, 11.5), 'left'),
      E(1.2, (x, y) => [rect(x, y, r(c.u * 14), r(c.u * 1.2), c.t.accent, { name: 'Rule' })]),
      T(p.sub, { role: 'body', size: 3.6, widthShare: land ? 0.9 : 0.92 }),
      R(p.items, { spec: { role: 'body', size: 3, color: c.t.ink }, badge: 'dot', gap: 1.2 })
    ],
    { valign: 'bottom', gap: 3.2 }
  )
  const footY = box.y + box.h - c.u * 4
  c.els.push(rect(box.x, r(footY - c.u * 2), box.w, r(Math.max(2, c.u * 0.2)), c.t.line === c.t.soft ? c.t.muted : c.t.line, { name: 'Footer line', opacity: 0.5 }))
  const [fl, fr] = cols(c, { x: box.x, y: footY, w: box.w, h: c.u * 4 }, [1, 1], 2)
  stack(c, fl, [T(p.cta, { role: 'body', size: 2.6, style: 'bold', color: c.t.ink })])
  stack(c, fr, [T(p.foot, { role: 'body', size: 2.6, align: 'right' })])
}

/** A title and a numbered or ticked list. */
export const list: PostLayout = (c, p) => {
  decorate(c, 0.8)
  const m = margin(c)
  const box = pageBox(c, m)
  const land = isLandscape(c)
  if (land) {
    const [a, b] = cols(c, box, [1, 1.15], 6)
    stack(c, a, [labelPill(c, p), headBlock(c, p, 10, 'left'), T(p.sub, { role: 'body', size: 3.4 }), footText(c, p, 'left')], { valign: 'middle', gap: 3 })
    stack(c, b, [R(p.items, { spec: { role: 'body', size: 3.6, color: c.t.ink, style: 'bold' }, badge: 'number', gap: 2.4 }), ctaPill(c, p)], { valign: 'middle', gap: 4 })
    return
  }
  stack(
    c,
    box,
    [
      labelPill(c, p),
      headBlock(c, p, headSize(c, 9.5), 'left'),
      T(p.sub, { role: 'body', size: 3.4 }),
      S(1),
      R(p.items, { spec: { role: 'body', size: 3.6, color: c.t.ink, style: 'bold' }, badge: p.icon ? { icon: p.icon } : 'number', gap: 2.6, badgeFill: p.icon ? c.t.accentText : undefined }),
      S(1),
      ctaPill(c, p),
      footText(c, p, 'left')
    ],
    { valign: 'middle', gap: 3 }
  )
}

/** A round photo with the message below: people, testimonials, birthdays. */
export const circlePhoto: PostLayout = (c, p) => {
  decorate(c, 0.9)
  const m = margin(c)
  if (isLandscape(c)) {
    const d = c.H - m * 2.4
    c.els.push(ellipse(m - c.u * 1.5, (c.H - d) / 2 - c.u * 1.5, r(d + c.u * 3), r(d + c.u * 3), c.t.accent, { name: 'Photo ring' }))
    c.els.push(photo(m, (c.H - d) / 2, d, d, 'circle'))
    stack(c, { x: m * 2 + d, y: m, w: c.W - d - m * 3, h: c.H - m * 2 }, [labelPill(c, p), headBlock(c, p, 9, 'left'), T(p.sub, { role: 'body', size: 3.4 }), footText(c, p, 'left', c.t.accentText), ctaPill(c, p)], { valign: 'middle', gap: 2.8 })
    return
  }
  const d = Math.min(c.W * 0.46, c.H * 0.36)
  const top = isTall(c) ? c.H * 0.14 : m * 1.1
  c.els.push(ellipse(r((c.W - d) / 2 - c.u * 1.5), r(top - c.u * 1.5), r(d + c.u * 3), r(d + c.u * 3), c.t.accent, { name: 'Photo ring' }))
  c.els.push(photo((c.W - d) / 2, top, d, d, 'circle'))
  stack(
    c,
    { x: m, y: top + d + c.u * 6, w: c.W - m * 2, h: c.H - top - d - c.u * 6 - m },
    [labelPill(c, p), headBlock(c, p, headSize(c, 9), 'center'), T(p.sub, { role: 'body', size: 3.4, align: 'center' }), footText(c, p, 'center', c.t.accentText), ctaPill(c, p)],
    { valign: 'middle', align: 'center', gap: 2.6 }
  )
}

/** A bold colour band across the page holding the headline. */
export const band: PostLayout = (c, p) => {
  decorate(c, 0.6)
  const m = margin(c)
  const land = isLandscape(c)
  if (land) {
    const bw = c.W * 0.52
    c.els.push(rect(0, 0, r(bw), c.H, c.t.accent, { name: 'Band' }))
    stack(c, inset({ x: 0, y: 0, w: bw, h: c.H }, m), [T(p.script, { role: 'accent', size: 7, color: c.t.onAccent }), headBlock(c, p, 12, 'left', c.t.onAccent), p.big ? T(p.big, { role: 'head', size: 9, color: c.t.onAccent }) : S(0)], { valign: 'middle', gap: 2 })
    stack(c, { x: bw + m, y: m, w: c.W - bw - m * 2, h: c.H - m * 2 }, [T(p.label, { role: 'label', size: 2.8, color: c.t.accentText }), T(p.sub, { role: 'body', size: 3.8 }), ctaPill(c, p, true), footText(c, p, 'left')], { valign: 'middle', gap: 3 })
    return
  }
  const bandH = c.H * (isTall(c) ? 0.3 : 0.36)
  const bandY = (c.H - bandH) / 2 + (land ? 0 : c.H * 0.02)
  c.els.push(rect(0, r(bandY), c.W, r(bandH), c.t.accent, { name: 'Band' }))
  stack(c, inset({ x: 0, y: bandY, w: c.W, h: bandH }, m, c.u * 4), [headBlock(c, p, headSize(c, 11), 'center', c.t.onAccent), p.big ? T(p.big, { role: 'head', size: 8, align: 'center', color: c.t.onAccent }) : S(0)], { valign: 'middle', align: 'center', gap: 2 })
  stack(c, { x: m, y: m, w: c.W - m * 2, h: bandY - m - c.u * 3 }, [T(p.label, { role: 'label', size: 2.8, align: 'center', color: c.t.accentText }), T(p.script, { role: 'accent', size: 6, align: 'center', color: c.t.ink })], { valign: 'bottom', align: 'center', gap: 2 })
  stack(c, { x: m, y: bandY + bandH + c.u * 4, w: c.W - m * 2, h: c.H - bandY - bandH - c.u * 4 - m }, [T(p.sub, { role: 'body', size: 3.6, align: 'center' }), ctaPill(c, p, true), footText(c, p)], { valign: 'top', align: 'center', gap: 3 })
}

/** A small gallery of photos with the message: collections, menus, portfolios. */
export const photoGrid: PostLayout = (c, p) => {
  const m = margin(c)
  const land = isLandscape(c)
  const grid: Box = land ? { x: c.W * 0.45, y: m, w: c.W * 0.55 - m, h: c.H - m * 2 } : { x: m, y: m, w: c.W - m * 2, h: c.H * (isTall(c) ? 0.5 : 0.5) - m }
  const [big, side] = cols(c, grid, [1.6, 1], 2)
  c.els.push(photo(big.x, big.y, big.w, big.h, 'rounded'))
  for (const b of rows(c, side, [1, 1], 2)) c.els.push(photo(b.x, b.y, b.w, b.h, 'rounded'))
  const text: Box = land ? { x: m, y: m, w: c.W * 0.45 - m * 1.6, h: c.H - m * 2 } : { x: m, y: grid.y + grid.h + c.u * 5, w: c.W - m * 2, h: c.H - grid.h - grid.y - c.u * 5 - m }
  stack(c, text, contentBlocks(c, p, 'left', 9), { valign: 'middle', gap: 2.6 })
}

/** A coupon with a dashed edge and a code. */
export const coupon: PostLayout = (c, p) => {
  decorate(c, 1)
  const m = margin(c) * 1.1
  const land = isLandscape(c)
  const h = land ? c.H - m * 2 : Math.min(c.H - m * 2, c.W * 0.95)
  const box = { x: m, y: (c.H - h) / 2, w: c.W - m * 2, h }
  c.els.push(rect(box.x, r(box.y), box.w, r(box.h), c.t.surface, { name: 'Coupon', cornerRadius: r(c.u * 2.5), stroke: c.t.accent, strokeWidth: r(c.u * 0.5), dash: 'dashed' }))
  const notch = c.u * 6
  c.els.push(ellipse(r(box.x - notch / 2), r(box.y + box.h / 2 - notch / 2), r(notch), r(notch), c.t.bg, { name: 'Notch' }))
  c.els.push(ellipse(r(box.x + box.w - notch / 2), r(box.y + box.h / 2 - notch / 2), r(notch), r(notch), c.t.bg, { name: 'Notch' }))
  const label = T(p.label, { role: 'label', size: 2.6, align: 'center', color: c.t.surfaceMuted })
  const big = T(p.big ?? p.head, { role: 'head', size: land ? 20 : 22, align: 'center', color: c.t.surfaceInk, upper: true, lineHeight: 1 })
  const rest = [
    p.big ? T(p.head, { role: 'head', size: 6, align: 'center', color: c.t.surfaceInk }) : S(0),
    T(p.sub, { role: 'body', size: 3.2, align: 'center', color: c.t.surfaceMuted }),
    P(p.cta, { role: 'body', size: 3.2, style: 'bold', color: c.t.onAccent }, { fill: c.t.accent, radius: 1.2, padX: 4, padY: 1.6, name: 'Code' }),
    T(p.foot, { role: 'body', size: 2.4, align: 'center', color: c.t.surfaceMuted })
  ]
  if (land) {
    const [a, b] = cols(c, inset(box, c.u * 6, c.u * 5), [1, 1.1], 6)
    c.els.push(rect(r(a.x + a.w + c.u * 3), r(box.y + c.u * 4), r(Math.max(2, c.u * 0.3)), r(box.h - c.u * 8), c.t.accent, { name: 'Tear line', opacity: 0.6 }))
    stack(c, a, [label, big], { valign: 'middle', align: 'center', gap: 2 })
    stack(c, b, rest, { valign: 'middle', align: 'center', gap: 2.6 })
    return
  }
  stack(c, inset(box, c.u * 7, c.u * 5), [label, big, ...rest], { valign: 'middle', align: 'center', gap: 2.6 })
}

/** A large icon badge as the hero. */
export const iconHero: PostLayout = (c, p) => {
  decorate(c, 0.9)
  const m = margin(c)
  const name = p.icon ?? 'sparkles'
  const land = isLandscape(c)
  const d = land ? c.H * 0.5 : Math.min(c.W, c.H) * 0.3
  const badge = (x: number, y: number): DesignElement[] =>
    group([ellipse(r(x), r(y), r(d), r(d), c.t.accent, { name: 'Icon circle' }), icon(name, r(x + d * 0.25), r(y + d * 0.25), r(d * 0.5), c.t.onAccent, { strokeWidth: 1.75 })])
  if (land) {
    c.els.push(...badge(m * 1.2, (c.H - d) / 2))
    stack(c, { x: m * 2.4 + d, y: m, w: c.W - d - m * 3.4, h: c.H - m * 2 }, contentBlocks(c, p, 'left', 9.5), { valign: 'middle', gap: 2.8 })
    return
  }
  const box = inset(pageBox(c, m), 0, isTall(c) ? c.u * 10 : 0)
  stack(c, box, [E(d / c.u, (x, y, w, h) => (w ? badge(x, y).map((e) => scaleTo(e, x, y, h / d)) : []), d / c.u, 4), ...contentBlocks(c, p, 'center', 10)], { valign: 'middle', align: 'center', gap: 3 })
}

/** Scales an element placed for size d about (x, y) by f. */
function scaleTo(el: DesignElement, x: number, y: number, f: number): DesignElement {
  if (f === 1) return el
  return { ...el, x: r(x + (el.x - x) * f), y: r(y + (el.y - y) * f), width: r(el.width * f), height: r(el.height * f) }
}

/** A quote with a big quotation mark, for sayings and testimonials. */
export const quoteMark: PostLayout = (c, p) => {
  decorate(c, 0.7)
  const m = margin(c) * 1.1
  const box = inset(pageBox(c, m), 0, isTall(c) ? c.u * 12 : 0)
  stack(
    c,
    box,
    [
      T('“', { role: 'head', family: 'DM Serif Display', style: 'normal', size: 26, align: 'left', color: c.t.accentText, lineHeight: 0.8, upper: false, name: 'Quote mark' }),
      T(p.head, { role: 'head', size: headSize(c, p.head.length > 90 ? 6 : 7.5), lineHeight: 1.25, upper: false }),
      E(1, (x, y) => [rect(x, y, r(c.u * 10), r(c.u * 0.8), c.t.accent, { name: 'Rule' })]),
      T(p.foot, { role: 'label', size: 2.6, color: c.t.ink }),
      T(p.sub, { role: 'body', size: 2.6 })
    ],
    { valign: 'middle', gap: 3.4 }
  )
}

/** A sparkle-framed celebration layout for greetings. */
export const celebrate: PostLayout = (c, p) => {
  decorate(c, 1, c.t.deco === 'none' || c.t.deco === 'grid' ? 'confetti' : c.t.deco)
  const m = margin(c)
  const s = c.u * 9
  c.els.push(path(SPARKLE, [100, 100], r(c.W / 2 - s / 2), r(isTall(c) ? c.H * 0.16 : m), r(s), r(s), c.t.accentText, { name: 'Sparkle' }))
  const box = inset(pageBox(c, m), 0, (isTall(c) ? c.H * 0.16 : m) + s + c.u * 2 - m, 0, isTall(c) ? c.u * 10 : 0)
  stack(
    c,
    box,
    [
      T(p.script, { role: 'accent', size: 9, align: 'center', color: c.t.accentText }),
      headBlock(c, p, headSize(c, 12), 'center'),
      T(p.sub, { role: 'body', size: 3.6, align: 'center' }),
      ctaPill(c, p),
      footText(c, p)
    ],
    { valign: 'middle', align: 'center', gap: 3 }
  )
}

export const postLayouts = { centered, splitPhoto, card, photoTop, bigNumber, bordered, editorial, list, circlePhoto, band, photoGrid, coupon, iconHero, quoteMark, celebrate }
export type PostLayoutId = keyof typeof postLayouts
