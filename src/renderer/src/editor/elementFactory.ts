import { nanoid } from 'nanoid'
import type {
  ChartElement,
  ChartType,
  DesignDocument,
  DesignElement,
  IconElement,
  ImageElement,
  LineElement,
  ShapeElement,
  ShapeKind,
  TableElement,
  TextElement
} from '@shared/model'
import { tableLayout } from '@renderer/render/layouts'
import { measureTextHeight } from '@renderer/render/text'
import { rotatedBounds } from './geometry'

/** Builders for new elements, with sensible default sizes relative to the page. */

type Size = Pick<DesignDocument, 'width' | 'height'>

export const base = (name: string, x: number, y: number, width: number, height: number) => ({
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

const short = (doc: Size) => Math.min(doc.width, doc.height)

export type TextPreset = 'heading' | 'subheading' | 'body' | 'caption' | 'quote' | 'label'

export const textPresets: Record<TextPreset, { label: string; text: string; size: number; style: TextElement['fontStyle']; role: 'heading' | 'body'; extra?: Partial<TextElement> }> = {
  heading: { label: 'Heading', text: 'Add a heading', size: 0.08, style: 'bold', role: 'heading' },
  subheading: { label: 'Subheading', text: 'Add a subheading', size: 0.05, style: 'bold', role: 'heading' },
  body: { label: 'Body text', text: 'Add a little bit of body text', size: 0.03, style: 'normal', role: 'body' },
  caption: { label: 'Caption', text: 'A short caption', size: 0.022, style: 'normal', role: 'body', extra: { fill: '#5b6170' } },
  quote: { label: 'Quote', text: '“Design is intelligence made visible.”', size: 0.045, style: 'italic', role: 'heading' },
  label: { label: 'Label', text: 'NEW ARRIVAL', size: 0.024, style: 'bold', role: 'body', extra: { letterSpacing: 4, uppercase: true } }
}

/** Text sizes scale with the page so a heading looks like a heading on any canvas size. */
export function createText(doc: Size, preset: TextPreset, fonts: { heading: string; body: string } = { heading: 'Poppins', body: 'Inter' }, overrides: Partial<TextElement> = {}): TextElement {
  const p = textPresets[preset]
  const fontSize = Math.max(8, Math.round(short(doc) * p.size))
  const width = Math.round(doc.width * 0.7)
  const el: TextElement = {
    ...base(p.label, (doc.width - width) / 2, 0, width, fontSize),
    type: 'text',
    text: p.text,
    fontFamily: p.role === 'heading' ? fonts.heading : fonts.body,
    fontSize,
    fontStyle: p.style,
    underline: false,
    fill: '#1f2329',
    align: 'center',
    lineHeight: 1.2,
    letterSpacing: 0,
    ...p.extra,
    ...overrides
  }
  const height = measureTextHeight(el)
  return { ...el, height, y: (doc.height - height) / 2 }
}

/** A free text element at a given size, for templates and the AI layouts. */
export function textAt(props: Partial<TextElement> & Pick<TextElement, 'text' | 'x' | 'y' | 'width' | 'fontSize'>): TextElement {
  const el: TextElement = {
    ...base(props.name ?? (props.text.split('\n')[0].slice(0, 30) || 'Text'), props.x, props.y, props.width, props.fontSize),
    type: 'text',
    fontFamily: 'Inter',
    fontStyle: 'normal',
    underline: false,
    fill: '#1f2329',
    align: 'left',
    lineHeight: 1.2,
    letterSpacing: 0,
    ...props,
    id: props.id ?? nanoid()
  } as TextElement
  return { ...el, height: measureTextHeight(el) }
}

const shapeNames: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  ellipse: 'Circle',
  triangle: 'Triangle',
  star: 'Star',
  line: 'Bar',
  polygon: 'Polygon',
  diamond: 'Diamond',
  path: 'Shape'
}

export function createShape(doc: Size, shape: ShapeKind, props: Partial<ShapeElement> = {}): ShapeElement {
  const size = Math.round(short(doc) * 0.3)
  const vb = props.viewBox
  const ratio = vb ? vb[0] / vb[1] : 1
  const width = props.width ?? (ratio >= 1 ? size : size * ratio)
  const height = props.height ?? (ratio >= 1 ? size / ratio : size)
  return {
    ...base(props.name ?? shapeNames[shape], (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'shape',
    shape,
    fill: '#7c5cff',
    stroke: '#1f2329',
    strokeWidth: 0,
    cornerRadius: 0,
    ...props
  }
}

export function createLine(doc: Size, props: Partial<LineElement> = {}): LineElement {
  const width = Math.round(short(doc) * 0.45)
  const strokeWidth = props.strokeWidth ?? Math.max(2, Math.round(short(doc) * 0.006))
  const height = Math.max(strokeWidth * 4, 12)
  return {
    ...base(props.name ?? 'Line', (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'line',
    stroke: '#1f2329',
    strokeWidth,
    dash: 'solid',
    startCap: 'none',
    endCap: 'none',
    ...props,
    height
  }
}

export function createIcon(doc: Size, icon: string, color = '#1f2329'): IconElement {
  const size = Math.round(short(doc) * 0.18)
  return {
    ...base(icon.replace(/-/g, ' '), (doc.width - size) / 2, (doc.height - size) / 2, size, size),
    type: 'icon',
    icon,
    color,
    strokeWidth: 2
  }
}

/** Places an image centred on the page, scaled down to fit within 80% of it. */
export function createImage(doc: Size, assetId: string, name: string, naturalWidth: number, naturalHeight: number): ImageElement {
  const scale = Math.min(1, (doc.width * 0.8) / naturalWidth, (doc.height * 0.8) / naturalHeight)
  const width = Math.max(1, naturalWidth * scale)
  const height = Math.max(1, naturalHeight * scale)
  return {
    ...base(name, (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'image',
    assetId
  }
}

/** An empty frame: drop a photo on it to fill it. */
export function createFrame(doc: Size, mask: string, aspect = 1, props: Partial<ImageElement> = {}): ImageElement {
  const size = Math.round(short(doc) * 0.4)
  const width = aspect >= 1 ? size : size * aspect
  const height = aspect >= 1 ? size / aspect : size
  return {
    ...base(`${mask[0].toUpperCase()}${mask.slice(1)} frame`, (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'image',
    assetId: null,
    mask,
    ...props
  }
}

const chartSamples: Record<ChartType, Pick<ChartElement, 'labels' | 'series'>> = {
  column: {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [
      { name: '2025', color: '#7c5cff', values: [42, 58, 51, 74] },
      { name: '2026', color: '#22a6c8', values: [48, 66, 70, 88] }
    ]
  },
  bar: { labels: ['Instagram', 'TikTok', 'YouTube', 'Email'], series: [{ name: 'Reach', color: '#ff7a59', values: [82, 64, 47, 30] }] },
  line: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], series: [{ name: 'Visitors', color: '#7c5cff', values: [12, 19, 17, 25, 31, 38] }] },
  area: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ name: 'Orders', color: '#12a37f', values: [8, 14, 11, 18, 24, 30, 22] }] },
  pie: { labels: ['Product', 'Services', 'Training', 'Other'], series: [{ name: 'Revenue', color: '#7c5cff', values: [45, 30, 15, 10] }] },
  donut: { labels: ['Done', 'In progress', 'Not started'], series: [{ name: 'Tasks', color: '#12a37f', values: [62, 25, 13] }] }
}

export function createChart(doc: Size, chartType: ChartType): ChartElement {
  const width = Math.round(Math.min(doc.width * 0.7, short(doc) * 0.9))
  const height = Math.round(chartType === 'pie' || chartType === 'donut' ? width * 0.8 : width * 0.62)
  return {
    ...base(`${chartType[0].toUpperCase()}${chartType.slice(1)} chart`, (doc.width - width) / 2, (doc.height - height) / 2, width, height),
    type: 'chart',
    chartType,
    ...structuredClone(chartSamples[chartType]),
    fontFamily: 'Inter',
    textColor: '#3a3f4b',
    showValues: chartType === 'pie' || chartType === 'donut' || chartType === 'bar',
    showLegend: chartType !== 'bar' && chartType !== 'line' && chartType !== 'area',
    showGrid: true
  }
}

export function createTable(doc: Size, rows = 4, cols = 3, style: Partial<TableElement> = {}): TableElement {
  const width = Math.round(doc.width * 0.7)
  const header = ['Item', 'Details', 'Price', 'Notes', 'Extra', 'More'].slice(0, cols)
  const body = Array.from({ length: rows - 1 }, (_, r) => Array.from({ length: cols }, (_, c) => (c === 0 ? `Row ${r + 1}` : c === cols - 1 && cols > 2 ? `$${(r + 1) * 10}` : 'Text')))
  const table: TableElement = {
    ...base('Table', (doc.width - width) / 2, 0, width, 100),
    type: 'table',
    rows: [header, ...body],
    fontFamily: 'Inter',
    fontSize: Math.max(10, Math.round(short(doc) * 0.022)),
    textColor: '#1f2329',
    fill: '#ffffff',
    headerRow: true,
    headerFill: '#1f2329',
    headerTextColor: '#ffffff',
    stripeFill: '#f3f4f7',
    borderColor: '#d6d9e0',
    borderWidth: 1,
    align: 'left',
    ...style
  }
  const height = tableLayout(table).height
  return { ...table, height, y: (doc.height - height) / 2 }
}

/** Copies elements with new ids. Elements that were grouped stay grouped, in a new group. */
export function cloneElements(elements: DesignElement[], offset = 0): DesignElement[] {
  const groups = new Map<string, string>()
  return elements.map((el) => {
    const copy = { ...structuredClone(el), id: nanoid(), x: el.x + offset, y: el.y + offset }
    if (el.groupId) {
      if (!groups.has(el.groupId)) groups.set(el.groupId, nanoid(8))
      copy.groupId = groups.get(el.groupId)
    }
    return copy
  })
}

/** A copy shifted slightly so it is visible on top of the original. */
export function duplicateElement<T extends DesignElement>(el: T, offset: number): T {
  return { ...structuredClone(el), id: nanoid(), x: el.x + offset, y: el.y + offset }
}

/** Moves a set of elements so their combined box is centred on a point. */
export function centerAt<T extends DesignElement>(elements: T[], point: { x: number; y: number }): T[] {
  if (elements.length === 0) return elements
  const boxes = elements.map((el) => rotatedBounds(el.x, el.y, el.width, el.height, el.rotation))
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  const x1 = Math.max(...boxes.map((b) => b.x + b.width))
  const y1 = Math.max(...boxes.map((b) => b.y + b.height))
  const dx = point.x - (x0 + x1) / 2
  const dy = point.y - (y0 + y1) / 2
  return elements.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy }))
}

/** Gives elements a shared new group id. */
export function grouped<T extends DesignElement>(elements: T[]): T[] {
  const groupId = nanoid(8)
  return elements.map((el) => ({ ...el, groupId }))
}
