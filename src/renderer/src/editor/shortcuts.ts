import { useEffect } from 'react'
import type { DesignElement } from '@shared/model'
import { importImageFiles } from '@renderer/io/projectIo'
import { editor, editorStore } from '@renderer/store/editorStore'
import { duplicateElement } from './elementFactory'

let clipboard: DesignElement[] = []
let pasteCount = 0

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function selectedElements(): DesignElement[] {
  const { history, selectedIds } = editorStore.getState()
  return history?.present.elements.filter((el) => selectedIds.includes(el.id)) ?? []
}

export function duplicateSelection(): void {
  const copies = selectedElements().map((el) => duplicateElement(el, 20))
  if (copies.length > 0) editor.addElements(copies, 'Duplicate')
}

function nudge(dx: number, dy: number): void {
  const patches: Record<string, Partial<DesignElement>> = {}
  for (const el of selectedElements()) {
    if (!el.locked) patches[el.id] = { x: el.x + dx, y: el.y + dy }
  }
  editor.updateElements(patches, 'Move', 'nudge')
}

/** Editor keyboard shortcuts. They are ignored while typing in a text box or field. */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || document.querySelector('.modal')) return
      const ctrl = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (ctrl && key === 'z' && !event.shiftKey) editor.undo()
      else if (ctrl && (key === 'y' || (key === 'z' && event.shiftKey))) editor.redo()
      else if (ctrl && key === 'd') duplicateSelection()
      else if (ctrl && key === 'a') editor.select(editorStore.getState().history?.present.elements.filter((e) => !e.hidden).map((e) => e.id) ?? [])
      else if (ctrl && key === 'c') {
        clipboard = structuredClone(selectedElements())
        pasteCount = 0
        if (clipboard.length === 0) return
      } else if (ctrl && key === ']') editor.arrange(event.shiftKey ? 'front' : 'forward')
      else if (ctrl && key === '[') editor.arrange(event.shiftKey ? 'back' : 'backward')
      else if (key === 'delete' || key === 'backspace') editor.deleteSelected()
      else if (key === 'escape') editor.select([])
      else if (key.startsWith('arrow')) {
        const step = event.shiftKey ? 10 : 1
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
        if (selectedElements().length === 0) return
        nudge(dx, dy)
      } else if (key === 'enter') {
        const [only, ...rest] = selectedElements()
        if (only && rest.length === 0 && only.type === 'text' && !only.locked) editor.setEditingText(only.id)
        else return
      } else return
      event.preventDefault()
    }

    // Pasting: images from the system clipboard first, otherwise elements copied in the app.
    const onPaste = (event: ClipboardEvent) => {
      if (isTyping(event.target) || document.querySelector('.modal') || !editorStore.getState().history) return
      const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
      event.preventDefault()
      if (files.length > 0) {
        void importImageFiles(files)
      } else if (clipboard.length > 0) {
        pasteCount++
        editor.addElements(
          clipboard.map((el) => duplicateElement(el, 20 * pasteCount)),
          'Paste'
        )
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('paste', onPaste)
    }
  }, [])
}
