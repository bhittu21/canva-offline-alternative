import Konva from 'konva'
import type { DesignDocument, DesignElement, ShapeElement, TextElement } from '@shared/model'
import { placement, type FitMode } from '@shared/exportOptions'
import { starPoints, trianglePoints } from '@renderer/editor/geometry'
import { assets } from '@renderer/store/assets'

export interface RenderOptions {
  width: number
  height: number
  fit: FitMode
  transparent: boolean
}

/**
 * Draws the design into a fresh canvas at the exact output size, separately
 * from the editor, so selection handles, guides and zoom never end up in exports.
 */
export async function renderDesign(doc: DesignDocument, options: RenderOptions): Promise<HTMLCanvasElement> {
  const images = await loadImages(doc)
  const container = document.createElement('div')
  const stage = new Konva.Stage({ container, width: options.width, height: options.height })
  try {
    const layer = new Konva.Layer({ imageSmoothingEnabled: true })
    stage.add(layer)
    if (!options.transparent) {
      layer.add(new Konva.Rect({ width: options.width, height: options.height, fill: doc.background }))
    }
    const { scale, x, y } = placement(doc.width, doc.height, options.width, options.height, options.fit)
    const page = new Konva.Group({
      x,
      y,
      scaleX: scale,
      scaleY: scale,
      clipX: 0,
      clipY: 0,
      clipWidth: doc.width,
      clipHeight: doc.height
    })
    layer.add(page)
    for (const el of doc.elements) {
      if (!el.hidden) page.add(buildElement(el, images))
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

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))), mime, quality)
  })
}

async function loadImages(doc: DesignDocument): Promise<Map<string, HTMLImageElement>> {
  const ids = [...new Set(doc.elements.flatMap((el) => (el.type === 'image' && !el.hidden ? [el.assetId] : [])))]
  const entries = await Promise.all(
    ids.map(
      (id) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const url = assets.url(id)
          if (!url) return reject(new Error('An image in this design is missing.'))
          const img = new window.Image()
          img.onload = () => resolve([id, img])
          img.onerror = () => reject(new Error('An image in this design could not be loaded.'))
          img.src = url
        })
    )
  )
  return new Map(entries)
}

function buildElement(el: DesignElement, images: Map<string, HTMLImageElement>): Konva.Group {
  const group = new Konva.Group({ x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity })
  if (el.type === 'text') group.add(buildText(el))
  else if (el.type === 'shape') group.add(buildShape(el))
  else {
    const image = images.get(el.assetId)
    if (image) group.add(new Konva.Image({ image, width: el.width, height: el.height }))
  }
  return group
}

export function textNode(el: TextElement): Konva.Text {
  return new Konva.Text({
    text: el.text,
    width: el.width,
    fontFamily: el.fontFamily,
    fontSize: el.fontSize,
    fontStyle: el.fontStyle,
    textDecoration: el.underline ? 'underline' : '',
    fill: el.fill,
    align: el.align,
    lineHeight: el.lineHeight,
    letterSpacing: el.letterSpacing,
    wrap: 'word'
  })
}

const buildText = textNode

function buildShape(el: ShapeElement): Konva.Shape {
  const { width, height, fill, stroke, strokeWidth } = el
  const strokeProps = strokeWidth > 0 ? { stroke, strokeWidth } : { strokeEnabled: false }
  switch (el.shape) {
    case 'rect':
      return new Konva.Rect({ width, height, fill, cornerRadius: el.cornerRadius, ...strokeProps })
    case 'ellipse':
      return new Konva.Ellipse({ x: width / 2, y: height / 2, radiusX: width / 2, radiusY: height / 2, fill, ...strokeProps })
    case 'triangle':
      return new Konva.Line({ points: trianglePoints(width, height), closed: true, fill, lineJoin: 'round', ...strokeProps })
    case 'star':
      return new Konva.Line({ points: starPoints(width, height), closed: true, fill, lineJoin: 'round', ...strokeProps })
    case 'line':
      return new Konva.Rect({ width, height, fill, cornerRadius: Math.min(height / 2, el.cornerRadius) })
  }
}
