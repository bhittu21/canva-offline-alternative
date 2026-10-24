import type { ChartElement, TableElement } from '@shared/model'
import { ellipsePath, pointsPath, rectPath } from './shapes'

/**
 * Charts and tables are laid out as simple drawing primitives (paths and
 * single lines of text). The canvas and the SVG export both draw these same
 * primitives, so an exported chart matches the editor exactly.
 */

export type Prim =
  | { t: 'path'; d: string; fill?: string; stroke?: string; sw?: number; dash?: number[]; round?: boolean }
  | { t: 'text'; x: number; y: number; text: string; size: number; font: string; bold?: boolean; fill: string; align: 'left' | 'center' | 'right' }

/** Measures a line of text. The renderer passes in a canvas-based measurer. */
export type Measure = (text: string, size: number, font: string, bold?: boolean) => number

let measureCanvas: CanvasRenderingContext2D | null = null

export const measureText: Measure = (text, size, font, bold) => {
  if (typeof document === 'undefined') return text.length * size * 0.55
  measureCanvas ??= document.createElement('canvas').getContext('2d')
  if (!measureCanvas) return text.length * size * 0.55
  measureCanvas.font = `${bold ? 'bold ' : ''}${size}px ${quoteFont(font)}`
  return measureCanvas.measureText(text).width
}

export function quoteFont(font: string): string {
  return /^[\w-]+$/.test(font) ? font : `"${font.replace(/"/g, '')}"`
}

// ---------------------------------------------------------------- Colours

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const s = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1]
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}

export function withAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color)
  return rgb ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})` : color
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const fn = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return rgbToHex(fn(0) * 255, fn(8) * 255, fn(4) * 255)
}

/** A family of distinct colours starting from a base colour, for pie slices. */
export function colorFamily(base: string, count: number): string[] {
  const rgb = hexToRgb(base) ?? [124, 92, 255]
  const [h, s, l] = rgbToHsl(rgb)
  return Array.from({ length: count }, (_, i) => (i === 0 ? base : hslToHex((h + i * 47) % 360, Math.max(0.35, s), Math.min(0.62, Math.max(0.4, l)))))
}

/** Relative luminance, for picking readable text colours. */
export function luminance(color: string): number {
  const rgb = hexToRgb(color)
  if (!rgb) return 1
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// ---------------------------------------------------------------- Charts

function niceMax(value: number): number {
  if (value <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(value)))
  const f = value / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nice * exp
}

function formatValue(v: number): string {
  if (Math.abs(v) >= 1e6) return `${+(v / 1e6).toFixed(1)}M`
  if (Math.abs(v) >= 1e4) return `${+(v / 1e3).toFixed(1)}k`
  return String(+v.toFixed(2))
}

export function chartLayout(el: ChartElement, measure: Measure = measureText): Prim[] {
  const { width: w, height: h, fontFamily: font, textColor } = el
  const prims: Prim[] = []
  const size = Math.max(8, Math.min(48, Math.min(w, h) * 0.05))
  const pad = size * 0.6
  const pie = el.chartType === 'pie' || el.chartType === 'donut'
  const sliceColors = colorFamily(el.series[0]?.color ?? '#7c5cff', el.labels.length)

  // Legend along the bottom.
  let bottom = h
  const legendItems = pie ? el.labels.map((name, i) => ({ name, color: sliceColors[i] })) : el.series.map((s) => ({ name: s.name, color: s.color }))
  if (el.showLegend && legendItems.length > 0) {
    const lh = size * 1.8
    bottom = h - lh
    const widths = legendItems.map((item) => size * 1.6 + measure(item.name, size * 0.85, font) + size)
    const total = widths.reduce((a, b) => a + b, 0)
    let x = Math.max(0, (w - total) / 2)
    legendItems.forEach((item, i) => {
      prims.push({ t: 'path', d: rectPath(size * 0.8, size * 0.8, size * 0.2, x, bottom + lh / 2 - size * 0.4), fill: item.color })
      prims.push({ t: 'text', x: x + size * 1.2, y: bottom + lh / 2, text: item.name, size: size * 0.85, font, fill: textColor, align: 'left' })
      x += widths[i]
    })
  }

  if (pie) {
    const values = el.labels.map((_, i) => Math.max(0, el.series[0]?.values[i] ?? 0))
    const total = values.reduce((a, b) => a + b, 0) || 1
    const cx = w / 2
    const cy = bottom / 2
    const r = Math.max(1, Math.min(w, bottom) / 2 - pad)
    const inner = el.chartType === 'donut' ? r * 0.58 : 0
    let angle = -Math.PI / 2
    values.forEach((v, i) => {
      const sweep = (v / total) * Math.PI * 2
      if (sweep <= 0) return
      prims.push({ t: 'path', d: sector(cx, cy, r, inner, angle, angle + sweep), fill: sliceColors[i], stroke: '#ffffff', sw: Math.max(1, r * 0.01) })
      if (el.showValues && sweep > 0.25) {
        const mid = angle + sweep / 2
        const lr = inner ? (r + inner) / 2 : r * 0.62
        prims.push({
          t: 'text',
          x: cx + Math.cos(mid) * lr,
          y: cy + Math.sin(mid) * lr,
          text: `${Math.round((v / total) * 100)}%`,
          size: size * 0.9,
          font,
          bold: true,
          fill: luminance(sliceColors[i]) > 0.5 ? '#1f2329' : '#ffffff',
          align: 'center'
        })
      }
      angle += sweep
    })
    return prims
  }

  const horizontal = el.chartType === 'bar'
  const all = el.series.flatMap((s) => s.values.slice(0, el.labels.length))
  const max = niceMax(Math.max(0, ...all))
  const ticks = 4
  const valueLabelWidth = Math.max(...Array.from({ length: ticks + 1 }, (_, i) => measure(formatValue((max / ticks) * i), size * 0.8, font)))
  const catLabelWidth = Math.max(...el.labels.map((l) => measure(l, size * 0.85, font)))

  const left = horizontal ? Math.min(w * 0.4, catLabelWidth + pad * 1.5) : valueLabelWidth + pad * 1.5
  const top = pad + (el.showValues ? size : 0)
  const plotBottom = bottom - (horizontal ? size * 1.6 : size * 1.8)
  const right = w - pad - (horizontal && el.showValues ? size * 2.5 : 0)
  const pw = Math.max(1, right - left)
  const ph = Math.max(1, plotBottom - top)
  const gridColor = withAlpha(textColor, 0.15)

  // Grid lines and value axis labels.
  for (let i = 0; i <= ticks; i++) {
    const value = (max / ticks) * i
    if (horizontal) {
      const x = left + (pw * i) / ticks
      if (el.showGrid || i === 0) prims.push({ t: 'path', d: `M${x} ${top}V${plotBottom}`, stroke: i === 0 ? withAlpha(textColor, 0.4) : gridColor, sw: 1 })
      prims.push({ t: 'text', x, y: plotBottom + size, text: formatValue(value), size: size * 0.8, font, fill: withAlpha(textColor, 0.7), align: 'center' })
    } else {
      const y = plotBottom - (ph * i) / ticks
      if (el.showGrid || i === 0) prims.push({ t: 'path', d: `M${left} ${y}H${right}`, stroke: i === 0 ? withAlpha(textColor, 0.4) : gridColor, sw: 1 })
      prims.push({ t: 'text', x: left - pad * 0.6, y, text: formatValue(value), size: size * 0.8, font, fill: withAlpha(textColor, 0.7), align: 'right' })
    }
  }

  const n = el.labels.length
  const band = (horizontal ? ph : pw) / n
  el.labels.forEach((label, i) => {
    const c = (horizontal ? top : left) + band * (i + 0.5)
    if (horizontal) prims.push({ t: 'text', x: left - pad * 0.6, y: c, text: label, size: size * 0.85, font, fill: textColor, align: 'right' })
    else prims.push({ t: 'text', x: c, y: plotBottom + size * 0.9, text: label, size: size * 0.85, font, fill: textColor, align: 'center' })
  })

  if (el.chartType === 'column' || el.chartType === 'bar') {
    const groupWidth = band * 0.72
    const barSize = groupWidth / el.series.length
    el.series.forEach((s, si) => {
      el.labels.forEach((_, i) => {
        const v = Math.max(0, s.values[i] ?? 0)
        const len = (v / max) * (horizontal ? pw : ph)
        const offset = (horizontal ? top : left) + band * i + (band - groupWidth) / 2 + barSize * si
        const r = Math.min(barSize * 0.18, len / 2)
        if (horizontal) {
          if (len > 0) prims.push({ t: 'path', d: rectPath(len, barSize * 0.9, r, left, offset), fill: s.color })
          if (el.showValues) prims.push({ t: 'text', x: left + len + pad * 0.4, y: offset + barSize * 0.45, text: formatValue(v), size: size * 0.8, font, fill: textColor, align: 'left' })
        } else {
          if (len > 0) prims.push({ t: 'path', d: rectPath(barSize * 0.9, len, r, offset, plotBottom - len), fill: s.color })
          if (el.showValues) prims.push({ t: 'text', x: offset + barSize * 0.45, y: plotBottom - len - size * 0.7, text: formatValue(v), size: size * 0.8, font, fill: textColor, align: 'center' })
        }
      })
    })
  } else {
    el.series.forEach((s) => {
      const pts = el.labels.map((_, i) => [left + band * (i + 0.5), plotBottom - (Math.max(0, s.values[i] ?? 0) / max) * ph])
      const flat = pts.flat()
      if (el.chartType === 'area' && pts.length > 1) {
        prims.push({ t: 'path', d: pointsPath([pts[0][0], plotBottom, ...flat, pts[pts.length - 1][0], plotBottom]), fill: withAlpha(s.color, 0.25) })
      }
      prims.push({ t: 'path', d: pointsPath(flat, false), stroke: s.color, sw: Math.max(1.5, size * 0.18), round: true })
      pts.forEach(([x, y], i) => {
        prims.push({ t: 'path', d: ellipsePath(size * 0.5, size * 0.5, x, y), fill: '#ffffff', stroke: s.color, sw: Math.max(1, size * 0.12) })
        if (el.showValues) prims.push({ t: 'text', x, y: y - size * 0.9, text: formatValue(s.values[i] ?? 0), size: size * 0.8, font, fill: textColor, align: 'center' })
      })
    })
  }
  return prims
}

function sector(cx: number, cy: number, r: number, inner: number, a0: number, a1: number): string {
  const full = a1 - a0 >= Math.PI * 2 - 1e-6
  if (full) {
    const outer = ellipsePath(r * 2, r * 2, cx, cy)
    return inner ? outer + ellipsePath(inner * 2, inner * 2, cx, cy) : outer
  }
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${cx + Math.cos(a) * rad} ${cy + Math.sin(a) * rad}`
  if (!inner) return `M${cx} ${cy}L${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}Z`
  return `M${p(r, a0)}A${r} ${r} 0 ${large} 1 ${p(r, a1)}L${p(inner, a1)}A${inner} ${inner} 0 ${large} 0 ${p(inner, a0)}Z`
}

// ---------------------------------------------------------------- Tables

/** Splits text into lines that fit a width, breaking at spaces (and inside very long words). */
export function wrapText(text: string, maxWidth: number, size: number, font: string, bold: boolean, measure: Measure): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (measure(candidate, size, font, bold) <= maxWidth || !line) {
        line = candidate
      } else {
        lines.push(line)
        line = word
      }
      while (measure(line, size, font, bold) > maxWidth && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && measure(line.slice(0, cut), size, font, bold) > maxWidth) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    lines.push(line)
  }
  return lines
}

export function tableLayout(el: TableElement, measure: Measure = measureText): { prims: Prim[]; height: number } {
  const cols = Math.max(...el.rows.map((r) => r.length))
  const colWidth = el.width / cols
  const pad = el.fontSize * 0.55
  const lineHeight = el.fontSize * 1.3
  const prims: Prim[] = []
  const rowHeights = el.rows.map((row, ri) => {
    const bold = el.headerRow && ri === 0
    const lines = Math.max(1, ...row.map((cell) => wrapText(cell, Math.max(1, colWidth - pad * 2), el.fontSize, el.fontFamily, bold, measure).length))
    return lines * lineHeight + pad * 2
  })
  const height = rowHeights.reduce((a, b) => a + b, 0)
  let y = 0
  el.rows.forEach((row, ri) => {
    const header = el.headerRow && ri === 0
    const rh = rowHeights[ri]
    const bodyIndex = el.headerRow ? ri - 1 : ri
    const fill = header ? el.headerFill : el.stripeFill && bodyIndex % 2 === 1 ? el.stripeFill : el.fill
    prims.push({ t: 'path', d: rectPath(el.width, rh, 0, 0, y), fill })
    for (let ci = 0; ci < cols; ci++) {
      const cell = row[ci] ?? ''
      const lines = wrapText(cell, Math.max(1, colWidth - pad * 2), el.fontSize, el.fontFamily, header, measure)
      const x0 = ci * colWidth
      const tx = el.align === 'left' ? x0 + pad : el.align === 'right' ? x0 + colWidth - pad : x0 + colWidth / 2
      lines.forEach((line, li) => {
        prims.push({
          t: 'text',
          x: tx,
          y: y + pad + lineHeight * (li + 0.5),
          text: line,
          size: el.fontSize,
          font: el.fontFamily,
          bold: header,
          fill: header ? el.headerTextColor : el.textColor,
          align: el.align
        })
      })
    }
    y += rh
  })
  if (el.borderWidth > 0) {
    let grid = ''
    let gy = 0
    for (const rh of rowHeights.slice(0, -1)) {
      gy += rh
      grid += `M0 ${gy}H${el.width}`
    }
    for (let ci = 1; ci < cols; ci++) grid += `M${ci * colWidth} 0V${height}`
    if (grid) prims.push({ t: 'path', d: grid, stroke: el.borderColor, sw: el.borderWidth })
    prims.push({ t: 'path', d: rectPath(el.width, height), stroke: el.borderColor, sw: el.borderWidth })
  }
  return { prims, height }
}
