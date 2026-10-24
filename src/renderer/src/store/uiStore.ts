import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type DialogName = 'export' | 'resize' | null

const uiStore = createStore<{ dialog: DialogName }>(() => ({ dialog: null }))

export function openDialog(dialog: DialogName): void {
  uiStore.setState({ dialog })
}

export function useDialog(): DialogName {
  return useStore(uiStore, (s) => s.dialog)
}
