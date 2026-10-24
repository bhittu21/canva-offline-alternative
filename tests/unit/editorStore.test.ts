import { describe, expect, it } from 'vitest'
import { createDocument, type ShapeElement } from '@shared/model'
import { arrangeElements, createEditorStore, selectIsDirty } from '@renderer/store/editorStore'

const ids = (els: { id: string }[]) => els.map((e) => e.id).join('')

function shape(id: string): ShapeElement {
  return {
    id,
    name: id,
    type: 'shape',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 0,
    cornerRadius: 0
  }
}

describe('arrangeElements', () => {
  const els = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
  it('moves selected elements forward, backward, to front and to back', () => {
    expect(ids(arrangeElements(els, new Set(['b']), 'forward'))).toBe('acbd')
    expect(ids(arrangeElements(els, new Set(['c']), 'backward'))).toBe('acbd')
    expect(ids(arrangeElements(els, new Set(['a', 'b']), 'front'))).toBe('cdab')
    expect(ids(arrangeElements(els, new Set(['c', 'd']), 'back'))).toBe('cdab')
    expect(ids(arrangeElements(els, new Set(['a', 'b']), 'forward'))).toBe('cabd')
    expect(ids(arrangeElements(els, new Set(['d']), 'forward'))).toBe('abcd')
  })
})

describe('editor store', () => {
  it('tracks unsaved changes, including undoing back to the saved state', () => {
    const store = createEditorStore()
    const { actions } = store
    actions.open(createDocument(100, 100), null)
    expect(selectIsDirty(store.getState())).toBe(false)

    actions.addElements([shape('a')])
    expect(selectIsDirty(store.getState())).toBe(true)

    actions.markSaved('C:/designs/test.odesign')
    expect(selectIsDirty(store.getState())).toBe(false)

    actions.updateElement('a', { x: 50 })
    expect(selectIsDirty(store.getState())).toBe(true)
    actions.undo()
    expect(selectIsDirty(store.getState())).toBe(false)
  })

  it('drops deleted elements from the selection and restores them on undo', () => {
    const store = createEditorStore()
    const { actions } = store
    actions.open(createDocument(100, 100), null)
    actions.addElements([shape('a'), shape('b')])
    expect(store.getState().selectedIds).toEqual(['a', 'b'])
    actions.deleteSelected()
    expect(store.getState().history!.present.elements).toHaveLength(0)
    expect(store.getState().selectedIds).toEqual([])
    actions.undo()
    expect(ids(store.getState().history!.present.elements)).toBe('ab')
  })

  it('does not delete locked elements', () => {
    const store = createEditorStore()
    const { actions } = store
    actions.open(createDocument(100, 100), null)
    actions.addElements([{ ...shape('a'), locked: true }, shape('b')])
    actions.deleteSelected()
    expect(ids(store.getState().history!.present.elements)).toBe('a')
  })

  it('moves a layer to a new position', () => {
    const store = createEditorStore()
    const { actions } = store
    actions.open(createDocument(100, 100), null)
    actions.addElements(['a', 'b', 'c'].map(shape))
    actions.moveLayer('a', 2)
    expect(ids(store.getState().history!.present.elements)).toBe('bca')
  })
})
