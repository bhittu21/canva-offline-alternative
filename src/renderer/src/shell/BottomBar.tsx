import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, LayoutGrid, Maximize, Minus, Plus, Trash2 } from 'lucide-react'
import type { DesignDocument, Page } from '@shared/model'
import { renderThumbnail } from '@renderer/export/renderDesign'
import { editor, useEditor } from '@renderer/store/editorStore'
import { requestFit } from '@renderer/store/uiStore'
import { MAX_ZOOM, MIN_ZOOM, useView, zoomAround } from '@renderer/store/viewStore'
import { useAssetVersion } from '@renderer/store/assets'

/** Page navigation, the page strip and zoom controls along the bottom of the editor. */
export function BottomBar({ doc }: { doc: DesignDocument }) {
  const activePageId = useEditor((s) => s.activePageId)
  const zoom = useView((s) => s.zoom)
  const [strip, setStrip] = useState(false)
  const index = Math.max(0, doc.pages.findIndex((p) => p.id === activePageId))
  const go = (i: number) => editor.setActivePage(doc.pages[Math.max(0, Math.min(doc.pages.length - 1, i))].id)

  // Zoom slider works on a log scale so small and large zoom levels are equally easy to reach.
  const toSlider = (z: number) => Math.log(z / MIN_ZOOM) / Math.log(MAX_ZOOM / MIN_ZOOM)
  const fromSlider = (v: number) => MIN_ZOOM * Math.pow(MAX_ZOOM / MIN_ZOOM, v)

  return (
    <footer className="bottombar">
      <button className={`btn sm ${strip ? 'soft' : 'ghost'}`} onClick={() => setStrip((s) => !s)} aria-pressed={strip}>
        <LayoutGrid size={15} /> Pages
      </button>
      <div className="page-nav">
        <button className="icon-btn sm" aria-label="Previous page" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={16} />
        </button>
        <span className="label">
          Page {index + 1} of {doc.pages.length}
        </span>
        <button className="icon-btn sm" aria-label="Next page" disabled={index >= doc.pages.length - 1} onClick={() => go(index + 1)}>
          <ChevronRight size={16} />
        </button>
        <button className="icon-btn sm" data-tip="Add a page" data-tip-pos="top" aria-label="Add a page" onClick={() => editor.addPage()}>
          <Plus size={16} />
        </button>
      </div>
      <div className="zoom">
        <button className="icon-btn sm" aria-label="Zoom out" onClick={() => zoomAround(zoom / 1.25)}>
          <Minus size={15} />
        </button>
        <input type="range" min={0} max={1} step={0.001} value={toSlider(zoom)} aria-label="Zoom" onChange={(e) => zoomAround(fromSlider(Number(e.target.value)))} />
        <button className="icon-btn sm" aria-label="Zoom in" onClick={() => zoomAround(zoom * 1.25)}>
          <Plus size={15} />
        </button>
        <button className="zoom-value" title="Show at 100%" onClick={() => zoomAround(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="icon-btn sm" data-tip="Fit page (Ctrl+0)" data-tip-pos="top" aria-label="Fit page to screen" onClick={() => requestFit('page')}>
          <Maximize size={15} />
        </button>
      </div>
      {strip && <PageStrip doc={doc} activePageId={doc.pages[index].id} />}
    </footer>
  )
}

function PageStrip({ doc, activePageId }: { doc: DesignDocument; activePageId: string }) {
  const [dragId, setDragId] = useState<string | null>(null)
  const strip = useRef<HTMLDivElement>(null)

  // The mouse wheel (with or without Shift) scrolls the strip sideways. React's onWheel is passive, so attach directly.
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      e.preventDefault()
      el.scrollLeft += e.deltaMode === 1 ? delta * 24 : delta
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Keep the current page in view when the strip opens, the page changes or pages are added.
  useEffect(() => {
    strip.current?.querySelector('.page-thumb.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activePageId, doc.pages.length])

  return (
    <div className="page-strip" ref={strip}>
      <div className="page-strip-track">
        {doc.pages.map((page, i) => (
          <div
            key={page.id}
            className={`page-thumb${page.id === activePageId ? ' active' : ''}`}
            draggable
            onDragStart={() => setDragId(page.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId && dragId !== page.id) editor.movePage(dragId, i)
              setDragId(null)
            }}
          >
            <button className="frame" onClick={() => editor.setActivePage(page.id)} aria-label={`Page ${i + 1}`}>
              <PageThumb doc={doc} page={page} />
            </button>
            <span className="num">{i + 1}</span>
            <span className="page-actions">
              <button className="icon-btn sm" title="Duplicate page" onClick={() => editor.duplicatePage(page.id)}>
                <Copy size={13} />
              </button>
              {doc.pages.length > 1 && (
                <button className="icon-btn sm" title="Delete page" onClick={() => editor.deletePage(page.id)}>
                  <Trash2 size={13} />
                </button>
              )}
            </span>
          </div>
        ))}
        <button className="add-page" title="Add a page" onClick={() => editor.addPage(doc.pages[doc.pages.length - 1].id)}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}

/** A small live preview of a page, redrawn shortly after the page changes. */
export function PageThumb({ doc, page, max = 68 }: { doc: DesignDocument; page: Page; max?: number }) {
  const holder = useRef<HTMLSpanElement>(null)
  const assetVersion = useAssetVersion()
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      renderThumbnail(doc, page, max * 2)
        .then((canvas) => {
          if (cancelled || !holder.current) return
          canvas.style.height = `${max}px`
          canvas.style.width = 'auto'
          holder.current.replaceChildren(canvas)
        })
        .catch(() => undefined)
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [page, doc.width, doc.height, max, assetVersion]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span
      ref={holder}
      style={{
        display: 'grid',
        placeItems: 'center',
        minWidth: (max * doc.width) / doc.height
      }}
    />
  )
}
