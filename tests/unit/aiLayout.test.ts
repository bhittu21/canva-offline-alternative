import { describe, expect, it } from 'vitest'
import { extractJson, layoutPrompt, parseEdits, parseLayout, parseSuggestions } from '@shared/aiLayout'

describe('AI layout parsing', () => {
  it('reads JSON wrapped in prose or a code fence', () => {
    expect(extractJson('Sure! ```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(extractJson('Here you go: {"a": {"b": 2}} enjoy')).toEqual({ a: { b: 2 } })
    expect(() => extractJson('no layout here')).toThrow(/did not contain/)
  })

  it('keeps valid items, clamps values and drops invalid ones', () => {
    const answer = JSON.stringify({
      title: 'Sale',
      background: '#FFEEDD',
      background2: 'red',
      items: [
        { type: 'text', text: 'Big sale', x: -10, y: 120, w: 80, size: 99, color: 'not a colour', align: 'middle', font: 'Anton' },
        { type: 'shape', shape: 'hexagon', x: 10, y: 10, w: 20, h: 20, color: '#00ff00' },
        { type: 'video', src: 'x' },
        { type: 'text', text: '   ' },
        { type: 'icon', name: 'star', x: 50, y: 50, size: 10, color: '#123456' },
        'garbage'
      ]
    })
    const { layout, skipped } = parseLayout(answer)
    expect(layout.background).toBe('#ffeedd')
    expect(layout.background2).toBeNull()
    expect(layout.items).toHaveLength(3)
    const text = layout.items[0]
    expect(text).toMatchObject({ type: 'text', x: 0, y: 100, size: 30, color: '#1f2329', align: 'left', font: 'Anton' })
    expect(layout.items[1]).toMatchObject({ type: 'shape', shape: 'rect', color: '#00ff00' })
    expect(skipped).toBe(3)
  })

  it('fails clearly when nothing usable comes back', () => {
    expect(() => parseLayout('{"items":[{"type":"video"}]}')).toThrow(/no usable elements/)
  })

  it('caps the number of items', () => {
    const items = Array.from({ length: 60 }, (_, i) => ({ type: 'shape', x: i, y: i, w: 1, h: 1, color: '#000000' }))
    const { layout, skipped } = parseLayout(JSON.stringify({ items }))
    expect(layout.items).toHaveLength(40)
    expect(skipped).toBe(20)
  })

  it('describes the page size and fonts in the prompt', () => {
    const prompt = layoutPrompt({ width: 1080, height: 1920, brief: 'Bakery sale', fonts: ['Inter', 'Anton'], brandColors: ['#ff0000'] })
    expect(prompt).toContain('portrait page of 1080 x 1920')
    expect(prompt).toContain('Inter, Anton')
    expect(prompt).toContain('#ff0000')
  })
})

describe('AI layout edits', () => {
  const ids = new Set(['a', 'b'])
  const page = { width: 1000, height: 1000 }

  it('accepts only known ids and allowed properties', () => {
    const answer = JSON.stringify({
      summary: 'Bigger title',
      edits: [
        { op: 'update', id: 'a', props: { fontSize: '64', fill: '#ABCDEF', onclick: 'x', x: 1e9, bold: true } },
        { op: 'update', id: 'zzz', props: { x: 1 } },
        { op: 'delete', id: 'b' },
        { op: 'background', color: '#000000' },
        { op: 'background', color: 'black' },
        { op: 'update', id: 'a', props: { nothing: 1 } }
      ]
    })
    const { summary, edits, skipped } = parseEdits(answer, ids, page)
    expect(summary).toBe('Bigger title')
    expect(edits).toEqual([
      { op: 'update', id: 'a', props: { x: 4000, fontSize: 64, fill: '#abcdef', bold: true } },
      { op: 'delete', id: 'b' },
      { op: 'background', color: '#000000' }
    ])
    expect(skipped).toBe(3)
  })
})

describe('suggestions', () => {
  it('reads a JSON list, or falls back to one per line', () => {
    expect(parseSuggestions('{"suggestions":["One","Two",""]}')).toEqual(['One', 'Two'])
    expect(parseSuggestions('1. First idea\n- Second idea\n\n"Third"')).toEqual(['First idea', 'Second idea', 'Third'])
  })
})
