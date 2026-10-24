import Konva from 'konva'
import { useEffect, useState } from 'react'
import type { DesignElement } from '@shared/model'
import { rotatedBounds } from '@renderer/editor/geometry'
import { buildContent } from '@renderer/render/nodes'
import { assets } from '@renderer/store/assets'

/**
 * Previews for the side panels, drawn by the same renderer as the canvas, so a
 * thumbnail always shows exactly what will be inserted. Results are cached.
 */

const cache = new Map<string, string>()
const SAMPLE = { width: 1000, height: 1000 }

export function renderElementsThumb(elements: DesignElement[], size = 120, padding = 0.08): string {
  const boxes = elements.map((el) => rotatedBounds(el.x, el.y, el.width, el.height, el.rotation))
  const x0 = Math.min(...boxes.map((b) => b.x))
  const y0 = Math.min(...boxes.map((b) => b.y))
  const w = Math.max(1, Math.max(...boxes.map((b) => b.x + b.width)) - x0)
  const h = Math.max(1, Math.max(...boxes.map((b) => b.y + b.height)) - y0)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const scale = (size * (1 - padding * 2)) / Math.max(w, h)
  const container = document.createElement('div')
  const stage = new Konva.Stage({ container, width: size, height: size })
  try {
    const layer = new Konva.Layer()
    stage.add(layer)
    const group = new Konva.Group({ x: (size - w * scale) / 2 - x0 * scale, y: (size - h * scale) / 2 - y0 * scale, scaleX: scale, scaleY: scale })
    for (const el of elements) {
      const g = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity })
      for (const node of buildContent(el, assets)) g.add(node)
      group.add(g)
    }
    layer.add(group)
    layer.draw()
    return stage.toDataURL({ pixelRatio: dpr })
  } finally {
    stage.destroy()
  }
}

export function presetThumb(key: string, make: (doc: { width: number; height: number }) => DesignElement[], size = 120): string {
  const cached = cache.get(`${key}@${size}`)
  if (cached) return cached
  const url = renderElementsThumb(make(SAMPLE), size)
  cache.set(`${key}@${size}`, url)
  return url
}

/** Renders a thumbnail after the first paint, so opening a panel stays instant. */
export function useLazyThumb(key: string, render: () => string): string | null {
  const [url, setUrl] = useState<string | null>(() => cache.get(key) ?? null)
  useEffect(() => {
    if (url) return
    let cancelled = false
    const id = requestAnimationFrame(() => {
      if (cancelled) return
      try {
        const result = render()
        cache.set(key, result)
        setUrl(result)
      } catch {
        // A preview that cannot be drawn is simply left blank.
      }
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

export function clearThumbCache(prefix: string): void {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key)
}
