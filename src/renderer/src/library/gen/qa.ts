import Konva from 'konva'
import type { DesignDocument, DesignElement, TextElement } from '@shared/model'
import { designDocumentSchema } from '@shared/model'
import { decodeProject, encodeProject } from '@shared/projectFile'
import { renderThumbnail } from '@renderer/export/renderDesign'
import { fontInfo } from '@renderer/fonts/fontList'
import { closeTab, openDocument } from '@renderer/io/projectIo'
import { iconList } from '@renderer/render/icons'
import { tableLayout, tableWordsFit } from '@renderer/render/layouts'
import { measureTextHeight } from '@renderer/render/text'
import { editor, editorStore } from '@renderer/store/editorStore'
import { builtInTemplates, templateDocument } from '../templates'
import { blend, contrast, parseColor, type RGBA } from './color'
import type { GeneratedTemplate } from './catalog'

/**
 * Automatic checks for the template library, run by the test scripts in a
 * development build only (the app loads this module when started with the
 * template check switch). Nothing here runs for normal users.
 */

const icons = new Set(iconList.map((i) => i.name))
const editableTypes = new Set(['text', 'shape', 'line', 'image', 'icon', 'chart', 'table'])

export function list() {
  return builtInTemplates.map((t) => {
    const g = t as Partial<GeneratedTemplate>
    return { id: t.id, title: t.title, category: t.category, width: t.width, height: t.height, family: g.family ?? 'handmade', layout: g.layout ?? '', theme: g.theme ?? '', format: g.format ?? '', pageCount: t.pageCount ?? 1 }
  })
}

function find(id: string) {
  const t = builtInTemplates.find((x) => x.id === id)
  if (!t) throw new Error(`No template ${id}`)
  return t
}

const overlap = (a: DesignElement, b: DesignElement) => {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return w > 2 && h > 2 ? w * h : 0
}

/** Meme-style text with a thick outline reads on any photo or colour. */
const outlined = (el: TextElement) => !!el.strokeColor && (el.strokeWidth ?? 0) >= el.fontSize * 0.05

/** The colour behind the middle of a text element. */
function colourUnder(page: DesignDocument['pages'][number], index: number, el: TextElement, stop: string): RGBA {
  let under = parseColor(stop) ?? [255, 255, 255, 1]
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  for (let i = 0; i < index; i++) {
    const s = page.elements[i]
    if (s.hidden || s.rotation % 360 !== 0) continue
    if (cx < s.x || cx > s.x + s.width || cy < s.y || cy > s.y + s.height) continue
    if (s.type === 'shape' && (s.shape === 'rect' || s.shape === 'ellipse')) {
      const fill = s.gradient ? s.gradient.stops[0].color : s.fill
      const p = parseColor(fill)
      if (p && p[3] > 0) under = blend(p, under, s.opacity)
    } else if (s.type === 'image') under = [230, 232, 238, 1]
  }
  return under
}

/** True when an opaque panel lies between a photo frame and a text element, so the text reads on the panel. */
function shieldedFrom(page: DesignDocument['pages'][number], frameIndex: number, textIndex: number, el: TextElement): boolean {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  for (let k = frameIndex + 1; k < textIndex; k++) {
    const s = page.elements[k]
    if (s.type !== 'shape' || s.hidden || s.rotation % 360 !== 0) continue
    const fill = s.gradient ? s.gradient.stops[0].color : s.fill
    const p = parseColor(fill)
    if (p && p[3] * s.opacity >= 0.8 && cx >= s.x && cx <= s.x + s.width && cy >= s.y && cy <= s.y + s.height) return true
  }
  return false
}

export interface CheckResult {
  id: string
  issues: string[]
  elements: number
  texts: number
  bytes: number
}

export function check(id: string): CheckResult {
  const t = find(id)
  const doc = templateDocument(t)
  const issues: string[] = []
  const parsed = designDocumentSchema.safeParse(doc)
  if (!parsed.success) issues.push(`invalid file: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`)
  let bytes = 0
  try {
    const encoded = encodeProject(doc, new Map())
    bytes = encoded.byteLength
    const back = decodeProject(encoded).document
    const count = (d: DesignDocument) => d.pages.reduce((s, p) => s + p.elements.length, 0)
    if (count(back) !== count(doc) || back.pages.length !== doc.pages.length) issues.push('save and reopen changed the design')
  } catch (error) {
    issues.push(`cannot save: ${(error as Error).message}`)
  }
  if (t.pageCount !== undefined && t.pageCount !== doc.pages.length) issues.push(`page count ${doc.pages.length} != ${t.pageCount}`)
  const W = doc.width
  const H = doc.height
  const short = Math.min(W, H)
  const minFont = Math.max(12, short * 0.015)
  let elements = 0
  let texts = 0
  doc.pages.forEach((page, pi) => {
    const where = doc.pages.length > 1 ? `p${pi + 1} ` : ''
    const stops = page.backgroundGradient ? page.backgroundGradient.stops.map((s) => s.color) : [page.background]
    const ids = new Set<string>()
    if (page.elements.length === 0) issues.push(`${where}empty page`)
    page.elements.forEach((el, i) => {
      elements++
      if (ids.has(el.id)) issues.push(`${where}duplicate id`)
      ids.add(el.id)
      const name = `${where}${el.type} "${el.name.slice(0, 24)}"`
      if (!editableTypes.has(el.type)) issues.push(`${name}: not an editable type`)
      if (el.locked || el.hidden || el.opacity <= 0) issues.push(`${name}: locked, hidden or invisible`)
      if (!(el.width > 0 && el.height > 0)) issues.push(`${name}: zero size`)
      const deco = el.name === 'Decoration'
      const inside = el.x >= -1 && el.y >= -1 && el.x + el.width <= W + 1 && el.y + el.height <= H + 1
      const visible = el.x < W && el.y < H && el.x + el.width > 0 && el.y + el.height > 0
      if (el.rotation % 360 === 0 && !deco && !inside) issues.push(`${name}: outside the page`)
      if (deco && !visible && el.rotation % 360 === 0) issues.push(`${name}: decoration off the page`)
      if (el.type === 'table') {
        const pairs: [string, string, string][] = [['table text', el.textColor, el.fill], ['table header', el.headerTextColor, el.headerFill]]
        if (el.stripeFill) pairs.push(['table stripe', el.textColor, el.stripeFill])
        for (const [label, fg, bg] of pairs) {
          const a = parseColor(fg)
          const b = parseColor(bg)
          if (a && b && contrast(a, b) < 4.5) issues.push(`${name}: ${label} contrast ${contrast(a, b).toFixed(2)} < 4.5`)
        }
        if (el.fontSize < minFont * 0.9) issues.push(`${name}: table font ${Math.round(el.fontSize)}px is too small`)
        if (!tableWordsFit(el)) issues.push(`${name}: a word is split across lines in a table cell`)
        const h = tableLayout(el).height
        if (Math.abs(h - el.height) > 2) issues.push(`${name}: table height ${Math.round(el.height)} but needs ${Math.round(h)}`)
      }
      if (el.type === 'icon' && !icons.has(el.icon)) issues.push(`${name}: unknown icon ${el.icon}`)
      if (el.type === 'text') {
        texts++
        if (!el.text.trim()) issues.push(`${name}: empty text`)
        if (!fontInfo(el.fontFamily)?.bundled) issues.push(`${name}: font ${el.fontFamily} is not bundled`)
        const info = fontInfo(el.fontFamily)
        if (info && el.fontStyle.includes('bold') && !info.bold) issues.push(`${name}: ${el.fontFamily} has no bold`)
        if (info && el.fontStyle.includes('italic') && !info.italic) issues.push(`${name}: ${el.fontFamily} has no italic`)
        const h = measureTextHeight(el)
        if (Math.abs(h - el.height) > 2) issues.push(`${name}: height ${Math.round(el.height)} but text needs ${Math.round(h)}`)
        if (el.fontSize < minFont) issues.push(`${name}: font ${Math.round(el.fontSize)}px is too small (min ${Math.round(minFont)})`)
        for (const stop of outlined(el) ? [] : stops) {
          const under = colourUnder(page, i, el, stop)
          const fg = parseColor(el.fill)
          if (!fg) continue
          const ratio = contrast(blend(fg, under, el.opacity), under)
          const need = el.fontSize >= short * 0.045 || (el.fontSize >= short * 0.03 && el.fontStyle.includes('bold')) ? 3 : 4.5
          if (ratio < need) issues.push(`${name}: contrast ${ratio.toFixed(2)} < ${need}`)
        }
        page.elements.forEach((other, j) => {
          if (j <= i && other.type === 'text') return
          if (other === el || other.hidden) return
          if (other.type === 'text' && overlap(el, other) > 0) issues.push(`${name}: overlaps text "${other.name.slice(0, 24)}"`)
          if (other.type === 'image' && j < i && overlap(el, other) > el.width * el.height * 0.05 && !el.background && !outlined(el) && !shieldedFrom(page, j, i, el)) issues.push(`${name}: sits on photo frame`)
          if (other.type === 'image' && j > i && overlap(el, other) > el.width * el.height * 0.05) issues.push(`${name}: hidden under photo frame`)
          if (j > i && other.type === 'shape' && other.name !== 'Decoration' && other.fill !== 'transparent' && overlap(el, other) > el.width * el.height * 0.3) issues.push(`${name}: covered by ${other.name}`)
        })
      }
    })
    if (page.elements.length > 160) issues.push(`${where}too many elements (${page.elements.length})`)
  })
  return { id, issues: [...new Set(issues)], elements, texts, bytes }
}

export async function thumb(id: string, max = 240, pageIndex = 0): Promise<string> {
  const doc = templateDocument(find(id))
  const canvas = await renderThumbnail(doc, doc.pages[pageIndex], max)
  return canvas.toDataURL('image/png')
}

/** Opens a template in the editor and checks that every element is on the canvas. */
export async function openInEditor(id: string): Promise<string[]> {
  const doc = templateDocument(find(id))
  await openDocument(doc, null)
  const issues: string[] = []
  const close = () => {
    // Each check opens a tab; mark it unchanged and close it so tabs do not pile up.
    const h = editorStore.getState().history
    if (h) editorStore.setState({ forceDirty: false, savedEntry: h.past[h.past.length - 1] ?? null })
    return closeTab()
  }
  for (const page of doc.pages) {
    editor.setActivePage(editorStore.getState().history!.present.pages[doc.pages.indexOf(page)].id)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const stage = Konva.stages.find((s) => s.container().closest('.canvas-area'))
    if (!stage) {
      await close()
      return ['no canvas']
    }
    const present = editorStore.getState().history!.present.pages[doc.pages.indexOf(page)]
    const missing = present.elements.filter((el) => !stage.findOne(`#${el.id}`))
    if (missing.length) issues.push(`${missing.length} of ${present.elements.length} elements not drawn on page ${doc.pages.indexOf(page) + 1}`)
  }
  await close()
  return issues
}
