import { memo, useEffect, useState } from 'react'
import { Eye, EyeOff, Group, Layers, Lock, Unlock } from 'lucide-react'
import type { DesignDocument, DesignElement } from '@shared/model'
import { Empty } from '@renderer/components/ui'
import { renderElementsThumb } from '@renderer/library/thumbnails'
import { useAssetVersion } from '@renderer/store/assets'
import { editor, selectActivePage, useEditor } from '@renderer/store/editorStore'
import { PanelFrame } from './common'

const thumbs = new WeakMap<DesignElement, string>()

/** A tiny preview of one element, redrawn only when that element changes. */
const LayerThumb = memo(function LayerThumb({ el }: { el: DesignElement }) {
  const assetVersion = useAssetVersion()
  const [url, setUrl] = useState(() => thumbs.get(el) ?? null)
  useEffect(() => {
    const cached = thumbs.get(el)
    if (cached) return setUrl(cached)
    const id = requestAnimationFrame(() => {
      try {
        const u = renderElementsThumb([{ ...el, rotation: 0, opacity: 1, hidden: false, x: 0, y: 0 }], 64, 0.1)
        thumbs.set(el, u)
        setUrl(u)
      } catch {
        setUrl(null)
      }
    })
    return () => cancelAnimationFrame(id)
  }, [el, assetVersion])
  return <span className="layer-thumb">{url && <img src={url} alt="" width={32} height={32} />}</span>
})

function layerName(el: DesignElement): string {
  if (el.type === 'text') return el.text.split('\n')[0].slice(0, 60) || el.name
  return el.name
}

/** Every element on the page, top-most first. Drag to reorder; click to select (Shift or Ctrl to add). */
export function LayersPanel({ doc }: { doc: DesignDocument }) {
  const page = useEditor(selectActivePage) ?? doc.pages[0]
  const selectedIds = useEditor((s) => s.selectedIds)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const layers = [...page.elements].reverse()

  const toggle = (el: DesignElement, key: 'hidden' | 'locked') => editor.updateElement(el.id, { [key]: !el[key] }, key === 'hidden' ? (el.hidden ? 'Show' : 'Hide') : el.locked ? 'Unlock' : 'Lock')

  return (
    <PanelFrame title="Layers" action={<span className="muted small">{layers.length} on this page</span>}>
      {layers.length === 0 && (
        <Empty icon={<Layers size={28} />} title="This page is empty">
          Add text, shapes, photos or icons and they will be listed here.
        </Empty>
      )}
      <ul className="layer-list" onDragLeave={() => setOverId(null)}>
        {layers.map((el, i) => {
          const prev = layers[i - 1]
          const startsGroup = el.groupId && el.groupId !== prev?.groupId
          return (
            <li key={el.id} style={{ listStyle: 'none' }}>
              {startsGroup && (
                <div className="group-label">
                  <Group size={12} /> Group
                </div>
              )}
              <div
                className={`layer${selectedIds.includes(el.id) ? ' selected' : ''}${el.hidden ? ' is-hidden' : ''}${el.groupId ? ' in-group' : ''}${overId === el.id && dragId !== el.id ? ' drop-target' : ''}`}
                draggable={renamingId !== el.id}
                onDragStart={(e) => {
                  setDragId(el.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOverId(el.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  // The list is top first; the page array is bottom first.
                  if (dragId && dragId !== el.id) editor.moveLayer(dragId, page.elements.length - 1 - i)
                  setDragId(null)
                  setOverId(null)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                onClick={(e) => (e.shiftKey || e.ctrlKey || e.metaKey ? editor.toggleSelected(el.id) : editor.select([el.id]))}
                onDoubleClick={() => setRenamingId(el.id)}
              >
                <LayerThumb el={el} />
                {renamingId === el.id ? (
                  <input
                    className="input sm"
                    autoFocus
                    defaultValue={el.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      const name = e.target.value.trim()
                      if (name && name !== el.name) editor.updateElement(el.id, { name }, 'Rename layer')
                      setRenamingId(null)
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                  />
                ) : (
                  <span className="layer-name" title="Double-click to rename">
                    {layerName(el)}
                  </span>
                )}
                <span className={`layer-actions${el.hidden || el.locked ? ' pinned' : ''}`}>
                  <button
                    className="icon-btn sm"
                    title={el.hidden ? 'Show' : 'Hide'}
                    aria-label={el.hidden ? 'Show' : 'Hide'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(el, 'hidden')
                    }}
                  >
                    {el.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    className="icon-btn sm"
                    title={el.locked ? 'Unlock' : 'Lock'}
                    aria-label={el.locked ? 'Unlock' : 'Lock'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(el, 'locked')
                    }}
                  >
                    {el.locked ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {layers.length > 1 && <p className="muted small">Drag to reorder. Double-click a name to rename. Shift-click to select several.</p>}
    </PanelFrame>
  )
}
