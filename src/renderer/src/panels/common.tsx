import type { ReactNode } from 'react'
import type { DesignElement } from '@shared/model'
import { centerAt } from '@renderer/editor/elementFactory'
import { endPanelDrag, startPanelDrag } from '@renderer/editor/dnd'
import { editor, editorStore } from '@renderer/store/editorStore'
import { uiStore } from '@renderer/store/uiStore'
import { useLazyThumb } from '@renderer/library/thumbnails'

type Size = { width: number; height: number }

/** The standard layout of a side panel: title, optional search and filters, then a scrolling body. */
export function PanelFrame(props: { title: ReactNode; action?: ReactNode; head?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="panel-head">
        <div className="panel-title">
          <h2>{props.title}</h2>
          {props.action}
        </div>
        {props.head}
      </div>
      <div className="panel-body">{props.children}</div>
    </>
  )
}

export function Chips<T extends string>(props: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="chips" role="tablist">
      {props.options.map((o) => (
        <button key={o.id} role="tab" aria-selected={props.value === o.id} className={`chip${props.value === o.id ? ' on' : ''}`} onClick={() => props.onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function brandFonts(): { heading: string; body: string } {
  const brand = uiStore.getState().prefs?.brand
  return { heading: brand?.headingFont || 'Poppins', body: brand?.bodyFont || 'Inter' }
}

export function currentDoc(): Size {
  const doc = editorStore.getState().history?.present
  return doc ? { width: doc.width, height: doc.height } : { width: 1080, height: 1080 }
}

/** Adds freshly made elements to the active page (centred on a point when one is given) and selects them. */
export function insertElements(elements: DesignElement[], label: string, point?: { x: number; y: number }): void {
  const placed = point ? centerAt(elements, point) : elements
  editor.addElements(placed, label)
}

/**
 * A library tile: click to add in the middle of the page, or drag it onto the
 * page to drop it where you want it.
 */
export function InsertTile(props: {
  thumbKey: string
  label: string
  make: (doc: Size) => DesignElement[]
  render: () => string
  className?: string
  extra?: ReactNode
  showLabel?: boolean
}) {
  const url = useLazyThumb(props.thumbKey, props.render)
  const add = (point?: { x: number; y: number }) => insertElements(props.make(currentDoc()), `Add ${props.label.toLowerCase()}`, point)
  return (
    <button
      className={`tile${props.className ? ` ${props.className}` : ''}`}
      title={props.label}
      aria-label={`Add ${props.label}`}
      draggable
      onDragStart={(e) => startPanelDrag(e, (point) => add(point))}
      onDragEnd={endPanelDrag}
      onClick={() => add()}
    >
      {url ? <img src={url} alt="" draggable={false} /> : <span className="skeleton" style={{ width: '70%', height: '70%' }} />}
      {props.showLabel && <span className="tile-label">{props.label}</span>}
      {props.extra}
    </button>
  )
}
