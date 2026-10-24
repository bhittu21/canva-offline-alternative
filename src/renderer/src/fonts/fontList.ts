import { useSyncExternalStore } from 'react'
import type { FontFaceInfo } from '@shared/ipc'

/**
 * Fonts available in the editor. Bundled fonts work offline on every PC.
 * Fonts installed on this computer and font files the user added are listed
 * too; their files are loaded into the page when first used, so text is
 * measured and drawn with the real font.
 */

export type FontSource = 'bundled' | 'system' | 'custom'

export interface FontInfo {
  family: string
  category: string
  bold: boolean
  italic: boolean
  bundled: boolean
  source: FontSource
  /** The files behind a system or added font. */
  faces?: FontFaceInfo[]
}

const bundled: FontInfo[] = [
  { family: 'Abril Fatface', category: 'Display', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Anton', category: 'Display', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Archivo Black', category: 'Display', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Bebas Neue', category: 'Display', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Caveat', category: 'Handwriting', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'Cormorant Garamond', category: 'Serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Dancing Script', category: 'Script', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'DM Serif Display', category: 'Serif', bold: false, italic: true, bundled: true, source: 'bundled' },
  { family: 'Great Vibes', category: 'Script', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Inter', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Josefin Sans', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Libre Baskerville', category: 'Serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Lobster', category: 'Script', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Lora', category: 'Serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Merriweather', category: 'Serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Montserrat', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Nunito', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Oswald', category: 'Display', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'Pacifico', category: 'Script', bold: false, italic: false, bundled: true, source: 'bundled' },
  { family: 'Playfair Display', category: 'Serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Poppins', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Quicksand', category: 'Sans serif', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'Raleway', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' },
  { family: 'Roboto Slab', category: 'Serif', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'Space Grotesk', category: 'Sans serif', bold: true, italic: false, bundled: true, source: 'bundled' },
  { family: 'Work Sans', category: 'Sans serif', bold: true, italic: true, bundled: true, source: 'bundled' }
]

/** Shown until the installed fonts have been read (and if they cannot be). */
const fallbackSystem: FontInfo[] = ['Arial', 'Segoe UI', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Courier New', 'Impact'].map((family) => ({
  family,
  category: 'Windows',
  bold: family !== 'Impact',
  italic: family !== 'Impact',
  bundled: false,
  source: 'system'
}))

let current: FontInfo[] = [...bundled, ...fallbackSystem]
const listeners = new Set<() => void>()

function setFonts(list: FontInfo[]): void {
  current = list
  listeners.forEach((l) => l())
}

/** Every font, current at the time of the call. */
export function allFonts(): FontInfo[] {
  return current
}

/** Every font; the component updates when fonts are added or removed. */
export function useFonts(): FontInfo[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current
  )
}

export function fontInfo(family: string): FontInfo | undefined {
  return current.find((f) => f.family === family)
}

/** Label shown next to a font in lists. */
export function fontNote(f: FontInfo): string {
  return f.source === 'bundled' ? f.category : f.source === 'custom' ? 'My fonts' : 'Installed'
}

function familiesFrom(faces: FontFaceInfo[], source: FontSource, category: string): FontInfo[] {
  const byFamily = new Map<string, FontFaceInfo[]>()
  for (const face of faces) byFamily.set(face.family, [...(byFamily.get(face.family) ?? []), face])
  return [...byFamily].map(([family, list]) => ({
    family,
    category,
    bold: list.some((f) => f.bold),
    italic: list.some((f) => f.italic),
    bundled: false,
    source,
    faces: list
  }))
}

/** Reads the installed fonts and the fonts the user added, and loads the added ones. */
export async function refreshFonts(): Promise<void> {
  const [system, custom] = await Promise.all([window.api.fonts.system().catch(() => null), window.api.fonts.custom().catch(() => [])])
  const taken = new Set(bundled.map((f) => f.family))
  const mine = familiesFrom(custom, 'custom', 'My fonts').filter((f) => !taken.has(f.family))
  mine.forEach((f) => taken.add(f.family))
  const installed = system?.length ? familiesFrom(system, 'system', 'Installed') : fallbackSystem
  const sort = (list: FontInfo[]) => list.sort((a, b) => a.family.localeCompare(b.family))
  setFonts([...sort(mine), ...bundled, ...sort(installed.filter((f) => !taken.has(f.family)))])
  await Promise.all(mine.map((f) => ensureFontFamily(f.family)))
}

const loaded = new Map<string, Promise<boolean>>()
let afterLoad: (() => void) | null = null

/** Called whenever another font finishes loading, so text can be measured and drawn again. */
export function onFontLoaded(fn: () => void): void {
  afterLoad = fn
}

/**
 * Makes sure a system or added font's files are loaded into the page. Resolves
 * to false if the font cannot be loaded (text then falls back to another font).
 */
export function ensureFontFamily(family: string): Promise<boolean> {
  const info = fontInfo(family)
  if (!info?.faces?.length) return Promise.resolve(true)
  const key = `${info.source}:${family}`
  let job = loaded.get(key)
  if (!job) {
    job = (async () => {
      const results = await Promise.all(
        info.faces!.map(async (face) => {
          try {
            const bytes = await window.api.fonts.read(face.id)
            const ff = new FontFace(family, new Uint8Array(bytes), { weight: face.bold ? '700' : '400', style: face.italic ? 'italic' : 'normal' })
            await ff.load()
            document.fonts.add(ff)
            return true
          } catch {
            return false
          }
        })
      )
      const ok = results.some(Boolean)
      if (ok) afterLoad?.()
      return ok
    })()
    loaded.set(key, job)
  }
  return job
}

/** Loads the system and added fonts a design uses. */
export function ensureFontsFor(families: Iterable<string>): void {
  for (const family of new Set(families)) if (fontInfo(family)?.faces) void ensureFontFamily(family)
}

let loading: Promise<void> | null = null

/** Loads every bundled font face so the canvas measures and draws text with the right font from the start. Runs once. */
export function loadFonts(): Promise<void> {
  loading ??= loadAll()
  return loading
}

async function loadAll(): Promise<void> {
  const faces = bundled.flatMap((f) => [
    `400 16px "${f.family}"`,
    ...(f.bold ? [`700 16px "${f.family}"`] : []),
    ...(f.italic ? [`italic 400 16px "${f.family}"`] : []),
    ...(f.italic && f.bold ? [`italic 700 16px "${f.family}"`] : [])
  ])
  await Promise.all(faces.map((face) => document.fonts.load(face).catch(() => [])))
}
