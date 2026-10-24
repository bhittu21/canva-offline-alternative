import { createHash } from 'node:crypto'
import { closeSync, openSync, readSync, promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'
import { inflateSync } from 'node:zlib'
import { app } from 'electron'
import type { AddFontsResult, FontFaceInfo } from '@shared/ipc'
import { writeFileAtomic } from './files'

/**
 * Fonts beyond the bundled set:
 *   - fonts installed on this computer (for Windows: the system Fonts folder
 *     and the per-user one), found by reading each file's name table;
 *   - font files the user adds, copied into the app-data "fonts" folder.
 * The renderer only gets names and ids; it asks for a face's bytes by id and
 * never passes a path, so it cannot read other files through this.
 */

export const FONT_EXTENSIONS = ['ttf', 'otf', 'ttc', 'woff', 'woff2']
const MAX_FONT_BYTES = 40 * 1024 * 1024

// ------------------------------------------------------------ name table

export interface FontNames {
  family: string
  style: string
  bold: boolean
  italic: boolean
}

type Reader = (offset: number, length: number) => Uint8Array

const u16 = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1]
const u32 = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + ((b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3])
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3])

function decodeName(bytes: Uint8Array, platform: number): string {
  if (platform === 3 || platform === 0) {
    let s = ''
    for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode(u16(bytes, i))
    return s
  }
  return String.fromCharCode(...bytes)
}

/** Reads the family and style names from the "name" table, preferring Windows English names. */
function parseNameTable(t: Uint8Array): Map<number, string> {
  const count = u16(t, 2)
  const strings = u16(t, 4)
  const best = new Map<number, { score: number; value: string }>()
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12
    if (r + 12 > t.length) break
    const platform = u16(t, r)
    const lang = u16(t, r + 4)
    const id = u16(t, r + 6)
    const len = u16(t, r + 8)
    const off = strings + u16(t, r + 10)
    if (![1, 2, 4, 16, 17].includes(id) || off + len > t.length) continue
    const score = platform === 3 ? (lang === 0x409 ? 3 : 2) : platform === 0 ? 1.5 : platform === 1 && lang === 0 ? 1 : 0
    if (score === 0 || (best.get(id)?.score ?? -1) >= score) continue
    const value = decodeName(t.subarray(off, off + len), platform).replace(/\0/g, '').trim()
    if (value) best.set(id, { score, value })
  }
  return new Map([...best].map(([id, v]) => [id, v.value]))
}

function namesFrom(tables: Map<string, Uint8Array>): FontNames | null {
  const name = tables.get('name')
  if (!name) return null
  const n = parseNameTable(name)
  const family = n.get(1)
  if (!family) return null
  const style = n.get(2) ?? 'Regular'
  const os2 = tables.get('OS/2')
  const sel = os2 && os2.length >= 64 ? u16(os2, 62) : 0
  return {
    family,
    style,
    bold: (sel & 0x20) !== 0 || /bold/i.test(style),
    italic: (sel & 0x01) !== 0 || /italic|oblique/i.test(style)
  }
}

/** Names of a TrueType or OpenType font (or the first font of a collection), reading only what it needs. */
export function readSfntNames(read: Reader): FontNames | null {
  const head = read(0, 16)
  if (head.length < 12) return null
  let base = 0
  if (tag(head, 0) === 'ttcf') base = u32(head, 12)
  const sfnt = base ? read(base, 12) : head
  const version = u32(sfnt, 0)
  if (version !== 0x00010000 && tag(sfnt, 0) !== 'OTTO' && tag(sfnt, 0) !== 'true') return null
  const numTables = u16(sfnt, 4)
  if (numTables > 200) return null
  const dir = read(base + 12, numTables * 16)
  const tables = new Map<string, Uint8Array>()
  for (let i = 0; i < numTables; i++) {
    const t = tag(dir, i * 16)
    if (t !== 'name' && t !== 'OS/2') continue
    const length = u32(dir, i * 16 + 12)
    if (length > 2 * 1024 * 1024) continue
    tables.set(t, read(u32(dir, i * 16 + 8), length))
  }
  return namesFrom(tables)
}

/** Names of a WOFF 1 font; its tables may be zlib-compressed. */
export function readWoffNames(bytes: Uint8Array): FontNames | null {
  if (tag(bytes, 0) !== 'wOFF') return null
  const numTables = u16(bytes, 12)
  const tables = new Map<string, Uint8Array>()
  for (let i = 0; i < numTables; i++) {
    const e = 44 + i * 20
    const t = tag(bytes, e)
    if (t !== 'name' && t !== 'OS/2') continue
    const offset = u32(bytes, e + 4)
    const comp = u32(bytes, e + 8)
    const orig = u32(bytes, e + 12)
    const raw = bytes.subarray(offset, offset + comp)
    tables.set(t, comp < orig ? new Uint8Array(inflateSync(raw)) : raw)
  }
  return namesFrom(tables)
}

/** Names from a whole font file in memory. WOFF 2 has no readable names without a decoder, so it gets none. */
export function readFontNames(bytes: Uint8Array): FontNames | null {
  try {
    if (tag(bytes, 0) === 'wOFF') return readWoffNames(bytes)
    return readSfntNames((o, l) => bytes.subarray(o, o + l))
  } catch {
    return null
  }
}

function readFileNames(path: string): FontNames | null {
  let fd = -1
  try {
    fd = openSync(path, 'r')
    const read: Reader = (offset, length) => {
      const buf = Buffer.alloc(length)
      const n = readSync(fd, buf, 0, length, offset)
      return new Uint8Array(buf.buffer, buf.byteOffset, n)
    }
    if (/\.woff$/i.test(path)) return null
    return readSfntNames(read)
  } catch {
    return null
  } finally {
    if (fd >= 0) closeSync(fd)
  }
}

// ------------------------------------------------------------ installed fonts

function systemFontFolders(): { dir: string; recursive: boolean }[] {
  const home = homedir()
  if (process.platform === 'win32') {
    const win = process.env['WINDIR'] ?? 'C:\\Windows'
    const local = process.env['LOCALAPPDATA'] ?? join(home, 'AppData', 'Local')
    return [
      { dir: join(win, 'Fonts'), recursive: false },
      { dir: join(local, 'Microsoft', 'Windows', 'Fonts'), recursive: false }
    ]
  }
  if (process.platform === 'darwin') return ['/System/Library/Fonts', '/Library/Fonts', join(home, 'Library', 'Fonts')].map((dir) => ({ dir, recursive: true }))
  return ['/usr/share/fonts', '/usr/local/share/fonts', join(home, '.local', 'share', 'fonts'), join(home, '.fonts')].map((dir) => ({ dir, recursive: true }))
}

async function listFiles(dir: string, recursive: boolean, depth = 0): Promise<string[]> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory() && recursive && depth < 4) out.push(...(await listFiles(p, recursive, depth + 1)))
    else if (e.isFile() && /\.(ttf|otf|ttc)$/i.test(e.name)) out.push(p)
  }
  return out
}

interface SystemFace extends FontFaceInfo {
  path: string
}

let systemFaces: Promise<SystemFace[]> | null = null

async function scanSystemFonts(): Promise<SystemFace[]> {
  const files = (await Promise.all(systemFontFolders().map((f) => listFiles(f.dir, f.recursive)))).flat()
  const faces: SystemFace[] = []
  const seen = new Set<string>()
  for (const path of files) {
    const names = readFileNames(path)
    // Symbol and private fonts start with "." or "@" (vertical CJK variants); skip them.
    if (!names || /^[.@]/.test(names.family)) continue
    const key = `${names.family}|${names.bold}|${names.italic}`
    if (seen.has(key)) continue
    seen.add(key)
    faces.push({ id: `s${faces.length}`, family: names.family, style: names.style, bold: names.bold, italic: names.italic, format: extname(path).slice(1).toLowerCase(), path })
  }
  return faces
}

/** Fonts installed on this computer. Scanned once per run. */
export async function listSystemFonts(): Promise<FontFaceInfo[]> {
  systemFaces ??= scanSystemFonts()
  return (await systemFaces).map(({ path: _path, ...face }) => face)
}

// ------------------------------------------------------------ fonts the user adds

const fontsDir = () => join(app.getPath('userData'), 'fonts')

async function readIndex(): Promise<FontFaceInfo[]> {
  try {
    const list = JSON.parse(await fs.readFile(join(fontsDir(), 'index.json'), 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function writeIndex(list: FontFaceInfo[]): Promise<void> {
  await fs.mkdir(fontsDir(), { recursive: true })
  await writeFileAtomic(join(fontsDir(), 'index.json'), new TextEncoder().encode(JSON.stringify(list, null, 1)))
}

export const listCustomFonts = readIndex

/** Checks that the bytes really are a font of a supported kind. */
function fontFormat(bytes: Uint8Array): string | null {
  const t = tag(bytes, 0)
  if (t === 'wOFF') return 'woff'
  if (t === 'wOF2') return 'woff2'
  if (t === 'OTTO') return 'otf'
  if (t === 'ttcf') return 'ttc'
  if (u32(bytes, 0) === 0x00010000 || t === 'true') return 'ttf'
  return null
}

/** A readable family name from a file name, for fonts whose names cannot be read (WOFF 2). */
function familyFromFileName(name: string): FontNames {
  const stem = basename(name, extname(name))
  const style = /bold.?italic|bolditalic/i.test(stem) ? 'Bold Italic' : /bold/i.test(stem) ? 'Bold' : /italic|oblique/i.test(stem) ? 'Italic' : 'Regular'
  const family = stem
    .replace(/[-_ ]?(regular|bold|italic|oblique|bolditalic|normal|\d{3})+$/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  return { family: family || stem, style, bold: /bold/i.test(style), italic: /italic/i.test(style) }
}

export async function addFontFiles(paths: string[]): Promise<AddFontsResult> {
  const list = await readIndex()
  const result: AddFontsResult = { added: [], skipped: [] }
  for (const path of paths) {
    const name = basename(path)
    try {
      const stat = await fs.stat(path)
      if (stat.size > MAX_FONT_BYTES) throw new Error('the file is larger than 40 MB')
      const bytes = new Uint8Array(await fs.readFile(path))
      const format = fontFormat(bytes)
      if (!format) throw new Error('it is not a font file')
      const names = readFontNames(bytes) ?? familyFromFileName(name)
      const id = createHash('sha256').update(bytes).digest('hex').slice(0, 24)
      if (list.some((f) => f.id === id)) throw new Error('it is already added')
      await fs.mkdir(fontsDir(), { recursive: true })
      await writeFileAtomic(join(fontsDir(), `${id}.${format}`), bytes)
      const face: FontFaceInfo = { id, family: names.family.slice(0, 100), style: names.style.slice(0, 60), bold: names.bold, italic: names.italic, format, file: name.slice(0, 200) }
      list.push(face)
      result.added.push(face)
    } catch (error) {
      result.skipped.push({ name, reason: error instanceof Error ? error.message : 'it could not be read' })
    }
  }
  await writeIndex(list)
  return result
}

export async function removeCustomFamily(family: unknown): Promise<void> {
  if (typeof family !== 'string') throw new Error('Invalid font.')
  const list = await readIndex()
  const gone = list.filter((f) => f.family === family)
  await writeIndex(list.filter((f) => f.family !== family))
  await Promise.all(gone.map((f) => fs.rm(join(fontsDir(), `${f.id}.${f.format}`), { force: true })))
}

/** The bytes of one face, by id: "s…" for installed fonts, otherwise a font the user added. */
export async function readFontFace(id: unknown): Promise<Uint8Array> {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{1,64}$/.test(id)) throw new Error('Invalid font.')
  if (id.startsWith('s')) {
    const face = (await (systemFaces ??= scanSystemFonts())).find((f) => f.id === id)
    if (!face) throw new Error('Font not found.')
    return new Uint8Array(await fs.readFile(face.path))
  }
  const face = (await readIndex()).find((f) => f.id === id)
  if (!face) throw new Error('Font not found.')
  return new Uint8Array(await fs.readFile(join(fontsDir(), `${face.id}.${face.format}`)))
}
