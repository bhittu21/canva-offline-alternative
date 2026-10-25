import type { DesignDocument, Gradient, ImageElement, Page, Shadow, TextElement } from '@shared/model'
import type { FitMode } from '@shared/exportOptions'
import { gradientLine, isVisibleColor, lineGeometry } from '@renderer/render/draw'
import { iconPaths, ICON_GRID } from '@renderer/render/icons'
import { chartLayout, tableLayout, type Prim } from '@renderer/render/layouts'
import { buildContent } from '@renderer/render/nodes'
import { dashArray, shapeGeometry } from '@renderer/render/shapes'
import { curvedText, displayText, isCurved, textNodes } from '@renderer/render/text'
import { assets } from '@renderer/store/assets'
import Konva from 'konva'

/**
 * Builds a vector SVG of one page: shapes, lines, icons, charts, tables and
 * text stay sharp at any size. Photos are embedded as PNG (with their frame,
 * crop and filters applied) so the file works on its own. Text uses the font
 * names from the design, so it looks right where those fonts are installed.
 */
export async function exportSvg(
  doc: DesignDocument,
  page: Page,
  options: { width: number; height: number; fit: FitMode; transparent: boolean }
): Promise<string> {
  const defs: string[] = []
  let idCounter = 0
  const nextId = (prefix: string) => `${prefix}${++idCounter}`
  const aspect = options.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'

  const paint = (color: string, gradient: Gradient | undefined, w: number, h: number) => {
    if (!gradient) return isVisibleColor(color) ? attr(color) : 'none'
    const id = nextId('g')
    const stops = gradient.stops.map((s) => `<stop offset="${num(s.offset)}" stop-color="${attr(s.color)}"/>`).join('')
    if (gradient.kind === 'radial') {
      defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${num(w / 2)}" cy="${num(h / 2)}" r="${num(Math.hypot(w, h) / 2)}">${stops}</radialGradient>`)
    } else {
      const [x1, y1, x2, y2] = gradientLine(gradient.angle, w, h)
      defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}">${stops}</linearGradient>`)
    }
    return `url(#${id})`
  }

  const shadowFilter = (shadow: Shadow | undefined) => {
    if (!shadow || shadow.opacity <= 0) return ''
    const id = nextId('s')
    defs.push(
      `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${num(shadow.offsetX)}" dy="${num(shadow.offsetY)}" stdDeviation="${num(shadow.blur / 2)}" flood-color="${attr(shadow.color)}" flood-opacity="${num(shadow.opacity)}"/></filter>`
    )
    return ` filter="url(#${id})"`
  }

  const body: string[] = []
  if (!options.transparent) body.push(`<rect width="${doc.width}" height="${doc.height}" fill="${paint(page.background, page.backgroundGradient, doc.width, doc.height)}"/>`)
  if (page.backgroundAssetId) {
    const href = await rasterImage({ type: 'image', id: 'bg', name: '', x: 0, y: 0, width: doc.width, height: doc.height, rotation: 0, opacity: 1, locked: false, hidden: false, assetId: page.backgroundAssetId })
    if (href) body.push(`<image width="${doc.width}" height="${doc.height}" preserveAspectRatio="none" href="${href}"/>`)
  }

  for (const el of page.elements) {
    if (el.hidden) continue
    const transform = `translate(${num(el.x)} ${num(el.y)})${el.rotation ? ` rotate(${num(el.rotation)})` : ''}`
    const opacity = el.opacity < 1 ? ` opacity="${num(el.opacity)}"` : ''
    const filter = shadowFilter(el.type === 'text' ? undefined : el.shadow)
    let inner = ''
    switch (el.type) {
      case 'shape': {
        const geo = shapeGeometry(el)
        const stroke =
          el.strokeWidth > 0 && isVisibleColor(el.stroke) && el.shape !== 'line'
            ? ` stroke="${attr(el.stroke)}" stroke-width="${num(el.strokeWidth)}" stroke-linejoin="round"${el.shape === 'path' && el.dash !== 'dotted' ? ' stroke-linecap="round"' : ''}${dashAttr(dashArray(el.dash, el.strokeWidth), el.dash)}`
            : ''
        inner = `<path d="${geo.d}" fill="${paint(el.fill, el.gradient, el.width, el.height)}"${geo.evenOdd ? ' fill-rule="evenodd"' : ''}${stroke}/>`
        break
      }
      case 'line': {
        const geo = lineGeometry(el)
        inner =
          `<path d="${geo.d}" fill="none" stroke="${attr(el.stroke)}" stroke-width="${num(el.strokeWidth)}"${dashAttr(dashArray(el.dash, el.strokeWidth), el.dash)}/>` +
          geo.caps
            .map((cap) =>
              cap.filled
                ? `<path d="${cap.d}" fill="${attr(el.stroke)}"/>`
                : `<path d="${cap.d}" fill="none" stroke="${attr(el.stroke)}" stroke-width="${num(el.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`
            )
            .join('')
        break
      }
      case 'icon': {
        const paths = (iconPaths(el.icon) ?? []).map((d) => `<path d="${d}"/>`).join('')
        inner = `<g transform="scale(${num(el.width / ICON_GRID)} ${num(el.height / ICON_GRID)})" fill="none" stroke="${attr(el.color)}" stroke-width="${num(el.strokeWidth)}" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`
        break
      }
      case 'chart':
        inner = prims(chartLayout(el))
        break
      case 'table':
        inner = prims(tableLayout(el).prims)
        break
      case 'image': {
        const href = await rasterImage(el)
        if (href) inner = `<image width="${num(el.width)}" height="${num(el.height)}" preserveAspectRatio="none" href="${href}"/>`
        break
      }
      case 'text':
        inner = text(el, nextId, defs, shadowFilter(el.shadow))
        break
    }
    body.push(`<g transform="${transform}"${opacity}${filter}>${inner}</g>`)
  }

  const outerBg = options.transparent ? '' : `<rect width="100%" height="100%" fill="${attr(page.background)}"/>\n`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${options.width}" height="${options.height}">
${outerBg}<svg width="100%" height="100%" viewBox="0 0 ${doc.width} ${doc.height}" preserveAspectRatio="${aspect}">
<defs><clipPath id="page"><rect width="${doc.width}" height="${doc.height}"/></clipPath>${defs.join('')}</defs>
<g clip-path="url(#page)">
${body.join('\n')}
</g>
</svg>
</svg>
`
}

function dashAttr(dash: number[], style: string | undefined): string {
  if (dash.length === 0) return ''
  return ` stroke-dasharray="${dash.map(num).join(' ')}"${style === 'dotted' ? ' stroke-linecap="round"' : ''}`
}

function prims(list: Prim[]): string {
  return list
    .map((p) => {
      if (p.t === 'path') {
        const fill = p.fill ? `fill="${attr(p.fill)}" fill-rule="evenodd"` : 'fill="none"'
        const stroke = p.stroke && p.sw ? ` stroke="${attr(p.stroke)}" stroke-width="${num(p.sw)}"${p.round ? ' stroke-linecap="round" stroke-linejoin="round"' : ''}` : ''
        return `<path d="${p.d}" ${fill}${stroke}/>`
      }
      const anchor = p.align === 'center' ? 'middle' : p.align === 'right' ? 'end' : 'start'
      return `<text x="${num(p.x)}" y="${num(p.y)}" font-family="${attr(fontStack(p.font))}" font-size="${num(p.size)}"${p.bold ? ' font-weight="bold"' : ''} fill="${attr(p.fill)}" text-anchor="${anchor}" dominant-baseline="central">${escapeText(p.text)}</text>`
    })
    .join('')
}

/** Uses the canvas text engine to find line breaks, so wrapping matches the editor. */
function text(el: TextElement, nextId: (p: string) => string, defs: string[], filter: string): string {
  const weight = el.fontStyle.includes('bold') ? ' font-weight="bold"' : ''
  const style = el.fontStyle.includes('italic') ? ' font-style="italic"' : ''
  const deco = el.underline ? ' text-decoration="underline"' : ''
  const spacing = el.letterSpacing ? ` letter-spacing="${num(el.letterSpacing)}"` : ''
  const outline =
    el.strokeWidth && el.strokeColor ? ` stroke="${attr(el.strokeColor)}" stroke-width="${num(el.strokeWidth)}" stroke-linejoin="round" paint-order="stroke"` : ''
  const font = `font-family="${attr(fontStack(el.fontFamily))}" font-size="${num(el.fontSize)}" fill="${attr(el.fill)}"${weight}${style}${deco}${spacing}${outline}`

  if (isCurved(el)) {
    const id = nextId('p')
    defs.push(`<path id="${id}" d="${curvedText(el).d}"/>`)
    return `<text ${font}${filter}><textPath href="#${id}" xlink:href="#${id}" startOffset="50%" text-anchor="middle">${escapeText(displayText(el))}</textPath></text>`
  }

  const nodes = textNodes(el)
  const node = nodes[nodes.length - 1] as Konva.Text
  const lines = (node as unknown as { textArr: { text: string }[] }).textArr
  nodes.forEach((n) => n.destroy())
  const lineHeight = el.fontSize * el.lineHeight
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'
  const x = el.align === 'center' ? el.width / 2 : el.align === 'right' ? el.width : 0
  const spans = lines.map((line, i) => `<tspan x="${num(x)}" y="${num(lineHeight * (i + 0.5))}">${escapeText(line.text)}</tspan>`).join('')
  const pad = el.fontSize * 0.25
  const bg = el.background
    ? `<rect x="${num(-pad)}" y="${num(-pad)}" width="${num(el.width + pad * 2)}" height="${num(el.height + pad * 2)}" rx="${num(pad)}" fill="${attr(el.background)}"/>`
    : ''
  return `${bg}<text ${font} text-anchor="${anchor}" dominant-baseline="central" xml:space="preserve"${filter}>${spans}</text>`
}

/** Draws a photo with its frame, crop, filters and border into a PNG data URL, at up to twice its design size. */
async function rasterImage(el: ImageElement): Promise<string | null> {
  if (el.assetId) await assets.load(el.assetId).catch(() => undefined)
  const scale = Math.min(2, 4096 / Math.max(el.width, el.height))
  const w = Math.max(1, Math.round(el.width * scale))
  const h = Math.max(1, Math.round(el.height * scale))
  const container = document.createElement('div')
  const stage = new Konva.Stage({ container, width: w, height: h })
  try {
    const layer = new Konva.Layer()
    stage.add(layer)
    const group = new Konva.Group({ scaleX: scale, scaleY: scale })
    for (const node of buildContent({ ...el, x: 0, y: 0, rotation: 0, opacity: 1, shadow: undefined }, assets)) group.add(node)
    layer.add(group)
    layer.draw()
    return stage.toDataURL({ pixelRatio: 1, mimeType: 'image/png' })
  } finally {
    stage.destroy()
  }
}

function fontStack(font: string): string {
  return `${font}, Segoe UI, Arial, sans-serif`
}

const num = (n: number) => String(Math.round(n * 100) / 100)
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

