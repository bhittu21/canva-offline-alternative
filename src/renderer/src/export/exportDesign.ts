import { PDFDocument } from 'pdf-lib'
import type { DesignDocument } from '@shared/model'
import { exportFormats, pdfPageSize, supportsTransparency, validateExport, type ExportOptions } from '@shared/exportOptions'
import { assets } from '@renderer/store/assets'
import { canvasToBlob, renderDesign } from './renderDesign'
import { exportSvg } from './svgExport'

/** Produces the bytes of an export. Rendering happens in the app; writing to disk is done by the main process. */
export async function exportDesign(doc: DesignDocument, options: ExportOptions): Promise<Uint8Array> {
  const problem = validateExport(options)
  if (problem) throw new Error(problem)
  const transparent = options.transparent && supportsTransparency(options.format)
  const size = { width: Math.round(options.width), height: Math.round(options.height), fit: options.fit, transparent }

  if (options.format === 'svg') {
    return new TextEncoder().encode(exportSvg(doc, size, assets.bytesMap()))
  }

  const canvas = await renderDesign(doc, size)
  try {
    if (options.format === 'pdf') {
      const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.95)
      const pdf = await PDFDocument.create()
      pdf.setTitle(doc.title)
      pdf.setCreator('Offline Design Editor')
      pdf.setProducer('Offline Design Editor')
      const image = await pdf.embedJpg(new Uint8Array(await jpeg.arrayBuffer()))
      const page = pdfPageSize(size.width, size.height, options.dpi)
      pdf.addPage([page.width, page.height]).drawImage(image, { x: 0, y: 0, width: page.width, height: page.height })
      return pdf.save()
    }
    const format = exportFormats.find((f) => f.id === options.format)!
    const blob = await canvasToBlob(canvas, format.mime, options.quality)
    if (blob.type !== format.mime) throw new Error(`${format.label} export is not supported on this computer.`)
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    // Free the (possibly very large) canvas memory straight away.
    canvas.width = 0
    canvas.height = 0
  }
}
