import type { EditorApi } from '../shared/ipc'

declare global {
  interface Window {
    api: EditorApi
  }
}
