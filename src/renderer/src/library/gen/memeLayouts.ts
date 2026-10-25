import type { TextElement } from '@shared/model'
import { chart, ellipse, icon, rect } from '../templateKit'
import { type Face, OUTLINE, artFor, backdrop, character, memeFor, picture, propBadge, scene, skinOf } from './memeArt'
import { type Box, type Ctx, E, P, S, T, cols, r, rows, stack, textEl, textIn, textWidth } from './core'
import type {
  AlignMeme,
  BrainMeme,
  ButtonsMeme,
  CaptionMeme,
  ChartMeme,
  ChoiceMeme,
  ClassicMeme,
  ComicMeme,
  LabelsMeme,
  NobodyMeme,
  PostMeme,
  SignMeme,
  StarterMeme,
  TierMeme,
  VennMeme,
  VersusMeme
} from './content/memes'

/**
 * Layouts for meme templates. The pictures are original cartoon reaction
 * characters picked from each meme's words (see memeArt.ts); people can
 * delete them and add their own photo. Every caption stays editable text.
 * Classic memes use white outlined capitals so the words read on any picture.
 */

const INK = '#111111'
const WHITE = '#ffffff'

/** Meme pages keep the classic black or white look whatever the colour style. */
function background(c: Ctx, color: string): void {
  c.t = { ...c.t, bg: color, bgGradient: undefined }
}

/** White capitals with a black outline, the classic meme lettering. */
function memeText(c: Ctx, value: string, b: Box, size: number, valign: 'top' | 'middle' | 'bottom' = 'top'): TextElement {
  const el = textIn(c, value, b, { role: 'head', family: 'Anton', style: 'normal', upper: true, size, color: WHITE, align: 'center', lineHeight: 1.08, spacing: 0.01, name: 'Meme text' }, valign)
  el.strokeColor = '#000000'
  el.strokeWidth = r(Math.max(2, el.fontSize * 0.075))
  return el
}

/** Plain caption text, like a modern meme caption. */
function plain(c: Ctx, value: string, b: Box, size: number, o: { bold?: boolean; color?: string; align?: TextElement['align']; valign?: 'top' | 'middle' | 'bottom'; name?: string } = {}): TextElement {
  return textIn(c, value, b, { role: 'body', family: 'Inter', style: o.bold ? 'bold' : 'normal', size, color: o.color ?? INK, align: o.align ?? 'left', lineHeight: 1.3, name: o.name ?? 'Caption' }, o.valign ?? 'top')
}

/** A caption at the top of a white page and a photo filling the rest. Returns the photo box. */
function captionTop(c: Ctx, caption: string, maxShare = 0.34, size = 5.4): Box {
  const m = c.u * 5
  const el = textEl(c, caption, m, m, c.W - m * 2, { role: 'body', family: 'Inter', style: 'normal', size, color: INK, align: 'left', lineHeight: 1.3, name: 'Caption' }, c.H * maxShare)
  el.y = r(m)
  c.els.push(el)
  const top = r(m + el.height + m * 0.8)
  return { x: 0, y: top, w: c.W, h: c.H - top }
}

/**
 * A centred title with a small reaction character on each side. Returns the
 * title so the layout can continue below it.
 */
function flankedTitle(c: Ctx, value: string, b: Box, faces: [Face, Face], about: string, spec: Parameters<typeof textIn>[3]): TextElement {
  const s = Math.min(b.h, c.u * 15)
  const gap = c.u * 2
  const title = textIn(c, value, { x: b.x + s + gap, y: b.y, w: b.w - (s + gap) * 2, h: b.h }, spec, 'middle')
  const cy = title.y + title.height / 2 - s / 2
  faces.forEach((face, i) => c.els.push(...character(i ? b.x + b.w - s : b.x, cy, s, artFor(value, about, { face }), { mini: true, prop: false })))
  return title
}

// ---------------------------------------------------------------- layouts

const classic = (c: Ctx, p: ClassicMeme) => {
  background(c, INK)
  const art = artFor(p.bottom, `${p.top} ${p.topic}`, { propFrom: `${p.top} ${p.bottom}` })
  c.els.push(...scene({ x: 0, y: 0, w: c.W, h: c.H }, art, { size: 0.5, meme: { id: memeFor(art, `${p.top} ${p.bottom}`) } }))
  const m = c.u * 3.5
  const h = c.H * 0.27
  memeText(c, p.top, { x: m, y: m, w: c.W - m * 2, h }, 10, 'top')
  memeText(c, p.bottom, { x: m, y: c.H - m - h, w: c.W - m * 2, h }, 10, 'bottom')
}

const caption = (c: Ctx, p: CaptionMeme) => {
  background(c, WHITE)
  const b = captionTop(c, p.caption)
  const art = artFor(p.caption, p.topic)
  c.els.push(...scene(b, art, { meme: { id: memeFor(art, p.caption) } }))
}

const choice = (c: Ctx, p: ChoiceMeme) => {
  background(c, WHITE)
  const [top, bottom] = rows(c, { x: 0, y: 0, w: c.W, h: c.H }, [1, 1], 0)
  const pad = c.u * 5
  ;[
    { box: top, text: p.no, icon: 'thumbs-down', fill: '#d93a3f', face: 'nope' as Face },
    { box: bottom, text: p.yes, icon: 'thumbs-up', fill: '#1f8f5a', face: 'cool' as Face }
  ].forEach((row, i) => {
    const half = row.box.w / 2
    c.els.push(...scene({ x: row.box.x, y: row.box.y, w: half, h: row.box.h }, artFor(row.text, p.topic, { face: row.face }), { size: 0.7, name: i === 0 ? 'Picture: no' : 'Picture: yes', meme: { id: 'drake', region: i === 0 ? [0, 0, 0.5, 0.5] : [0, 0.5, 0.5, 1] } }))
    const d = c.u * 11
    const bx = c.u * 2.5
    const by = row.box.y + c.u * 2.5
    c.els.push(ellipse(r(bx), r(by), r(d), r(d), row.fill, { name: 'Badge', stroke: WHITE, strokeWidth: r(c.u * 0.6) }))
    c.els.push(icon(row.icon, r(bx + d * 0.22), r(by + d * 0.22), r(d * 0.56), WHITE, { strokeWidth: 2.5 }))
    plain(c, row.text, { x: half + pad, y: row.box.y + pad, w: half - pad * 2, h: row.box.h - pad * 2 }, 6.4, { bold: true, align: 'center', valign: 'middle' })
  })
  c.els.push(rect(0, r(c.H / 2 - c.u * 0.3), c.W, r(c.u * 0.6), INK, { name: 'Divider' }))
}

const BRAIN_FACES: Face[] = ['meh', 'smug', 'cool', 'party']
const BRAIN_GLOW = ['', '#ffd23f', '#ff8a3d', '#b14dff']

const brain = (c: Ctx, p: BrainMeme) => {
  background(c, WHITE)
  const parts = rows(c, { x: 0, y: 0, w: c.W, h: c.H }, [1, 1, 1, 1], 0)
  const pad = c.u * 4
  parts.forEach((b, i) => {
    const half = b.w * 0.5
    plain(c, p.steps[i], { x: b.x + pad, y: b.y + pad, w: half - pad * 2, h: b.h - pad * 2 }, 5.6, { bold: i === 3, valign: 'middle', name: `Level ${i + 1}` })
    const pic = { x: b.x + half, y: b.y, w: half, h: b.h }
    c.els.push(...scene(pic, { face: BRAIN_FACES[i], who: 'blob', prop: 'brain' }, { size: 0.86, name: `Picture level ${i + 1}`, meme: { id: 'gb', region: [0.5, i / 4, 1, (i + 1) / 4] } }))
    if (i) {
      const glow = i * c.u * 0.8
      c.els.push(rect(r(pic.x + glow / 2), r(pic.y + glow / 2), r(pic.w - glow), r(pic.h - glow), 'transparent', { name: 'Glow', stroke: BRAIN_GLOW[i], strokeWidth: r(glow) }))
      c.els.push(rect(0, r(b.y - c.u * 0.2), c.W, r(c.u * 0.4), INK, { name: 'Divider' }))
    }
  })
}

const nobody = (c: Ctx, p: NobodyMeme) => {
  background(c, WHITE)
  const m = c.u * 5
  const used = stack(
    c,
    { x: m, y: m, w: c.W - m * 2, h: c.H * 0.42 },
    [T(p.setup, { role: 'body', family: 'Inter', style: 'bold', size: 5.4, color: INK, name: 'Setup' }), S(2), T(p.me, { role: 'body', family: 'Inter', style: 'normal', size: 5.4, color: INK, lineHeight: 1.3, name: 'Me' })],
    { gap: 0, fill: 0 }
  )
  const top = r(used.y + used.h + m * 0.8)
  const art = artFor(p.me, p.topic)
  c.els.push(...scene({ x: 0, y: top, w: c.W, h: c.H - top }, art, { meme: { id: memeFor(art, p.me) } }))
}

const post = (c: Ctx, p: PostMeme) => {
  background(c, c.t.dark ? '#e9ecf2' : c.t.soft2)
  const m = c.u * 6
  const pad = c.u * 5
  const cardW = c.W - m * 2
  const inner = cardW - pad * 2
  const avatar = c.u * 12
  const nameEl = textEl(c, p.name, 0, 0, inner - avatar - c.u * 10, { role: 'body', family: 'Inter', style: 'bold', size: 4.4, color: '#0f1419', name: 'Name' })
  const handleEl = textEl(c, p.handle, 0, 0, inner - avatar - c.u * 4, { role: 'body', family: 'Inter', style: 'normal', size: 3.6, color: '#536471', name: 'Handle' })
  const body = textEl(c, p.text, 0, 0, inner, { role: 'body', family: 'Inter', style: 'normal', size: 6, color: '#0f1419', lineHeight: 1.32, name: 'Post text' }, c.H * 0.46)
  const footH = c.u * 5
  const gap = c.u * 4
  const cardH = pad + avatar + gap + body.height + gap + footH + pad
  const x = m
  const y = Math.max(m, (c.H - cardH) / 2)
  c.els.push(rect(r(x), r(y), r(cardW), r(cardH), WHITE, { name: 'Post card', cornerRadius: r(c.u * 3), stroke: '#dfe3e8', strokeWidth: r(Math.max(2, c.u * 0.25)) }))
  const face = artFor(p.text, p.topic)
  c.els.push(ellipse(r(x + pad), r(y + pad), r(avatar), r(avatar), '#e8ebf2', { name: 'Profile picture' }))
  c.els.push(...character(x + pad + avatar * 0.06, y + pad + avatar * 0.02, avatar * 0.88, face, { mini: true, prop: false }))
  const tx = x + pad + avatar + c.u * 3
  nameEl.x = r(tx)
  nameEl.y = r(y + pad + avatar / 2 - (nameEl.height + handleEl.height) / 2)
  nameEl.width = r(Math.min(nameEl.width, textWidth(nameEl) + nameEl.fontSize * 0.2))
  handleEl.x = r(tx)
  handleEl.y = r(nameEl.y + nameEl.height)
  c.els.push(nameEl, handleEl)
  const tick = c.u * 4
  c.els.push(icon('badge-check', r(nameEl.x + nameEl.width + c.u * 1.2), r(nameEl.y + (nameEl.height - tick) / 2), r(tick), '#1d9bf0'))
  body.x = r(x + pad)
  body.y = r(y + pad + avatar + gap)
  c.els.push(body)
  const fy = y + pad + avatar + gap + body.height + gap
  const stats: [string, string][] = [
    ['message-circle', '128'],
    ['repeat-2', '2.4K'],
    ['heart', '18K'],
    ['share', 'Share']
  ]
  const slot = inner / stats.length
  stats.forEach(([name, count], i) => {
    const sx = x + pad + slot * i
    const is = c.u * 4
    c.els.push(icon(name, r(sx), r(fy + (footH - is) / 2), r(is), '#536471'))
    const t = textEl(c, count, 0, 0, slot - is - c.u * 2, { role: 'body', family: 'Inter', style: 'normal', size: 3.2, color: '#536471', name: 'Count' })
    t.x = r(sx + is + c.u * 1.5)
    t.y = r(fy + (footH - t.height) / 2)
    c.els.push(t)
  })
}

const versus = (c: Ctx, p: VersusMeme) => {
  const m = c.u * 6
  const parts = cols(c, { x: m, y: m, w: c.W - m * 2, h: c.H - m * 2 }, [1, 1], 4)
  const photoH = parts[0].h / c.u - 26
  // The two sides must feel different: if the words pick the same face, the second side gets the sad one.
  const arts = [artFor(p.a, p.topic, { fallback: 'happy' }), artFor(p.b, p.topic, { fallback: 'cry' })]
  if (arts[0].face === arts[1].face) arts[1] = { ...arts[1], face: arts[0].face === 'cry' ? 'shock' : 'cry' }
  ;[
    [p.la, p.a],
    [p.lb, p.b]
  ].forEach(([label, text], i) => {
    stack(
      c,
      parts[i],
      [
        P(label, { role: 'head', size: 4.6, color: c.t.onAccent }, { fill: c.t.accent, padX: 3, padY: 1.2, name: 'Label', radius: 1.5 }),
        E(photoH, (x, y, w, h) => scene({ x, y, w, h }, arts[i], { radius: c.u * 2, size: 0.8, name: `Picture ${i + 1}`, meme: { id: memeFor(arts[i], text) } })),
        T(text, { role: 'body', size: 4, align: 'center', color: c.t.ink, style: c.t.body.boldOk === false ? 'normal' : 'bold', name: 'Caption' })
      ],
      { align: 'center', gap: 2.5, valign: 'middle', fill: 0 }
    )
  })
}

const labels = (c: Ctx, p: LabelsMeme) => {
  let area: Box = { x: 0, y: 0, w: c.W, h: c.H }
  if (p.caption) {
    background(c, WHITE)
    area = captionTop(c, p.caption, 0.2)
  } else background(c, INK)
  const w = area.w * 0.29
  const h = area.h * 0.18
  // Laid out like the distracted-boyfriend photo: the new thing on the left, "me" in the middle, the old thing on the right.
  const spots: Box[] = [
    { x: area.x + area.w * 0.355, y: area.y + area.h * 0.05, w, h },
    { x: area.x + c.u * 3, y: area.y + area.h * 0.58, w, h },
    { x: area.x + area.w - c.u * 3 - w, y: area.y + area.h * 0.58, w, h }
  ]
  const who = artFor(p.labels[0], p.topic, { face: 'love' })
  const cs = Math.min(area.w * 0.36, area.h * 0.5)
  const d = Math.min(area.w * 0.2, area.h * 0.24)
  const a = artFor(p.labels[1], '', { propFrom: p.labels[1] })
  const b = artFor(p.labels[2], '', { propFrom: p.labels[2] })
  c.els.push(
    ...picture(
      [
        ...backdrop(area, 'love'),
        ...character(area.x + (area.w - cs) / 2, spots[0].y + h + c.u, cs, who, { prop: false }),
        ...propBadge(spots[1].x + (w - d) / 2, spots[1].y - d - c.u * 2, d, a.prop ?? 'sparkles', 'love'),
        ...propBadge(spots[2].x + (w - d) / 2, spots[2].y - d - c.u * 2, d, b.prop === a.prop ? 'list-checks' : (b.prop ?? 'sparkles'), 'cry')
      ],
      { id: 'db' }
    )
  )
  p.labels.forEach((label, i) => memeText(c, label, spots[i], 6.2, 'middle'))
}

const starter = (c: Ctx, p: StarterMeme) => {
  background(c, WHITE)
  const m = c.u * 4
  const title = plain(c, p.head, { x: m, y: m, w: c.W - m * 2, h: c.u * 14 }, 7, { bold: true, align: 'center', valign: 'middle', name: 'Title' })
  const top = title.y + title.height + c.u * 3
  const grid = rows(c, { x: m, y: top, w: c.W - m * 2, h: c.H - top - m }, [1, 1], 3)
  grid.forEach((row, ri) => {
    cols(c, row, [1, 1, 1], 3).forEach((cell, ci) => {
      const item = p.items[ri * 3 + ci]
      if (!item) return
      const labelH = c.u * 9
      const pic = { x: cell.x, y: cell.y, w: cell.w, h: cell.h - labelH - c.u }
      const art = artFor(item, `${p.head} ${p.topic}`)
      if (art.prop && art.prop !== 'sparkles' && (ri * 3 + ci) % 2 === 0) {
        c.els.push(rect(r(pic.x), r(pic.y), r(pic.w), r(pic.h), '#f1f2f6', { name: 'Picture background', cornerRadius: r(c.u * 1.2) }))
        const d = Math.min(pic.w, pic.h) * 0.78
        c.els.push(...propBadge(pic.x + (pic.w - d) / 2, pic.y + (pic.h - d) / 2, d, art.prop, art.face))
      } else c.els.push(...scene(pic, art, { radius: c.u * 1.2, size: 0.9, mini: true, prop: art.prop !== 'sparkles' }))
      plain(c, item, { x: cell.x, y: cell.y + cell.h - labelH, w: cell.w, h: labelH }, 3.4, { bold: true, align: 'center', name: 'Item' })
    })
  })
}

const TIER_COLORS = ['#ff7f7f', '#ffbf7f', '#ffdf7f', '#bfff7f', '#7fbfff']

const tier = (c: Ctx, p: TierMeme) => {
  background(c, '#1b1d24')
  const m = c.u * 5
  const title = flankedTitle(c, p.head, { x: m, y: m, w: c.W - m * 2, h: c.u * 14 }, ['love', 'dead'], p.topic, { role: 'head', family: 'Anton', style: 'normal', upper: true, size: 8, color: WHITE, align: 'center', lineHeight: 1.05, name: 'Title' })
  const top = title.y + title.height + c.u * 4
  const list = rows(c, { x: m, y: top, w: c.W - m * 2, h: c.H - top - m }, p.rows.map(() => 1), 1.4)
  list.forEach((b, i) => {
    const [letter, text] = p.rows[i]
    const sq = Math.min(b.h, c.u * 24)
    c.els.push(rect(r(b.x), r(b.y), r(sq), r(b.h), TIER_COLORS[i % TIER_COLORS.length], { name: `Tier ${letter}`, cornerRadius: r(c.u * 1) }))
    textIn(c, letter, { x: b.x, y: b.y, w: sq, h: b.h }, { role: 'head', family: 'Anton', style: 'normal', size: 9, color: '#1b1d24', align: 'center', lineHeight: 1, name: `Tier ${letter} letter` }, 'middle')
    c.els.push(rect(r(b.x + sq + c.u), r(b.y), r(b.w - sq - c.u), r(b.h), '#2c2f3a', { name: 'Tier row', cornerRadius: r(c.u * 1) }))
    plain(c, text, { x: b.x + sq + c.u * 4, y: b.y + c.u, w: b.w - sq - c.u * 7, h: b.h - c.u * 2 }, 4.4, { color: WHITE, valign: 'middle', name: `Tier ${letter} items` })
  })
}

const ALIGN_FACES: Face[] = ['happy', 'love', 'party', 'meh', 'side', 'think', 'smug', 'angry', 'laugh']

const align = (c: Ctx, p: AlignMeme) => {
  background(c, WHITE)
  const m = c.u * 4
  const title = plain(c, p.head, { x: m, y: m, w: c.W - m * 2, h: c.u * 11 }, 6, { bold: true, align: 'center', valign: 'middle', name: 'Title' })
  const top = title.y + title.height + c.u * 2.5
  const grid = rows(c, { x: m, y: top, w: c.W - m * 2, h: c.H - top - m }, [1, 1, 1], 1.5)
  grid.forEach((row, ri) =>
    cols(c, row, [1, 1, 1], 1.5).forEach((cell, ci) => {
      const k = ri * 3 + ci
      const pets = /pet/.test(p.head.toLowerCase())
      const art = { ...artFor(p.head, p.topic, { face: ALIGN_FACES[k] }), ...(pets ? { who: k % 2 ? ('dog' as const) : ('cat' as const) } : {}) }
      c.els.push(...scene({ x: cell.x, y: cell.y, w: cell.w, h: cell.h - c.u * 6 }, art, { size: 0.92, cy: 0.52, mini: true, rays: false }))
      const barH = c.u * 7
      c.els.push(rect(r(cell.x), r(cell.y + cell.h - barH), r(cell.w), r(barH), INK, { name: 'Label bar' }))
      plain(c, p.cells[ri * 3 + ci], { x: cell.x + c.u, y: cell.y + cell.h - barH, w: cell.w - c.u * 2, h: barH }, 3.1, { bold: true, color: WHITE, align: 'center', valign: 'middle', name: 'Label' })
    })
  )
}

const sign = (c: Ctx, p: SignMeme) => {
  background(c, INK)
  const art = artFor(p.sign, p.topic, { face: 'smug' })
  const pic = scene({ x: 0, y: 0, w: c.W, h: c.H }, art, { size: 0.56, cy: 0.38, prop: false, meme: { id: 'cmm' } })
  c.els.push(...pic)
  const w = c.W * 0.72
  const h = c.H * 0.27
  const x = (c.W - w) / 2
  const y = c.H - h - c.u * 7
  c.els.push(rect(r(x), r(y), r(w), r(h), WHITE, { name: 'Sign', cornerRadius: r(c.u * 1), stroke: '#2a2d37', strokeWidth: r(c.u * 0.6) }))
  const hand = c.u * 7
  // The hands belong to the drawn picture, so they go with it if it is swapped for a photo.
  for (const hx of [x + w * 0.16, x + w * 0.84 - hand]) c.els.push(ellipse(r(hx), r(y - hand * 0.45), r(hand), r(hand), skinOf(art.who), { name: 'Hand', stroke: OUTLINE, strokeWidth: r(c.u * 0.4), groupId: pic[0].groupId }))
  plain(c, p.sign, { x: x + c.u * 4, y: y + c.u * 3, w: w - c.u * 8, h: h - c.u * 6 }, 5.6, { bold: true, align: 'center', valign: 'middle', name: 'Sign text' })
}

const buttons = (c: Ctx, p: ButtonsMeme) => {
  background(c, INK)
  const panelH = c.H * 0.46
  c.els.push(rect(0, 0, c.W, r(panelH), '#e9ecf2', { name: 'Panel' }))
  const bh = c.u * 20
  const m = c.u * 7
  const pair = cols(c, { x: m, y: (panelH - bh) / 2, w: c.W - m * 2, h: bh }, [1, 1], 6)
  ;[p.a, p.b].forEach((label, i) => {
    const b = pair[i]
    c.els.push(rect(r(b.x), r(b.y), r(b.w), r(b.h), '#d93a3f', { name: 'Button', cornerRadius: r(c.u * 3), stroke: '#8f1d21', strokeWidth: r(c.u * 0.6) }))
    plain(c, label, { x: b.x + c.u * 3, y: b.y + c.u * 2, w: b.w - c.u * 6, h: b.h - c.u * 4 }, 4.8, { bold: true, color: WHITE, align: 'center', valign: 'middle', name: 'Button text' })
  })
  c.els.push(...scene({ x: 0, y: panelH, w: c.W, h: c.H - panelH }, artFor(p.caption, `${p.a} ${p.b} ${p.topic}`, { face: 'nervous' }), { size: 0.66, cy: 0.42, meme: { id: 'ds', region: [0, 0.5, 1, 1] } }))
  const cm = c.u * 3.5
  memeText(c, p.caption, { x: cm, y: c.H - cm - c.H * 0.16, w: c.W - cm * 2, h: c.H * 0.16 }, 8, 'bottom')
}

const funnyChart = (c: Ctx, p: ChartMeme) => {
  const m = c.u * 7
  const round = p.chart === 'pie' || p.chart === 'donut'
  const title = flankedTitle(c, p.head, { x: m * 0.7, y: m * 0.8, w: c.W - m * 1.4, h: c.u * 16 }, ['shock', 'laugh'], p.topic, { role: 'head', size: 7, align: 'center', name: 'Title' })
  const top = title.y + title.height + c.u * 3
  const box = { x: m, y: top, w: c.W - m * 2, h: c.H - top - m }
  const chartH = Math.min(box.h * 0.8, box.w * (round ? 0.8 : 0.66)) / c.u
  stack(
    c,
    box,
    [
      E(chartH, (x, y, w, h) => [
        chart(p.chart, x, y, w, h, {
          name: 'Chart',
          labels: p.labels,
          series: [{ name: 'Amount', color: c.t.accent, values: p.values }],
          fontFamily: c.t.body.family,
          textColor: c.t.ink,
          showValues: round,
          showLegend: round,
          showGrid: !round
        })
      ]),
      T(p.note, { role: 'body', size: 3.8, align: 'center', name: 'Note' })
    ],
    { valign: 'middle', align: 'center', gap: 3, fill: 0 }
  )
}

const venn = (c: Ctx, p: VennMeme) => {
  const m = c.u * 6
  const title = flankedTitle(c, p.head, { x: m, y: m, w: c.W - m * 2, h: c.u * 14 }, ['think', 'love'], p.topic, { role: 'head', size: 7, align: 'center', name: 'Title' })
  const top = title.y + title.height + c.u * 3
  const area = { x: m, y: top, w: c.W - m * 2, h: c.H - top - m }
  const d = Math.min(area.w * 0.64, area.h)
  const cx = area.x + area.w / 2
  const cy = area.y + area.h / 2
  const shift = d * 0.3
  c.els.push(ellipse(r(cx - shift - d / 2), r(cy - d / 2), r(d), r(d), c.t.soft, { name: 'Circle A', opacity: 0.9 }))
  c.els.push(ellipse(r(cx + shift - d / 2), r(cy - d / 2), r(d), r(d), c.t.soft2, { name: 'Circle B', opacity: 0.7 }))
  const label = { role: 'body' as const, size: 4, align: 'center' as const, color: c.t.ink, style: c.t.body.boldOk === false ? ('normal' as const) : ('bold' as const), lineHeight: 1.2 }
  const sideW = d / 2 - shift - c.u * 2
  const textH = d * 0.42
  textIn(c, p.a, { x: cx - shift - d / 2 + c.u * 3, y: cy - textH / 2, w: sideW + d * 0.14 - c.u * 3, h: textH }, { ...label, name: 'Left' }, 'middle')
  textIn(c, p.mid, { x: cx - (d - shift * 2) / 2 + c.u, y: cy - textH / 2, w: d - shift * 2 - c.u * 2, h: textH }, { ...label, name: 'Middle' }, 'middle')
  textIn(c, p.b, { x: cx + shift + (d / 2 - sideW - d * 0.14), y: cy - textH / 2, w: sideW + d * 0.14 - c.u * 3, h: textH }, { ...label, name: 'Right' }, 'middle')
}

const COMIC_FACES: Face[] = ['happy', 'think', 'nervous', 'shock']

const comic = (c: Ctx, p: ComicMeme) => {
  background(c, INK)
  const g = c.u * 1.5
  const grid = rows(c, { x: g, y: g, w: c.W - g * 2, h: c.H - g * 2 }, [1, 1], 1.5)
  grid.forEach((row, ri) =>
    cols(c, row, [1, 1], 1.5).forEach((cell, ci) => {
      const k = ri * 2 + ci
      const capH = c.u * 13
      const art = artFor(p.panels[k], p.topic, { fallback: COMIC_FACES[k] })
      c.els.push(rect(r(cell.x), r(cell.y), r(cell.w), r(capH), WHITE, { name: 'Caption box' }))
      plain(c, p.panels[k], { x: cell.x + c.u * 2.5, y: cell.y + c.u * 1.5, w: cell.w - c.u * 5, h: capH - c.u * 3 }, 3.6, { bold: true, align: 'center', valign: 'middle', name: `Panel ${k + 1} text` })
      c.els.push(...scene({ x: cell.x, y: cell.y + capH, w: cell.w, h: cell.h - capH }, art, { size: 0.8, name: `Panel ${k + 1} picture`, meme: { id: memeFor(art, p.panels[k]) } }))
    })
  )
}

export const memeLayouts = { classic, caption, choice, brain, nobody, post, versus, labels, starter, tier, align, sign, buttons, chart: funnyChart, venn, comic }
export type MemeLayoutId = keyof typeof memeLayouts
