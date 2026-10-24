import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import type { LibraryItem } from '@shared/ipc'
import type { DesignDocument } from '@shared/model'
import { Empty, SearchInput, SectionHead } from '@renderer/components/ui'
import { showError } from '@renderer/components/toast'
import { createImage } from '@renderer/editor/elementFactory'
import { endPanelDrag, startPanelDrag } from '@renderer/editor/dnd'
import { importImagesDialog, insertImage } from '@renderer/io/projectIo'
import { assets, useAssetVersion } from '@renderer/store/assets'
import { bumpLibrary, useLibraryVersion } from '@renderer/store/libraryStore'
import { confirmAction } from '@renderer/store/uiStore'
import { insertElements, PanelFrame } from './common'

export async function addLibraryItem(item: LibraryItem, point?: { x: number; y: number }, targetId?: string | null): Promise<void> {
  try {
    const { bytes, mime } = await window.api.library.read(item.id)
    await insertImage(bytes, mime, item.name, { point, targetId })
  } catch (error) {
    showError(error, 'That image could not be read.')
  }
}

/** Your images: ones in this design, and every image you have imported before (kept on this PC). */
export function UploadsPanel({ doc }: { doc: DesignDocument }) {
  const version = useLibraryVersion()
  const assetVersion = useAssetVersion()
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    window.api.library.list().then(setItems).catch(() => setItems([]))
  }, [version])

  const q = query.toLowerCase().trim()
  const shown = (items ?? []).filter((i) => !q || i.name.toLowerCase().includes(q))
  const inDesign = doc.assets.filter((a) => a.mime.startsWith('image/') && (!q || a.name.toLowerCase().includes(q)))

  const remove = async (item: LibraryItem) => {
    const choice = await confirmAction({
      title: 'Remove from uploads?',
      message: `"${item.name}" will be removed from your uploads library. Designs that already use it keep their copy.`,
      confirmLabel: 'Remove',
      danger: true
    })
    if (choice !== 'confirm') return
    await window.api.library.remove(item.id)
    bumpLibrary()
  }

  return (
    <PanelFrame
      title="Uploads"
      head={
        <>
          <button className="btn primary block" onClick={() => void importImagesDialog()}>
            <Upload size={16} /> Upload images
          </button>
          {(items?.length ?? 0) > 6 && <SearchInput value={query} onChange={setQuery} placeholder="Search your uploads" />}
        </>
      }
    >
      <p className="muted small" style={{ margin: '0 0 6px' }}>
        PNG, JPG, WebP, GIF or SVG. You can also drag files from Windows onto the page, or paste with Ctrl+V. Everything stays on this PC.
      </p>

      {inDesign.length > 0 && (
        <section className="panel-section" key={assetVersion}>
          <SectionHead title="In this design" />
          <div className="tile-grid">
            {inDesign.map((a) => {
              const url = assets.url(a.id)
              return (
                url && (
                  <button
                    key={a.id}
                    className="tile"
                    title={`Add ${a.name} again`}
                    onClick={async () => {
                      const img = await assets.load(a.id).catch(() => null)
                      if (img) insertElements([createImage(doc, a.id, a.name, img.width, img.height)], 'Add image')
                    }}
                  >
                    <img src={url} alt={a.name} />
                  </button>
                )
              )
            })}
          </div>
        </section>
      )}

      <section className="panel-section">
        <SectionHead title="Your uploads" />
        {items === null ? (
          <span className="spinner" />
        ) : shown.length === 0 ? (
          <Empty icon={<ImagePlus size={28} />} title={q ? 'No uploads match' : 'No uploads yet'}>
            {q ? 'Try another name.' : 'Images you import are kept here so you can reuse them in any design.'}
          </Empty>
        ) : (
          <div className="tile-grid">
            {shown.map((item) => (
              <button
                key={item.id}
                className="tile"
                title={`${item.name} · ${item.width}×${item.height}`}
                draggable
                onDragStart={(e) => startPanelDrag(e, (point, targetId) => void addLibraryItem(item, point, targetId))}
                onDragEnd={endPanelDrag}
                onClick={() => void addLibraryItem(item)}
              >
                <img src={item.thumbnail} alt={item.name} draggable={false} />
                <span
                  className="fav"
                  role="button"
                  title="Remove from uploads"
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(item)
                  }}
                >
                  <Trash2 size={12} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </PanelFrame>
  )
}
