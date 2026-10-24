import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readFontNames } from '../../src/main/fonts'

const file = (p: string) => new Uint8Array(readFileSync(p))
const woff = 'node_modules/@fontsource/playfair-display/files/playfair-display-latin-ext-800-italic.woff'

describe('font names', () => {
  it('reads the family and style of a WOFF font', () => {
    const names = readFontNames(file(woff))
    expect(names?.family).toMatch(/Playfair Display/)
    expect(names?.italic).toBe(true)
  })

  it('rejects files that are not fonts', () => {
    expect(readFontNames(new TextEncoder().encode('hello, this is not a font file at all'))).toBeNull()
  })

  const dejavu = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
  it.skipIf(!existsSync(dejavu))('reads a TrueType font', () => {
    expect(readFontNames(file(dejavu))).toEqual({ family: 'DejaVu Serif', style: 'Bold', bold: true, italic: false })
  })
})
