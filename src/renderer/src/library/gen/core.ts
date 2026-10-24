import type { DesignElement, FontStyle, Page, TableElement, TextElement } from '@shared/model'
import { tableLayout, tableWordsFit } from '@renderer/render/layouts'
import { textAt } from '@renderer/editor/elementFactory'
import { ellipse, group, icon, page, rect, table } from '../templateKit'
import type { FontSpec, Theme } from './themes'

/**
 * A small layout engine for the generated template library. Layouts describe
 * boxes and stacks of blocks; text is measured with the real fonts and shrunk
 * until it fits its box, so a template never overflows whatever its size or
 * content. Every element it makes is an ordinary editable element.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface Ctx {
  W: number
  H: number
  /** One hundredth of the shorter page side: the unit every size is written in. */
  u: number
  t: Theme
  rand: () => number
  els: DesignElement[]
}

export function makeCtx(W: number, H: number, t: Theme, seed: string): Ctx {
  return { W, H, u: Math.min(W, H) / 100, t, rand: rng(seed), els: [] }
}

export function finish(c: Ctx, name = ''): Page {
  const p = page(c.t.bg, c.els, { name })
  if (c.t.bgGradient) p.backgroundGradient = c.t.bgGradient
  return p
}

/** Deterministic random numbers, so a template looks the same every time. */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export const inset = (b: Box, l: number, t = l, r = l, bo = t): Box => ({ x: b.x + l, y: b.y + t, w: b.w - l - r, h: b.h - t - bo })
export const pageBox = (c: Ctx, margin: number): Box => inset({ x: 0, y: 0, w: c.W, h: c.H }, margin)
export const r = (n: number) => Math.round(n * 10) / 10

// ------------------------------------------------------------ text

export type Role = 'head' | 'body' | 'label' | 'accent'

export interface TextSpec {
  role?: Role
  /** Font size in units (u). */
  size: number
  color?: string
  align?: TextElement['align']
  style?: FontStyle
  family?: string
  lineHeight?: number
  spacing?: number
  upper?: boolean
  name?: string
  /** Highlight colour behind the text. */
  background?: string
  /** Width of the text box as a share of the stack width (0..1). */
  widthShare?: number
}

const SCRIPT: FontSpec = { family: 'Dancing Script', style: 'bold', lineHeight: 1.15 }

let measureCtx: CanvasRenderingContext2D | null = null

function setFont(family: string, size: number, style: FontStyle): CanvasRenderingContext2D {
  measureCtx ??= document.createElement('canvas').getContext('2d')!
  const weight = style.includes('bold') ? '700' : '400'
  const italic = style.includes('italic') ? 'italic ' : ''
  measureCtx.font = `${italic}${weight} ${size}px "${family}"`
  return measureCtx
}

/** Width of the widest word, so a long word is never split across lines. */
function widestWord(text: string, family: string, size: number, style: FontStyle, spacing: number): number {
  const ctx = setFont(family, size, style)
  let max = 0
  for (const word of text.split(/\s+/)) if (word) max = Math.max(max, ctx.measureText(word).width + spacing * word.length)
  return max
}

/** Width of a text element's longest line as drawn. */
export function textWidth(el: TextElement): number {
  const ctx = setFont(el.fontFamily, el.fontSize, el.fontStyle)
  const shown = el.uppercase ? el.text.toUpperCase() : el.text
  return Math.max(...shown.split('\n').map((line) => ctx.measureText(line).width + el.letterSpacing * line.length))
}

function fontFor(c: Ctx, spec: TextSpec): { family: string; style: FontStyle; upper: boolean; spacing: number; lineHeight: number } {
  const role = spec.role ?? 'body'
  const f = role === 'head' ? c.t.head : role === 'accent' ? (c.t.accentFont ?? SCRIPT) : c.t.body
  const label = role === 'label'
  return {
    family: spec.family ?? f.family,
    style: spec.style ?? (label ? (c.t.body.boldOk === false ? 'normal' : 'bold') : f.style),
    upper: spec.upper ?? (label ? true : role === 'head' ? !!f.upper : false),
    spacing: spec.spacing ?? (label ? 0.18 : role === 'head' ? (f.spacing ?? 0) : 0),
    lineHeight: spec.lineHeight ?? (role === 'head' || role === 'accent' ? (f.lineHeight ?? 1.15) : role === 'label' ? 1.25 : 1.4)
  }
}

/** Builds a text element of the given width, shrinking the font until it fits within maxH (if given). */
export function textEl(c: Ctx, value: string, x: number, y: number, w: number, spec: TextSpec, maxH = Infinity, scale = 1): TextElement {
  const f = fontFor(c, spec)
  let size = Math.max(6, spec.size * c.u * scale)
  const color = spec.color ?? (spec.role === 'head' ? c.t.ink : spec.role === 'label' ? c.t.accentText : spec.role === 'accent' ? c.t.accentText : c.t.muted)
  let el: TextElement
  for (let i = 0; ; i++) {
    const shown = f.upper ? value.toUpperCase() : value
    const spacing = r(f.spacing * size)
    const fits = widestWord(shown, f.family, size, f.style, spacing) <= w
    el = textAt({
      text: value,
      x: r(x),
      y: r(y),
      width: r(w),
      fontSize: r(size),
      fontFamily: f.family,
      fontStyle: f.style,
      fill: color,
      align: spec.align ?? 'left',
      lineHeight: f.lineHeight,
      letterSpacing: spacing,
      ...(f.upper ? { uppercase: true } : {}),
      ...(spec.background ? { background: spec.background } : {}),
      ...(spec.name ? { name: spec.name } : {})
    })
    if ((fits && el.height <= maxH) || i > 40 || size < 7) break
    size *= 0.94
  }
  return el
}

/** Adds text to the page inside a box, vertically placed; returns the element. */
export function textIn(c: Ctx, value: string, b: Box, spec: TextSpec, valign: 'top' | 'middle' | 'bottom' = 'top'): TextElement {
  const el = textEl(c, value, b.x, b.y, b.w, spec, b.h)
  const dy = valign === 'middle' ? (b.h - el.height) / 2 : valign === 'bottom' ? b.h - el.height : 0
  el.y = r(b.y + Math.max(0, dy))
  c.els.push(el)
  return el
}

// ------------------------------------------------------------ stacks

/** A measured block, ready to be placed. */
export interface Made {
  w: number
  h: number
  place: (x: number, y: number) => DesignElement[]
}

/** Something a stack can lay out: measured at a scale for a given width. */
export interface Block {
  make: (c: Ctx, w: number, scale: number) => Made | null
  /** Gap after this block in units (overrides the stack gap). */
  gapAfter?: number
  /** Spaces are not followed by a gap. */
  space?: boolean
}

type TextBlockSpec = TextSpec & { gapAfter?: number }

/** A text block. Empty text is skipped. */
export const T = (value: string | undefined, spec: TextBlockSpec): Block => ({
  gapAfter: spec.gapAfter,
  make: (c, w, scale) => {
    if (!value || !value.trim()) return null
    const width = w * (spec.widthShare ?? 1)
    const el = textEl(c, value, 0, 0, width, spec, Infinity, scale)
    return {
      w: width,
      h: el.height,
      place: (x, y) => {
        el.x = r(x)
        el.y = r(y)
        return [el]
      }
    }
  }
})

export const S = (h: number): Block => ({ space: true, make: (c, _w, scale) => ({ w: 0, h: h * c.u * scale, place: () => [] }) })

/** Fixed elements of a given size in units (width defaults to the full stack width). */
export const E = (h: number, build: (x: number, y: number, w: number, h: number) => DesignElement[], w?: number, gapAfter?: number): Block => ({
  gapAfter,
  make: (c, sw, scale) => {
    const hh = h * c.u * Math.min(1, scale * 1.05)
    const ww = w ? Math.min(sw, w * c.u * Math.min(1, scale * 1.05)) : sw
    return { w: ww, h: hh, place: (x, y) => build(r(x), r(y), r(ww), r(hh)) }
  }
})

export interface PillOpts {
  fill: string
  stroke?: string
  /** Padding in units. */
  padX?: number
  padY?: number
  radius?: number
  gapAfter?: number
  name?: string
}

/** A label or button: text on a rounded fill that hugs the text. */
export const P = (value: string | undefined, spec: TextSpec, o: PillOpts): Block => ({
  gapAfter: o.gapAfter,
  make: (c, w, scale) => {
    if (!value || !value.trim()) return null
    const padX = (o.padX ?? 3.2) * c.u * scale
    const padY = (o.padY ?? 1.4) * c.u * scale
    const el = textEl(c, value, 0, 0, w - padX * 2, { ...spec, align: 'center' }, Infinity, scale)
    const tw = Math.min(w - padX * 2, textWidth(el) + el.fontSize * 0.15)
    el.width = r(tw)
    el.height = textAt({ ...el }).height
    const bw = tw + padX * 2
    const bh = el.height + padY * 2
    return {
      w: bw,
      h: bh,
      place: (x, y) => {
        const bg = rect(r(x), r(y), r(bw), r(bh), o.fill, {
          name: o.name ?? 'Button',
          cornerRadius: r(o.radius === undefined ? bh / 2 : o.radius * c.u),
          ...(o.stroke ? { stroke: o.stroke, strokeWidth: r(Math.max(2, c.u * 0.3)) } : {})
        })
        el.x = r(x + padX)
        el.y = r(y + padY)
        return group([bg, el])
      }
    }
  }
})

export type Badge = 'number' | 'check' | 'dot' | 'none' | { icon: string }

export interface RowsOpts {
  spec: TextSpec
  badge?: Badge
  badgeFill?: string
  badgeInk?: string
  /** Gap between rows in units. */
  gap?: number
  gapAfter?: number
  /** Two columns of rows. */
  columns?: 1 | 2
  /** A different icon for each row (overrides the badge). */
  icons?: string[]
}

/** A list of rows, each with a number, tick, dot or icon badge. */
export const R = (items: string[] | undefined, o: RowsOpts): Block => ({
  gapAfter: o.gapAfter,
  make: (c, w, scale) => {
    if (!items?.length) return null
    const badge: Badge = o.icons ? { icon: o.icons[0] } : (o.badge ?? 'number')
    const colsN = o.columns ?? 1
    const colGap = 4 * c.u
    const colW = (w - colGap * (colsN - 1)) / colsN
    const size = o.spec.size * c.u * scale
    const bs = badge === 'none' ? 0 : badge === 'dot' ? size * 0.45 : size * 1.75
    const bgap = badge === 'none' ? 0 : size * 0.8
    const rowGap = (o.gap ?? 2) * c.u * scale
    const made = items.map((item) => textEl(c, item, 0, 0, colW - bs - bgap, o.spec, Infinity, scale))
    const rowH = made.map((el) => Math.max(el.height, bs))
    const perCol = Math.ceil(items.length / colsN)
    const colHeights = Array.from({ length: colsN }, (_, k) => rowH.slice(k * perCol, (k + 1) * perCol).reduce((s, h) => s + h + rowGap, -rowGap))
    const h = Math.max(...colHeights)
    return {
      w,
      h,
      place: (x, y) => {
        const out: DesignElement[] = []
        made.forEach((el, i) => {
          const col = Math.floor(i / perCol)
          const before = rowH.slice(col * perCol, i).reduce((s, hh) => s + hh + rowGap, 0)
          const rx = x + col * (colW + colGap)
          const ry = y + before
          const mid = ry + rowH[i] / 2
          const fill = o.badgeFill ?? c.t.accent
          const ink = o.badgeInk ?? c.t.onAccent
          const parts: DesignElement[] = []
          if (badge === 'number' || badge === 'check') {
            parts.push(ellipse(r(rx), r(mid - bs / 2), r(bs), r(bs), fill, { name: 'Badge' }))
            if (badge === 'number') {
              const n = textAt({ text: String(i + 1), x: r(rx), y: 0, width: r(bs), fontSize: r(size * 0.85), fontFamily: c.t.body.family, fontStyle: c.t.body.boldOk === false ? 'normal' : 'bold', fill: ink, align: 'center', lineHeight: 1 })
              n.y = r(mid - n.height / 2)
              parts.push(n)
            } else parts.push(icon('check', r(rx + bs * 0.2), r(mid - bs * 0.3), r(bs * 0.6), ink, { strokeWidth: 3 }))
          } else if (badge === 'dot') parts.push(ellipse(r(rx), r(mid - bs / 2), r(bs), r(bs), fill, { name: 'Bullet' }))
          else if (typeof badge === 'object') parts.push(icon(o.icons?.[i] ?? badge.icon, r(rx), r(mid - bs / 2), r(bs), fill))
          el.x = r(rx + bs + bgap)
          el.y = r(mid - el.height / 2)
          out.push(...(parts.length ? group([...parts, el]) : [el]))
        })
        return out
      }
    }
  }
})

export interface TableOpts {
  size: number
  header?: boolean
  align?: 'left' | 'center' | 'right'
  headerFill?: string
  headerInk?: string
  fill?: string
  stripe?: string | null
  ink?: string
  border?: string
  gapAfter?: number
  name?: string
}

/** An editable table that fills the stack width. Font size in units. */
export const TB = (rowsData: string[][], o: TableOpts): Block => ({
  gapAfter: o.gapAfter,
  make: (c, w, scale) => {
    const el: TableElement = {
      ...table(rowsData, 0, 0, w, {}),
      name: o.name ?? 'Table',
      width: r(w),
      fontFamily: c.t.body.family,
      fontSize: r(Math.max(10, o.size * c.u * scale)),
      textColor: o.ink ?? c.t.surfaceInk,
      fill: o.fill ?? c.t.surface,
      headerRow: o.header ?? true,
      headerFill: o.headerFill ?? c.t.accent,
      headerTextColor: o.headerInk ?? c.t.onAccent,
      stripeFill: o.stripe === null ? undefined : (o.stripe ?? (c.t.dark ? undefined : c.t.soft2)),
      borderColor: o.border ?? (c.t.dark ? c.t.surfaceMuted : c.t.soft),
      borderWidth: 1,
      align: o.align ?? 'left'
    }
    if (el.stripeFill === undefined) delete el.stripeFill
    // Keep words whole: a narrow column caps the font size.
    while (el.fontSize > 10 && !tableWordsFit(el)) el.fontSize = Math.max(10, r(el.fontSize * 0.95))
    el.height = r(tableLayout(el).height)
    return {
      w,
      h: el.height,
      place: (x, y) => [{ ...el, x: r(x), y: r(y) }]
    }
  }
})

export interface StackOpts {
  valign?: 'top' | 'middle' | 'bottom'
  /** Horizontal placement of blocks narrower than the stack. */
  align?: 'left' | 'center' | 'right'
  /** Gap between blocks in units. */
  gap?: number
  /** Content shorter than this share of the box grows (up to maxGrow) to fill it. */
  fill?: number
  maxGrow?: number
}

/**
 * Lays blocks out top to bottom inside a box. If they do not fit, every text
 * size, gap and space shrinks together until they do. Returns the used box.
 */
export function stack(c: Ctx, b: Box, blocks: Block[], opts: StackOpts = {}): Box {
  const gap = (opts.gap ?? 3) * c.u
  const fill = opts.fill ?? 0.7
  const maxGrow = opts.maxGrow ?? 1.7
  const measure = (scale: number) => {
    const made = blocks.map((bl) => ({ bl, m: bl.make(c, b.w, scale) })).filter((x): x is { bl: Block; m: Made } => !!x.m)
    const gapAfter = (i: number) => (i < made.length - 1 && !made[i].bl.space ? (made[i].bl.gapAfter !== undefined ? made[i].bl.gapAfter! * c.u : gap) * scale : 0)
    const total = made.reduce((s, x, i) => s + x.m.h + gapAfter(i), 0)
    return { made, gapAfter, total }
  }
  let scale = 1
  let best = measure(scale)
  if (best.total <= b.h) {
    // Short content grows a little to use the space (stories, posters).
    while (scale < maxGrow && best.total < b.h * fill) {
      const next = measure(scale * 1.06)
      if (next.total > b.h * Math.max(fill, 0.8)) break
      scale *= 1.06
      best = next
    }
  } else {
    for (let attempt = 0; attempt < 40 && best.total > b.h && scale > 0.25; attempt++) {
      scale *= Math.max(0.7, Math.min(0.96, Math.sqrt(b.h / best.total)))
      best = measure(scale)
    }
  }
  const { made, gapAfter, total } = best
  let y = b.y + (opts.valign === 'middle' ? (b.h - total) / 2 : opts.valign === 'bottom' ? b.h - total : 0)
  y = Math.max(b.y, y)
  const top = y
  made.forEach((x, i) => {
    const align = opts.align ?? 'left'
    const px = b.x + (align === 'center' ? (b.w - x.m.w) / 2 : align === 'right' ? b.w - x.m.w : 0)
    c.els.push(...x.m.place(px, y))
    y += x.m.h + gapAfter(i)
  })
  return { x: b.x, y: top, w: b.w, h: y - top }
}

/** Splits a box into columns (weights) with a gap in units. */
export function cols(c: Ctx, b: Box, weights: number[], gap = 4): Box[] {
  const g = gap * c.u
  const total = weights.reduce((a, w) => a + w, 0)
  const free = b.w - g * (weights.length - 1)
  let x = b.x
  return weights.map((w) => {
    const box = { x, y: b.y, w: (free * w) / total, h: b.h }
    x += box.w + g
    return box
  })
}

export function rows(c: Ctx, b: Box, weights: number[], gap = 4): Box[] {
  const g = gap * c.u
  const total = weights.reduce((a, w) => a + w, 0)
  const free = b.h - g * (weights.length - 1)
  let y = b.y
  return weights.map((w) => {
    const box = { x: b.x, y, w: b.w, h: (free * w) / total }
    y += box.h + g
    return box
  })
}

export const isLandscape = (c: Ctx) => c.W / c.H > 1.25
export const isTall = (c: Ctx) => c.H / c.W > 1.5
export const pick = <T>(c: Ctx, list: readonly T[]): T => list[Math.floor(c.rand() * list.length) % list.length]
