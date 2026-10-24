import { z } from 'zod'

/**
 * The contract between the AI design assistant and the editor. The model is
 * asked for a small JSON layout in page percentages; this module turns
 * whatever comes back into a safe, validated layout. Anything that does not
 * fit the contract is dropped or clamped instead of being trusted, so a
 * confused or malicious answer can never produce an invalid document.
 */

const HEX = /^#[0-9a-f]{6}$/i

const pct = z.coerce.number().catch(0).transform((n) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0))
const size = (min: number, max: number, fallback: number) =>
  z.coerce
    .number()
    .catch(fallback)
    .transform((n) => (Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback))
const hex = (fallback: string) =>
  z
    .string()
    .catch(fallback)
    .transform((s) => (HEX.test(s.trim()) ? s.trim().toLowerCase() : fallback))
const str = (max: number, fallback = '') =>
  z
    .string()
    .catch(fallback)
    .transform((s) => s.slice(0, max))

export const aiShapes = ['rect', 'ellipse', 'triangle', 'star', 'diamond'] as const
export const aiMasks = ['rect', 'rounded', 'circle', 'arch', 'pill', 'hexagon', 'blob'] as const

const textItem = z.object({
  type: z.literal('text'),
  text: str(2000),
  x: pct,
  y: pct,
  w: size(5, 100, 80),
  /** Font size as a percentage of the page width. */
  size: size(1, 30, 5),
  font: str(60, ''),
  color: hex('#1f2329'),
  align: z.enum(['left', 'center', 'right']).catch('left'),
  bold: z.coerce.boolean().catch(false),
  italic: z.coerce.boolean().catch(false),
  uppercase: z.coerce.boolean().catch(false),
  spacing: size(-5, 50, 0)
})

const shapeItem = z.object({
  type: z.literal('shape'),
  shape: z.enum(aiShapes).catch('rect'),
  x: pct,
  y: pct,
  w: size(0.5, 200, 20),
  h: size(0.5, 200, 20),
  color: hex('#7c5cff'),
  radius: size(0, 50, 0),
  opacity: size(0, 1, 1)
})

const lineItem = z.object({
  type: z.literal('line'),
  x: pct,
  y: pct,
  w: size(1, 100, 30),
  color: hex('#1f2329'),
  thickness: size(0.1, 5, 0.4)
})

const iconItem = z.object({
  type: z.literal('icon'),
  name: str(60, 'star'),
  x: pct,
  y: pct,
  size: size(2, 60, 10),
  color: hex('#1f2329')
})

const frameItem = z.object({
  type: z.literal('photo'),
  x: pct,
  y: pct,
  w: size(2, 100, 40),
  h: size(2, 100, 40),
  mask: z.enum(aiMasks).catch('rect'),
  /** What photo would fit, shown to the user as a hint. */
  hint: str(120, '')
})

export const aiItemSchema = z.discriminatedUnion('type', [textItem, shapeItem, lineItem, iconItem, frameItem])

export type AiItem = z.infer<typeof aiItemSchema>

export interface AiLayout {
  title: string
  background: string
  /** Optional second colour: the background becomes a gradient. */
  background2: string | null
  items: AiItem[]
}

export const MAX_ITEMS = 40

/** Pulls the first JSON object out of a model's answer, which may be wrapped in prose or a code fence. */
export function extractJson(answer: string): unknown {
  const fenced = answer.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : answer
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The AI answer did not contain a layout.')
  return JSON.parse(body.slice(start, end + 1))
}

/** Validates a layout. Bad items are skipped; the layout fails only when nothing usable is left. */
export function parseLayout(answer: string): { layout: AiLayout; skipped: number } {
  const raw = extractJson(answer) as Record<string, unknown>
  if (!raw || typeof raw !== 'object') throw new Error('The AI answer was not a layout.')
  const list = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.elements) ? raw.elements : []
  const items: AiItem[] = []
  let skipped = 0
  for (const item of list.slice(0, MAX_ITEMS)) {
    const parsed = aiItemSchema.safeParse(item)
    if (parsed.success && !(parsed.data.type === 'text' && !parsed.data.text.trim())) items.push(parsed.data)
    else skipped++
  }
  skipped += Math.max(0, list.length - MAX_ITEMS)
  if (items.length === 0) throw new Error('The AI answer had no usable elements. Try again or reword the request.')
  const bg = hex('#ffffff').parse(raw.background ?? '#ffffff')
  const bg2 = typeof raw.background2 === 'string' && HEX.test(raw.background2.trim()) ? raw.background2.trim().toLowerCase() : null
  return { layout: { title: str(120, 'AI design').parse(raw.title ?? 'AI design') || 'AI design', background: bg, background2: bg2, items }, skipped }
}

/** The instructions sent with every design request. */
export function layoutPrompt(options: { width: number; height: number; brief: string; style?: string; brandColors?: string[]; fonts: string[]; brandName?: string }): string {
  const orientation = options.width > options.height * 1.15 ? 'landscape' : options.height > options.width * 1.15 ? 'portrait' : 'square'
  return [
    `Design one ${orientation} page of ${options.width} x ${options.height} pixels for this request: "${options.brief.slice(0, 1500)}".`,
    options.style ? `Visual style: ${options.style}.` : '',
    options.brandColors?.length ? `Use these brand colours: ${options.brandColors.join(', ')}.` : '',
    options.brandName ? `The brand is called "${options.brandName}".` : '',
    `Reply with JSON only, no explanation, in exactly this shape:`,
    `{"title": string, "background": "#rrggbb", "background2": "#rrggbb" or null, "items": [ ... ]}`,
    `Each item is one of:`,
    `{"type":"text","text":string,"x":0-100,"y":0-100,"w":5-100,"size":1-30,"font":string,"color":"#rrggbb","align":"left"|"center"|"right","bold":bool,"italic":bool,"uppercase":bool,"spacing":number}`,
    `{"type":"shape","shape":"rect"|"ellipse"|"triangle"|"star"|"diamond","x":0-100,"y":0-100,"w":number,"h":number,"color":"#rrggbb","radius":0-50,"opacity":0-1}`,
    `{"type":"line","x":0-100,"y":0-100,"w":1-100,"color":"#rrggbb","thickness":0.1-5}`,
    `{"type":"icon","name":lucide icon name such as "star","heart","coffee","map-pin","phone","mail","calendar","check","leaf","sun","x":0-100,"y":0-100,"size":2-60,"color":"#rrggbb"}`,
    `{"type":"photo","x":0-100,"y":0-100,"w":2-100,"h":2-100,"mask":"rect"|"rounded"|"circle"|"arch"|"pill"|"hexagon"|"blob","hint":"what photo fits here"}`,
    `All x, y, w, h and size values are percentages: x and w of the page width, y and h of the page height, size (font size) of the page width.`,
    `x,y is the top-left corner. Items are drawn in order, first item at the back.`,
    `Use these fonts only: ${options.fonts.slice(0, 30).join(', ')}.`,
    `Write real, specific copy for the request (no lorem ipsum). Keep 4 to 14 items, a clear hierarchy, generous margins (at least 6%), strong contrast between text and background, and nothing outside the page.`
  ]
    .filter(Boolean)
    .join('\n')
}

// ---------------------------------------------------------------- Layout assistant (edits to an existing page)

/** Properties the layout assistant may change. Anything else in its answer is ignored. */
export const editableProps = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'text', 'fontSize', 'fontFamily', 'fill', 'color', 'stroke', 'align', 'bold', 'italic'] as const

export interface PageSummaryItem {
  id: string
  type: string
  name: string
  text?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  font?: string
  fontSize?: number
}

export type LayoutEdit =
  | { op: 'update'; id: string; props: Partial<Record<(typeof editableProps)[number], string | number | boolean>> }
  | { op: 'delete'; id: string }
  | { op: 'background'; color: string }

export function editPrompt(options: { width: number; height: number; request: string; items: PageSummaryItem[]; background: string; fonts: string[] }): string {
  return [
    `You edit a design page of ${options.width} x ${options.height} pixels. Background: ${options.background}.`,
    `Elements (back to front): ${JSON.stringify(options.items)}`,
    `Request: "${options.request.slice(0, 1500)}"`,
    `Reply with JSON only: {"summary": short sentence, "edits": [ ... ]} where each edit is one of:`,
    `{"op":"update","id":element id,"props":{ any of x, y, width, height, rotation, opacity (0-1), text, fontSize, fontFamily, fill (text or shape colour "#rrggbb"), color (icon colour), stroke (line colour), align, bold, italic }}`,
    `{"op":"delete","id":element id}`,
    `{"op":"background","color":"#rrggbb"}`,
    `Positions are in pixels from the top-left of the page. Only use ids from the list. Fonts available: ${options.fonts.slice(0, 30).join(', ')}.`,
    `Keep everything inside the page and make the smallest set of changes that fulfils the request.`
  ].join('\n')
}

const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null
}

/** Validates the layout assistant's edits against the ids that exist on the page. */
export function parseEdits(answer: string, ids: Set<string>, page: { width: number; height: number }): { summary: string; edits: LayoutEdit[]; skipped: number } {
  const raw = extractJson(answer) as { summary?: unknown; edits?: unknown }
  const list = Array.isArray(raw?.edits) ? raw.edits.slice(0, 100) : []
  const edits: LayoutEdit[] = []
  let skipped = 0
  const big = Math.max(page.width, page.height) * 4
  for (const e of list as Record<string, unknown>[]) {
    if (!e || typeof e !== 'object') {
      skipped++
      continue
    }
    if (e.op === 'background' && typeof e.color === 'string' && HEX.test(e.color)) {
      edits.push({ op: 'background', color: e.color.toLowerCase() })
    } else if (e.op === 'delete' && typeof e.id === 'string' && ids.has(e.id)) {
      edits.push({ op: 'delete', id: e.id })
    } else if (e.op === 'update' && typeof e.id === 'string' && ids.has(e.id) && e.props && typeof e.props === 'object') {
      const p = e.props as Record<string, unknown>
      const props: LayoutEdit & { op: 'update' } = { op: 'update', id: e.id, props: {} }
      for (const key of ['x', 'y'] as const) {
        const v = num(p[key], -big, big)
        if (v !== null) props.props[key] = v
      }
      for (const key of ['width', 'height'] as const) {
        const v = num(p[key], 1, big)
        if (v !== null) props.props[key] = v
      }
      const rotation = num(p.rotation, -360, 360)
      if (rotation !== null) props.props.rotation = rotation
      const opacity = num(p.opacity, 0, 1)
      if (opacity !== null) props.props.opacity = opacity
      const fontSize = num(p.fontSize, 1, 2000)
      if (fontSize !== null) props.props.fontSize = fontSize
      if (typeof p.text === 'string') props.props.text = p.text.slice(0, 5000)
      if (typeof p.fontFamily === 'string') props.props.fontFamily = p.fontFamily.slice(0, 80)
      for (const key of ['fill', 'color', 'stroke'] as const) if (typeof p[key] === 'string' && HEX.test(p[key] as string)) props.props[key] = (p[key] as string).toLowerCase()
      if (p.align === 'left' || p.align === 'center' || p.align === 'right') props.props.align = p.align
      if (typeof p.bold === 'boolean') props.props.bold = p.bold
      if (typeof p.italic === 'boolean') props.props.italic = p.italic
      if (Object.keys(props.props).length > 0) edits.push(props)
      else skipped++
    } else {
      skipped++
    }
  }
  return { summary: typeof raw?.summary === 'string' ? raw.summary.slice(0, 300) : '', edits, skipped }
}

/** Parses a list of short text suggestions (headlines, rewrites). */
export function parseSuggestions(answer: string, max = 8): string[] {
  try {
    const raw = extractJson(answer) as { suggestions?: unknown }
    if (Array.isArray(raw?.suggestions)) {
      return raw.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim().slice(0, 2000)).slice(0, max)
    }
  } catch {
    // Fall back to one suggestion per line.
  }
  return answer
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').replace(/^"|"$/g, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('{') && !l.startsWith('```'))
    .slice(0, max)
}
