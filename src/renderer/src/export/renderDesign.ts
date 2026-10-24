import Konva from 'konva'
import type { DesignDocument, Page } from '@shared/model'
import { pageAssetIds } from '@shared/model'
import { placement, type FitMode } from '@shared/exportOptions'
import { buildBackground, buildContent, type ImageSource, type RenderContext } from '@renderer/render/nodes'
import { assets } from '@renderer/store/assets'

export interface RenderOptions {
  width: number
  height: number
  fit: FitMode
  transparent: boolean
}

/** Waits until every image on the page is decoded and every font is ready, so nothing is missing from the output. */
export async function preparePage(page: Page, source: RenderContext & { load?(id: string): Promise<ImageSource> } = assets): Promise<void> {
  await Promise.all(pageAssetIds(page).map((id) => source.load?.(id)))
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready
}

/**
 * Draws one page into a fresh canvas at the exact output size, separately
 * from the editor, so selection handles, guides and zoom never end up in
 * exports. The page is scaled evenly (never stretched) to the output size.
 */
export async function renderPage(doc: DesignDocument, page: Page, options: RenderOptions, source: RenderContext = assets): Promise<HTMLCanvasElement> {
  await preparePage(page, source as RenderContext & { load?(id: string): Promise<ImageSource> })
  const container = document.createElement('div')
  const stage = new Konva.Stage({ container, width: options.width, height: options.height })
  try {
    const layer = new Konva.Layer({ imageSmoothingEnabled: true })
    stage.add(layer)
    const { scale, x, y } = placement(doc.width, doc.height, options.width, options.height, options.fit)
    if (!options.transparent) {
      // Margins added by "show the whole design" take the page colour.
      layer.add(new Konva.Rect({ width: options.width, height: options.height, fill: page.background }))
    }
    const pageGroup = new Konva.Group({ x, y, scaleX: scale, scaleY: scale, clipX: 0, clipY: 0, clipWidth: doc.width, clipHeight: doc.height })
    layer.add(pageGroup)
    if (!options.transparent || page.backgroundAssetId) {
      const bg = buildBackground(options.transparent ? { ...page, background: 'transparent', backgroundGradient: undefined } : page, doc.width, doc.height, source)
      pageGroup.add(bg)
    }
    for (const el of page.elements) {
      if (el.hidden) continue
      const group = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity })
      for (const node of buildContent(el, source)) group.add(node)
      pageGroup.add(group)
    }
    layer.draw()
    const canvas = stage.toCanvas({ pixelRatio: 1 })
    // Konva positions its canvases absolutely; clear that so the canvas can be shown in normal layout.
    canvas.style.cssText = ''
    return canvas
  } finally {
    stage.destroy()
  }
}

/** Kept for callers that think in single-page designs: renders the first page. */
export function renderDesign(doc: DesignDocument, options: RenderOptions, page: Page = doc.pages[0]): Promise<HTMLCanvasElement> {
  return renderPage(doc, page, options)
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))), mime, quality)
  })
}

/** A small PNG preview of a page, longest side `max` pixels. */
export async function renderThumbnail(doc: DesignDocument, page: Page = doc.pages[0], max = 360, source: RenderContext = assets): Promise<HTMLCanvasElement> {
  const scale = Math.min(max / doc.width, max / doc.height)
  return renderPage(doc, page, { width: Math.max(1, Math.round(doc.width * scale)), height: Math.max(1, Math.round(doc.height * scale)), fit: 'contain', transparent: false }, source)
}

export async function thumbnailPng(doc: DesignDocument, max = 360): Promise<Uint8Array | undefined> {
  try {
    const canvas = await renderThumbnail(doc, doc.pages[0], max)
    const blob = await canvasToBlob(canvas, 'image/png')
    return new Uint8Array(await blob.arrayBuffer())
  } catch {
    return undefined
  }
}
