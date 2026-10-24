import { useEffect, useState } from 'react'
import { FileStack, FolderOpen, FolderSearch, Save } from 'lucide-react'
import type { RecentFile } from '@shared/ipc'
import { Empty, SearchInput, SectionHead } from '@renderer/components/ui'
import { duplicateDesign, openDesignDialog, openDesignPath, saveDesign } from '@renderer/io/projectIo'
import { useEditor } from '@renderer/store/editorStore'
import { PanelFrame } from './common'

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return new Date(iso).toLocaleDateString()
}

/** Recent designs on this PC, and file actions for the open one. */
export function ProjectsPanel() {
  const filePath = useEditor((s) => s.filePath)
  const [recent, setRecent] = useState<RecentFile[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    window.api.listRecentFiles().then(setRecent).catch(() => setRecent([]))
  }, [filePath])

  const shown = (recent ?? []).filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <PanelFrame title="My projects" head={<SearchInput value={query} onChange={setQuery} placeholder="Search recent designs" />}>
      <section className="panel-section">
        <div className="stack" style={{ gap: 6 }}>
          <button className="btn block" onClick={() => void saveDesign(false)}>
            <Save size={16} /> {filePath ? 'Save' : 'Save to a file…'}
          </button>
          <button className="btn block" onClick={() => void duplicateDesign()}>
            <FileStack size={16} /> Make a copy
          </button>
          <button className="btn block" onClick={() => void openDesignDialog()}>
            <FolderOpen size={16} /> Open a design file…
          </button>
          {filePath && (
            <button className="btn ghost block" onClick={() => window.api.showInFolder(filePath)}>
              <FolderSearch size={16} /> Show this file in Explorer
            </button>
          )}
        </div>
      </section>
      <section className="panel-section">
        <SectionHead title="Recent designs" />
        {recent && shown.length === 0 && <Empty title={query ? 'No designs match' : 'No recent designs yet'}>Saved designs appear here.</Empty>}
        <div className="tile-grid cols-2">
          {shown.map((r) => (
            <button key={r.path} className={`thumb-card${r.path === filePath ? ' current' : ''}`} title={r.path} onClick={() => r.path !== filePath && void openDesignPath(r.path)}>
              <span className="thumb">{r.thumbnail ? <img src={r.thumbnail} alt="" /> : <FileStack size={22} />}</span>
              <span className="thumb-title">{r.title || 'Untitled design'}</span>
              <span className="thumb-meta">{r.path === filePath ? 'Open now' : timeAgo(r.openedAt)}</span>
            </button>
          ))}
        </div>
      </section>
    </PanelFrame>
  )
}
