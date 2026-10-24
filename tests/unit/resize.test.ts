import { describe, expect, it } from 'vitest'
import { createDocument, type ShapeElement, type TextElement } from '@shared/model'
import { ratioLabel, resizeDocument, sizeForRatio } from '@shared/resize'

const rect: ShapeElement = {
  id: 'r', name: 'r', type: 'shape', shape: 'rect', x: 100, y: 100, width: 200, height: 100, rotation: 30,
  opacity: 1, locked: false, hidden: false, fill: '#000000', stroke: '#000000', strokeWidth: 4, cornerRadius: 10
}
const text: TextElement = {
  id: 't', name: 't', type: 'text', x: 0, y: 0, width: 400, height: 50, rotation: 0, opacity: 1, locked: false,
  hidden: false, text: 'Hi', fontFamily: 'Arial', fontSize: 40, fontStyle: 'normal', underline: false,
  fill: '#000000', align: 'left', lineHeight: 1.2, letterSpacing: 2
}

function doc() {
  return { ...createDocument(1000, 1000), elements: [rect, text] }
}

describe('resizeDocument', () => {
  it('scales content evenly and centres it, never stretching', () => {
    const out = resizeDocument(doc(), 1920, 1080, 'scale')
    const r = out.elements[0] as ShapeElement
    expect(out.width).toBe(1920)
    expect(r.width / r.height).toBeCloseTo(2)
    expect(r.width).toBeCloseTo(200 * 1.08)
    expect(r.x).toBeCloseTo(100 * 1.08 + (1920 - 1080) / 2)
    expect(r.strokeWidth).toBeCloseTo(4 * 1.08)
    expect(r.rotation).toBe(30)
    const t = out.elements[1] as TextElement
    expect(t.fontSize).toBeCloseTo(40 * 1.08)
  })

  it('centres content without resizing it', () => {
    const r = resizeDocument(doc(), 1200, 800, 'center').elements[0]
    expect(r.width).toBe(200)
    expect(r.x).toBe(200)
    expect(r.y).toBe(0)
  })

  it('keeps content in place', () => {
    const out = resizeDocument(doc(), 500, 500, 'keep')
    expect(out.elements[0]).toEqual(rect)
  })
})

describe('aspect ratios', () => {
  it('keeps the longest side when switching ratio', () => {
    expect(sizeForRatio(1080, 1080, { w: 9, h: 16 })).toEqual({ width: 608, height: 1080 })
    expect(sizeForRatio(1080, 1920, { w: 16, h: 9 })).toEqual({ width: 1920, height: 1080 })
  })

  it('names common ratios', () => {
    expect(ratioLabel(1920, 1080)).toBe('16:9')
    expect(ratioLabel(1080, 1350)).toBe('4:5')
    expect(ratioLabel(1000, 700)).toBe('10:7')
  })
})
