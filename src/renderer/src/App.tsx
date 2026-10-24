import { useEffect } from 'react'
import { Toasts } from './components/Toasts'
import { Editor } from './Editor'
import { HomeScreen } from './HomeScreen'
import { closeDesign, importImagesDialog, newDesign, openDesignDialog, openDesignPath, saveDesign } from './io/projectIo'
import { SettingsDialog } from './dialogs/SettingsDialog'
import { openDialog, useDialog } from './store/uiStore'
import { editor, editorStore, selectDocument, selectIsDirty, useEditor } from './store/editorStore'

export function App() {
  const doc = useEditor(selectDocument)
  const dirty = useEditor(selectIsDirty)
  const dialog = useDialog()

  // Keep the window title and the "unsaved changes" warning on close up to date.
  useEffect(() => {
    window.api.setDocumentState({ dirty, title: doc?.title ?? '' })
  }, [dirty, doc?.title])

  useEffect(() => {
    const offMenu = window.api.onMenuCommand((command) => {
      const hasDoc = !!editorStore.getState().history
      switch (command) {
        case 'new':
          openDialog(null)
          if (hasDoc) closeDesign()
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
        case 'close-design':
          if (hasDoc) closeDesign()
          break
      }
    })
    const offOpen = window.api.onOpenFile((path) => void openDesignPath(path))
    return () => {
      offMenu()
      offOpen()
    }
  }, [])

  return (
    <>
      {doc ? <Editor doc={doc} /> : <HomeScreen onCreate={newDesign} />}
      {dialog === 'settings' && <SettingsDialog onClose={() => openDialog(null)} />}
      <Toasts />
    </>
  )
}
