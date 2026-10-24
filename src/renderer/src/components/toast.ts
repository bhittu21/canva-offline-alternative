import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error'
}

const toastStore = createStore<{ toasts: Toast[] }>(() => ({ toasts: [] }))
let nextId = 1

export function showToast(message: string, kind: Toast['kind'] = 'info'): void {
  const id = nextId++
  toastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
  setTimeout(() => toastStore.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 7000 : 3000)
}

export function showError(error: unknown, fallback = 'Something went wrong.'): void {
  const message = error instanceof Error ? error.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') : fallback
  showToast(message || fallback, 'error')
}

export function useToasts(): Toast[] {
  return useStore(toastStore, (s) => s.toasts)
}
