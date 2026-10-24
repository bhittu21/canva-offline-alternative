import { useRef, useState } from 'react'
import {
  ChevronDown,
  Cloud,
  Download,
  FileStack,
  FilePlus2,
  FolderOpen,
  ImagePlus,
  Link2,
  Mail,
  Menu as MenuIcon,
  Redo2,
  Save,
  Scaling,
  Search,
  Settings,
  Share2,
  Sparkles,
  Undo2,
  Users
} from 'lucide-react'
import type { DesignDocument } from '@shared/model'
import { Menu, type MenuEntry } from '@renderer/components/ui'
import { runCommand } from '@renderer/editor/commands'
import { closeDesign, newDesign, useSaveStatus } from '@renderer/io/projectIo'
import { editor, selectIsDirty, useEditor } from '@renderer/store/editorStore'
import { openDialog, uiStore, usePrefs } from '@renderer/store/uiStore'
import { BrandMark } from './BrandMark'

export function TopBar({ doc }: { doc: DesignDocument }) {
  const canUndo = useEditor((s) => (s.history?.past.length ?? 0) > 0)
  const canRedo = useEditor((s) => (s.history?.future.length ?? 0) > 0)
  const dirty = useEditor(selectIsDirty)
  const filePath = useEditor((s) => s.filePath)
  const save = useSaveStatus()
  const prefs = usePrefs()
  const [menu, setMenu] = useState<{ kind: 'file' | 'share'; x: number; y: number } | null>(null)
  const fileRef = useRef<HTMLButtonElement>(null)
  const shareRef = useRef<HTMLButtonElement>(null)

  const open = (kind: 'file' | 'share', el: HTMLElement | null) => {
    const r = el?.getBoundingClientRect()
    if (r) setMenu({ kind, x: kind === 'share' ? r.right - 260 : r.left, y: r.bottom + 6 })
  }

  let status: string
  if (save.status === 'saving') status = 'Saving…'
  else if (dirty && save.status === 'draft') status = 'Unsaved · recovery copy kept'
  else if (dirty) status = filePath ? 'Unsaved changes' : 'Not saved yet'
  else if (save.status === 'autosaved') status = 'All changes saved automatically'
  else status = filePath ? 'All changes saved' : 'Saved'

  const fileItems: (MenuEntry | 'sep')[] = [
    { label: 'New design', icon: <FilePlus2 size={16} />, shortcut: 'Ctrl+N', onSelect: () => void newDesign(doc.width, doc.height, 'Untitled design') },
    { label: 'Open…', icon: <FolderOpen size={16} />, shortcut: 'Ctrl+O', onSelect: () => runCommand('open') },
    'sep',
    { label: 'Save', icon: <Save size={16} />, shortcut: 'Ctrl+S', onSelect: () => runCommand('save') },
    { label: 'Save as…', shortcut: 'Ctrl+Shift+S', onSelect: () => runCommand('save-as') },
    { label: 'Make a copy', icon: <FileStack size={16} />, onSelect: () => runCommand('duplicate-design') },
    { label: 'Save as template…', onSelect: () => runCommand('save-template') },
    'sep',
    { label: 'Import images…', icon: <ImagePlus size={16} />, shortcut: 'Ctrl+I', onSelect: () => runCommand('import') },
    { label: 'Resize design…', icon: <Scaling size={16} />, onSelect: () => runCommand('resize') },
    { label: 'Export / download…', icon: <Download size={16} />, shortcut: 'Ctrl+E', onSelect: () => runCommand('export') },
    'sep',
    { label: 'Search commands…', icon: <Search size={16} />, shortcut: 'Ctrl+K', onSelect: () => uiStore.setState({ palette: true }) },
    { label: 'Settings', icon: <Settings size={16} />, onSelect: () => openDialog('settings') },
    { label: 'Close design', onSelect: () => void closeDesign() }
  ]

  const shareItems: (MenuEntry | 'sep')[] = [
    { label: 'Download (PNG, JPG, PDF, SVG…)', icon: <Download size={16} />, onSelect: () => openDialog('export') },
    { label: 'Save project file', icon: <Save size={16} />, onSelect: () => runCommand('save') },
    'sep',
    { label: 'Share link (needs cloud, not in this offline app)', icon: <Link2 size={16} />, disabled: true, onSelect: () => {} },
    { label: 'Invite people (not available offline)', icon: <Users size={16} />, disabled: true, onSelect: () => {} },
    { label: 'Email (not available)', icon: <Mail size={16} />, disabled: true, onSelect: () => {} },
    { label: 'Cloud sync (planned)', icon: <Cloud size={16} />, disabled: true, onSelect: () => {} }
  ]

  return (
    <header className="topbar">
      <button className="brand" title="Home" onClick={() => void closeDesign()} data-tip="Back to home">
        <BrandMark />
        <span className="brand-name">Design Studio</span>
      </button>
      <button ref={fileRef} className="btn ghost sm" onClick={() => open('file', fileRef.current)}>
        <MenuIcon size={15} /> File
      </button>
      <span className="topbar-sep" />
      <button className="icon-btn" data-tip="Undo (Ctrl+Z)" aria-label="Undo" disabled={!canUndo} onClick={editor.undo}>
        <Undo2 size={18} />
      </button>
      <button className="icon-btn" data-tip="Redo (Ctrl+Y)" aria-label="Redo" disabled={!canRedo} onClick={editor.redo}>
        <Redo2 size={18} />
      </button>
      <span className="topbar-sep" />
      <div className="doc-title">
        <input
          aria-label="Design title"
          value={doc.title}
          spellCheck={false}
          onChange={(e) =>
            editor.change(
              'Rename design',
              (d) => {
                d.title = e.target.value
              },
              { mergeKey: 'title' }
            )
          }
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <span className={`save-state${dirty ? ' dirty' : ''}`}>
          <span className="dot" />
          {status}
          {prefs?.autosave && filePath ? ' · Autosave on' : ''}
        </span>
      </div>
      <span className="topbar-spacer" />
      <button className="dims-chip" data-tip="Resize or create a version in another size" onClick={() => openDialog('resize')}>
        <Scaling size={14} />
        <span className="dims-text">
          {doc.width} × {doc.height} px
        </span>
      </button>
      <button className="icon-btn" data-tip="Search commands (Ctrl+K)" aria-label="Search commands" onClick={() => uiStore.setState({ palette: true })}>
        <Search size={18} />
      </button>
      <button className="icon-btn" data-tip="Settings" aria-label="Settings" onClick={() => openDialog('settings')}>
        <Settings size={18} />
      </button>
      <button className="btn soft" onClick={() => uiStore.setState({ panel: 'ai', panelOpen: true })}>
        <Sparkles size={16} /> AI Studio
      </button>
      <button ref={shareRef} className="btn" onClick={() => open('share', shareRef.current)}>
        <Share2 size={16} /> Share <ChevronDown size={14} />
      </button>
      <button className="btn primary" onClick={() => openDialog('export')}>
        <Download size={16} /> Export
      </button>
      {menu && <Menu x={menu.x} y={menu.y} items={menu.kind === 'file' ? fileItems : shareItems} onClose={() => setMenu(null)} />}
    </header>
  )
}
