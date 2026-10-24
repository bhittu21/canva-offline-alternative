import { useState } from 'react'
import type { DesignDocument, DesignElement } from '@shared/model'
import { Icon } from '@renderer/components/Icon'
import { editor, useEditor } from '@renderer/store/editorStore'

/** Layers are listed top-most first, the way they stack on the page. */
export function LayersPanel({ doc }: { doc: DesignDocument }) {
  const selectedIds = useEditor((s) => s.selectedIds)
  const [dragId, setDragId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const layers = [...doc.elements].reverse()

  const toggle = (el: DesignElement, key: 'hidden' | 'locked') =>
    editor.updateElement(el.id, { [key]: !el[key] }, key === 'hidden' ? 'Show/hide' : 'Lock/unlock')

  return (
    <div className="panel">
      <h2 className="panel-title">Layers</h2>
      {layers.length === 0 && <p className="muted small">Add text, shapes or images and they will be listed here.</p>}
      <ul className="layer-list">
        {layers.map((el, i) => (
          <li
            key={el.id}
            className={`layer${selectedIds.includes(el.id) ? ' selected' : ''}${el.hidden ? ' is-hidden' : ''}`}
            draggable={renamingId !== el.id}
            onDragStart={() => setDragId(el.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              // Convert the list position (top first) back to an array index (bottom first).
              if (dragId && dragId !== el.id) editor.moveLayer(dragId, doc.elements.length - 1 - i)
              setDragId(null)
            }}
            onClick={(e) => (e.shiftKey || e.ctrlKey ? editor.toggleSelected(el.id) : editor.select([el.id]))}
            onDoubleClick={() => setRenamingId(el.id)}
          >
            <span className="layer-kind">{kindLabel(el)}</span>
            {renamingId === el.id ? (
              <input
                className="layer-rename"
                autoFocus
                defaultValue={el.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== el.name) editor.updateElement(el.id, { name }, 'Rename layer')
                  setRenamingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
              />
            ) : (
              <span className="layer-name" title="Double-click to rename">
                {el.type === 'text' ? el.text.split('\n')[0] || el.name : el.name}
              </span>
            )}
            <button
              className="icon-button small"
              title={el.hidden ? 'Show' : 'Hide'}
              onClick={(e) => {
                e.stopPropagation()
                toggle(el, 'hidden')
              }}
            >
              <Icon name={el.hidden ? 'eyeOff' : 'eye'} size={16} />
            </button>
            <button
              className="icon-button small"
              title={el.locked ? 'Unlock' : 'Lock'}
              onClick={(e) => {
                e.stopPropagation()
                toggle(el, 'locked')
              }}
            >
              <Icon name={el.locked ? 'lock' : 'unlock'} size={16} />
            </button>
          </li>
        ))}
      </ul>
      {layers.length > 1 && <p className="muted small">Drag layers to reorder them.</p>}
    </div>
  )
}

function kindLabel(el: DesignElement): string {
  if (el.type === 'text') return 'T'
  if (el.type === 'image') return '▣'
  return { rect: '■', ellipse: '●', triangle: '▲', star: '★', line: '—' }[el.shape]
}
