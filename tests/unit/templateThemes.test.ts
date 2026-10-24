import { describe, expect, it } from 'vitest'
import { contrastHex } from '@renderer/library/gen/color'
import { themes } from '@renderer/library/gen/themes'

const backgrounds = (t: (typeof themes)[number]) => (t.bgGradient ? t.bgGradient.stops.map((s) => s.color) : [t.bg])

describe('template themes', () => {
  it('have unique ids', () => {
    expect(new Set(themes.map((t) => t.id)).size).toBe(themes.length)
  })
  for (const t of themes) {
    it(`${t.id} has readable text colours`, () => {
      const issues: string[] = []
      const need = (label: string, fg: string, bg: string, min: number) => {
        const c = contrastHex(fg, bg)
        if (c < min) issues.push(`${label} ${fg} on ${bg}: ${c.toFixed(2)} < ${min}`)
      }
      for (const bg of backgrounds(t)) {
        need('ink', t.ink, bg, 4.5)
        need('muted', t.muted, bg, 4.5)
        need('accentText', t.accentText, bg, 3)
      }
      need('onAccent', t.onAccent, t.accent, 4.5)
      need('surfaceInk', t.surfaceInk, t.surface, 7)
      need('surfaceMuted', t.surfaceMuted, t.surface, 4.5)
      expect(issues).toEqual([])
    })
  }
})
