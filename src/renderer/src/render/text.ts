import Konva from 'konva'
import type { TextElement } from '@shared/model'
import { measureText } from './layouts'

/** The text exactly as drawn (after the uppercase option). */
export function displayText(el: Pick<TextElement, 'text' | 'uppercase'>): string {
  return el.uppercase ? el.text.toUpperCase() : el.text
}

export function isCurved(el: Pick<TextElement, 'curve'>): boolean {
  return !!el.curve && Math.abs(el.curve) >= 1
}

type TextMetrics = Pick<TextElement, 'text' | 'uppercase' | 'width' | 'fontFamily' | 'fontSize' | 'fontStyle' | 'lineHeight' | 'letterSpacing' | 'curve'>

let measurer: Konva.Text | null = null

/** Height the text needs at its current width, so selection boxes and alignment stay accurate. */
export function measureTextHeight(el: TextMetrics): number {
  if (isCurved(el)) return curvedText(el).height
  measurer ??= new Konva.Text({ wrap: 'word' })
  measurer.setAttrs({
    text: displayText(el) || ' ',
    width: el.width,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: el.fontStyle,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing
  })
  return Math.max(1, measurer.height())
}

/** Adds the matching size to a text patch whenever it changes something that affects layout. */
export function withTextHeight(el: TextElement, patch: Partial<TextElement>): Partial<TextElement> {
  const next = { ...el, ...patch }
  if (isCurved(next)) {
    const box = curvedText(next)
    return { ...patch, width: box.width, height: box.height }
  }
  return { ...patch, height: measureTextHeight(next) }
}

/**
 * Curved text runs along a circular arc. The arc's length matches the text
 * length, and `curve` is how many degrees of the circle it covers.
 */
export function curvedText(el: TextMetrics): { d: string; width: number; height: number } {
  const text = displayText(el).replace(/\n/g, ' ') || ' '
  const bold = el.fontStyle.includes('bold')
  const length = measureText(text, el.fontSize, el.fontFamily, bold) + Math.max(0, text.length - 1) * el.letterSpacing
  const theta = (Math.min(350, Math.abs(el.curve ?? 0)) * Math.PI) / 180
  const r = Math.max(length / theta, el.fontSize)
  const up = (el.curve ?? 0) > 0
  // Arc around a centre at (0, 0); "up" runs over the top of the circle, otherwise along the bottom.
  const a0 = up ? -Math.PI / 2 - theta / 2 : Math.PI / 2 + theta / 2
  const a1 = up ? -Math.PI / 2 + theta / 2 : Math.PI / 2 - theta / 2
  const steps = 48
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const pad = el.fontSize
  const width = Math.max(maxX - minX + pad * 2, el.fontSize * 2)
  const dx = width / 2
  const dy = pad - minY
  const p = (a: number) => `${(Math.cos(a) * r + dx).toFixed(2)} ${(Math.sin(a) * r + dy).toFixed(2)}`
  const large = theta > Math.PI ? 1 : 0
  const d = `M${p(a0)}A${r.toFixed(2)} ${r.toFixed(2)} 0 ${large} ${up ? 1 : 0} ${p(a1)}`
  return { d, width, height: maxY - minY + pad * 1.4 }
}

/** The Konva node for a text element. Shared by the editor and exports. */
export function textNodes(el: TextElement): Konva.Shape[] {
  const nodes: Konva.Shape[] = []
  const shadow = el.shadow && el.shadow.opacity > 0
  const common = {
    text: displayText(el),
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: el.fontStyle,
    textDecoration: el.underline ? 'underline' : '',
    fill: el.fill,
    letterSpacing: el.letterSpacing,
    ...(el.strokeWidth && el.strokeColor
      ? { stroke: el.strokeColor, strokeWidth: el.strokeWidth, fillAfterStrokeEnabled: true, lineJoin: 'round' as const }
      : {}),
    ...(shadow
      ? {
          shadowColor: el.shadow!.color,
          shadowBlur: el.shadow!.blur,
          shadowOffsetX: el.shadow!.offsetX,
          shadowOffsetY: el.shadow!.offsetY,
          shadowOpacity: el.shadow!.opacity
        }
      : {})
  }
  if (el.background && !isCurved(el)) {
    const pad = el.fontSize * 0.25
    nodes.push(new Konva.Rect({ x: -pad, y: -pad, width: el.width + pad * 2, height: el.height + pad * 2, fill: el.background, cornerRadius: pad }))
  }
  if (isCurved(el)) {
    const { d } = curvedText(el)
    nodes.push(new Konva.TextPath({ ...common, name: 'text-content', data: d, align: 'center', textBaseline: 'alphabetic' }))
    // Hit area for the whole box, since a text path is only clickable on its letters.
    nodes.unshift(new Konva.Rect({ width: el.width, height: el.height, fill: 'rgba(0,0,0,0)' }))
  } else {
    nodes.push(
      new Konva.Text({
        ...common,
        name: 'text-content',
        width: el.width,
        align: el.align,
        lineHeight: el.lineHeight,
        wrap: 'word'
      })
    )
  }
  return nodes
}
