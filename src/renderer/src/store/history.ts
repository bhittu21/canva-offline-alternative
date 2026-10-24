import { applyPatches, enablePatches, produceWithPatches, type Draft, type Objectish, type Patch } from 'immer'

enablePatches()

export interface HistoryEntry {
  label: string
  patches: Patch[]
  inverse: Patch[]
  /** Consecutive changes with the same key (typing a number, dragging a colour slider) merge into one undo step. */
  mergeKey?: string
  time: number
}

export interface History<T extends Objectish> {
  present: T
  past: HistoryEntry[]
  future: HistoryEntry[]
}

export const MAX_HISTORY = 200
export const MERGE_WINDOW_MS = 1500

export interface ChangeOptions {
  mergeKey?: string
  now?: number
}

export function createHistory<T extends Objectish>(present: T): History<T> {
  return { present, past: [], future: [] }
}

/**
 * Applies a change and records it. Returns the same history object when the
 * recipe changed nothing, so no empty undo steps are created.
 */
export function applyChange<T extends Objectish>(
  history: History<T>,
  label: string,
  recipe: (draft: Draft<T>) => void,
  options: ChangeOptions = {}
): History<T> {
  const [next, patches, inverse] = produceWithPatches(history.present, recipe)
  if (patches.length === 0) return history

  const now = options.now ?? Date.now()
  const last = history.past[history.past.length - 1]
  const merge =
    options.mergeKey !== undefined &&
    last?.mergeKey === options.mergeKey &&
    history.future.length === 0 &&
    now - last.time <= MERGE_WINDOW_MS

  let past: HistoryEntry[]
  if (merge) {
    // A new object, so "is this the saved state?" checks by identity still work.
    const merged: HistoryEntry = {
      label: last.label,
      patches: [...last.patches, ...patches],
      inverse: [...inverse, ...last.inverse],
      mergeKey: last.mergeKey,
      time: now
    }
    past = [...history.past.slice(0, -1), merged]
  } else {
    past = [...history.past, { label, patches, inverse, mergeKey: options.mergeKey, time: now }]
    if (past.length > MAX_HISTORY) past = past.slice(past.length - MAX_HISTORY)
  }
  return { present: next, past, future: [] }
}

export function undo<T extends Objectish>(history: History<T>): History<T> {
  const entry = history.past[history.past.length - 1]
  if (!entry) return history
  return {
    present: applyPatches(history.present, entry.inverse),
    past: history.past.slice(0, -1),
    future: [entry, ...history.future]
  }
}

export function redo<T extends Objectish>(history: History<T>): History<T> {
  const entry = history.future[0]
  if (!entry) return history
  return {
    present: applyPatches(history.present, entry.patches),
    // Stop merging into an entry that was undone and redone.
    past: [...history.past, { ...entry, mergeKey: undefined }],
    future: history.future.slice(1)
  }
}
