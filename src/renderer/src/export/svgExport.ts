import type { DesignDocument, DesignElement, ShapeElement, TextElement } from '@shared/model'
import type { FitMode } from '@shared/exportOptions'
import { starPoints, trianglePoints } from '@renderer/editor/geometry'
import { textNode } from './renderDesign'

/**
 * Builds a vector SVG: shapes and text stay sharp at any size, and images are
 * embedded so the file works on its own. Text uses the same fonts by name, so
 * it looks right on PCs that have those fonts (all built-in Windows fonts).
 */
export function exportSvg(
  doc: DesignDocument,
  options: { width: number; height: number; fit: FitMode; transparent: boolean },
  assetBytes: ReadonlyMap<string, Uint8Array>
): string {
  const mimeOf = new Map(doc.assets.map((a) => [a.id, a.mime]))
  const aspect = options.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'
  const body = doc.elements
    .filter((el) => !el.hidden)
    .map((el) => element(el, assetBytes, mimeOf))
    .join('\n')
  // Margins added by "fit" are coloured like the page unless the background is transparent.
  const outerBg = options.transparent ? '' : `<rect width="100%" height="100%" fill="${attr(doc.background)}"/>\n`
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${options.width}" height="${options.height}">
${outerBg}<svg width="100%" height="100%" viewBox="0 0 ${doc.width} ${doc.height}" preserveAspectRatio="${aspect}">
<defs><clipPath id="page"><rect width="${doc.width}" height="${doc.height}"/></clipPath></defs>
<g clip-path="url(#page)">
${body}
</g>
</svg>
</svg>
`
}

function element(el: DesignElement, assetBytes: ReadonlyMap<string, Uint8Array>, mimeOf: Map<string, string>): string {
  const transform = `translate(${num(el.x)} ${num(el.y)})${el.rotation ? ` rotate(${num(el.rotation)})` : ''}`
  const opacity = el.opacity < 1 ? ` opacity="${num(el.opacity)}"` : ''
  let inner = ''
  if (el.type === 'shape') inner = shape(el)
  else if (el.type === 'text') inner = text(el)
  else {
    const bytes = assetBytes.get(el.assetId)
    if (!bytes) return ''
    const href = `data:${mimeOf.get(el.assetId) ?? 'image/png'};base64,${toBase64(bytes)}`
    inner = `<image width="${num(el.width)}" height="${num(el.height)}" preserveAspectRatio="none" href="${href}" xlink:href="${href}"/>`
  }
  return `<g transform="${transform}"${opacity}>${inner}</g>`
}

function shape(el: ShapeElement): string {
  const stroke = el.strokeWidth > 0 && el.shape !== 'line' ? ` stroke="${attr(el.stroke)}" stroke-width="${num(el.strokeWidth)}" stroke-linejoin="round"` : ''
  const fill = `fill="${attr(el.fill)}"`
  switch (el.shape) {
    case 'rect':
      return `<rect width="${num(el.width)}" height="${num(el.height)}" rx="${num(el.cornerRadius)}" ${fill}${stroke}/>`
    case 'ellipse':
      return `<ellipse cx="${num(el.width / 2)}" cy="${num(el.height / 2)}" rx="${num(el.width / 2)}" ry="${num(el.height / 2)}" ${fill}${stroke}/>`
    case 'triangle':
      return `<polygon points="${points(trianglePoints(el.width, el.height))}" ${fill}${stroke}/>`
    case 'star':
      return `<polygon points="${points(starPoints(el.width, el.height))}" ${fill}${stroke}/>`
    case 'line':
      return `<rect width="${num(el.width)}" height="${num(el.height)}" rx="${num(Math.min(el.height / 2, el.cornerRadius))}" ${fill}/>`
  }
}

/** Uses the canvas text engine to find line breaks, so wrapping matches the editor. */
function text(el: TextElement): string {
  const node = textNode(el)
  const lines = (node as unknown as { textArr: { text: string }[] }).textArr
  node.destroy()
  const lineHeight = el.fontSize * el.lineHeight
  const anchor = el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start'
  const x = el.align === 'center' ? el.width / 2 : el.align === 'right' ? el.width : 0
  const weight = el.fontStyle.includes('bold') ? ' font-weight="bold"' : ''
  const style = el.fontStyle.includes('italic') ? ' font-style="italic"' : ''
  const deco = el.underline ? ' text-decoration="underline"' : ''
  const spacing = el.letterSpacing ? ` letter-spacing="${num(el.letterSpacing)}"` : ''
  const spans = lines
    .map((line, i) => `<tspan x="${num(x)}" y="${num(lineHeight * (i + 0.5))}">${escapeText(line.text)}</tspan>`)
    .join('')
  return `<text font-family="${attr(el.fontFamily)}" font-size="${num(el.fontSize)}" fill="${attr(el.fill)}" text-anchor="${anchor}" dominant-baseline="central" xml:space="preserve"${weight}${style}${deco}${spacing}>${spans}</text>`
}

const num = (n: number) => String(Math.round(n * 100) / 100)
const points = (p: number[]) => p.map(num).join(' ')
const attr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(binary)
}

