import { z } from 'zod'

/**
 * The design document is the single source of truth. The canvas only draws it,
 * and every change goes through the document store so it can be undone.
 *
 * Coordinates are in design pixels. Each element is positioned by its top-left
 * corner (x, y) and rotates around that corner, matching Konva's defaults.
 * Array order in `elements` is layer order: the last element is drawn on top.
 */

export const SCHEMA_VERSION = 1

const baseElement = {
  id: z.string().min(1),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean()
}

export const fontStyles = ['normal', 'bold', 'italic', 'italic bold'] as const
export const textAligns = ['left', 'center', 'right'] as const

export const textElementSchema = z.object({
  ...baseElement,
  type: z.literal('text'),
  text: z.string(),
  fontFamily: z.string().min(1),
  fontSize: z.number().positive(),
  fontStyle: z.enum(fontStyles),
  underline: z.boolean(),
  fill: z.string(),
  align: z.enum(textAligns),
  lineHeight: z.number().positive(),
  letterSpacing: z.number()
})

export const shapeKinds = ['rect', 'ellipse', 'triangle', 'star', 'line'] as const

export const shapeElementSchema = z.object({
  ...baseElement,
  type: z.literal('shape'),
  shape: z.enum(shapeKinds),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number().min(0),
  cornerRadius: z.number().min(0)
})

export const imageElementSchema = z.object({
  ...baseElement,
  type: z.literal('image'),
  assetId: z.string().min(1)
})

export const elementSchema = z.discriminatedUnion('type', [
  textElementSchema,
  shapeElementSchema,
  imageElementSchema
])

export const assetInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  mime: z.string().min(1)
})

export const designDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  title: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  background: z.string(),
  elements: z.array(elementSchema),
  assets: z.array(assetInfoSchema)
})

export type TextElement = z.infer<typeof textElementSchema>
export type ShapeElement = z.infer<typeof shapeElementSchema>
export type ImageElement = z.infer<typeof imageElementSchema>
export type DesignElement = z.infer<typeof elementSchema>
export type ShapeKind = (typeof shapeKinds)[number]
export type FontStyle = (typeof fontStyles)[number]
export type TextAlign = (typeof textAligns)[number]
export type AssetInfo = z.infer<typeof assetInfoSchema>
export type DesignDocument = z.infer<typeof designDocumentSchema>

export function createDocument(width: number, height: number, title = 'Untitled design'): DesignDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    width: Math.round(width),
    height: Math.round(height),
    background: '#ffffff',
    elements: [],
    assets: []
  }
}
