import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileImage,
  FileText,
  FolderOpen,
  Home,
  Image,
  MonitorPlay,
  LayoutTemplate,
  Monitor,
  Plus,
  Presentation,
  RotateCcw,
  Settings,
  Smartphone,
  Trash2
} from 'lucide-react'
import type { RecentFile, RecoveryItem, TemplateItem } from '@shared/ipc'
import { canvasPresets } from '@shared/presets'
import { Empty, LoadMore, Menu, NumberField, SearchInput } from './components/ui'
import { showError } from './components/toast'
import { useTabs } from './io/tabs'
import { openAsNewDesign, openDesignDialog, openDesignPath, openRecovered, openUserTemplate } from './io/projectIo'
import { builtInTemplates, searchTemplates, templateCategories, templateDocument, type BuiltInTemplate, type TemplateCategory } from './library/templates'
import { useNearView, usePaged, useTemplateThumb } from './library/templateThumbs'
import { loadFonts } from './fonts/fontList'
import { BrandMark } from './shell/BrandMark'
import { timeAgo } from './panels/ProjectsPanel'
import { bumpLibrary, useLibraryVersion } from './store/libraryStore'
import { confirmAction, openDialog } from './store/uiStore'

const MAX_SIDE = 10000

type View = 'home' | 'templates' | 'projects'

const quick = [
  { id: 'instagram-post', label: 'Social post', icon: <Image size={22} />, color: '#e1306c' },
  { id: 'instagram-story', label: 'Story', icon: <Smartphone size={22} />, color: '#c026d3' },
  { id: 'presentation', label: 'Presentation', icon: <Presentation size={22} />, color: '#ff7a59' },
  { id: 'youtube-thumbnail', label: 'Video thumbnail', icon: <MonitorPlay size={22} />, color: '#e62117' },
  { id: 'a4-portrait', label: 'A4 document', icon: <FileText size={22} />, color: '#2856d8' },
  { id: 'poster', label: 'Poster', icon: <FileImage size={22} />, color: '#12a37f' },
  { id: 'facebook-post', label: 'Banner', icon: <Monitor size={22} />, color: '#0f172a' }
]

function TemplateCard({ template }: { template: BuiltInTemplate }) {
  const ref = useRef<HTMLButtonElement>(null)
  const url = useTemplateThumb(template, 320, useNearView(ref))
  const open = async () => {
    await loadFonts()
    await openAsNewDesign(templateDocument(template))
  }
  return (
    <button ref={ref} className="design-card" onClick={() => void open()} title={`Start from “${template.title}”`}>
      <span className="thumb">{url ? <img src={url} alt="" /> : <span className="skeleton" style={{ width: '70%', height: '70%' }} />}</span>
      <span className="title">{template.title}</span>
      <span className="meta">
        {template.width} × {template.height}
        {(template.pageCount ?? 1) > 1 ? ` · ${template.pageCount} pages` : ''}
      </span>
    </button>
  )
}

/** The start screen: create, start from a template, reopen recent work or recover unsaved work. */
export function HomeScreen({ onCreate }: { onCreate: (width: number, height: number, title?: string) => void }) {
  const [view, setView] = useState<View>('home')
  const [recent, setRecent] = useState<RecentFile[] | null>(null)
  const [recovery, setRecovery] = useState<RecoveryItem[]>([])
  const [mine, setMine] = useState<TemplateItem[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all')
  const [custom, setCustom] = useState({ width: 1080, height: 1080 })
  const [menu, setMenu] = useState<{ x: number; y: number; file: RecentFile } | null>(null)
  const version = useLibraryVersion()
  // Unsaved work of open tabs is in the tab bar already; only older copies are offered here.
  const tabIds = useTabs((s) => s.tabs.map((t) => t.id).join(' '))
  const openTabIds = useMemo(() => new Set(tabIds.split(' ')), [tabIds])

  const loadRecent = () => window.api.listRecentFiles().then(setRecent).catch(() => setRecent([]))
  useEffect(() => {
    void loadRecent()
    window.api.recovery.list().then(setRecovery).catch(() => setRecovery([]))
  }, [])
  useEffect(() => {
    window.api.templates.list().then(setMine).catch(() => setMine([]))
  }, [version])

  const templates = useMemo(() => searchTemplates(query, category), [query, category])
  const listed = useMemo(() => (view === 'home' && !query ? templates.slice(0, 8) : templates), [view, query, templates])
  const paged = usePaged(listed, 48)
  const validCustom = custom.width >= 1 && custom.height >= 1 && custom.width <= MAX_SIDE && custom.height <= MAX_SIDE
  const presetById = (id: string) => canvasPresets.find((p) => p.id === id)!

  const discardRecovery = async (item: RecoveryItem) => {
    if ((await confirmAction({ title: 'Discard recovered design?', message: `The unsaved copy of “${item.title}” will be deleted.`, confirmLabel: 'Discard', danger: true })) !== 'confirm') return
    await window.api.recovery.remove(item.id)
    setRecovery((r) => r.filter((x) => x.id !== item.id))
  }

  const removeMine = async (t: TemplateItem) => {
    if ((await confirmAction({ title: 'Delete template?', message: `“${t.title}” will be removed from My templates.`, confirmLabel: 'Delete', danger: true })) !== 'confirm') return
    await window.api.templates.remove(t.id)
    bumpLibrary()
  }

  const nav = (id: View, label: string, icon: React.ReactNode) => (
    <button className={`nav${view === id ? ' on' : ''}`} onClick={() => setView(id)} aria-current={view === id}>
      {icon}
      <span className="label">{label}</span>
    </button>
  )

  const recentGrid = (limit?: number) =>
    recent === null ? (
      <span className="spinner" />
    ) : recent.length === 0 ? (
      <Empty icon={<FolderOpen size={28} />} title="No recent designs">
        Designs you save or open appear here.
      </Empty>
    ) : (
      <div className="card-grid small">
        {recent.slice(0, limit).map((r) => (
          <div key={r.path} style={{ position: 'relative' }}>
            <button
              className="design-card"
              style={{ width: '100%' }}
              title={r.path}
              onClick={() => void openDesignPath(r.path)}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenu({ x: e.clientX, y: e.clientY, file: r })
              }}
            >
              <span className="thumb">{r.thumbnail ? <img src={r.thumbnail} alt="" /> : <LayoutTemplate size={26} />}</span>
              <span className="title">{r.title || 'Untitled design'}</span>
              <span className="meta">Opened {timeAgo(r.openedAt)}</span>
            </button>
          </div>
        ))}
      </div>
    )

  const templateSection = (
    <section className="home-section">
      <div className="home-section-head">
        <h2>{query ? `Templates for “${query}”` : 'Start from a template'}</h2>
        {view === 'home' && (
          <button className="btn sm ghost" onClick={() => setView('templates')}>
            See all {builtInTemplates.length}
          </button>
        )}
      </div>
      {view === 'templates' && (
        <div className="chips" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`chip${category === 'all' ? ' on' : ''}`} onClick={() => setCategory('all')}>
            All
          </button>
          {templateCategories.map((c) => (
            <button key={c.id} className={`chip${category === c.id ? ' on' : ''}`} onClick={() => setCategory(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      {templates.length === 0 ? (
        <Empty icon={<LayoutTemplate size={28} />} title="No templates match">
          Try another word, or start with a blank design above.
        </Empty>
      ) : (
        <div className="card-grid">
          {paged.shown.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
      <LoadMore remaining={paged.more} onMore={paged.showMore} label="Show more templates" />
      {view === 'templates' && mine.length > 0 && (
        <>
          <div className="home-section-head" style={{ marginTop: 24 }}>
            <h2>My templates</h2>
          </div>
          <div className="card-grid">
            {mine.map((t) => (
              <div key={t.id} style={{ position: 'relative' }}>
                <button className="design-card" style={{ width: '100%' }} onClick={() => void openUserTemplate(t.id, t.title)}>
                  <span className="thumb">{t.thumbnail ? <img src={t.thumbnail} alt="" /> : <LayoutTemplate size={26} />}</span>
                  <span className="title">{t.title}</span>
                  <span className="meta">
                    {t.width} × {t.height}
                  </span>
                </button>
                <button className="icon-btn sm card-menu" style={{ position: 'absolute', top: 6, right: 6, background: 'var(--surface)' }} title="Delete template" onClick={() => void removeMine(t)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )

  return (
    <div className="home">
      <nav className="home-nav" aria-label="Home navigation">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Design Studio</span>
        </div>
        {nav('home', 'Home', <Home size={18} />)}
        {nav('templates', 'Templates', <LayoutTemplate size={18} />)}
        {nav('projects', 'My projects', <FolderOpen size={18} />)}
        <div className="bottom">
          <button className="nav" onClick={() => void openDesignDialog()}>
            <FolderOpen size={18} />
            <span className="label">Open a file…</span>
          </button>
          <button className="nav" onClick={() => openDialog('settings')}>
            <Settings size={18} />
            <span className="label">Settings</span>
          </button>
        </div>
      </nav>

      <main className="home-main">
        <div className="home-inner">
          {recovery.filter((item) => !openTabIds.has(item.id)).map((item) => (
            <div key={item.id} className="recovery-banner" role="alert">
              {item.thumbnail && <img src={item.thumbnail} alt="" />}
              <div className="grow">
                <strong>Unsaved work was recovered: “{item.title}”</strong>
                <div className="small muted">
                  From {new Date(item.savedAt).toLocaleString()}
                  {item.filePath ? ` · ${item.filePath}` : ' · never saved to a file'}
                </div>
              </div>
              <button className="btn primary sm" onClick={() => void openRecovered(item.id, item.filePath).catch((e) => showError(e))}>
                <RotateCcw size={14} /> Restore
              </button>
              <button className="btn sm ghost" onClick={() => void discardRecovery(item)}>
                Discard
              </button>
            </div>
          ))}

          {view !== 'projects' && (
            <div className="hero">
              <h1>What will you design today?</h1>
              <p>Everything stays on this PC. No account needed.</p>
              <SearchInput
                value={query}
                onChange={(v) => {
                  setQuery(v)
                  if (v && view === 'home') setView('templates')
                }}
                placeholder="Search templates, e.g. “menu”, “sale”, “resume”"
              />
              <div className="quick-create">
                {quick.map((q) => {
                  const p = presetById(q.id)
                  return (
                    <button key={q.id} className="quick-item" title={`${p.label}: ${p.width} × ${p.height} px`} onClick={() => onCreate(p.width, p.height, p.label)}>
                      <span className="qi-icon" style={{ background: q.color }}>
                        {q.icon}
                      </span>
                      {q.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'home' && (
            <section className="home-section">
              <div className="home-section-head">
                <h2>Blank designs</h2>
              </div>
              <div className="preset-row">
                {canvasPresets.map((p) => {
                  const s = 26 / Math.max(p.width, p.height)
                  return (
                    <button key={p.id} className="preset" onClick={() => onCreate(p.width, p.height, p.label)}>
                      <span className="preset-thumb">
                        <span style={{ width: p.width * s, height: p.height * s }} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="preset-label">{p.label}</span>
                        <span className="preset-size">
                          {p.width} × {p.height}
                        </span>
                      </span>
                    </button>
                  )
                })}
                <div className="preset" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <span className="preset-label">Custom size</span>
                  <div className="row" style={{ gap: 6 }}>
                    <NumberField label="W" value={custom.width} min={1} max={MAX_SIDE} onChange={(width) => setCustom((c) => ({ ...c, width: Math.round(width) }))} />
                    <NumberField label="H" value={custom.height} min={1} max={MAX_SIDE} onChange={(height) => setCustom((c) => ({ ...c, height: Math.round(height) }))} />
                  </div>
                  <button className="btn sm primary" disabled={!validCustom} onClick={() => onCreate(custom.width, custom.height, 'Untitled design')}>
                    <Plus size={14} /> Create
                  </button>
                </div>
              </div>
            </section>
          )}

          {view !== 'projects' && templateSection}

          {(view === 'home' || view === 'projects') && (
            <section className="home-section">
              <div className="home-section-head">
                <h2>{view === 'projects' ? 'My projects' : 'Recent designs'}</h2>
                {view === 'home' && (recent?.length ?? 0) > 8 && (
                  <button className="btn sm ghost" onClick={() => setView('projects')}>
                    See all
                  </button>
                )}
              </div>
              {recentGrid(view === 'home' ? 8 : undefined)}
            </section>
          )}
        </div>
      </main>
      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Open', onSelect: () => void openDesignPath(menu.file.path) },
            { label: 'Show in Explorer', onSelect: () => window.api.showInFolder(menu.file.path) },
            'sep',
            { label: 'Remove from recent', danger: true, onSelect: () => void window.api.removeRecentFile(menu.file.path).then(loadRecent) }
          ]}
        />
      )}
    </div>
  )
}
