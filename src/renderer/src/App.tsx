import { useEffect } from 'react'
import { Toasts } from './components/Toasts'
import { Editor } from './Editor'
import { HomeScreen } from './HomeScreen'
import { closeDesign, duplicateDesign, importImagesDialog, newDesign, openDesignDialog, openDesignPath, saveDesign, startAutosave } from './io/projectIo'
import { SettingsDialog } from './dialogs/SettingsDialog'
import { ShortcutsDialog } from './dialogs/ShortcutsDialog'
import { CommandPalette } from './shell/CommandPalette'
import { ConfirmHost } from './shell/ConfirmHost'
import { loadPrefs, openDialog, uiStore, useDialog, usePrefs } from './store/uiStore'
import { editor, editorStore, selectDocument, selectIsDirty, useEditor } from './store/editorStore'

function useTheme(): void {
  const theme = usePrefs()?.theme ?? 'light'
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

export function App() {
  const doc = useEditor(selectDocument)
  const dirty = useEditor(selectIsDirty)
  const dialog = useDialog()
  useTheme()

  // Keep the window title and the "unsaved changes" warning on close up to date.
  useEffect(() => {
    window.api.setDocumentState({ dirty, title: doc?.title ?? '' })
  }, [dirty, doc?.title])

  useEffect(() => {
    void loadPrefs().catch(() => undefined)
    const stopAutosave = startAutosave()
    const offMenu = window.api.onMenuCommand((command) => {
      const hasDoc = !!editorStore.getState().history
      switch (command) {
        case 'new':
          openDialog(null)
          if (hasDoc) void closeDesign()
          break
        case 'open':
          void openDesignDialog()
          break
        case 'save':
          if (hasDoc) void saveDesign(false)
          break
        case 'save-as':
          if (hasDoc) void saveDesign(true)
          break
        case 'duplicate':
          if (hasDoc) void duplicateDesign()
          break
        case 'import-image':
          if (hasDoc) void importImagesDialog()
          break
        case 'undo':
          editor.undo()
          break
        case 'redo':
          editor.redo()
          break
        case 'export':
          if (hasDoc) openDialog('export')
          break
        case 'settings':
          openDialog('settings')
          break
        case 'command-palette':
          uiStore.setState({ palette: !uiStore.getState().palette })
          break
        case 'close-design':
          if (hasDoc) void closeDesign()
          break
      }
    })
    const offOpen = window.api.onOpenFile((path) => void openDesignPath(path))
    return () => {
      stopAutosave()
      offMenu()
      offOpen()
    }
  }, [])

  return (
    <>
      {doc ? <Editor doc={doc} /> : <HomeScreen onCreate={(w, h, title) => void newDesign(w, h, title)} />}
      {dialog === 'settings' && <SettingsDialog onClose={() => openDialog(null)} />}
      {dialog === 'shortcuts' && <ShortcutsDialog onClose={() => openDialog(null)} />}
      <CommandPalette />
      <ConfirmHost />
      <Toasts />
    </>
  )
}
