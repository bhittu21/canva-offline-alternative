import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

/** Bumped whenever the uploads library or templates change, so panels reload them. */
const store = createStore<{ version: number }>(() => ({ version: 0 }))

export function bumpLibrary(): void {
  store.setState((s) => ({ version: s.version + 1 }))
}

export function useLibraryVersion(): number {
  return useStore(store, (s) => s.version)
}
