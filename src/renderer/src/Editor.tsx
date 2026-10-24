import { useState } from 'react'
import type { DesignDocument } from '@shared/model'
import { Icon, type IconName } from './components/Icon'
import { ExportDialog } from './dialogs/ExportDialog'
import { ResizeDialog } from './dialogs/ResizeDialog'
import { CanvasArea } from './editor/CanvasArea'
import { useEditorShortcuts } from './editor/shortcuts'
import { closeDesign, saveDesign } from './io/projectIo'
import { ElementsPanel } from './panels/ElementsPanel'
import { LayersPanel } from './panels/LayersPanel'
import { PropertiesPanel } from './panels/PropertiesPanel'
import { TextPanel } from './panels/TextPanel'
import { UploadsPanel } from './panels/UploadsPanel'
import { editor, selectIsDirty, useEditor } from './store/editorStore'
import { openDialog, useDialog } from './store/uiStore'

type Tab = 'text' | 'elements' | 'uploads' | 'layers'

const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'elements', label: 'Elements', icon: 'shapes' },
  { id: 'uploads', label: 'Uploads', icon: 'image' },
  { id: 'layers', label: 'Layers', icon: 'layers' }
]

export function Editor({ doc }: { doc: DesignDocument }) {
  const [tab, setTab] = useState<Tab>('text')
  const canUndo = useEditor((s) => (s.history?.past.length ?? 0) > 0)
  const canRedo = useEditor((s) => (s.history?.future.length ?? 0) > 0)
  const dirty = useEditor(selectIsDirty)
  const dialog = useDialog()
  useEditorShortcuts()

  return (
    <div className="editor">
      <header className="topbar">
        <button className="icon-button light" title="Home" onClick={closeDesign}>
          <Icon name="home" />
        </button>
        <div className="topbar-group">
          <button className="icon-button light" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={editor.undo}>
            <Icon name="undo" />
          </button>
          <button className="icon-button light" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={editor.redo}>
            <Icon name="redo" />
          </button>
        </div>
        <div className="topbar-title">
          <input
            aria-label="Design title"
            value={doc.title}
            onChange={(e) =>
              editor.change(
                'Rename design',
                (d) => {
                  d.title = e.target.value
                },
                { mergeKey: 'title' }
              )
            }
          />
          <span className="topbar-meta">
            {doc.width} × {doc.height} px{dirty ? ' · Unsaved changes' : ' · Saved'}
          </span>
        </div>
        <button className="button ghost" title="Change the design size" onClick={() => openDialog('resize')}>
          <Icon name="resize" size={18} /> Resize
        </button>
        <button className="button ghost" title="Save (Ctrl+S)" onClick={() => void saveDesign(false)}>
          <Icon name="save" size={18} /> Save
        </button>
        <button className="button primary" title="Export (Ctrl+E)" onClick={() => openDialog('export')}>
          <Icon name="export" size={18} /> Export
        </button>
      </header>

      <nav className="rail" aria-label="Tools">
        {tabs.map((t) => (
          <button key={t.id} className={`rail-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <aside className="side-panel">
        {tab === 'text' && <TextPanel doc={doc} />}
        {tab === 'elements' && <ElementsPanel doc={doc} />}
        {tab === 'uploads' && <UploadsPanel doc={doc} />}
        {tab === 'layers' && <LayersPanel doc={doc} />}
      </aside>

      <main className="workspace">
        <CanvasArea doc={doc} />
      </main>

      <aside className="properties">
        <PropertiesPanel doc={doc} />
      </aside>

      {dialog === 'export' && <ExportDialog doc={doc} onClose={() => openDialog(null)} />}
      {dialog === 'resize' && <ResizeDialog doc={doc} onClose={() => openDialog(null)} />}
    </div>
  )
}
