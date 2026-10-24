import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

/** Zoom and scroll position of the canvas. Shared by the canvas, rulers and the zoom controls. */
export interface ViewState {
  zoom: number
  x: number
  y: number
  /** While true, the page is kept fitted to the window as it resizes. */
  fit: boolean
  width: number
  height: number
}

export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 8

export const viewStore = createStore<ViewState>(() => ({ zoom: 1, x: 0, y: 0, fit: true, width: 0, height: 0 }))

export function useView<T>(selector: (s: ViewState) => T): T {
  return useStore(viewStore, selector)
}

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/** Zooms so that a point on screen stays under the cursor. */
export function zoomAround(nextZoom: number, point?: { x: number; y: number }): void {
  const v = viewStore.getState()
  const p = point ?? { x: v.width / 2, y: v.height / 2 }
  const zoom = clampZoom(nextZoom)
  const pageX = (p.x - v.x) / v.zoom
  const pageY = (p.y - v.y) / v.zoom
  viewStore.setState({ zoom, x: p.x - pageX * zoom, y: p.y - pageY * zoom, fit: false })
}

/** Shows a box (in design pixels) centred in the view, with a margin. */
export function fitBox(box: { x: number; y: number; width: number; height: number }, margin = 48, maxZoom = MAX_ZOOM): void {
  const v = viewStore.getState()
  if (v.width <= 0 || v.height <= 0) return
  const zoom = clampZoom(Math.min((v.width - margin * 2) / box.width, (v.height - margin * 2) / box.height, maxZoom))
  viewStore.setState({
    zoom,
    x: (v.width - box.width * zoom) / 2 - box.x * zoom,
    y: (v.height - box.height * zoom) / 2 - box.y * zoom
  })
}

export function panBy(dx: number, dy: number): void {
  const v = viewStore.getState()
  viewStore.setState({ x: v.x + dx, y: v.y + dy, fit: false })
}
