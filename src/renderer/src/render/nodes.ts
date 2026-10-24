import Konva from 'konva'
import type { DesignElement, Page } from '@shared/model'
import { drawBackground, drawIcon, drawImage, drawLine, drawPrims, drawShape } from './draw'
import { chartLayout, tableLayout } from './layouts'
import { textNodes } from './text'

/**
 * Builds the Konva nodes for one element's content, in the element's own
 * coordinates. The editor places them inside a draggable group; exports place
 * them inside a plain group. Using one builder for both means what you see is
 * what you export.
 */

export interface ImageSource {
  image: CanvasImageSource
  width: number
  height: number
}

export interface RenderContext {
  image(assetId: string): ImageSource | undefined
}

function nativeShape(el: DesignElement, draw: (c: CanvasRenderingContext2D) => void): Konva.Shape {
  return new Konva.Shape({
    width: el.width,
    height: el.height,
    // Konva sets up position, rotation, opacity and pixel ratio; the drawing itself is plain canvas code.
    sceneFunc: (ctx) => draw(ctx._context),
    hitFunc: (ctx, shape) => {
      ctx.beginPath()
      ctx.rect(0, 0, el.width, el.height)
      ctx.closePath()
      ctx.fillStrokeShape(shape)
    }
  })
}

export function buildContent(el: DesignElement, ctx: RenderContext): Konva.Shape[] {
  switch (el.type) {
    case 'text':
      return textNodes(el)
    case 'shape':
      return [nativeShape(el, (c) => drawShape(c, el))]
    case 'line':
      return [nativeShape(el, (c) => drawLine(c, el))]
    case 'icon':
      return [nativeShape(el, (c) => drawIcon(c, el))]
    case 'image': {
      const source = el.assetId ? ctx.image(el.assetId) : undefined
      return [nativeShape(el, (c) => drawImage(c, el, source?.image, source))]
    }
    case 'chart': {
      const prims = chartLayout(el)
      return [nativeShape(el, (c) => drawPrims(c, prims))]
    }
    case 'table': {
      const { prims } = tableLayout(el)
      return [nativeShape(el, (c) => drawPrims(c, prims))]
    }
  }
}

/** The page background: colour or gradient, then an optional photo covering the page. */
export function buildBackground(page: Page, width: number, height: number, ctx: RenderContext): Konva.Shape {
  return new Konva.Shape({
    width,
    height,
    listening: false,
    sceneFunc: (konvaCtx) => {
      const c = konvaCtx._context
      drawBackground(c, width, height, page.background, page.backgroundGradient)
      const source = page.backgroundAssetId ? ctx.image(page.backgroundAssetId) : undefined
      if (source) {
        drawImage(
          c,
          { type: 'image', id: 'bg', name: '', x: 0, y: 0, width, height, rotation: 0, opacity: 1, locked: false, hidden: false, assetId: page.backgroundAssetId! },
          source.image,
          source
        )
      }
    }
  })
}
