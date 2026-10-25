import type { DesignElement, ShapeElement } from '@shared/model'
import { ellipse, group, icon, linear, path, radial, rect } from '../templateKit'
import { type Box, hash, r } from './core'

/**
 * Original cartoon reaction characters for the meme templates, drawn from
 * plain shapes so every part stays editable. A character is a face (the
 * reaction), a body type (round face, cat or dog) and a prop icon that says
 * what the meme is about. Picks are made from the meme's own words.
 */

export type Face = 'nope' | 'laugh' | 'happy' | 'party' | 'love' | 'shock' | 'nervous' | 'cry' | 'sleepy' | 'angry' | 'smug' | 'side' | 'think' | 'cool' | 'dead' | 'meh'
export type Who = 'blob' | 'cat' | 'dog'

export interface Art {
  face: Face
  who: Who
  prop?: string
}

type Eyes = 'open' | 'big' | 'small' | 'happy' | 'sad' | 'sleep' | 'lids' | 'heart' | 'shades' | 'x' | 'flat' | 'squeeze'
type Mouth = 'grin' | 'laugh' | 'smile' | 'o' | 'flat' | 'frown' | 'wobble' | 'smirk' | 'grimace' | 'tongue' | 'wavy'
type Fx = 'tears' | 'streams' | 'sweat' | 'blush' | 'zzz' | 'question' | 'hat' | 'vein' | 'lines' | 'hearts' | 'sparkle'
type Mood = 'sunny' | 'pink' | 'alarm' | 'blue' | 'night' | 'red' | 'purple' | 'mint' | 'cyan' | 'grey'

interface FaceSpec {
  eyes: Eyes
  /** Where the pupils look, in character units. */
  look?: [number, number]
  brows?: string
  mouth: Mouth
  fx: Fx[]
  mood: Mood
}

const BROWS = {
  raised: 'M28 36 Q36 29 45 34 M55 34 Q64 29 72 36',
  angry: 'M28 36 L45 43 M72 36 L55 43',
  worried: 'M29 42 L44 36 M71 42 L56 36',
  skeptic: 'M29 40 L45 40 M55 36 Q63 29 72 34',
  flat: 'M29 39 L45 39 M55 39 L71 39'
}

const FACES: Record<Face, FaceSpec> = {
  nope: { eyes: 'squeeze', brows: BROWS.angry, mouth: 'frown', fx: [], mood: 'red' },
  laugh: { eyes: 'squeeze', mouth: 'laugh', fx: ['tears', 'blush'], mood: 'sunny' },
  happy: { eyes: 'happy', mouth: 'grin', fx: ['blush', 'sparkle'], mood: 'sunny' },
  party: { eyes: 'happy', mouth: 'grin', fx: ['hat', 'blush'], mood: 'sunny' },
  love: { eyes: 'heart', mouth: 'grin', fx: ['blush', 'hearts'], mood: 'pink' },
  shock: { eyes: 'big', brows: BROWS.raised, mouth: 'o', fx: ['lines'], mood: 'alarm' },
  nervous: { eyes: 'small', brows: BROWS.worried, mouth: 'grimace', fx: ['sweat'], mood: 'alarm' },
  cry: { eyes: 'sad', brows: BROWS.worried, mouth: 'wobble', fx: ['streams'], mood: 'blue' },
  sleepy: { eyes: 'sleep', mouth: 'o', fx: ['zzz'], mood: 'night' },
  angry: { eyes: 'open', look: [0, 1], brows: BROWS.angry, mouth: 'grimace', fx: ['vein'], mood: 'red' },
  smug: { eyes: 'lids', look: [3, 0], brows: BROWS.skeptic, mouth: 'smirk', fx: [], mood: 'purple' },
  side: { eyes: 'open', look: [3.6, 0.5], brows: BROWS.flat, mouth: 'flat', fx: [], mood: 'purple' },
  think: { eyes: 'open', look: [-2.4, -3], brows: BROWS.skeptic, mouth: 'wavy', fx: ['question'], mood: 'mint' },
  cool: { eyes: 'shades', mouth: 'smirk', fx: ['sparkle'], mood: 'cyan' },
  dead: { eyes: 'x', mouth: 'tongue', fx: [], mood: 'grey' },
  meh: { eyes: 'flat', mouth: 'flat', fx: [], mood: 'grey' }
}

const MOODS: Record<Mood, { bg: [string, string]; rays: string; raysOpacity: number; ink: string }> = {
  sunny: { bg: ['#fff6c9', '#ffcf7a'], rays: '#ffffff', raysOpacity: 0.5, ink: '#e0650b' },
  pink: { bg: ['#ffe6f1', '#ffaccb'], rays: '#ffffff', raysOpacity: 0.45, ink: '#e0245e' },
  alarm: { bg: ['#fff1de', '#ff9a78'], rays: '#ffffff', raysOpacity: 0.45, ink: '#e5482d' },
  blue: { bg: ['#e4efff', '#9fc0ff'], rays: '#ffffff', raysOpacity: 0.35, ink: '#2f6fe0' },
  night: { bg: ['#3d4b8f', '#161c3a'], rays: '#ffffff', raysOpacity: 0.07, ink: '#5b5fd9' },
  red: { bg: ['#ffd9cf', '#ff6f5c'], rays: '#ffffff', raysOpacity: 0.35, ink: '#c8291a' },
  purple: { bg: ['#f0eaff', '#bca8ff'], rays: '#ffffff', raysOpacity: 0.45, ink: '#6a3ee8' },
  mint: { bg: ['#e2fbf2', '#9be6c8'], rays: '#ffffff', raysOpacity: 0.45, ink: '#0f9d6e' },
  cyan: { bg: ['#e2f7ff', '#83d1ff'], rays: '#ffffff', raysOpacity: 0.45, ink: '#0b7fc2' },
  grey: { bg: ['#f1f2f6', '#c4c9d4'], rays: '#ffffff', raysOpacity: 0.45, ink: '#4a5160' }
}

const SKIN: Record<Who, [string, string, string]> = {
  blob: ['#ffe680', '#ffc229', '#f29d00'],
  cat: ['#ffc583', '#f69a3c', '#d9741c'],
  dog: ['#f0c897', '#d79a5c', '#b57438']
}

const LINE = '#3b2614'
const TEAR = '#5ec2ff'
const BLUSH = '#ff7a9c'

// ------------------------------------------------------------ picking art from words

const PROPS: [RegExp, string][] = [
  [/spider/, 'bug'],
  [/\bbug|error|framework|variable|print on every/, 'bug'],
  [/code|compil|program|developer|dark mode|it works/, 'laptop'],
  [/alarm|wake|snooze/, 'alarm-clock'],
  [/sleep|nap|\bbed\b|bed at|night|2 am|3 am|midnight|tired|resting my eyes|blanket/, 'moon'],
  [/coffee|\btea\b|latte|mug|caffeine/, 'coffee'],
  [/pizza/, 'pizza'],
  [/salad|diet|healthy/, 'salad'],
  [/fridge|leftover/, 'refrigerator'],
  [/snack|chips|cookie/, 'cookie'],
  [/pineapple/, 'citrus'],
  [/cereal|breakfast/, 'egg'],
  [/food|cook|recipe|toast|dinner|lunch|meal|eat/, 'utensils'],
  [/payday|salary|money|bank|wallet|budget|rent|broke|receipt/, 'wallet'],
  [/cart|shop|sale|buy|order|arrived|sweater/, 'shopping-cart'],
  [/delivery|package/, 'package'],
  [/1 percent|1%|100%|battery|charger/, 'battery-low'],
  [/wifi|internet/, 'wifi-off'],
  [/phone|text|reply|message|notification|autocorrect|chat/, 'smartphone'],
  [/game|gamer|gaming/, 'gamepad-2'],
  [/tabs|laptop|computer|progress bar|software|update|password|save|file|docx|crash/, 'monitor'],
  [/teacher|lecture|assignment|class/, 'graduation-cap'],
  [/exam|test|study|homework|essay|textbook|school|student|notebook|book/, 'book-open'],
  [/gym|exercise|stairs|running|walking|fitness|workout/, 'dumbbell'],
  [/\btv\b|episode|show|stream|movie|remote|video/, 'tv'],
  [/email|mail/, 'mail'],
  [/meeting|office|boss|work|task|deadline|team|quick question/, 'briefcase'],
  [/plant|cactus|water them/, 'sprout'],
  [/weekend|friday|holiday|party|cancelled/, 'party-popper'],
  [/monday|tuesday|week|january|december|calendar/, 'calendar'],
  [/bus|stop/, 'bus'],
  [/travel|trip|airport|passport|suitcase/, 'plane'],
  [/weather|sunny|\brain|forecast|\bsky/, 'cloud-rain'],
  [/song|playlist|lyrics|music/, 'headphones'],
  [/shower/, 'shower-head'],
  [/laundry|sock|sandal|shirt|jacket/, 'shirt'],
  [/clean|room|closet|chores/, 'trash'],
  [/hair/, 'scissors'],
  [/hobby|hobbies/, 'palette'],
  [/baby|parent/, 'baby'],
  [/mom|family|home|house/, 'house'],
  [/to-do|list|unfinished/, 'list-checks'],
  [/lift|elevator/, 'arrow-up-down'],
  [/productive|afternoon/, 'briefcase'],
  [/brain|remember|think|idea|language/, 'brain'],
  [/friend|social|hang out|conversation|weather|talk|name/, 'message-circle'],
  [/leaf|tree/, 'leaf'],
  [/box/, 'package']
]

const FACE_RULES: [RegExp, Face][] = [
  [/on fire|crash|panic|spider|deadline|storage|1 percent|picks you|stuck|99%|update required|the test:|takes off|take-off|auto-saving|chaos|errors?\b/, 'shock'],
  [/awkward|you too|nice weather|embarrass|quiet after|explaining|pretending|\bsweat\b|forgot|before a deadline|me at midnight|in any shop|me at lunch|a new message|after work|as a developer|on friday|as a gamer|every morning/, 'nervous'],
  [/broke|cold|cannot|ruining|diet|stairs|surviving|three more|not quick|stuck|every error|page 3|doll-sized|got\b|says nothing|my version|panicking|month/, 'cry'],
  [/sleep|nap|\bbed\b|tired|zombie|resting my eyes|snooze|hours later|5 pm|up at noon|3 am|2 am/, 'sleepy'],
  [/autocorrect|eats the snack|wifi|starving|ate 5 minutes|knocking|ceo energy|landlord/, 'angry'],
  [/no idea|i am the group|smelled|understand|haha|opinion|cereal is|pineapple|dark mode|socks|weekends need|breaks should|best dinner|tiny vacations|ship my computer|basically a different/, 'smug'],
  [/crime|memory of/, 'shock'],
  [/could have been|i am the group/, 'smug'],
  [/payday|friday|weekend|cancelled|best day|party|holiday|relaxed/, 'party'],
  [/finally|first try|exactly like|unstoppable|found|find money|ends five|ready to|remote|perfect|silent angels|goals|outgoing|works\b/, 'happy'],
  [/cat|dog|pizza|snack|food|plant|walk|coffee|tea\b|salad/, 'love'],
  [/remember|why|think|wonder|learn|brain|plan|lyrics|languages/, 'think'],
  [/laugh|joke|lol/, 'laugh'],
  [/cool|energy|confident|up at 6/, 'cool'],
  [/hear your name|watching|window|someone/, 'side']
]

const FALLBACK: Face[] = ['laugh', 'side', 'smug', 'happy', 'think', 'cool']

/** Picks a face, body and prop for a piece of meme text. `about` adds topic words that only steer the prop and body. */
export function artFor(text: string, about = '', o: { face?: Face; fallback?: Face; propFrom?: string } = {}): Art {
  const t = text.toLowerCase()
  const all = `${t} ${about.toLowerCase()}`
  const who: Who = /\bcats?\b|cat’s|kitten/.test(all) ? 'cat' : /\bdogs?\b|bark/.test(all) ? 'dog' : 'blob'
  const pick = o.face ?? FACE_RULES.find(([re]) => re.test(t))?.[1] ?? o.fallback ?? FACE_RULES.find(([re]) => re.test(all))?.[1] ?? FALLBACK[hash(t) % FALLBACK.length]
  const first = (s: string) => PROPS.find(([re]) => re.test(s))?.[1]
  const prop = (o.propFrom !== undefined ? first(o.propFrom.toLowerCase()) : first(t)) ?? first(all) ?? 'sparkles'
  return { face: pick, who, prop }
}

/** The background colours that suit a face, for layouts that colour around the picture. */
export const moodColours = (face: Face) => MOODS[FACES[face].mood].bg

// ------------------------------------------------------------ drawing

/** Drawing helpers for one character placed in a square box. Units run 0–100 across the box. */
function pen(x: number, y: number, s: number) {
  const k = s / 100
  const shape = (d: string, fill: string, o: Partial<ShapeElement> = {}) => path(d, [100, 100], r(x), r(y), r(s), r(s), fill, { name: 'Drawing', ...o })
  return {
    k,
    /** A filled outline drawn over the whole box. */
    fill: (d: string, fill: string, o: Partial<ShapeElement> = {}) => shape(d, fill, { stroke: LINE, strokeWidth: r(Math.max(1, 2.2 * k)), ...o }),
    /** A drawn line, like a brow or a smile. */
    line: (d: string, width = 3.2, color = LINE, o: Partial<ShapeElement> = {}) => shape(d, 'transparent', { stroke: color, strokeWidth: r(Math.max(1, width * k)), ...o }),
    /** A plain filled shape with no outline. */
    blot: (d: string, fill: string, o: Partial<ShapeElement> = {}) => shape(d, fill, { strokeWidth: 0, ...o }),
    oval: (cx: number, cy: number, rx: number, ry: number, fill: string, o: Partial<ShapeElement> = {}) =>
      ellipse(r(x + (cx - rx) * k), r(y + (cy - ry) * k), r(rx * 2 * k), r(ry * 2 * k), fill, { name: 'Drawing', ...o })
  }
}

const drop = (cx: number, cy: number, k: number) =>
  `M${cx} ${cy - k}C${cx + k * 0.2} ${cy - k * 0.4} ${cx + k * 0.75} ${cy} ${cx + k * 0.75} ${cy + k * 0.45}A${k * 0.75} ${k * 0.75} 0 0 1 ${cx - k * 0.75} ${cy + k * 0.45}C${cx - k * 0.75} ${cy} ${cx - k * 0.2} ${cy - k * 0.4} ${cx} ${cy - k}Z`

const heart = (cx: number, cy: number, k: number) =>
  `M${cx} ${cy + k * 0.9}C${cx - k * 1.6} ${cy - k * 0.1} ${cx - k * 0.75} ${cy - k * 1.25} ${cx} ${cy - k * 0.4}C${cx + k * 0.75} ${cy - k * 1.25} ${cx + k * 1.6} ${cy - k * 0.1} ${cx} ${cy + k * 0.9}Z`

/**
 * One character in a square of side `s`. The head sits low in the square so
 * ears and hats fit above it. With `mini`, the small extras are left out.
 */
export function character(x: number, y: number, s: number, art: Art, o: { mini?: boolean; prop?: boolean } = {}): DesignElement[] {
  const spec = FACES[art.face]
  const accent = MOODS[spec.mood].ink
  const p = pen(x, y, s)
  const els: DesignElement[] = []
  const fx = new Set(o.mini ? spec.fx.filter((f) => f === 'streams' || f === 'hat' || f === 'tears') : spec.fx)
  const skin = art.face === 'angry' && art.who === 'blob' ? (['#ffb199', '#ff7350', '#e2462a'] as const) : SKIN[art.who]
  const headFill = { gradient: radial(skin[0], skin[1], skin[2]) }

  // Behind the head: cat ears.
  if (art.who === 'cat') {
    els.push(p.fill('M15 44L19 8L46 26Z', skin[1]), p.fill('M85 44L81 8L54 26Z', skin[1]))
    els.push(p.blot('M22 36L24 17L38 27Z', '#ffb3c4'), p.blot('M78 36L76 17L62 27Z', '#ffb3c4'))
  }
  els.push(p.oval(50, 58, art.who === 'cat' ? 40 : 38, art.who === 'cat' ? 35 : 37, skin[1], { ...headFill, stroke: LINE, strokeWidth: r(Math.max(1, 2.4 * p.k)), name: 'Head' }))
  if (art.who === 'dog') {
    els.push(p.fill('M19 30C3 33 1 64 11 74C19 81 26 62 27 46Z', '#8a5530'), p.fill('M81 30C97 33 99 64 89 74C81 81 74 62 73 46Z', '#8a5530'))
    els.push(p.oval(50, 74, 16, 12, '#f8dfc0', { stroke: LINE, strokeWidth: r(Math.max(1, 1.8 * p.k)) }))
  }

  // Eyes
  const ex = [37, 63]
  const ey = 52
  const [lx, ly] = spec.look ?? [0, 0]
  switch (spec.eyes) {
    case 'open':
    case 'big':
    case 'small': {
      const rx = spec.eyes === 'big' ? 9.5 : 7.5
      const ry = spec.eyes === 'big' ? 11 : 8.5
      const pr = spec.eyes === 'open' ? 3.8 : 2.6
      for (const cx of ex) {
        els.push(p.oval(cx, ey, rx, ry, '#ffffff', { stroke: LINE, strokeWidth: r(Math.max(1, 2 * p.k)) }))
        els.push(p.oval(cx + lx, ey + ly, pr, pr, LINE))
      }
      break
    }
    case 'lids':
      els.push(p.fill('M29.5 52A7.5 7.5 0 0 0 44.5 52Z', '#ffffff'), p.fill('M55.5 52A7.5 7.5 0 0 0 70.5 52Z', '#ffffff'))
      els.push(p.blot(`M${37 + lx - 3} 53A3 3 0 0 0 ${37 + lx + 3} 53Z M${63 + lx - 3} 53A3 3 0 0 0 ${63 + lx + 3} 53Z`, LINE))
      break
    case 'happy':
      els.push(p.line('M29 55Q37 44 45 55M55 55Q63 44 71 55', 3.6))
      break
    case 'squeeze':
      els.push(p.line('M29 45L42 51L29 57M71 45L58 51L71 57', 3.6))
      break
    case 'sad':
      els.push(p.line('M29 50Q37 57 45 50M55 50Q63 57 71 50', 3.4))
      break
    case 'sleep':
      els.push(p.line('M29 53Q37 58 45 53M55 53Q63 58 71 53', 3.2))
      break
    case 'flat':
      els.push(p.line('M29 52L45 52M55 52L71 52', 3.4))
      break
    case 'x':
      els.push(p.line('M31 46L43 58M43 46L31 58M57 46L69 58M69 46L57 58', 3.4))
      break
    case 'heart':
      els.push(p.fill(heart(37, 52, 8.5), '#ff3b5c'), p.fill(heart(63, 52, 8.5), '#ff3b5c'))
      break
    case 'shades':
      els.push(p.blot('M22 44H47Q47 60 35 60Q23 60 22 44ZM53 44H78Q77 60 65 60Q53 60 53 44ZM46 44H54V47.5H46Z', '#1b1b22'))
      if (!o.mini) els.push(p.line('M27 48L33 48M58 48L64 48', 2.2, '#ffffff', { opacity: 0.8 }))
      break
  }
  if (spec.brows) els.push(p.line(spec.brows, 3.2))

  // Mouth
  switch (spec.mouth) {
    case 'grin':
      els.push(p.fill('M34 67Q50 90 66 67Z', '#6b1f2a'))
      if (!o.mini) els.push(p.blot('M41 79Q50 74 59 79Q50 86 41 79Z', '#ff7d8f'))
      break
    case 'laugh':
      els.push(p.fill('M30 65Q50 96 70 65Z', '#6b1f2a'))
      if (!o.mini) els.push(p.blot('M40 82Q50 75 60 82Q50 90 40 82Z', '#ff7d8f'))
      break
    case 'smile':
      els.push(p.line('M38 70Q50 81 62 70'))
      break
    case 'o':
      els.push(p.oval(50, 76, art.face === 'shock' ? 7 : 4.5, art.face === 'shock' ? 9 : 5.5, '#6b1f2a', { stroke: LINE, strokeWidth: r(Math.max(1, 1.8 * p.k)) }))
      break
    case 'flat':
      els.push(p.line('M41 75L59 75'))
      break
    case 'frown':
      els.push(p.line('M39 79Q50 69 61 79'))
      break
    case 'wobble':
      els.push(p.line('M37 80Q41 73 45 77Q50 71 55 77Q59 73 63 80', 3))
      break
    case 'smirk':
      els.push(p.line('M40 74Q53 78 62 68', 3.2))
      break
    case 'wavy':
      els.push(p.line('M40 76Q44 72 48 76Q52 80 56 76Q58 74 60 75', 2.8))
      break
    case 'grimace':
      els.push(p.fill('M35 69H65Q67 69 67 71V79Q67 81 65 81H35Q33 81 33 79V71Q33 69 35 69Z', '#ffffff'))
      if (!o.mini) els.push(p.line('M33 75H67M42 69V81M50 69V81M58 69V81', 1.6))
      break
    case 'tongue':
      els.push(p.line('M40 74L60 74'), p.fill('M48 74H58Q58 86 53 86Q48 86 48 79Z', '#ff7d8f'))
      break
  }

  // Extras
  if (fx.has('blush')) els.push(p.oval(26, 66, 6, 3.6, BLUSH, { opacity: 0.55 }), p.oval(74, 66, 6, 3.6, BLUSH, { opacity: 0.55 }))
  if (fx.has('tears')) els.push(p.fill(`${drop(13, 50, 6)}${drop(87, 50, 6)}`, TEAR, { strokeWidth: r(Math.max(1, 1.4 * p.k)) }))
  if (fx.has('streams')) els.push(p.blot('M33 56Q30 72 33 92L40 92Q37 72 39 56ZM67 56Q70 72 67 92L60 92Q63 72 61 56Z', TEAR, { opacity: 0.9 }))
  if (fx.has('sweat')) els.push(p.fill(drop(83, 33, 7), TEAR, { strokeWidth: r(Math.max(1, 1.4 * p.k)) }))
  if (fx.has('vein')) els.push(p.line('M74 27Q78 31 74 35M80 27Q76 31 80 35M73 30Q77 26 81 30M73 33Q77 37 81 33', 2.6, '#d61f1f'))
  if (fx.has('zzz')) els.push(p.line('M74 8H84L74 19H84M86 22H93L86 30H93M93 35H98L93 41H98', 2.8, '#ffffff'))
  if (fx.has('question')) els.push(p.line('M82 12Q82 4 89 4Q96 4 96 11Q96 16 89 18V22M89 27V27.5', 3.4, accent))
  if (fx.has('lines')) els.push(p.line('M4 34L11 38M2 52L10 52M4 70L11 66M96 34L89 38M98 52L90 52M96 70L89 66', 3))
  if (fx.has('hat')) {
    els.push(p.fill('M50 0L37 26Q50 31 63 26Z', accent))
    els.push(p.blot('M46 9L54 9L56 14L44 14ZM42 18L58 18L60 22L40 22Z', '#ffffff', { opacity: 0.85 }))
    els.push(p.oval(50, 2, 4, 4, '#ffffff', { stroke: LINE, strokeWidth: r(Math.max(1, 1.6 * p.k)) }))
  }
  if (fx.has('hearts')) els.push(p.blot(`${heart(12, 26, 5)}${heart(88, 18, 6.5)}`, '#ff3b5c'))
  if (fx.has('sparkle')) els.push(icon('sparkles', r(x + 2 * p.k), r(y + 8 * p.k), r(18 * p.k), '#ffffff', { strokeWidth: 2.2, name: 'Sparkles' }))

  // The prop: what the meme is about, in a round badge at the lower right.
  if (o.prop !== false && art.prop) {
    const d = 34
    els.push(p.oval(84, 82, d / 2, d / 2, '#ffffff', { stroke: LINE, strokeWidth: r(Math.max(1, 2 * p.k)), name: 'Prop badge' }))
    const is = d * 0.58
    els.push(icon(art.prop, r(x + (84 - is / 2) * p.k), r(y + (82 - is / 2) * p.k), r(is * p.k), accent, { strokeWidth: 2.2, name: 'Prop' }))
  }
  return group(els)
}

/** Sun rays from the middle of a box, clipped to its edges. */
function rays(b: Box, count: number, color: string, opacity: number): DesignElement {
  const cx = b.w / 2
  const cy = b.h / 2
  const edge = (a: number) => {
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    const t = Math.min(dx ? Math.abs(cx / dx) : Infinity, dy ? Math.abs(cy / dy) : Infinity)
    return [cx + dx * t, cy + dy * t]
  }
  const corners = [
    [b.w, b.h],
    [0, b.h],
    [0, 0],
    [b.w, 0]
  ]
  const cornerAngle = corners.map(([px, py]) => (Math.atan2(py - cy, px - cx) + Math.PI * 2) % (Math.PI * 2))
  const step = (Math.PI * 2) / count
  let d = ''
  for (let i = 0; i < count; i++) {
    const a0 = i * step
    const a1 = a0 + step / 2
    const pts = [[cx, cy], edge(a0)]
    corners.forEach((corner, ci) => {
      if (cornerAngle[ci] > a0 && cornerAngle[ci] < a1) pts.push(corner)
    })
    pts.push(edge(a1))
    d += `M${pts.map(([px, py]) => `${r(px)} ${r(py)}`).join('L')}Z`
  }
  return path(d, [r(b.w), r(b.h)], r(b.x), r(b.y), r(b.w), r(b.h), color, { strokeWidth: 0, opacity, name: 'Rays' })
}

/** A mood-coloured box with sun rays (rays only on square-cornered boxes, since they are not clipped). */
export function backdrop(b: Box, face: Face, o: { mini?: boolean; rays?: boolean; radius?: number; name?: string } = {}): DesignElement[] {
  const mood = MOODS[FACES[face].mood]
  const els: DesignElement[] = [rect(r(b.x), r(b.y), r(b.w), r(b.h), mood.bg[1], { name: o.name ?? 'Picture background', gradient: linear(90, ...mood.bg), ...(o.radius ? { cornerRadius: r(o.radius) } : {}) })]
  if (o.rays !== false && !o.radius) els.push(rays(b, o.mini ? 12 : 16, mood.rays, mood.raysOpacity))
  return els
}

/**
 * A picture box: a mood-coloured backdrop with sun rays, a soft shadow and
 * the character. `size` is the character's share of the box's shorter side,
 * and `cy` where its middle sits (share of the height).
 */
export function scene(b: Box, art: Art, o: { size?: number; cy?: number; mini?: boolean; prop?: boolean; rays?: boolean; radius?: number; name?: string } = {}): DesignElement[] {
  const els = backdrop(b, art.face, o)
  const s = Math.min(b.w, b.h) * (o.size ?? 0.74)
  const x = b.x + (b.w - s) / 2
  const y = b.y + b.h * (o.cy ?? 0.5) - s / 2
  if (!o.mini) els.push(ellipse(r(x + s * 0.2), r(y + s * 0.9), r(s * 0.6), r(s * 0.09), '#000000', { name: 'Shadow', opacity: 0.12 }))
  els.push(...character(x, y, s, art, { mini: o.mini, prop: o.prop }))
  return els
}

/** A big topic icon in a white circle, used where a meme labels things rather than people. */
export function propBadge(x: number, y: number, d: number, name: string, face: Face = 'happy'): DesignElement[] {
  const ink = MOODS[FACES[face].mood].ink
  const is = d * 0.56
  return group([
    ellipse(r(x), r(y), r(d), r(d), '#ffffff', { name: 'Prop badge', stroke: LINE, strokeWidth: r(Math.max(1, d * 0.03)) }),
    icon(name, r(x + (d - is) / 2), r(y + (d - is) / 2), r(is), ink, { strokeWidth: 2.2, name: 'Prop' })
  ])
}

/** The skin colours of a body type, for hands and other extra parts. */
export const skinOf = (who: Who) => SKIN[who][1]
export const OUTLINE = LINE
