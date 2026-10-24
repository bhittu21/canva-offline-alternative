import type { Draft } from 'immer'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { DesignDocument, DesignElement } from '@shared/model'
import { applyChange, createHistory, redo, undo, type ChangeOptions, type History, type HistoryEntry } from './history'

export interface EditorState {
  history: History<DesignDocument> | null
  filePath: string | null
  /** The undo entry that matches the file on disk. Null means "the starting state". */
  savedEntry: HistoryEntry | null
  /** True when the document was never saved, or was changed outside undo history. */
  forceDirty: boolean
  selectedIds: string[]
  editingTextId: string | null
}

export type ArrangeDirection = 'forward' | 'backward' | 'front' | 'back'

export function createEditorStore() {
  const store = createStore<EditorState>(() => ({
    history: null,
    filePath: null,
    savedEntry: null,
    forceDirty: false,
    selectedIds: [],
    editingTextId: null
  }))

  const get = store.getState
  const set = store.setState

  const lastEntry = (history: History<DesignDocument>) => history.past[history.past.length - 1] ?? null

  /** Drops selection of elements that no longer exist (after undo, delete, and so on). */
  const keepValidSelection = (doc: DesignDocument, ids: string[]) =>
    ids.filter((id) => doc.elements.some((el) => el.id === id))

  const actions = {
    open(document: DesignDocument, filePath: string | null) {
      set({
        history: createHistory(document),
        filePath,
        savedEntry: null,
        forceDirty: filePath === null && document.elements.length > 0,
        selectedIds: [],
        editingTextId: null
      })
    },

    close() {
      set({ history: null, filePath: null, savedEntry: null, forceDirty: false, selectedIds: [], editingTextId: null })
    },

    change(label: string, recipe: (doc: Draft<DesignDocument>) => void, options?: ChangeOptions) {
      const { history, selectedIds } = get()
      if (!history) return
      const next = applyChange(history, label, recipe, options)
      if (next === history) return
      set({ history: next, selectedIds: keepValidSelection(next.present, selectedIds) })
    },

    undo() {
      const { history, selectedIds } = get()
      if (!history || history.past.length === 0) return
      const next = undo(history)
      set({ history: next, selectedIds: keepValidSelection(next.present, selectedIds), editingTextId: null })
    },

    redo() {
      const { history, selectedIds } = get()
      if (!history || history.future.length === 0) return
      const next = redo(history)
      set({ history: next, selectedIds: keepValidSelection(next.present, selectedIds), editingTextId: null })
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

    select(ids: string[]) {
      set({ selectedIds: ids, editingTextId: null })
    },

    toggleSelected(id: string) {
      const { selectedIds } = get()
      set({
        selectedIds: selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
        editingTextId: null
      })
    },

    setEditingText(id: string | null) {
      set({ editingTextId: id, selectedIds: id ? [id] : get().selectedIds })
    },

    addElements(elements: DesignElement[], label = 'Add element') {
      actions.change(label, (doc) => {
        doc.elements.push(...elements)
      })
      set({ selectedIds: elements.map((el) => el.id) })
    },

    updateElement(id: string, patch: Partial<DesignElement>, label = 'Edit', mergeKey?: string) {
      actions.change(
        label,
        (doc) => {
          const el = doc.elements.find((e) => e.id === id)
          if (el) Object.assign(el, patch)
        },
        { mergeKey }
      )
    },

    updateElements(patches: Record<string, Partial<DesignElement>>, label = 'Edit', mergeKey?: string) {
      actions.change(
        label,
        (doc) => {
          for (const el of doc.elements) {
            const patch = patches[el.id]
            if (patch) Object.assign(el, patch)
          }
        },
        { mergeKey }
      )
    },

    deleteSelected() {
      const ids = new Set(get().selectedIds)
      if (ids.size === 0) return
      actions.change('Delete', (doc) => {
        doc.elements = doc.elements.filter((el) => !ids.has(el.id) || el.locked)
      })
    },

    arrange(direction: ArrangeDirection) {
      const ids = new Set(get().selectedIds)
      if (ids.size === 0) return
      actions.change('Arrange', (doc) => {
        doc.elements = arrangeElements(doc.elements as DesignElement[], ids, direction) as Draft<DesignElement>[]
      })
    },

    moveLayer(id: string, toIndex: number) {
      actions.change('Reorder layers', (doc) => {
        const from = doc.elements.findIndex((el) => el.id === id)
        if (from < 0) return
        const [el] = doc.elements.splice(from, 1)
        doc.elements.splice(Math.max(0, Math.min(toIndex, doc.elements.length)), 0, el)
      })
    }
  }

  return Object.assign(store, { actions })
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

export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(editorStore, selector)
}

export const selectDocument = (state: EditorState) => state.history?.present ?? null

export const selectIsDirty = (state: EditorState) => {
  if (!state.history) return false
  if (state.forceDirty) return true
  const last = state.history.past[state.history.past.length - 1] ?? null
  return last !== state.savedEntry
}
