import type { AiLayout, LayoutEdit, PageSummaryItem } from '@shared/aiLayout'
import type { DesignElement, FontStyle, Page } from '@shared/model'
import { fontInfo } from '@renderer/fonts/fontList'
import { hasIcon } from '@renderer/render/icons'
import { withTextHeight } from '@renderer/render/text'
import { ellipse, frame, icon, line, linear, page as makePage, rect, text } from '@renderer/library/templateKit'

/** Turns a validated AI layout into an editable page of real elements. */
export function layoutToPage(layout: AiLayout, size: { width: number; height: number }, fallbackFonts: { heading: string; body: string }): Page {
  const W = size.width
  const H = size.height
  const elements: DesignElement[] = []
  for (const item of layout.items) {
    switch (item.type) {
      case 'text': {
        const fontSize = (item.size / 100) * W
        const family = fontInfo(item.font) ? item.font : fontSize > W * 0.05 ? fallbackFonts.heading : fallbackFonts.body
        const style: FontStyle = item.bold && item.italic ? 'italic bold' : item.bold ? 'bold' : item.italic ? 'italic' : 'normal'
        const width = Math.min((item.w / 100) * W, W - (item.x / 100) * W)
        elements.push(
          text(item.text, (item.x / 100) * W, (item.y / 100) * H, Math.max(20, width), fontSize, {
            fontFamily: family,
            fill: item.color,
            align: item.align,
            fontStyle: style,
            uppercase: item.uppercase || undefined,
            letterSpacing: (item.spacing / 100) * fontSize
          })
        )
        break
      }
      case 'shape': {
        const x = (item.x / 100) * W
        const y = (item.y / 100) * H
        const w = (item.w / 100) * W
        const h = (item.h / 100) * H
        const base = item.shape === 'ellipse' ? ellipse(x, y, w, h, item.color) : rect(x, y, w, h, item.color, { shape: item.shape, cornerRadius: item.shape === 'rect' ? (item.radius / 100) * Math.min(w, h) : 0 })
        elements.push({ ...base, opacity: item.opacity, name: item.shape === 'rect' ? 'Rectangle' : base.name })
        break
      }
      case 'line':
        elements.push(line((item.x / 100) * W, (item.y / 100) * H, (item.w / 100) * W, item.color, Math.max(1, (item.thickness / 100) * W)))
        break
      case 'icon': {
        const name = hasIcon(item.name) ? item.name : 'star'
        elements.push(icon(name, (item.x / 100) * W, (item.y / 100) * H, (item.size / 100) * W, item.color))
        break
      }
      case 'photo':
        elements.push(frame((item.x / 100) * W, (item.y / 100) * H, (item.w / 100) * W, (item.h / 100) * H, { mask: item.mask === 'rect' ? undefined : item.mask, name: item.hint ? `Photo: ${item.hint}` : 'Photo frame' }))
        break
    }
  }
  return makePage(layout.background, elements, layout.background2 ? { backgroundGradient: linear(135, layout.background, layout.background2) } : {})
}

/** A compact description of the page for the layout assistant: no images, no ids of other pages. */
export function summarizePage(page: Page): PageSummaryItem[] {
  return page.elements.map((el) => ({
    id: el.id,
    type: el.type === 'image' ? (el.assetId ? 'photo' : 'empty photo frame') : el.type,
    name: el.name.slice(0, 40),
    ...(el.type === 'text' && { text: el.text.slice(0, 300), font: el.fontFamily, fontSize: Math.round(el.fontSize) }),
    x: Math.round(el.x),
    y: Math.round(el.y),
    width: Math.round(el.width),
    height: Math.round(el.height),
    ...(el.type === 'text' && { color: el.fill }),
    ...(el.type === 'shape' && { color: el.fill }),
    ...(el.type === 'icon' && { color: el.color }),
    ...(el.type === 'line' && { color: el.stroke })
  }))
}

/** The element patches for a set of validated edits. */
export function editPatches(page: Page, edits: LayoutEdit[]): { patches: Record<string, Partial<DesignElement>>; deletes: string[]; background: string | null } {
  const patches: Record<string, Partial<DesignElement>> = {}
  const deletes: string[] = []
  let background: string | null = null
  for (const edit of edits) {
    if (edit.op === 'background') background = edit.color
    else if (edit.op === 'delete') deletes.push(edit.id)
    else {
      const el = page.elements.find((e) => e.id === edit.id)
      if (!el || el.locked) continue
      const p = edit.props
      const patch: Record<string, unknown> = {}
      for (const key of ['x', 'y', 'width', 'height', 'rotation', 'opacity'] as const) if (p[key] !== undefined) patch[key] = p[key]
      if (el.type === 'text') {
        if (typeof p.text === 'string') patch.text = p.text
        if (typeof p.fontSize === 'number') patch.fontSize = p.fontSize
        if (typeof p.fontFamily === 'string' && fontInfo(p.fontFamily)) patch.fontFamily = p.fontFamily
        if (typeof p.fill === 'string') patch.fill = p.fill
        if (typeof p.align === 'string') patch.align = p.align
        if (typeof p.bold === 'boolean' || typeof p.italic === 'boolean') {
          const bold = typeof p.bold === 'boolean' ? p.bold : el.fontStyle.includes('bold')
          const italic = typeof p.italic === 'boolean' ? p.italic : el.fontStyle.includes('italic')
          patch.fontStyle = bold && italic ? 'italic bold' : bold ? 'bold' : italic ? 'italic' : 'normal'
        }
        delete patch.height
        Object.assign(patch, withTextHeight(el, patch))
      }
      if (el.type === 'shape' && typeof p.fill === 'string') {
        patch.fill = p.fill
        patch.gradient = undefined
      }
      if (el.type === 'icon' && typeof (p.color ?? p.fill) === 'string') patch.color = p.color ?? p.fill
      if (el.type === 'line' && typeof (p.stroke ?? p.fill) === 'string') patch.stroke = p.stroke ?? p.fill
      if (el.type === 'line') delete patch.height
      if (Object.keys(patch).length > 0) patches[el.id] = patch as Partial<DesignElement>
    }
  }
  return { patches, deletes, background }
}
