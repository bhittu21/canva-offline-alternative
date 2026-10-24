import { nanoid } from 'nanoid'
import type { DesignDocument, ImageElement, ShapeElement, ShapeKind, TextElement } from '@shared/model'

const base = (name: string, x: number, y: number, width: number, height: number) => ({
  id: nanoid(),
  name,
  x,
  y,
  width,
  height,
  rotation: 0,
  opacity: 1,
  locked: false,
  hidden: false
})

export type TextPreset = 'heading' | 'subheading' | 'body'

const textPresets: Record<TextPreset, { label: string; text: string; size: number; style: TextElement['fontStyle'] }> = {
  heading: { label: 'Heading', text: 'Add a heading', size: 0.08, style: 'bold' },
  subheading: { label: 'Subheading', text: 'Add a subheading', size: 0.05, style: 'bold' },
  body: { label: 'Body text', text: 'Add a little bit of body text', size: 0.03, style: 'normal' }
}

/** Text sizes scale with the page so a heading looks like a heading on any canvas size. */
export function createText(doc: DesignDocument, preset: TextPreset): TextElement {
  const p = textPresets[preset]
  const short = Math.min(doc.width, doc.height)
  const fontSize = Math.max(8, Math.round(short * p.size))
  const width = Math.round(doc.width * 0.7)
  const height = Math.round(fontSize * 1.2)
  return {
    ...base(p.label, (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'text',
    text: p.text,
    fontFamily: 'Arial',
    fontSize,
    fontStyle: p.style,
    underline: false,
    fill: '#1f2329',
    align: 'center',
    lineHeight: 1.2,
    letterSpacing: 0
  }
}

const shapeNames: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  ellipse: 'Circle',
  triangle: 'Triangle',
  star: 'Star',
  line: 'Line'
}

export function createShape(doc: DesignDocument, shape: ShapeKind): ShapeElement {
  const size = Math.round(Math.min(doc.width, doc.height) * 0.3)
  const width = shape === 'line' ? size * 1.5 : size
  const height = shape === 'line' ? Math.max(4, Math.round(size * 0.04)) : size
  return {
    ...base(shapeNames[shape], (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'shape',
    shape,
    fill: shape === 'line' ? '#1f2329' : '#7c5cff',
    stroke: '#1f2329',
    strokeWidth: 0,
    cornerRadius: 0
  }
}

/** Places an image centred on the page, scaled down to fit within 80% of it. */
export function createImage(
  doc: DesignDocument,
  assetId: string,
  name: string,
  naturalWidth: number,
  naturalHeight: number
): ImageElement {
  const scale = Math.min(1, (doc.width * 0.8) / naturalWidth, (doc.height * 0.8) / naturalHeight)
  const width = Math.max(1, naturalWidth * scale)
  const height = Math.max(1, naturalHeight * scale)
  return {
    ...base(name, (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'image',
    assetId
  }
}

/** A copy shifted slightly so it is visible on top of the original. */
export function duplicateElement<T extends { id: string; x: number; y: number; name: string }>(el: T, offset: number): T {
  return { ...structuredClone(el), id: nanoid(), x: el.x + offset, y: el.y + offset }
}
