import type { Draft } from 'immer'
import { nanoid } from 'nanoid'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { createPage, newPageId, type DesignDocument, type DesignElement, type Page } from '@shared/model'
import { rotatedBounds } from '@renderer/editor/geometry'
import { applyChange, createHistory, redo, undo, type ChangeOptions, type History, type HistoryEntry } from './history'

export interface EditorState {
  history: History<DesignDocument> | null
  filePath: string | null
  /** The undo entry that matches the file on disk. Null means "the starting state". */
  savedEntry: HistoryEntry | null
  /** True when the document was never saved, or was changed outside undo history. */
  forceDirty: boolean
  /** The page shown on the canvas. Selection always belongs to this page. */
  activePageId: string | null
  selectedIds: string[]
  editingTextId: string | null
}

export type ArrangeDirection = 'forward' | 'backward' | 'front' | 'back'
export type AlignEdge = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function createEditorStore() {
  const store = createStore<EditorState>(() => ({
    history: null,
    filePath: null,
    savedEntry: null,
    forceDirty: false,
    activePageId: null,
    selectedIds: [],
    editingTextId: null
  }))

  const get = store.getState
  const set = store.setState

  const lastEntry = (history: History<DesignDocument>) => history.past[history.past.length - 1] ?? null

  /** The active page, falling back to the first page if it was deleted (for example by undo). */
  const pageOf = (doc: DesignDocument, pageId: string | null) => doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]

  /** Drops selection of elements that are no longer on the active page. */
  const validate = (doc: DesignDocument, pageId: string | null, ids: string[]) => {
    const page = pageOf(doc, pageId)
    return { activePageId: page.id, selectedIds: ids.filter((id) => page.elements.some((el) => el.id === id)) }
  }

  const activeElements = (): DesignElement[] => {
    const { history, activePageId } = get()
    return history ? pageOf(history.present, activePageId).elements : []
  }

  const selected = (): DesignElement[] => {
    const ids = new Set(get().selectedIds)
    return activeElements().filter((el) => ids.has(el.id))
  }

  /** Selecting part of a group selects the whole group. */
  const expandGroups = (ids: string[]): string[] => {
    const elements = activeElements()
    const groups = new Set(elements.filter((el) => ids.includes(el.id) && el.groupId).map((el) => el.groupId))
    if (groups.size === 0) return ids
    const result = new Set(ids)
    for (const el of elements) if (el.groupId && groups.has(el.groupId)) result.add(el.id)
    return elements.filter((el) => result.has(el.id)).map((el) => el.id)
  }

  const actions = {
    open(document: DesignDocument, filePath: string | null) {
      set({
        history: createHistory(document),
        filePath,
        savedEntry: null,
        forceDirty: filePath === null && document.pages.some((p) => p.elements.length > 0),
        activePageId: document.pages[0].id,
        selectedIds: [],
        editingTextId: null
      })
    },

    close() {
      set({ history: null, filePath: null, savedEntry: null, forceDirty: false, activePageId: null, selectedIds: [], editingTextId: null })
    },

    change(label: string, recipe: (doc: Draft<DesignDocument>) => void, options?: ChangeOptions) {
      const { history, selectedIds, activePageId } = get()
      if (!history) return
      const next = applyChange(history, label, recipe, options)
      if (next === history) return
      set({ history: next, ...validate(next.present, activePageId, selectedIds) })
    },

    /** Changes the active page. */
    changePage(label: string, recipe: (page: Draft<Page>, doc: Draft<DesignDocument>) => void, options?: ChangeOptions) {
      const pageId = get().activePageId
      actions.change(
        label,
        (doc) => {
          const page = doc.pages.find((p) => p.id === pageId) ?? doc.pages[0]
          recipe(page, doc)
        },
        options
      )
    },

    undo() {
      const { history, selectedIds, activePageId } = get()
      if (!history || history.past.length === 0) return
      const next = undo(history)
      set({ history: next, ...validate(next.present, activePageId, selectedIds), editingTextId: null })
    },

    redo() {
      const { history, selectedIds, activePageId } = get()
      if (!history || history.future.length === 0) return
      const next = redo(history)
      set({ history: next, ...validate(next.present, activePageId, selectedIds), editingTextId: null })
    },

    markSaved(filePath: string) {
      const { history } = get()
      if (!history) return
      set({ filePath, savedEntry: lastEntry(history), forceDirty: false })
    },

    /** Changes the title without an undo step (used when the file is first named). */
    setTitleSilently(title: string) {
      const { history } = get()
      if (!history) return
      set({ history: { ...history, present: { ...history.present, title } } })
    },

    // ----- Selection -----

    select(ids: string[]) {
      set({ selectedIds: expandGroups(ids), editingTextId: null })
    },

    toggleSelected(id: string) {
      const { selectedIds } = get()
      const group = expandGroups([id])
      const remove = selectedIds.includes(id)
      set({
        selectedIds: remove ? selectedIds.filter((x) => !group.includes(x)) : [...new Set([...selectedIds, ...group])],
        editingTextId: null
      })
    },

    selectAll() {
      set({ selectedIds: activeElements().filter((e) => !e.hidden && !e.locked).map((e) => e.id), editingTextId: null })
    },

    setEditingText(id: string | null) {
      set({ editingTextId: id, selectedIds: id ? [id] : get().selectedIds })
    },

    // ----- Elements -----

    addElements(elements: DesignElement[], label = 'Add element') {
      if (elements.length === 0) return
      actions.changePage(label, (page) => {
        page.elements.push(...(elements as Draft<DesignElement>[]))
      })
      set({ selectedIds: elements.map((el) => el.id), editingTextId: null })
    },

    updateElement(id: string, patch: Partial<DesignElement>, label = 'Edit', mergeKey?: string) {
      actions.updateElements({ [id]: patch }, label, mergeKey)
    },

    updateElements(patches: Record<string, Partial<DesignElement>>, label = 'Edit', mergeKey?: string) {
      actions.change(
        label,
        (doc) => {
          for (const page of doc.pages) {
            for (const el of page.elements) {
              const patch = patches[el.id]
              if (patch) Object.assign(el, patch)
            }
          }
        },
        { mergeKey }
      )
    },

    /** Applies the same change to every selected element. */
    updateSelected(patch: Partial<DesignElement> | ((el: DesignElement) => Partial<DesignElement> | null), label = 'Edit', mergeKey?: string) {
      const patches: Record<string, Partial<DesignElement>> = {}
      for (const el of selected()) {
        const p = typeof patch === 'function' ? patch(el) : patch
        if (p) patches[el.id] = p
      }
      actions.updateElements(patches, label, mergeKey)
    },

    deleteSelected() {
      const ids = new Set(get().selectedIds)
      if (ids.size === 0) return
      actions.changePage('Delete', (page) => {
        page.elements = page.elements.filter((el) => !ids.has(el.id) || el.locked)
      })
    },

    arrange(direction: ArrangeDirection) {
      const ids = new Set(get().selectedIds)
      if (ids.size === 0) return
      actions.changePage('Arrange', (page) => {
        page.elements = arrangeElements(page.elements as DesignElement[], ids, direction) as Draft<DesignElement>[]
      })
    },

    moveLayer(id: string, toIndex: number) {
      actions.changePage('Reorder layers', (page) => {
        const from = page.elements.findIndex((el) => el.id === id)
        if (from < 0) return
        const [el] = page.elements.splice(from, 1)
        page.elements.splice(Math.max(0, Math.min(toIndex, page.elements.length)), 0, el)
      })
    },

    group() {
      const ids = get().selectedIds
      if (ids.length < 2) return
      const groupId = nanoid(8)
      const set_ = new Set(ids)
      actions.changePage('Group', (page) => {
        // Group members are kept next to each other in the layer list, at the topmost member's position.
        const members = page.elements.filter((el) => set_.has(el.id))
        for (const el of members) el.groupId = groupId
        const topIndex = Math.max(...members.map((m) => page.elements.indexOf(m)))
        const rest = page.elements.filter((el) => !set_.has(el.id))
        const insertAt = rest.length - (page.elements.length - 1 - topIndex)
        page.elements = [...rest.slice(0, insertAt), ...members, ...rest.slice(insertAt)]
      })
    },

    ungroup() {
      const ids = new Set(get().selectedIds)
      actions.changePage('Ungroup', (page) => {
        for (const el of page.elements) if (ids.has(el.id)) delete el.groupId
      })
    },

    toggleLock() {
      const items = selected()
      if (items.length === 0) return
      const lock = !items.every((el) => el.locked)
      actions.updateSelected({ locked: lock }, lock ? 'Lock' : 'Unlock')
    },

    /** Aligns the selection: one element aligns to the page, several align to each other. */
    align(edge: AlignEdge) {
      const items = selected().filter((el) => !el.locked)
      const { history } = get()
      if (!history || items.length === 0) return
      const doc = history.present
      const boxes = items.map((el) => ({ el, b: rotatedBounds(el.x, el.y, el.width, el.height, el.rotation) }))
      // One element, or one whole group, aligns to the page; several align to each other.
      const oneGroup = items.length > 1 && items.every((el) => el.groupId && el.groupId === items[0].groupId)
      const toPage = items.length === 1 || oneGroup
      const area = toPage ? { x: 0, y: 0, width: doc.width, height: doc.height } : unionBox(boxes.map(({ b }) => b))
      const groupBox = oneGroup ? unionBox(boxes.map(({ b }) => b)) : null
      const patches: Record<string, Partial<DesignElement>> = {}
      for (const { el, b: own } of boxes) {
        const b = groupBox ?? own
        let dx = 0
        let dy = 0
        if (edge === 'left') dx = area.x - b.x
        if (edge === 'center') dx = area.x + area.width / 2 - (b.x + b.width / 2)
        if (edge === 'right') dx = area.x + area.width - (b.x + b.width)
        if (edge === 'top') dy = area.y - b.y
        if (edge === 'middle') dy = area.y + area.height / 2 - (b.y + b.height / 2)
        if (edge === 'bottom') dy = area.y + area.height - (b.y + b.height)
        patches[el.id] = { x: el.x + dx, y: el.y + dy }
      }
      actions.updateElements(patches, 'Align')
    },

    /** Spaces three or more elements evenly. */
    distribute(axis: 'x' | 'y') {
      const items = selected().filter((el) => !el.locked)
      if (items.length < 3) return
      const boxes = items
        .map((el) => ({ el, b: rotatedBounds(el.x, el.y, el.width, el.height, el.rotation) }))
        .sort((a, b) => (axis === 'x' ? a.b.x - b.b.x : a.b.y - b.b.y))
      const size = (b: { width: number; height: number }) => (axis === 'x' ? b.width : b.height)
      const start = axis === 'x' ? boxes[0].b.x : boxes[0].b.y
      const last = boxes[boxes.length - 1].b
      const end = axis === 'x' ? last.x + last.width : last.y + last.height
      const gap = (end - start - boxes.reduce((sum, { b }) => sum + size(b), 0)) / (boxes.length - 1)
      let cursor = start
      const patches: Record<string, Partial<DesignElement>> = {}
      for (const { el, b } of boxes) {
        const delta = cursor - (axis === 'x' ? b.x : b.y)
        patches[el.id] = axis === 'x' ? { x: el.x + delta } : { y: el.y + delta }
        cursor += size(b) + gap
      }
      actions.updateElements(patches, 'Distribute')
    },

    // ----- Pages -----

    setActivePage(pageId: string) {
      set({ activePageId: pageId, selectedIds: [], editingTextId: null })
    },

    addPage(afterPageId?: string, page: Page = createPage()) {
      const after = afterPageId ?? get().activePageId
      actions.change('Add page', (doc) => {
        const index = doc.pages.findIndex((p) => p.id === after)
        doc.pages.splice(index < 0 ? doc.pages.length : index + 1, 0, page as Draft<Page>)
      })
      actions.setActivePage(page.id)
    },

    duplicatePage(pageId: string) {
      const doc = get().history?.present
      const source = doc?.pages.find((p) => p.id === pageId)
      if (!source) return
      const groupMap = new Map<string, string>()
      const copy: Page = {
        ...structuredClone(source),
        id: newPageId(),
        elements: source.elements.map((el) => {
          const clone = { ...structuredClone(el), id: nanoid() }
          if (el.groupId) {
            if (!groupMap.has(el.groupId)) groupMap.set(el.groupId, nanoid(8))
            clone.groupId = groupMap.get(el.groupId)
          }
          return clone
        })
      }
      actions.addPage(pageId, copy)
    },

    deletePage(pageId: string) {
      const doc = get().history?.present
      if (!doc || doc.pages.length <= 1) return
      const index = doc.pages.findIndex((p) => p.id === pageId)
      actions.change('Delete page', (d) => {
        d.pages = d.pages.filter((p) => p.id !== pageId)
      })
      const pages = get().history!.present.pages
      if (get().activePageId === pageId || !pages.some((p) => p.id === get().activePageId)) {
        actions.setActivePage(pages[Math.max(0, index - 1)].id)
      }
    },

    movePage(pageId: string, toIndex: number) {
      actions.change('Reorder pages', (doc) => {
        const from = doc.pages.findIndex((p) => p.id === pageId)
        if (from < 0) return
        const [page] = doc.pages.splice(from, 1)
        doc.pages.splice(Math.max(0, Math.min(toIndex, doc.pages.length)), 0, page)
      })
    }
  }

  return Object.assign(store, { actions, helpers: { selected, activeElements, pageOf } })
}

function unionBox(boxes: { x: number; y: number; width: number; height: number }[]) {
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))
  return { x, y, width: right - x, height: bottom - y }
}

/** Reorders elements while keeping the relative order of the moved ones. */
export function arrangeElements<T extends { id: string }>(elements: T[], ids: Set<string>, direction: ArrangeDirection): T[] {
  const moving = elements.filter((el) => ids.has(el.id))
  const rest = elements.filter((el) => !ids.has(el.id))
  if (direction === 'front') return [...rest, ...moving]
  if (direction === 'back') return [...moving, ...rest]

  const result = [...elements]
  if (direction === 'forward') {
    for (let i = result.length - 2; i >= 0; i--) {
      if (ids.has(result[i].id) && !ids.has(result[i + 1].id)) {
        ;[result[i], result[i + 1]] = [result[i + 1], result[i]]
      }
    }
  } else {
    for (let i = 1; i < result.length; i++) {
      if (ids.has(result[i].id) && !ids.has(result[i - 1].id)) {
        ;[result[i], result[i - 1]] = [result[i - 1], result[i]]
      }
    }
  }
  return result
}

export type EditorStore = ReturnType<typeof createEditorStore>

export const editorStore = createEditorStore()
export const editor = editorStore.actions
export const selectedElements = editorStore.helpers.selected

export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector)
}

export const selectDocument = (state: EditorState) => state.history?.present ?? null

export const selectActivePage = (state: EditorState): Page | null => {
  const doc = state.history?.present
  if (!doc) return null
  return doc.pages.find((p) => p.id === state.activePageId) ?? doc.pages[0]
}

export const selectIsDirty = (state: EditorState) => {
  if (!state.history) return false
  if (state.forceDirty) return true
  const last = state.history.past[state.history.past.length - 1] ?? null
  return last !== state.savedEntry
}
