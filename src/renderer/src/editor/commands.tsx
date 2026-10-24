import type { ReactNode } from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  BringToFront,
  Circle,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FileStack,
  FolderOpen,
  Group,
  Keyboard,
  Lock,
  Maximize,
  Minus,
  Moon,
  Redo2,
  Ruler,
  Save,
  Scaling,
  SendToBack,
  Settings,
  Slash,
  Square,
  Trash2,
  Type,
  Undo2,
  Ungroup,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import type { DesignElement } from '@shared/model'
import { closeDesign, duplicateDesign, importImageFiles, importImagesDialog, openDesignDialog, saveDesign } from '@renderer/io/projectIo'
import { editor, editorStore, selectActivePage, selectedElements } from '@renderer/store/editorStore'
import { openDialog, requestFit, uiStore, updatePrefs, type PanelId, showPanel } from '@renderer/store/uiStore'
import { viewStore, zoomAround } from '@renderer/store/viewStore'
import { cloneElements, createLine, createShape, createText } from './elementFactory'
import { showToast } from '@renderer/components/toast'

/**
 * Every editor action in one list. The keyboard shortcuts, the right-click
 * menu and the command search all run these, so an action always does the
 * same thing (through the same undo history) wherever it is started.
 */

export interface Command {
  id: string
  label: string
  group: 'Edit' | 'Arrange' | 'Align' | 'Insert' | 'View' | 'File' | 'Panels'
  icon?: ReactNode
  shortcut?: string
  keywords?: string
  enabled?: () => boolean
  run: () => void
}

let clipboard: DesignElement[] = []
let pasteCount = 0

const hasDoc = () => !!editorStore.getState().history
const hasSelection = () => editorStore.getState().selectedIds.length > 0
const selectionCount = () => editorStore.getState().selectedIds.length
const doc = () => editorStore.getState().history?.present
const brandFonts = () => {
  const brand = uiStore.getState().prefs?.brand
  return { heading: brand?.headingFont ?? 'Poppins', body: brand?.bodyFont ?? 'Inter' }
}

export function copySelection(): void {
  clipboard = structuredClone(selectedElements())
  pasteCount = 0
}

export function pasteElements(): void {
  if (clipboard.length === 0) return
  pasteCount++
  editor.addElements(cloneElements(clipboard, 20 * pasteCount), 'Paste')
}

export function duplicateSelection(): void {
  const copies = cloneElements(selectedElements(), 20)
  if (copies.length > 0) editor.addElements(copies, 'Duplicate')
}

function nudge(dx: number, dy: number): void {
  editor.updateSelected((el) => (el.locked ? null : { x: el.x + dx, y: el.y + dy }), 'Move', 'nudge')
}

function toggleHidden(): void {
  const items = selectedElements()
  const hide = !items.every((el) => el.hidden)
  editor.updateSelected({ hidden: hide }, hide ? 'Hide' : 'Show')
  if (hide) editor.select([])
}

export const commands: Command[] = [
  // File
  { id: 'save', label: 'Save', group: 'File', icon: <Save size={16} />, shortcut: 'Ctrl+S', enabled: hasDoc, run: () => void saveDesign(false) },
  { id: 'save-as', label: 'Save as…', group: 'File', icon: <Save size={16} />, shortcut: 'Ctrl+Shift+S', enabled: hasDoc, run: () => void saveDesign(true) },
  { id: 'duplicate-design', label: 'Make a copy of this design', group: 'File', icon: <FileStack size={16} />, enabled: hasDoc, run: () => void duplicateDesign() },
  { id: 'open', label: 'Open design…', group: 'File', icon: <FolderOpen size={16} />, shortcut: 'Ctrl+O', run: () => void openDesignDialog() },
  { id: 'export', label: 'Export / download…', group: 'File', icon: <Download size={16} />, shortcut: 'Ctrl+E', enabled: hasDoc, run: () => openDialog('export') },
  { id: 'resize', label: 'Resize design…', group: 'File', icon: <Scaling size={16} />, enabled: hasDoc, run: () => openDialog('resize') },
  { id: 'import', label: 'Import images…', group: 'File', icon: <FilePlus2 size={16} />, shortcut: 'Ctrl+I', enabled: hasDoc, run: () => void importImagesDialog() },
  { id: 'save-template', label: 'Save as template…', group: 'File', icon: <FileStack size={16} />, enabled: hasDoc, run: () => openDialog('save-template') },
  { id: 'home', label: 'Close design and go home', group: 'File', enabled: hasDoc, run: () => void closeDesign() },
  { id: 'settings', label: 'Settings', group: 'File', icon: <Settings size={16} />, run: () => openDialog('settings') },
  { id: 'shortcuts', label: 'Keyboard shortcuts', group: 'File', icon: <Keyboard size={16} />, shortcut: '?', run: () => openDialog('shortcuts') },

  // Edit
  { id: 'undo', label: 'Undo', group: 'Edit', icon: <Undo2 size={16} />, shortcut: 'Ctrl+Z', enabled: () => (editorStore.getState().history?.past.length ?? 0) > 0, run: editor.undo },
  { id: 'redo', label: 'Redo', group: 'Edit', icon: <Redo2 size={16} />, shortcut: 'Ctrl+Y', enabled: () => (editorStore.getState().history?.future.length ?? 0) > 0, run: editor.redo },
  { id: 'copy', label: 'Copy', group: 'Edit', icon: <Copy size={16} />, shortcut: 'Ctrl+C', enabled: hasSelection, run: copySelection },
  { id: 'paste', label: 'Paste', group: 'Edit', icon: <ClipboardPaste size={16} />, shortcut: 'Ctrl+V', enabled: () => clipboard.length > 0 && hasDoc(), run: pasteElements },
  { id: 'duplicate', label: 'Duplicate', group: 'Edit', icon: <CopyPlus size={16} />, shortcut: 'Ctrl+D', enabled: hasSelection, run: duplicateSelection },
  { id: 'delete', label: 'Delete', group: 'Edit', icon: <Trash2 size={16} />, shortcut: 'Delete', enabled: hasSelection, run: editor.deleteSelected },
  { id: 'select-all', label: 'Select all', group: 'Edit', shortcut: 'Ctrl+A', enabled: hasDoc, run: editor.selectAll },
  { id: 'lock', label: 'Lock or unlock', group: 'Edit', icon: <Lock size={16} />, shortcut: 'Ctrl+Shift+L', enabled: hasSelection, run: editor.toggleLock },
  { id: 'hide', label: 'Hide or show', group: 'Edit', icon: <EyeOff size={16} />, shortcut: 'Ctrl+Shift+H', enabled: hasSelection, run: toggleHidden },
  { id: 'show-all', label: 'Show all hidden elements', group: 'Edit', icon: <Eye size={16} />, enabled: hasDoc, run: () => editor.changePage('Show all', (p) => p.elements.forEach((el) => (el.hidden = false))) },

  // Arrange
  { id: 'group', label: 'Group', group: 'Arrange', icon: <Group size={16} />, shortcut: 'Ctrl+G', enabled: () => selectionCount() > 1, run: editor.group },
  { id: 'ungroup', label: 'Ungroup', group: 'Arrange', icon: <Ungroup size={16} />, shortcut: 'Ctrl+Shift+G', enabled: () => selectedElements().some((el) => el.groupId), run: editor.ungroup },
  { id: 'front', label: 'Bring to front', group: 'Arrange', icon: <BringToFront size={16} />, shortcut: 'Ctrl+Shift+]', enabled: hasSelection, run: () => editor.arrange('front') },
  { id: 'forward', label: 'Bring forward', group: 'Arrange', icon: <ArrowUpToLine size={16} />, shortcut: 'Ctrl+]', enabled: hasSelection, run: () => editor.arrange('forward') },
  { id: 'backward', label: 'Send backward', group: 'Arrange', icon: <ArrowDownToLine size={16} />, shortcut: 'Ctrl+[', enabled: hasSelection, run: () => editor.arrange('backward') },
  { id: 'back', label: 'Send to back', group: 'Arrange', icon: <SendToBack size={16} />, shortcut: 'Ctrl+Shift+[', enabled: hasSelection, run: () => editor.arrange('back') },

  // Align
  { id: 'align-left', label: 'Align left', group: 'Align', icon: <AlignStartVertical size={16} />, enabled: hasSelection, run: () => editor.align('left') },
  { id: 'align-center', label: 'Align centre', group: 'Align', icon: <AlignCenterVertical size={16} />, enabled: hasSelection, run: () => editor.align('center') },
  { id: 'align-right', label: 'Align right', group: 'Align', icon: <AlignEndVertical size={16} />, enabled: hasSelection, run: () => editor.align('right') },
  { id: 'align-top', label: 'Align top', group: 'Align', icon: <AlignStartHorizontal size={16} />, enabled: hasSelection, run: () => editor.align('top') },
  { id: 'align-middle', label: 'Align middle', group: 'Align', icon: <AlignCenterHorizontal size={16} />, enabled: hasSelection, run: () => editor.align('middle') },
  { id: 'align-bottom', label: 'Align bottom', group: 'Align', icon: <AlignEndHorizontal size={16} />, enabled: hasSelection, run: () => editor.align('bottom') },
  { id: 'distribute-x', label: 'Space evenly across', group: 'Align', icon: <AlignHorizontalDistributeCenter size={16} />, enabled: () => selectionCount() > 2, run: () => editor.distribute('x') },
  { id: 'distribute-y', label: 'Space evenly down', group: 'Align', icon: <AlignVerticalDistributeCenter size={16} />, enabled: () => selectionCount() > 2, run: () => editor.distribute('y') },

  // Insert
  { id: 'add-text', label: 'Add a text box', group: 'Insert', icon: <Type size={16} />, shortcut: 'T', enabled: hasDoc, run: () => editor.addElements([createText(doc()!, 'body', brandFonts())], 'Add text') },
  { id: 'add-rect', label: 'Add a rectangle', group: 'Insert', icon: <Square size={16} />, shortcut: 'R', enabled: hasDoc, run: () => editor.addElements([createShape(doc()!, 'rect')], 'Add rectangle') },
  { id: 'add-circle', label: 'Add a circle', group: 'Insert', icon: <Circle size={16} />, shortcut: 'C', enabled: hasDoc, run: () => editor.addElements([createShape(doc()!, 'ellipse')], 'Add circle') },
  { id: 'add-line', label: 'Add a line', group: 'Insert', icon: <Slash size={16} />, shortcut: 'L', enabled: hasDoc, run: () => editor.addElements([createLine(doc()!)], 'Add line') },
  { id: 'add-page', label: 'Add a page', group: 'Insert', icon: <FilePlus2 size={16} />, enabled: hasDoc, run: () => editor.addPage() },
  { id: 'duplicate-page', label: 'Duplicate page', group: 'Insert', icon: <CopyPlus size={16} />, enabled: hasDoc, run: () => editor.duplicatePage(editorStore.getState().activePageId!) },
  {
    id: 'delete-page',
    label: 'Delete page',
    group: 'Insert',
    icon: <Trash2 size={16} />,
    enabled: () => (doc()?.pages.length ?? 0) > 1,
    run: () => editor.deletePage(editorStore.getState().activePageId!)
  },

  // View
  { id: 'zoom-in', label: 'Zoom in', group: 'View', icon: <ZoomIn size={16} />, shortcut: 'Ctrl++', enabled: hasDoc, run: () => zoomAround(viewStore.getState().zoom * 1.25) },
  { id: 'zoom-out', label: 'Zoom out', group: 'View', icon: <ZoomOut size={16} />, shortcut: 'Ctrl+-', enabled: hasDoc, run: () => zoomAround(viewStore.getState().zoom / 1.25) },
  { id: 'zoom-100', label: 'Actual size (100%)', group: 'View', enabled: hasDoc, run: () => zoomAround(1) },
  { id: 'fit', label: 'Fit page to screen', group: 'View', icon: <Maximize size={16} />, shortcut: 'Ctrl+0', enabled: hasDoc, run: () => requestFit('page') },
  { id: 'fit-selection', label: 'Zoom to selection', group: 'View', icon: <Minus size={16} />, shortcut: 'Shift+2', enabled: hasSelection, run: () => requestFit('selection') },
  {
    id: 'rulers',
    label: 'Show or hide rulers',
    group: 'View',
    icon: <Ruler size={16} />,
    shortcut: 'Ctrl+R',
    run: () => void updatePrefs({ showRulers: !(uiStore.getState().prefs?.showRulers ?? true) })
  },
  {
    id: 'snapping',
    label: 'Turn snapping on or off',
    group: 'View',
    run: () => {
      const on = !(uiStore.getState().prefs?.snapping ?? true)
      void updatePrefs({ snapping: on })
      showToast(on ? 'Snapping on' : 'Snapping off')
    }
  },
  {
    id: 'theme',
    label: 'Switch light or dark theme',
    group: 'View',
    icon: <Moon size={16} />,
    run: () => void updatePrefs({ theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark' })
  },
  { id: 'clear-guides', label: 'Remove all guides', group: 'View', enabled: () => !!selectActivePage(editorStore.getState())?.guides, run: () => editor.changePage('Remove guides', (p) => delete p.guides) }
]

const panelCommands: { id: PanelId; label: string }[] = [
  { id: 'design', label: 'Templates' },
  { id: 'elements', label: 'Elements' },
  { id: 'text', label: 'Text' },
  { id: 'photos', label: 'Photos' },
  { id: 'icons', label: 'Icons' },
  { id: 'uploads', label: 'Uploads' },
  { id: 'backgrounds', label: 'Backgrounds' },
  { id: 'frames', label: 'Frames and mockups' },
  { id: 'charts', label: 'Charts and tables' },
  { id: 'brand', label: 'Brand kit' },
  { id: 'ai', label: 'AI Studio' },
  { id: 'layers', label: 'Layers' }
]

for (const p of panelCommands) {
  commands.push({ id: `panel-${p.id}`, label: `Open ${p.label}`, group: 'Panels', enabled: hasDoc, run: () => showPanel(p.id) })
}

export function command(id: string): Command {
  const c = commands.find((x) => x.id === id)
  if (!c) throw new Error(`Unknown command ${id}`)
  return c
}

export function runCommand(id: string): void {
  const c = command(id)
  if (!c.enabled || c.enabled()) c.run()
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Editor keyboard shortcuts. They are ignored while typing in a text box or field, or while a dialog is open. */
export function handleKeyDown(event: KeyboardEvent): void {
  if (isTyping(event.target)) return
  if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    uiStore.setState({ palette: !uiStore.getState().palette })
    return
  }
  if (document.querySelector('.modal, .palette') || !hasDoc()) return
  const ctrl = event.ctrlKey || event.metaKey
  const shift = event.shiftKey
  const key = event.key.toLowerCase()
  const run = (id: string) => {
    event.preventDefault()
    runCommand(id)
  }

  if (ctrl && key === 'z' && !shift) return run('undo')
  if (ctrl && (key === 'y' || (key === 'z' && shift))) return run('redo')
  if (ctrl && key === 'd') return run('duplicate')
  if (ctrl && key === 'a') return run('select-all')
  if (ctrl && key === 'c') return run('copy')
  if (ctrl && key === 'x') {
    event.preventDefault()
    copySelection()
    editor.deleteSelected()
    return
  }
  if (ctrl && key === 'g') return run(shift ? 'ungroup' : 'group')
  if (ctrl && shift && key === 'l') return run('lock')
  if (ctrl && shift && key === 'h') return run('hide')
  if (ctrl && key === 'r') return run('rulers')
  if (ctrl && (key === '=' || key === '+')) return run('zoom-in')
  if (ctrl && key === '-') return run('zoom-out')
  if (ctrl && key === '0') return run('fit')
  if (ctrl && (event.code === 'BracketRight' || key === ']')) return run(shift ? 'front' : 'forward')
  if (ctrl && (event.code === 'BracketLeft' || key === '[')) return run(shift ? 'back' : 'backward')
  if (ctrl || event.altKey) return

  if (shift && event.code === 'Digit2') return run('fit-selection')
  if (shift && event.code === 'Digit1') return run('fit')
  if (key === '?' || (shift && event.code === 'Slash')) return run('shortcuts')
  if (key === 'delete' || key === 'backspace') return run('delete')
  if (key === 'escape') {
    editor.select([])
    return
  }
  if (key.startsWith('arrow')) {
    if (!hasSelection()) return
    event.preventDefault()
    const step = shift ? 10 : 1
    nudge(key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0, key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0)
    return
  }
  if (key === 'enter') {
    const [only, ...rest] = selectedElements()
    if (only && rest.length === 0 && only.type === 'text' && !only.locked) {
      event.preventDefault()
      editor.setEditingText(only.id)
    }
    return
  }
  if (key === 't') return run('add-text')
  if (key === 'r') return run('add-rect')
  if (key === 'c') return run('add-circle')
  if (key === 'l') return run('add-line')
}

/** Pasting: images from the Windows clipboard first, otherwise elements copied in the app. */
export function handlePaste(event: ClipboardEvent): void {
  if (isTyping(event.target) || document.querySelector('.modal, .palette') || !hasDoc()) return
  const files = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'))
  event.preventDefault()
  if (files.length > 0) void importImageFiles(files)
  else pasteElements()
}
