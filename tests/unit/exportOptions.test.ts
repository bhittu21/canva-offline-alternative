import { describe, expect, it } from 'vitest'
import { fileNameFor, pdfPageSize, placement, validateExport } from '@shared/exportOptions'

describe('export options', () => {
  it('never stretches the design when the output ratio differs', () => {
    const fit = placement(1000, 1000, 1920, 1080, 'contain')
    expect(fit.scale).toBeCloseTo(1.08)
    expect(fit.x).toBeCloseTo((1920 - 1080) / 2)
    expect(fit.y).toBeCloseTo(0)
    const fill = placement(1000, 1000, 1920, 1080, 'cover')
    expect(fill.scale).toBeCloseTo(1.92)
    expect(fill.y).toBeCloseTo((1080 - 1920) / 2)
  })

  it('rejects impossible sizes', () => {
    expect(validateExport({ width: 0, height: 10 })).toMatch(/at least 1/)
    expect(validateExport({ width: 20000, height: 10 })).toMatch(/at most/)
    expect(validateExport({ width: 16000, height: 16000 })).toMatch(/too large/)
    expect(validateExport({ width: 1080, height: 1080 })).toBeNull()
  })

  it('computes PDF page size from DPI', () => {
    const a4 = pdfPageSize(2480, 3508, 300)
    expect(a4.width).toBeCloseTo(595.2, 0)
    expect(a4.height).toBeCloseTo(841.9, 0)
  })

  it('makes safe file names', () => {
    expect(fileNameFor('My: design?', 'jpeg')).toBe('My design.jpg')
    expect(fileNameFor('', 'pdf')).toBe('Design.pdf')
  })
})
