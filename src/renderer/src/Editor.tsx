import { useEffect, type ReactNode } from 'react'
import {
  BarChart3,
  Bot,
  FolderKanban,
  Frame,
  Image,
  Layers,
  LayoutTemplate,
  Paintbrush,
  Palette,
  Shapes,
  Smile,
  Type,
  Upload
} from 'lucide-react'
import type { DesignDocument } from '@shared/model'
import { CanvasArea } from './editor/CanvasArea'
import { handleKeyDown, handlePaste } from './editor/commands'
import { ContextMenu } from './shell/ContextMenu'
import { TopBar } from './shell/TopBar'
import { BottomBar } from './shell/BottomBar'
import { PanelResizer } from './shell/PanelResizer'
import { Inspector } from './inspector/Inspector'
import { DesignPanel } from './panels/DesignPanel'
import { ElementsPanel } from './panels/ElementsPanel'
import { TextPanel } from './panels/TextPanel'
import { PhotosPanel } from './panels/PhotosPanel'
import { IconsPanel } from './panels/IconsPanel'
import { UploadsPanel } from './panels/UploadsPanel'
import { BackgroundsPanel } from './panels/BackgroundsPanel'
import { FramesPanel } from './panels/FramesPanel'
import { ChartsPanel } from './panels/ChartsPanel'
import { BrandPanel } from './panels/BrandPanel'
import { AiPanel } from './panels/AiPanel'
import { ProjectsPanel } from './panels/ProjectsPanel'
import { LayersPanel } from './panels/LayersPanel'
import { ExportDialog } from './dialogs/ExportDialog'
import { ResizeDialog } from './dialogs/ResizeDialog'
import { SaveTemplateDialog } from './dialogs/SaveTemplateDialog'
import { selectActivePage, useEditor } from './store/editorStore'
import { openDialog, openPanel, useDialog, useUi, type PanelId } from './store/uiStore'

const rail: ({ id: PanelId; label: string; icon: ReactNode; className?: string } | 'sep')[] = [
  { id: 'design', label: 'Design', icon: <LayoutTemplate size={21} /> },
  { id: 'elements', label: 'Elements', icon: <Shapes size={21} /> },
  { id: 'text', label: 'Text', icon: <Type size={21} /> },
  { id: 'photos', label: 'Photos', icon: <Image size={21} /> },
  { id: 'icons', label: 'Icons', icon: <Smile size={21} /> },
  { id: 'uploads', label: 'Uploads', icon: <Upload size={21} /> },
  { id: 'backgrounds', label: 'Background', icon: <Paintbrush size={21} /> },
  { id: 'frames', label: 'Frames', icon: <Frame size={21} /> },
  { id: 'charts', label: 'Charts', icon: <BarChart3 size={21} /> },
  'sep',
  { id: 'brand', label: 'Brand', icon: <Palette size={21} /> },
  { id: 'ai', label: 'AI Studio', icon: <Bot size={21} />, className: 'ai' },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={21} /> },
  { id: 'layers', label: 'Layers', icon: <Layers size={21} /> }
]

function PanelContent({ panel, doc }: { panel: PanelId; doc: DesignDocument }) {
  switch (panel) {
    case 'design':
      return <DesignPanel doc={doc} />
    case 'elements':
      return <ElementsPanel doc={doc} />
    case 'text':
      return <TextPanel doc={doc} />
    case 'photos':
      return <PhotosPanel doc={doc} />
    case 'icons':
      return <IconsPanel doc={doc} />
    case 'uploads':
      return <UploadsPanel doc={doc} />
    case 'backgrounds':
      return <BackgroundsPanel doc={doc} />
    case 'frames':
      return <FramesPanel doc={doc} />
    case 'charts':
      return <ChartsPanel doc={doc} />
    case 'brand':
      return <BrandPanel doc={doc} />
    case 'ai':
      return <AiPanel doc={doc} />
    case 'projects':
      return <ProjectsPanel />
    case 'layers':
      return <LayersPanel doc={doc} />
  }
}

export function Editor({ doc }: { doc: DesignDocument }) {
  const page = useEditor(selectActivePage) ?? doc.pages[0]
  const panel = useUi((s) => s.panel)
  const panelOpen = useUi((s) => s.panelOpen)
  const dialog = useDialog()

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('paste', handlePaste)
    }
  }, [])

  return (
    <div className="editor">
      <TopBar doc={doc} />

      <nav className="rail" aria-label="Panels">
        {rail.map((item, i) =>
          item === 'sep' ? (
            <span key={i} className="rail-sep" />
          ) : (
            <button
              key={item.id}
              className={`rail-item${item.className ? ` ${item.className}` : ''}${panelOpen && panel === item.id ? ' active' : ''}`}
              aria-pressed={panelOpen && panel === item.id}
              onClick={() => openPanel(item.id)}
            >
              <span className="rail-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        )}
      </nav>

      <aside className={`side-panel${panelOpen ? '' : ' closed'}`} aria-label="Side panel">
        {panelOpen && <PanelContent panel={panel} doc={doc} />}
        {panelOpen && <PanelResizer cssVar="--panel-w" edge="right" min={260} max={620} label="Resize side panel" />}
      </aside>

      <main className="workspace">
        <CanvasArea doc={doc} page={page} />
      </main>

      <BottomBar doc={doc} />

      <Inspector doc={doc} page={page} />

      <ContextMenu />
      {dialog === 'export' && <ExportDialog doc={doc} onClose={() => openDialog(null)} />}
      {dialog === 'resize' && <ResizeDialog doc={doc} onClose={() => openDialog(null)} />}
      {dialog === 'save-template' && <SaveTemplateDialog doc={doc} onClose={() => openDialog(null)} />}
    </div>
  )
}
