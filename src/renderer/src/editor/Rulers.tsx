import { useEffect, useRef, useState } from 'react'
import type { DesignDocument, DesignElement, Page } from '@shared/model'
import { useView, viewStore } from '@renderer/store/viewStore'
import { rotatedBounds } from './geometry'

export const RULER_SIZE = 20

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]

/**
 * Rulers along the top and left of the canvas, in design pixels. The page and
 * the current selection are highlighted. Drag from a ruler onto the page to
 * add a guide; drag a guide off the page to remove it.
 */
export function Rulers(props: { doc: DesignDocument; page: Page; selection: DesignElement[]; onAddGuide: (axis: 'x' | 'y', value: number) => void }) {
  const view = useView((s) => s)
  const hRef = useRef<HTMLCanvasElement>(null)
  const vRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<{ axis: 'x' | 'y'; client: number } | null>(null)

  const sel = props.selection.length
    ? props.selection.map((el) => rotatedBounds(el.x, el.y, el.width, el.height, el.rotation)).reduce((a, b) => {
        const x = Math.min(a.x, b.x)
        const y = Math.min(a.y, b.y)
        return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y }
      })
    : null

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const colors = {
      bg: style.getPropertyValue('--surface').trim() || '#fff',
      page: style.getPropertyValue('--surface-2').trim() || '#f8f9fb',
      tick: style.getPropertyValue('--text-3').trim() || '#8a90a0',
      sel: 'rgba(109,74,255,0.18)'
    }
    const step = STEPS.find((s) => s * view.zoom >= 56) ?? 10000
    const draw = (canvas: HTMLCanvasElement | null, horizontal: boolean) => {
      if (!canvas) return
      const length = horizontal ? view.width : view.height
      const dpr = window.devicePixelRatio || 1
      const w = horizontal ? length : RULER_SIZE
      const h = horizontal ? RULER_SIZE : length
      canvas.width = Math.max(1, w * dpr)
      canvas.height = Math.max(1, h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const c = canvas.getContext('2d')!
      c.scale(dpr, dpr)
      c.fillStyle = colors.bg
      c.fillRect(0, 0, w, h)
      const offset = horizontal ? view.x : view.y
      const pageLen = (horizontal ? props.doc.width : props.doc.height) * view.zoom
      c.fillStyle = colors.page
      if (horizontal) c.fillRect(offset, 0, pageLen, h)
      else c.fillRect(0, offset, w, pageLen)
      if (sel) {
        c.fillStyle = colors.sel
        const start = (horizontal ? sel.x : sel.y) * view.zoom + offset
        const size = (horizontal ? sel.width : sel.height) * view.zoom
        if (horizontal) c.fillRect(start, 0, size, h)
        else c.fillRect(0, start, w, size)
      }
      c.strokeStyle = colors.tick
      c.fillStyle = colors.tick
      c.lineWidth = 1
      c.font = '9.5px Inter, Segoe UI, sans-serif'
      const first = Math.floor(-offset / view.zoom / step) * step
      const last = (length - offset) / view.zoom
      c.beginPath()
      for (let v = first; v <= last; v += step / 5) {
        const pos = Math.round(v * view.zoom + offset) + 0.5
        const major = Math.abs(v / step - Math.round(v / step)) < 1e-6
        const tick = major ? 8 : 4
        if (horizontal) {
          c.moveTo(pos, RULER_SIZE)
          c.lineTo(pos, RULER_SIZE - tick)
        } else {
          c.moveTo(RULER_SIZE, pos)
          c.lineTo(RULER_SIZE - tick, pos)
        }
        if (major) {
          const label = String(Math.round(v))
          if (horizontal) c.fillText(label, pos + 3, 10)
          else {
            c.save()
            c.translate(10, pos - 3)
            c.rotate(-Math.PI / 2)
            c.fillText(label, 0, 0)
            c.restore()
          }
        }
      }
      c.stroke()
    }
    draw(hRef.current, true)
    draw(vRef.current, false)
  }, [view, props.doc.width, props.doc.height, sel?.x, sel?.y, sel?.width, sel?.height]) // eslint-disable-line react-hooks/exhaustive-deps

  // Dragging a new guide out of a ruler.
  useEffect(() => {
    if (!drag) return
    const move = (e: MouseEvent) => setDrag((d) => d && { ...d, client: d.axis === 'y' ? e.clientY : e.clientX })
    const up = (e: MouseEvent) => {
      const area = document.querySelector('.canvas-area')?.getBoundingClientRect()
      const v = viewStore.getState()
      if (area) {
        if (drag.axis === 'y' && e.clientY > area.top) props.onAddGuide('y', (e.clientY - area.top - v.y) / v.zoom)
        if (drag.axis === 'x' && e.clientX > area.left) props.onAddGuide('x', (e.clientX - area.left - v.x) / v.zoom)
      }
      setDrag(null)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [drag?.axis]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="ruler-corner" />
      <div className="ruler ruler-h" title="Drag down to add a guide" onMouseDown={(e) => setDrag({ axis: 'y', client: e.clientY })}>
        <canvas ref={hRef} />
      </div>
      <div className="ruler ruler-v" title="Drag right to add a guide" onMouseDown={(e) => setDrag({ axis: 'x', client: e.clientX })}>
        <canvas ref={vRef} />
      </div>
      {drag && (
        <div
          style={{
            position: 'fixed',
            background: '#00a3e0',
            pointerEvents: 'none',
            zIndex: 50,
            ...(drag.axis === 'y' ? { left: 0, right: 0, top: drag.client, height: 1 } : { top: 0, bottom: 0, left: drag.client, width: 1 })
          }}
        />
      )}
    </>
  )
}
