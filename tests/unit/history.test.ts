import { describe, expect, it } from 'vitest'
import { applyChange, createHistory, MAX_HISTORY, MERGE_WINDOW_MS, redo, undo } from '@renderer/store/history'

interface Doc {
  items: { id: string; x: number }[]
  title: string
}

const start = (): Doc => ({ items: [{ id: 'a', x: 0 }], title: 'T' })

describe('history', () => {
  it('undoes and redoes a change', () => {
    let h = createHistory(start())
    h = applyChange(h, 'move', (d) => void (d.items[0].x = 10))
    expect(h.present.items[0].x).toBe(10)
    h = undo(h)
    expect(h.present.items[0].x).toBe(0)
    h = redo(h)
    expect(h.present.items[0].x).toBe(10)
  })

  it('records nothing for a change that changes nothing', () => {
    const h = createHistory(start())
    expect(applyChange(h, 'noop', (d) => void (d.items[0].x = 0))).toBe(h)
  })

  it('merges consecutive changes with the same key into one undo step', () => {
    let h = createHistory(start())
    h = applyChange(h, 'x', (d) => void (d.items[0].x = 1), { mergeKey: 'x', now: 1000 })
    h = applyChange(h, 'x', (d) => void (d.items[0].x = 2), { mergeKey: 'x', now: 1200 })
    h = applyChange(h, 'x', (d) => void (d.items[0].x = 3), { mergeKey: 'x', now: 1400 })
    expect(h.past).toHaveLength(1)
    h = undo(h)
    expect(h.present.items[0].x).toBe(0)
    h = redo(h)
    expect(h.present.items[0].x).toBe(3)
  })

  it('does not merge after the merge window or with a different key', () => {
    let h = createHistory(start())
    h = applyChange(h, 'x', (d) => void (d.items[0].x = 1), { mergeKey: 'x', now: 0 })
    h = applyChange(h, 'x', (d) => void (d.items[0].x = 2), { mergeKey: 'x', now: MERGE_WINDOW_MS + 1 })
    h = applyChange(h, 't', (d) => void (d.title = 'U'), { mergeKey: 't', now: MERGE_WINDOW_MS + 2 })
    expect(h.past).toHaveLength(3)
  })

  it('clears redo after a new change', () => {
    let h = createHistory(start())
    h = applyChange(h, 'a', (d) => void (d.items[0].x = 1))
    h = undo(h)
    h = applyChange(h, 'b', (d) => void d.items.push({ id: 'b', x: 5 }))
    expect(h.future).toHaveLength(0)
    expect(redo(h)).toBe(h)
  })

  it('keeps at most MAX_HISTORY steps', () => {
    let h = createHistory(start())
    for (let i = 1; i <= MAX_HISTORY + 20; i++) h = applyChange(h, 'step', (d) => void (d.items[0].x = i))
    expect(h.past).toHaveLength(MAX_HISTORY)
    for (let i = 0; i < MAX_HISTORY; i++) h = undo(h)
    expect(h.present.items[0].x).toBe(20)
  })
})
