import { useEffect, useMemo, useRef, useState } from 'react'
import { FileDown, LayoutTemplate, Save, Trash2 } from 'lucide-react'
import type { TemplateItem } from '@shared/ipc'
import type { DesignDocument } from '@shared/model'
import { Empty, LoadMore, SearchInput, SectionHead } from '@renderer/components/ui'
import { showError, showToast } from '@renderer/components/toast'
import { addTemplatePages, loadUserTemplate } from '@renderer/io/projectIo'
import { builtInTemplates, searchTemplates, templateCategories, templateDocument, type BuiltInTemplate, type TemplateCategory } from '@renderer/library/templates'
import { useNearView, usePaged, useTemplateThumb } from '@renderer/library/templateThumbs'
import { loadFonts } from '@renderer/fonts/fontList'
import { editorStore, selectActivePage } from '@renderer/store/editorStore'
import { bumpLibrary, useLibraryVersion } from '@renderer/store/libraryStore'
import { confirmAction, openDialog, uiStore, updatePrefs, usePrefs } from '@renderer/store/uiStore'
import { Chips, PanelFrame } from './common'

function rememberTemplate(key: string): void {
  const prefs = uiStore.getState().prefs
  if (prefs) void updatePrefs({ recentTemplates: [key, ...prefs.recentTemplates.filter((k) => k !== key)].slice(0, 8) })
}

/** Puts a template into the open design: replaces an empty page, otherwise asks whether to replace or add. */
export async function applyTemplate(template: DesignDocument, key: string): Promise<void> {
  const state = editorStore.getState()
  const doc = state.history?.present
  const page = selectActivePage(state)
  if (!doc || !page) return
  let replace = page.elements.length === 0 && !page.backgroundAssetId
  if (!replace) {
    const sizeNote =
      Math.abs(template.width / template.height - doc.width / doc.height) > 0.01
        ? `\n\nThe template is ${template.width} × ${template.height}; it will be scaled to fit your ${doc.width} × ${doc.height} design.`
        : ''
    const choice = await confirmAction({
      title: `Use “${template.title}”?`,
      message: `This page already has content. Add the template as ${template.pages.length === 1 ? 'a new page' : `${template.pages.length} new pages`}, or replace the current page?${sizeNote}`,
      confirmLabel: template.pages.length === 1 ? 'Add as new page' : 'Add as new pages',
      alternateLabel: 'Replace this page'
    })
    if (choice === 'cancel') return
    replace = choice === 'alternate'
  }
  addTemplatePages(template, replace)
  rememberTemplate(key)
}

function BuiltInCard({ template }: { template: BuiltInTemplate }) {
  const ref = useRef<HTMLButtonElement>(null)
  const url = useTemplateThumb(template, 240, useNearView(ref))
  const use = async () => {
    await loadFonts()
    await applyTemplate(templateDocument(template), `builtin:${template.id}`)
  }
  return (
    <button ref={ref} className="thumb-card" title={template.title} onClick={() => void use()}>
      <span className="thumb" style={{ aspectRatio: template.width / template.height > 1.2 ? '16 / 10' : '1' }}>
        {url ? <img src={url} alt="" /> : <span className="skeleton" style={{ width: '80%', height: '80%' }} />}
      </span>
      <span className="thumb-title">{template.title}</span>
      <span className="thumb-meta">
        {template.width} × {template.height}
        {(template.pageCount ?? 1) > 1 ? ` · ${template.pageCount} pages` : ''}
      </span>
    </button>
  )
}

/** Templates: the built-in library, templates you saved, and recently used ones. */
export function DesignPanel(_props: { doc: DesignDocument }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategory | 'all' | 'mine'>('all')
  const [mine, setMine] = useState<TemplateItem[]>([])
  const version = useLibraryVersion()
  const prefs = usePrefs()

  useEffect(() => {
    window.api.templates.list().then(setMine).catch(() => setMine([]))
  }, [version])

  const results = useMemo(() => (category === 'mine' ? [] : searchTemplates(query, category)), [query, category])
  const paged = usePaged(results, 40)
  const mineShown = mine.filter((t) => !query || t.title.toLowerCase().includes(query.toLowerCase()))
  const recent = (prefs?.recentTemplates ?? [])
    .map((k) => (k.startsWith('builtin:') ? builtInTemplates.find((t) => `builtin:${t.id}` === k) : undefined))
    .filter((t): t is BuiltInTemplate => !!t)
    .slice(0, 4)

  const applyMine = async (item: TemplateItem) => {
    try {
      const doc = await loadUserTemplate(item.id)
      await applyTemplate({ ...doc, title: item.title }, `user:${item.id}`)
    } catch (error) {
      showError(error, 'The template could not be opened.')
    }
  }

  const importTemplate = async () => {
    try {
      const picked = await window.api.templates.importDialog()
      if (!picked) return
      bumpLibrary()
      showToast(`Added “${picked.name}” to My templates`)
    } catch (error) {
      showError(error, 'That file could not be added as a template.')
    }
  }

  const removeMine = async (item: TemplateItem) => {
    if ((await confirmAction({ title: 'Delete template?', message: `“${item.title}” will be removed from My templates.`, confirmLabel: 'Delete', danger: true })) !== 'confirm') return
    await window.api.templates.remove(item.id)
    bumpLibrary()
  }

  const mineGrid = (
    <div className="tile-grid cols-2">
      {mineShown.map((t) => (
        <div key={t.id} style={{ position: 'relative' }}>
          <button className="thumb-card" style={{ width: '100%' }} onClick={() => void applyMine(t)} title={t.title}>
            <span className="thumb">{t.thumbnail ? <img src={t.thumbnail} alt="" /> : <LayoutTemplate size={22} />}</span>
            <span className="thumb-title">{t.title}</span>
            <span className="thumb-meta">
              {t.width} × {t.height}
              {t.pages > 1 ? ` · ${t.pages} pages` : ''}
            </span>
          </button>
          <button className="icon-btn sm" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--surface)' }} title="Delete template" onClick={() => void removeMine(t)}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <PanelFrame
      title="Templates"
      head={
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search templates, e.g. “sale”, “menu”" autoFocus />
          <Chips
            value={category}
            onChange={setCategory}
            options={[{ id: 'all', label: 'All' }, { id: 'mine', label: 'My templates' }, ...templateCategories.map((c) => ({ id: c.id, label: c.label }))]}
          />
        </>
      }
    >
      <div className="tool-row" style={{ marginTop: 4 }}>
        <button className="btn sm" onClick={() => openDialog('save-template')}>
          <Save size={14} /> Save design as template
        </button>
        <button className="btn sm ghost" onClick={() => void importTemplate()}>
          <FileDown size={14} /> Import
        </button>
      </div>

      {category === 'all' && !query && recent.length > 0 && (
        <section className="panel-section">
          <SectionHead title="Recently used" />
          <div className="tile-grid cols-2">
            {recent.map((t) => (
              <BuiltInCard key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {(category === 'mine' || (category === 'all' && mineShown.length > 0)) && (
        <section className="panel-section">
          <SectionHead title="My templates" />
          {mineShown.length === 0 ? (
            <Empty icon={<LayoutTemplate size={28} />} title="No saved templates yet">
              Save any design as a template to reuse its layout, or import a .odesign file.
            </Empty>
          ) : (
            mineGrid
          )}
        </section>
      )}

      {category !== 'mine' && (
        <section className="panel-section">
          <SectionHead title={query ? `${results.length} template${results.length === 1 ? '' : 's'}` : category === 'all' ? 'All templates' : (templateCategories.find((c) => c.id === category)?.label ?? '')} />
          {results.length === 0 ? (
            <Empty icon={<LayoutTemplate size={28} />} title="No templates found">
              Try another word, or start from a blank page.
            </Empty>
          ) : (
            <div className="tile-grid cols-2">
              {paged.shown.map((t) => (
                <BuiltInCard key={t.id} template={t} />
              ))}
            </div>
          )}
          <LoadMore remaining={paged.more} onMore={paged.showMore} />
        </section>
      )}
      <p className="muted small" style={{ marginTop: 14 }}>
        All templates are original and free to use. Empty photo frames are waiting for your images: drag a photo onto them.
      </p>
    </PanelFrame>
  )
}
