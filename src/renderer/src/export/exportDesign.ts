import { zipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import type { DesignDocument, Page } from '@shared/model'
import { exportFormats, pdfPageSize, supportsTransparency, validateExport, type ExportOptions } from '@shared/exportOptions'
import { canvasToBlob, renderPage } from './renderDesign'
import { exportSvg } from './svgExport'

export interface ExportResult {
  bytes: Uint8Array
  /** File extension: the format's own, or "zip" when several pages were exported as separate images. */
  extension: string
}

/**
 * Produces the bytes of an export. Rendering happens in the app; writing to
 * disk is done by the main process. PDF puts every chosen page in one file;
 * other formats give one file per page, packed in a ZIP when there are several.
 */
export async function exportDesign(
  doc: DesignDocument,
  options: ExportOptions,
  pages: Page[],
  onProgress?: (done: number, total: number) => void
): Promise<ExportResult> {
  const problem = validateExport(options)
  if (problem) throw new Error(problem)
  if (pages.length === 0) throw new Error('Choose at least one page to export.')
  const format = exportFormats.find((f) => f.id === options.format)!
  const transparent = options.transparent && supportsTransparency(options.format)
  const size = { width: Math.round(options.width), height: Math.round(options.height), fit: options.fit, transparent }

  if (options.format === 'pdf') {
    const pdf = await PDFDocument.create()
    pdf.setTitle(doc.title)
    pdf.setCreator('Design Studio')
    pdf.setProducer('Design Studio')
    const pageSize = pdfPageSize(size.width, size.height, options.dpi)
    for (let i = 0; i < pages.length; i++) {
      onProgress?.(i, pages.length)
      const canvas = await renderPage(doc, pages[i], size)
      try {
        const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.95)
        const image = await pdf.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
        pdf.addPage([pageSize.width, pageSize.height]).drawImage(image, { x: 0, y: 0, width: pageSize.width, height: pageSize.height })
      } finally {
        freeCanvas(canvas)
      }
    }
    return { bytes: await pdf.save(), extension: 'pdf' }
  }

  const files: { name: string; bytes: Uint8Array }[] = []
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i, pages.length)
    let bytes: Uint8Array
    if (options.format === 'svg') {
      bytes = new TextEncoder().encode(await exportSvg(doc, pages[i], size))
    } else {
      const canvas = await renderPage(doc, pages[i], size)
      try {
        const blob = await canvasToBlob(canvas, format.mime, options.quality)
        if (blob.type !== format.mime) throw new Error(`${format.label} export is not supported on this computer.`)
        bytes = new Uint8Array(await blob.arrayBuffer())
      } finally {
        freeCanvas(canvas)
      }
    }
    files.push({ name: `${safeName(doc.title)} - page ${doc.pages.indexOf(pages[i]) + 1}.${format.extension}`, bytes })
  }
  onProgress?.(pages.length, pages.length)
  if (files.length === 1) return { bytes: files[0].bytes, extension: format.extension }
  return { bytes: zipSync(Object.fromEntries(files.map((f) => [f.name, [f.bytes, { level: 0 }]]))), extension: 'zip' }
}

/** Frees the (possibly very large) canvas memory straight away. */
function freeCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

function safeName(title: string): string {
  return title.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Design'
}
