import { z } from 'zod'

/**
 * The design document is the single source of truth. The canvas only draws it,
 * and every change goes through the document store so it can be undone.
 *
 * A document has one size shared by all of its pages. Coordinates are in
 * design pixels. Each element is positioned by its top-left corner (x, y) and
 * rotates around that corner, matching Konva's defaults. Array order in a
 * page's `elements` is layer order: the last element is drawn on top.
 *
 * Version history:
 *   1  single page (`background`, `elements` on the document)
 *   2  pages, groups, effects, lines, icons, charts, tables, image frames
 */

export const SCHEMA_VERSION = 2

const finite = z.number().refine(Number.isFinite, 'Must be a number')
const color = z.string().max(64)

export const gradientSchema = z.object({
  kind: z.enum(['linear', 'radial']),
  /** Degrees, 0 = left to right, 90 = top to bottom. Ignored for radial. */
  angle: finite,
  stops: z
    .array(z.object({ offset: z.number().min(0).max(1), color }))
    .min(2)
    .max(8)
})

export const shadowSchema = z.object({
  color,
  blur: z.number().min(0).max(500),
  offsetX: finite,
  offsetY: finite,
  opacity: z.number().min(0).max(1)
})

const baseElement = {
  id: z.string().min(1),
  name: z.string(),
  x: finite,
  y: finite,
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: finite,
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
  /** Elements sharing a group id are selected and moved together. */
  groupId: z.string().min(1).optional(),
  shadow: shadowSchema.optional()
}

export const fontStyles = ['normal', 'bold', 'italic', 'italic bold'] as const
export const textAligns = ['left', 'center', 'right'] as const

export const textElementSchema = z.object({
  ...baseElement,
  type: z.literal('text'),
  text: z.string().max(20000),
  fontFamily: z.string().min(1).max(100),
  fontSize: z.number().positive().max(5000),
  fontStyle: z.enum(fontStyles),
  underline: z.boolean(),
  fill: color,
  align: z.enum(textAligns),
  lineHeight: z.number().positive().max(10),
  letterSpacing: finite,
  uppercase: z.boolean().optional(),
  /** Outline around the letters. */
  strokeColor: color.optional(),
  strokeWidth: z.number().min(0).max(200).optional(),
  /** Curved text: degrees of arc the text bends through. Positive bends up (smile), negative bends down. */
  curve: z.number().min(-360).max(360).optional(),
  /** Highlight box behind the text. */
  background: color.optional()
})

export const shapeKinds = ['rect', 'ellipse', 'triangle', 'star', 'line', 'polygon', 'diamond', 'path'] as const
export const dashStyles = ['solid', 'dashed', 'dotted'] as const

export const shapeElementSchema = z.object({
  ...baseElement,
  type: z.literal('shape'),
  shape: z.enum(shapeKinds),
  fill: color,
  gradient: gradientSchema.optional(),
  stroke: color,
  strokeWidth: z.number().min(0).max(1000),
  dash: z.enum(dashStyles).optional(),
  cornerRadius: z.number().min(0),
  /** Polygon side count, or star point count. */
  sides: z.number().int().min(3).max(24).optional(),
  /** Star inner radius as a share of the outer radius. */
  innerRatio: z.number().min(0.05).max(0.95).optional(),
  /** SVG path data for `path` shapes, drawn in a box of `viewBox` and scaled to the element. */
  path: z.string().max(20000).optional(),
  viewBox: z.tuple([z.number().positive(), z.number().positive()]).optional()
})

export const lineCaps = ['none', 'arrow', 'triangle', 'circle', 'square', 'bar'] as const

/** A straight line or arrow. It runs along the middle of its box, from left to right; rotate it to change the angle. */
export const lineElementSchema = z.object({
  ...baseElement,
  type: z.literal('line'),
  stroke: color,
  strokeWidth: z.number().positive().max(500),
  dash: z.enum(dashStyles),
  startCap: z.enum(lineCaps),
  endCap: z.enum(lineCaps)
})

export const imageFilterSchema = z.object({
  brightness: z.number().min(0).max(3),
  contrast: z.number().min(0).max(3),
  saturation: z.number().min(0).max(3),
  blur: z.number().min(0).max(50),
  grayscale: z.number().min(0).max(1),
  sepia: z.number().min(0).max(1),
  hue: z.number().min(-180).max(180)
})

export const imageElementSchema = z.object({
  ...baseElement,
  type: z.literal('image'),
  /** Null is an empty frame (a placeholder waiting for a photo). */
  assetId: z.string().min(1).nullable(),
  /** Frame shape the photo is clipped to. Unknown ids draw as a plain rectangle. */
  mask: z.string().max(40).optional(),
  cornerRadius: z.number().min(0).optional(),
  /** The photo always fills the frame without stretching. Zoom >= 1 enlarges it; focus picks which part shows (0..1). */
  crop: z.object({ zoom: z.number().min(1).max(10), focusX: z.number().min(0).max(1), focusY: z.number().min(0).max(1) }).optional(),
  filters: imageFilterSchema.partial().optional(),
  borderColor: color.optional(),
  borderWidth: z.number().min(0).max(500).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional()
})

/** A vector icon from the bundled icon set, drawn with lines like the interface icons. */
export const iconElementSchema = z.object({
  ...baseElement,
  type: z.literal('icon'),
  icon: z.string().min(1).max(80),
  color,
  strokeWidth: z.number().min(0.25).max(6)
})

export const chartTypes = ['column', 'bar', 'line', 'area', 'pie', 'donut'] as const

export const chartElementSchema = z.object({
  ...baseElement,
  type: z.literal('chart'),
  chartType: z.enum(chartTypes),
  labels: z.array(z.string().max(100)).min(1).max(50),
  series: z
    .array(z.object({ name: z.string().max(100), color, values: z.array(finite).max(50) }))
    .min(1)
    .max(8),
  fontFamily: z.string().min(1).max(100),
  textColor: color,
  showValues: z.boolean(),
  showLegend: z.boolean(),
  showGrid: z.boolean()
})

export const tableElementSchema = z.object({
  ...baseElement,
  type: z.literal('table'),
  rows: z
    .array(z.array(z.string().max(2000)).min(1).max(20))
    .min(1)
    .max(60),
  fontFamily: z.string().min(1).max(100),
  fontSize: z.number().positive().max(500),
  textColor: color,
  fill: color,
  headerRow: z.boolean(),
  headerFill: color,
  headerTextColor: color,
  stripeFill: color.optional(),
  borderColor: color,
  borderWidth: z.number().min(0).max(50),
  align: z.enum(textAligns)
})

export const elementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  shapeElementSchema,
  lineElementSchema,
  imageElementSchema,
  iconElementSchema,
  chartElementSchema,
  tableElementSchema
])

export const assetInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mime: z.string().min(1),
  /** Where a downloaded photo came from, so its licence attribution travels with the design. */
  credit: z
    .object({
      source: z.string().max(100),
      author: z.string().max(200),
      authorUrl: z.string().max(500).optional(),
      sourceUrl: z.string().max(500).optional()
    })
    .optional()
})

export const pageSchema = z.object({
  id: z.string().min(1),
  name: z.string().max(200),
  background: color,
  backgroundGradient: gradientSchema.optional(),
  /** A photo that covers the whole page, under every element. */
  backgroundAssetId: z.string().min(1).optional(),
  elements: z.array(elementSchema),
  /** Ruler guides, in design pixels. */
  guides: z.object({ x: z.array(finite), y: z.array(finite) }).optional()
})

export const designDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  title: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  pages: z.array(pageSchema).min(1).max(200),
  assets: z.array(assetInfoSchema)
})

export type Gradient = z.infer<typeof gradientSchema>
export type Shadow = z.infer<typeof shadowSchema>
export type TextElement = z.infer<typeof textElementSchema>
export type ShapeElement = z.infer<typeof shapeElementSchema>
export type LineElement = z.infer<typeof lineElementSchema>
export type ImageElement = z.infer<typeof imageElementSchema>
export type IconElement = z.infer<typeof iconElementSchema>
export type ChartElement = z.infer<typeof chartElementSchema>
export type TableElement = z.infer<typeof tableElementSchema>
export type ImageFilters = z.infer<typeof imageFilterSchema>
export type DesignElement = z.infer<typeof elementSchema>
export type ElementType = DesignElement['type']
export type ShapeKind = (typeof shapeKinds)[number]
export type LineCap = (typeof lineCaps)[number]
export type DashStyle = (typeof dashStyles)[number]
export type ChartType = (typeof chartTypes)[number]
export type FontStyle = (typeof fontStyles)[number]
export type TextAlign = (typeof textAligns)[number]
export type AssetInfo = z.infer<typeof assetInfoSchema>
export type Page = z.infer<typeof pageSchema>
export type DesignDocument = z.infer<typeof designDocumentSchema>

let pageCounter = 0
export function newPageId(): string {
  pageCounter++
  return `page-${Date.now().toString(36)}-${pageCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createPage(background = '#ffffff'): Page {
  return { id: newPageId(), name: '', background, elements: [] }
}

export function createDocument(width: number, height: number, title = 'Untitled design'): DesignDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    width: Math.round(width),
    height: Math.round(height),
    pages: [createPage()],
    assets: []
  }
}

/** Every element on every page. */
export function allElements(doc: DesignDocument): DesignElement[] {
  return doc.pages.flatMap((page) => page.elements)
}

/** Asset ids used by a page: image elements and the page background photo. */
export function pageAssetIds(page: Page): string[] {
  const ids: string[] = []
  if (page.backgroundAssetId) ids.push(page.backgroundAssetId)
  for (const el of page.elements) if (el.type === 'image' && el.assetId) ids.push(el.assetId)
  return ids
}

/** Asset ids used anywhere in the document, in first-use order. */
export function usedAssetIds(doc: DesignDocument): string[] {
  return [...new Set(doc.pages.flatMap(pageAssetIds))]
}

/** Upgrades older documents step by step. Each step takes the raw JSON of one version and returns the next. */
export function migrateDocument(raw: unknown, fromVersion: number): unknown {
  let doc = raw
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    const step = migrations[version]
    if (step) doc = step(doc)
  }
  return doc
}

const migrations: Record<number, (doc: unknown) => unknown> = {
  // 1 -> 2: the single page moves into `pages`.
  1: (raw) => {
    const doc = raw as Record<string, unknown>
    const { background, elements, ...rest } = doc
    return {
      ...rest,
      schemaVersion: 2,
      pages: [{ id: 'page-1', name: '', background: typeof background === 'string' ? background : '#ffffff', elements: elements ?? [] }]
    }
  }
}
