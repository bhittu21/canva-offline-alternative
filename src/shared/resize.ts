import type { DesignDocument, DesignElement } from './model'

/**
 * How existing content is adapted when a design changes size. Content is
 * always scaled uniformly, so nothing is ever stretched or squashed.
 */
export type ResizeMode = 'scale' | 'center' | 'keep'

export const resizeModes: { id: ResizeMode; label: string; description: string }[] = [
  { id: 'scale', label: 'Scale content to fit', description: 'Everything grows or shrinks evenly and is centred on the new page.' },
  { id: 'center', label: 'Keep size, centre content', description: 'Elements keep their size and move to stay centred.' },
  { id: 'keep', label: 'Keep size and position', description: 'Only the page changes; elements stay where they are.' }
]

export function resizeDocument(doc: DesignDocument, width: number, height: number, mode: ResizeMode): DesignDocument {
  const w = Math.max(1, Math.round(width))
  const h = Math.max(1, Math.round(height))
  let scale = 1
  let dx = 0
  let dy = 0
  if (mode === 'scale') {
    scale = Math.min(w / doc.width, h / doc.height)
    dx = (w - doc.width * scale) / 2
    dy = (h - doc.height * scale) / 2
  } else if (mode === 'center') {
    dx = (w - doc.width) / 2
    dy = (h - doc.height) / 2
  }
  return {
    ...doc,
    width: w,
    height: h,
    pages: doc.pages.map((page) => ({
      ...page,
      elements: page.elements.map((el) => transformElement(el, scale, dx, dy)),
      guides: undefined
    }))
  }
}

/** Scales an element uniformly around the page origin, then moves it. */
export function transformElement<T extends DesignElement>(el: T, scale: number, dx: number, dy: number): T {
  const moved = {
    ...el,
    x: el.x * scale + dx,
    y: el.y * scale + dy,
    width: el.width * scale,
    height: el.height * scale
  }
  if (moved.shadow) {
    moved.shadow = { ...moved.shadow, blur: moved.shadow.blur * scale, offsetX: moved.shadow.offsetX * scale, offsetY: moved.shadow.offsetY * scale }
  }
  switch (moved.type) {
    case 'text':
      return {
        ...moved,
        fontSize: moved.fontSize * scale,
        letterSpacing: moved.letterSpacing * scale,
        ...(moved.strokeWidth !== undefined && { strokeWidth: moved.strokeWidth * scale })
      }
    case 'shape':
      return { ...moved, strokeWidth: moved.strokeWidth * scale, cornerRadius: moved.cornerRadius * scale }
    case 'line':
      return { ...moved, strokeWidth: Math.max(0.1, moved.strokeWidth * scale) }
    case 'image':
      return {
        ...moved,
        ...(moved.cornerRadius !== undefined && { cornerRadius: moved.cornerRadius * scale }),
        ...(moved.borderWidth !== undefined && { borderWidth: moved.borderWidth * scale })
      }
    case 'table':
      return { ...moved, fontSize: moved.fontSize * scale, borderWidth: moved.borderWidth * scale }
    default:
      return moved
  }
}

export interface AspectRatio {
  id: string
  label: string
  w: number
  h: number
}

export const aspectRatios: AspectRatio[] = [
  { id: '1:1', label: '1:1 Square', w: 1, h: 1 },
  { id: '4:5', label: '4:5 Portrait social', w: 4, h: 5 },
  { id: '3:4', label: '3:4 Portrait', w: 3, h: 4 },
  { id: '2:3', label: '2:3 Poster', w: 2, h: 3 },
  { id: '3:2', label: '3:2 Landscape photo', w: 3, h: 2 },
  { id: '16:9', label: '16:9 Presentation, video', w: 16, h: 9 },
  { id: '9:16', label: '9:16 Story, vertical video', w: 9, h: 16 }
]

/** Size with the given ratio that keeps the longer side of the current size. */
export function sizeForRatio(width: number, height: number, ratio: { w: number; h: number }) {
  const longest = Math.max(width, height)
  if (ratio.w >= ratio.h) return { width: longest, height: Math.round((longest * ratio.h) / ratio.w) }
  return { width: Math.round((longest * ratio.w) / ratio.h), height: longest }
}

export function ratioLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const match = aspectRatios.find((r) => Math.abs(width / height - r.w / r.h) < 0.005)
  if (match) return match.id
  const d = gcd(Math.round(width), Math.round(height)) || 1
  const a = Math.round(width) / d
  const b = Math.round(height) / d
  return a <= 50 && b <= 50 ? `${a}:${b}` : (width / height).toFixed(2) + ':1'
}
