/** Export settings and the rules that keep exports correct. Pure, so it can be unit tested. */

export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'pdf'
export type FitMode = 'contain' | 'cover'

export interface ExportOptions {
  format: ExportFormat
  width: number
  height: number
  /** When the output ratio differs from the design: show all of it with margins, or fill and crop. */
  fit: FitMode
  /** 0..1, used by JPEG and WebP. */
  quality: number
  transparent: boolean
  /** PDF only: pixels per inch, which sets the printed page size. */
  dpi: number
}

export const exportFormats: { id: ExportFormat; label: string; extension: string; mime: string; note: string }[] = [
  { id: 'png', label: 'PNG', extension: 'png', mime: 'image/png', note: 'Best for graphics and text. Supports transparency.' },
  { id: 'jpeg', label: 'JPG', extension: 'jpg', mime: 'image/jpeg', note: 'Smaller files, best for photos. No transparency.' },
  { id: 'webp', label: 'WebP', extension: 'webp', mime: 'image/webp', note: 'Small, modern web format. Supports transparency.' },
  { id: 'svg', label: 'SVG', extension: 'svg', mime: 'image/svg+xml', note: 'Scalable vector. Shapes and text stay sharp at any size.' },
  {
    id: 'pdf',
    label: 'PDF',
    extension: 'pdf',
    mime: 'application/pdf',
    note: 'For printing and sharing. In this version each page is a high-quality image, so text is not selectable.'
  }
]

export const MAX_SIDE = 16384
export const MAX_PIXELS = 120_000_000

export function supportsTransparency(format: ExportFormat): boolean {
  return format === 'png' || format === 'webp' || format === 'svg'
}

export function supportsQuality(format: ExportFormat): boolean {
  return format === 'jpeg' || format === 'webp'
}

/** Returns a message explaining why these options can't be exported, or null when they're fine. */
export function validateExport(options: Pick<ExportOptions, 'width' | 'height'>): string | null {
  const { width, height } = options
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return 'Width and height must be at least 1 pixel.'
  if (width > MAX_SIDE || height > MAX_SIDE) return `Width and height can be at most ${MAX_SIDE.toLocaleString()} pixels.`
  if (width * height > MAX_PIXELS) return 'This size is too large to export. Try a smaller width or height.'
  return null
}

/**
 * Where the design sits inside the output image. The design is always scaled
 * by the same amount in both directions, so it is never stretched.
 */
export function placement(designWidth: number, designHeight: number, outWidth: number, outHeight: number, fit: FitMode) {
  const sx = outWidth / designWidth
  const sy = outHeight / designHeight
  const scale = fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy)
  return {
    scale,
    x: (outWidth - designWidth * scale) / 2,
    y: (outHeight - designHeight * scale) / 2
  }
}

/** Printed page size in points (1/72 inch) for a raster of the given size at the given DPI. */
export function pdfPageSize(width: number, height: number, dpi: number) {
  return { width: (width / dpi) * 72, height: (height / dpi) * 72 }
}

export function fileNameFor(title: string, format: ExportFormat): string {
  const ext = exportFormats.find((f) => f.id === format)!.extension
  const base = title.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Design'
  return `${base}.${ext}`
}
