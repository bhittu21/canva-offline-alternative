import type { Gradient, IconElement, ImageElement, LineElement, Shadow, ShapeElement } from '@shared/model'
import { iconPaths, ICON_GRID } from './icons'
import { quoteFont, withAlpha, type Prim } from './layouts'
import { dashArray, maskPath, rectPath, shapeGeometry } from './shapes'

/**
 * Plain canvas drawing for every element that is not text. Each function
 * draws in the element's own coordinates, so the caller only sets up the
 * position, rotation and opacity. The editor canvas, thumbnails and exports
 * all use these functions.
 */

type Ctx = CanvasRenderingContext2D

export function isVisibleColor(color: string | undefined): boolean {
  if (!color) return false
  const c = color.trim().toLowerCase()
  if (c === 'transparent' || c === 'none') return false
  const rgba = /^rgba\([^)]*,\s*([\d.]+)\s*\)$/.exec(c)
  return !(rgba && Number(rgba[1]) === 0)
}

/** How much the current transform scales design units into device pixels. Blur and shadow offsets need this. */
function deviceScale(c: Ctx): number {
  const m = c.getTransform()
  return Math.hypot(m.a, m.b) || 1
}

export function gradientPaint(c: Ctx, gradient: Gradient, w: number, h: number): CanvasGradient {
  let g: CanvasGradient
  if (gradient.kind === 'radial') {
    g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2)
  } else {
    const [x0, y0, x1, y1] = gradientLine(gradient.angle, w, h)
    g = c.createLinearGradient(x0, y0, x1, y1)
  }
  for (const stop of gradient.stops) g.addColorStop(Math.max(0, Math.min(1, stop.offset)), stop.color)
  return g
}

/** Start and end points of a linear gradient at an angle, reaching the corners of a w x h box. */
export function gradientLine(angle: number, w: number, h: number): [number, number, number, number] {
  const rad = (angle * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const half = Math.abs((w / 2) * dx) + Math.abs((h / 2) * dy)
  return [w / 2 - dx * half, h / 2 - dy * half, w / 2 + dx * half, h / 2 + dy * half]
}

export function applyShadow(c: Ctx, shadow: Shadow | undefined): void {
  if (!shadow || shadow.opacity <= 0) return
  const s = deviceScale(c)
  c.shadowColor = withAlpha(shadow.color, shadow.opacity)
  c.shadowBlur = shadow.blur * s
  c.shadowOffsetX = shadow.offsetX * s
  c.shadowOffsetY = shadow.offsetY * s
}

function clearShadow(c: Ctx): void {
  c.shadowColor = 'transparent'
  c.shadowBlur = 0
  c.shadowOffsetX = 0
  c.shadowOffsetY = 0
}

export function drawShape(c: Ctx, el: ShapeElement): void {
  const geo = shapeGeometry(el)
  const path = new Path2D(geo.d)
  c.save()
  applyShadow(c, el.shadow)
  const hasFill = !!el.gradient || isVisibleColor(el.fill)
  if (hasFill) {
    c.fillStyle = el.gradient ? gradientPaint(c, el.gradient, el.width, el.height) : el.fill
    c.fill(path, geo.evenOdd ? 'evenodd' : 'nonzero')
    clearShadow(c)
  }
  if (el.strokeWidth > 0 && isVisibleColor(el.stroke) && el.shape !== 'line') {
    c.strokeStyle = el.stroke
    c.lineWidth = el.strokeWidth
    c.lineJoin = 'round'
    // Drawn paths (doodles, illustrations) end in round caps; boxes keep crisp corners.
    c.lineCap = el.dash === 'dotted' || el.shape === 'path' ? 'round' : 'butt'
    c.setLineDash(dashArray(el.dash, el.strokeWidth))
    c.stroke(path)
  }
  c.restore()
}

/** Where the drawn line ends after making room for a cap, and the cap's outline. */
export function lineGeometry(el: LineElement) {
  const sw = el.strokeWidth
  const y = el.height / 2
  const cap = Math.max(sw * 3, 6)
  const inset = (kind: string) => (kind === 'triangle' ? cap * 0.9 : kind === 'arrow' ? sw * 0.5 : kind === 'circle' || kind === 'square' ? cap * 0.35 : 0)
  const x0 = inset(el.startCap)
  const x1 = el.width - inset(el.endCap)
  const caps: { d: string; filled: boolean }[] = []
  const makeCap = (kind: string, tipX: number, dir: 1 | -1) => {
    const back = tipX - dir * cap
    switch (kind) {
      case 'arrow':
        return { d: `M${back} ${y - cap * 0.6}L${tipX} ${y}L${back} ${y + cap * 0.6}`, filled: false }
      case 'triangle':
        return { d: `M${back} ${y - cap * 0.6}L${tipX} ${y}L${back} ${y + cap * 0.6}Z`, filled: true }
      case 'circle': {
        const r = cap * 0.4
        const cx = tipX - dir * r
        return { d: `M${cx - r} ${y}A${r} ${r} 0 1 0 ${cx + r} ${y}A${r} ${r} 0 1 0 ${cx - r} ${y}Z`, filled: true }
      }
      case 'square': {
        const s = cap * 0.7
        const left = dir === 1 ? tipX - s : tipX
        return { d: rectPath(s, s, 0, left, y - s / 2), filled: true }
      }
      case 'bar':
        return { d: `M${tipX} ${y - cap * 0.6}L${tipX} ${y + cap * 0.6}`, filled: false }
      default:
        return null
    }
  }
  const start = makeCap(el.startCap, 0, -1)
  const end = makeCap(el.endCap, el.width, 1)
  if (start) caps.push(start)
  if (end) caps.push(end)
  return { d: `M${x0} ${y}L${Math.max(x0, x1)} ${y}`, caps }
}

export function drawLine(c: Ctx, el: LineElement): void {
  const geo = lineGeometry(el)
  c.save()
  applyShadow(c, el.shadow)
  c.strokeStyle = el.stroke
  c.fillStyle = el.stroke
  c.lineWidth = el.strokeWidth
  c.lineCap = el.dash === 'solid' ? 'butt' : 'round'
  c.setLineDash(dashArray(el.dash, el.strokeWidth))
  c.stroke(new Path2D(geo.d))
  c.setLineDash([])
  c.lineJoin = 'round'
  c.lineCap = 'round'
  for (const cap of geo.caps) {
    const p = new Path2D(cap.d)
    if (cap.filled) c.fill(p)
    else c.stroke(p)
  }
  c.restore()
}

export function drawIcon(c: Ctx, el: IconElement): void {
  const paths = iconPaths(el.icon) ?? iconPaths('circle-help') ?? []
  c.save()
  applyShadow(c, el.shadow)
  c.scale(el.width / ICON_GRID, el.height / ICON_GRID)
  c.strokeStyle = el.color
  c.lineWidth = el.strokeWidth
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const d of paths) c.stroke(new Path2D(d))
  c.restore()
}

export function filterString(el: ImageElement, scale: number): string {
  const f = el.filters
  if (!f) return 'none'
  const parts: string[] = []
  if (f.brightness !== undefined && f.brightness !== 1) parts.push(`brightness(${f.brightness})`)
  if (f.contrast !== undefined && f.contrast !== 1) parts.push(`contrast(${f.contrast})`)
  if (f.saturation !== undefined && f.saturation !== 1) parts.push(`saturate(${f.saturation})`)
  if (f.grayscale) parts.push(`grayscale(${f.grayscale})`)
  if (f.sepia) parts.push(`sepia(${f.sepia})`)
  if (f.hue) parts.push(`hue-rotate(${f.hue}deg)`)
  if (f.blur) parts.push(`blur(${f.blur * scale}px)`)
  return parts.length ? parts.join(' ') : 'none'
}

/** The part of the photo that shows in the frame: it always fills the frame, never stretched. */
export function imageSourceRect(el: Pick<ImageElement, 'width' | 'height' | 'crop'>, iw: number, ih: number) {
  const zoom = el.crop?.zoom ?? 1
  const scale = Math.max(el.width / iw, el.height / ih) * zoom
  const sw = Math.min(iw, el.width / scale)
  const sh = Math.min(ih, el.height / scale)
  const sx = (iw - sw) * (el.crop?.focusX ?? 0.5)
  const sy = (ih - sh) * (el.crop?.focusY ?? 0.5)
  return { sx, sy, sw, sh }
}

export function drawImage(c: Ctx, el: ImageElement, image: CanvasImageSource | undefined, naturalSize?: { width: number; height: number }): void {
  const { width: w, height: h } = el
  const mask = maskPath(el.mask, w, h, el.cornerRadius ?? 0)
  const clip = mask ? new Path2D(mask) : null
  c.save()
  if (el.shadow && el.shadow.opacity > 0) {
    // The shadow follows the frame shape.
    c.save()
    applyShadow(c, el.shadow)
    c.fillStyle = '#ffffff'
    if (clip) c.fill(clip)
    else c.fillRect(0, 0, w, h)
    c.restore()
  }
  if (clip) c.clip(clip)
  if (image && naturalSize && naturalSize.width > 0) {
    const { sx, sy, sw, sh } = imageSourceRect(el, naturalSize.width, naturalSize.height)
    c.save()
    c.filter = filterString(el, deviceScale(c))
    if (el.flipX || el.flipY) {
      c.translate(el.flipX ? w : 0, el.flipY ? h : 0)
      c.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1)
    }
    c.drawImage(image, sx, sy, sw, sh, 0, 0, w, h)
    c.restore()
  } else {
    drawFramePlaceholder(c, w, h)
  }
  c.restore()
  if (el.borderWidth && el.borderWidth > 0 && isVisibleColor(el.borderColor)) {
    c.save()
    if (clip) c.clip(clip)
    c.strokeStyle = el.borderColor!
    c.lineWidth = el.borderWidth * 2
    c.stroke(clip ?? new Path2D(rectPath(w, h)))
    c.restore()
  }
}

/** An empty frame: a soft grey box with a small picture symbol. */
function drawFramePlaceholder(c: Ctx, w: number, h: number): void {
  c.fillStyle = '#e6e8ee'
  c.fillRect(0, 0, w, h)
  const s = Math.min(w, h) * 0.22
  c.translate(w / 2 - s / 2, h / 2 - s / 2)
  c.scale(s / 24, s / 24)
  c.strokeStyle = '#9aa0ad'
  c.lineWidth = 1.6
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const d of iconPaths('image') ?? []) c.stroke(new Path2D(d))
}

export function drawPrims(c: Ctx, prims: Prim[]): void {
  for (const p of prims) {
    if (p.t === 'path') {
      const path = new Path2D(p.d)
      if (p.fill) {
        c.fillStyle = p.fill
        c.fill(path, 'evenodd')
      }
      if (p.stroke && p.sw) {
        c.strokeStyle = p.stroke
        c.lineWidth = p.sw
        c.lineJoin = 'round'
        c.lineCap = p.round ? 'round' : 'butt'
        c.setLineDash(p.dash ?? [])
        c.stroke(path)
        c.setLineDash([])
      }
    } else {
      c.font = `${p.bold ? 'bold ' : ''}${p.size}px ${quoteFont(p.font)}`
      c.fillStyle = p.fill
      c.textAlign = p.align
      c.textBaseline = 'middle'
      c.fillText(p.text, p.x, p.y)
    }
  }
}

export function drawBackground(c: Ctx, w: number, h: number, color: string, gradient: Gradient | undefined): void {
  c.save()
  c.fillStyle = gradient ? gradientPaint(c, gradient, w, h) : color
  c.fillRect(0, 0, w, h)
  c.restore()
}
