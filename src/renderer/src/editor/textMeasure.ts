import Konva from 'konva'
import type { TextElement } from '@shared/model'

let measurer: Konva.Text | null = null

/** Height that the text needs at its current width, so selection boxes and alignment stay accurate. */
export function measureTextHeight(el: Pick<TextElement, 'text' | 'width' | 'fontFamily' | 'fontSize' | 'fontStyle' | 'lineHeight' | 'letterSpacing'>): number {
  measurer ??= new Konva.Text({ wrap: 'word' })
  measurer.setAttrs({
    text: el.text || ' ',
    width: el.width,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: el.fontStyle,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing
  })
  return Math.max(1, measurer.height())
}

/** Adds the matching height to a text patch whenever it changes something that affects layout. */
export function withTextHeight(el: TextElement, patch: Partial<TextElement>): Partial<TextElement> {
  const next = { ...el, ...patch }
  return { ...patch, height: measureTextHeight(next) }
}
