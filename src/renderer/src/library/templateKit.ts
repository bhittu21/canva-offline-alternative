import type { ChartElement, DesignElement, Gradient, IconElement, ImageElement, LineElement, Page, ShapeElement, TableElement, TextElement } from '@shared/model'
import { createPage } from '@shared/model'
import { nanoid } from 'nanoid'
import { base, createChart, createTable, textAt } from '@renderer/editor/elementFactory'

/**
 * A small vocabulary for writing templates (and AI layouts) as code. All
 * values are in design pixels of the template's own size; templates are
 * scaled when they are used on a design of another size.
 */

export type TextOpts = Partial<Omit<TextElement, 'text' | 'x' | 'y' | 'width' | 'fontSize'>>

export const text = (value: string, x: number, y: number, width: number, fontSize: number, opts: TextOpts = {}): TextElement =>
  textAt({ text: value, x, y, width, fontSize, ...opts })

export const rect = (x: number, y: number, width: number, height: number, fill: string, opts: Partial<ShapeElement> = {}): ShapeElement => ({
  ...base(opts.name ?? 'Rectangle', x, y, width, height),
  type: 'shape',
  shape: 'rect',
  fill,
  stroke: '#1f2329',
  strokeWidth: 0,
  cornerRadius: 0,
  ...opts
})

export const ellipse = (x: number, y: number, width: number, height: number, fill: string, opts: Partial<ShapeElement> = {}): ShapeElement =>
  rect(x, y, width, height, fill, { name: 'Circle', ...opts, shape: 'ellipse' })

export const path = (d: string, viewBox: [number, number], x: number, y: number, width: number, height: number, fill: string, opts: Partial<ShapeElement> = {}): ShapeElement =>
  rect(x, y, width, height, fill, { name: 'Shape', ...opts, shape: 'path', path: d, viewBox })

export const line = (x: number, y: number, width: number, stroke: string, strokeWidth: number, opts: Partial<LineElement> = {}): LineElement => {
  const height = Math.max(strokeWidth * 4, 12)
  return {
    ...base(opts.name ?? 'Line', x, y - height / 2, width, height),
    type: 'line',
    stroke,
    strokeWidth,
    dash: 'solid',
    startCap: 'none',
    endCap: 'none',
    ...opts
  }
}

export const frame = (x: number, y: number, width: number, height: number, opts: Partial<ImageElement> = {}): ImageElement => ({
  ...base(opts.name ?? 'Photo frame', x, y, width, height),
  type: 'image',
  assetId: null,
  mask: 'rect',
  ...opts
})

export const icon = (name: string, x: number, y: number, size: number, color: string, opts: Partial<IconElement> = {}): IconElement => ({
  ...base(name.replace(/-/g, ' '), x, y, size, size),
  type: 'icon',
  icon: name,
  color,
  strokeWidth: 2,
  ...opts
})

export const chart = (type: ChartElement['chartType'], x: number, y: number, width: number, height: number, opts: Partial<ChartElement> = {}): ChartElement => ({
  ...createChart({ width, height }, type),
  x,
  y,
  width,
  height,
  ...opts
})

export const table = (rows: string[][], x: number, y: number, width: number, opts: Partial<TableElement> = {}): TableElement => {
  const t = createTable({ width: width / 0.7, height: 1000 }, rows.length, rows[0].length, { ...opts, rows })
  return { ...t, x, y }
}

export const linear = (angle: number, ...colors: string[]): Gradient => ({
  kind: 'linear',
  angle,
  stops: colors.map((color, i) => ({ offset: colors.length === 1 ? 0 : i / (colors.length - 1), color }))
})

export const radial = (...colors: string[]): Gradient => ({ ...linear(0, ...colors), kind: 'radial' })

export function page(background: string, elements: DesignElement[], opts: Partial<Page> = {}): Page {
  return { ...createPage(background), elements, ...opts }
}

/** Gives elements a shared group id, so they move together. */
export function group<T extends DesignElement>(elements: T[]): T[] {
  const groupId = nanoid(8)
  return elements.map((el) => ({ ...el, groupId }))
}
