import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { LibraryItem, RecoveryItem, TemplateItem } from '@shared/ipc'
import { writeFileAtomic } from './files'

/**
 * Local storage in the user's app-data folder:
 *   library/     images you imported, reusable in any design ("Uploads")
 *   templates/   designs you saved as templates
 *   recovery/    autosaved copies of open designs, for crash recovery
 *   thumbnails/  previews for the recent designs list
 */

const dir = (name: string) => join(app.getPath('userData'), name)
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)

function checkId(id: unknown): string {
  if (!validId(id)) throw new Error('Invalid id.')
  return id
}

async function readIndex<T>(folder: string): Promise<T[]> {
  try {
    const list = JSON.parse(await fs.readFile(join(dir(folder), 'index.json'), 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function writeIndex<T>(folder: string, list: T[]): Promise<void> {
  await fs.mkdir(dir(folder), { recursive: true })
  await writeFileAtomic(join(dir(folder), 'index.json'), new TextEncoder().encode(JSON.stringify(list, null, 1)))
}

const MAX_LIBRARY_BYTES = 50 * 1024 * 1024

// ----- Library -----

export const library = {
  list: () => readIndex<LibraryItem>('library'),

  async add(name: string, mime: string, bytes: Uint8Array, width: number, height: number, thumbnail: string): Promise<LibraryItem> {
    if (!/^image\/(png|jpeg|webp|gif|bmp|svg\+xml)$/.test(mime)) throw new Error('Only images can be added to your uploads.')
    if (!(bytes instanceof Uint8Array) || bytes.byteLength > MAX_LIBRARY_BYTES) throw new Error('This image is too large for your uploads.')
    // Identical images are stored once.
    const id = createHash('sha256').update(bytes).digest('hex').slice(0, 24)
    const list = await library.list()
    const existing = list.find((item) => item.id === id)
    if (existing) return existing
    await fs.mkdir(dir('library'), { recursive: true })
    await writeFileAtomic(join(dir('library'), `${id}.bin`), bytes)
    const item: LibraryItem = {
      id,
      name: String(name).slice(0, 200),
      mime,
      width: Number(width) || 0,
      height: Number(height) || 0,
      bytes: bytes.byteLength,
      addedAt: new Date().toISOString(),
      thumbnail: typeof thumbnail === 'string' && thumbnail.startsWith('data:image/') && thumbnail.length < 200_000 ? thumbnail : ''
    }
    await writeIndex('library', [item, ...list].slice(0, 2000))
    return item
  },

  async read(id: unknown): Promise<{ bytes: Uint8Array; mime: string }> {
    const safe = checkId(id)
    const item = (await library.list()).find((i) => i.id === safe)
    if (!item) throw new Error('This upload no longer exists.')
    return { bytes: new Uint8Array(await fs.readFile(join(dir('library'), `${safe}.bin`))), mime: item.mime }
  },

  async remove(id: unknown): Promise<void> {
    const safe = checkId(id)
    await writeIndex('library', (await library.list()).filter((i) => i.id !== safe))
    await fs.rm(join(dir('library'), `${safe}.bin`), { force: true })
  }
}

// ----- Templates -----

export const templates = {
  list: () => readIndex<TemplateItem>('templates'),

  async save(title: string, project: Uint8Array, info: { width: number; height: number; pages: number; thumbnail?: string }): Promise<TemplateItem> {
    if (!(project instanceof Uint8Array) || project.byteLength > 300 * 1024 * 1024) throw new Error('This design cannot be saved as a template.')
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    await fs.mkdir(dir('templates'), { recursive: true })
    await writeFileAtomic(join(dir('templates'), `${id}.odesign`), project)
    const item: TemplateItem = {
      id,
      title: String(title || 'My template').slice(0, 200),
      width: Number(info?.width) || 0,
      height: Number(info?.height) || 0,
      pages: Number(info?.pages) || 1,
      createdAt: new Date().toISOString(),
      thumbnail: typeof info?.thumbnail === 'string' && info.thumbnail.startsWith('data:image/') && info.thumbnail.length < 400_000 ? info.thumbnail : undefined
    }
    await writeIndex('templates', [item, ...(await templates.list())])
    return item
  },

  async read(id: unknown): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(join(dir('templates'), `${checkId(id)}.odesign`)))
  },

  async remove(id: unknown): Promise<void> {
    const safe = checkId(id)
    await writeIndex('templates', (await templates.list()).filter((t) => t.id !== safe))
    await fs.rm(join(dir('templates'), `${safe}.odesign`), { force: true })
  }
}

// ----- Recovery -----

export const recovery = {
  async write(id: unknown, title: string, filePath: string | null, project: Uint8Array, thumbnail?: string): Promise<void> {
    const safe = checkId(id)
    if (!(project instanceof Uint8Array)) throw new Error('Nothing to save.')
    await fs.mkdir(dir('recovery'), { recursive: true })
    await writeFileAtomic(join(dir('recovery'), `${safe}.odesign`), project)
    const meta: RecoveryItem = {
      id: safe,
      title: String(title || 'Untitled design').slice(0, 200),
      filePath: typeof filePath === 'string' ? filePath : null,
      savedAt: new Date().toISOString(),
      thumbnail: typeof thumbnail === 'string' && thumbnail.startsWith('data:image/') && thumbnail.length < 400_000 ? thumbnail : undefined
    }
    await writeFileAtomic(join(dir('recovery'), `${safe}.json`), new TextEncoder().encode(JSON.stringify(meta)))
  },

  async list(): Promise<RecoveryItem[]> {
    let names: string[]
    try {
      names = await fs.readdir(dir('recovery'))
    } catch {
      return []
    }
    const items: RecoveryItem[] = []
    for (const name of names.filter((n) => n.endsWith('.json'))) {
      try {
        items.push(JSON.parse(await fs.readFile(join(dir('recovery'), name), 'utf8')))
      } catch {
        // A damaged entry is skipped.
      }
    }
    return items.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  },

  async read(id: unknown): Promise<Uint8Array> {
    return new Uint8Array(await fs.readFile(join(dir('recovery'), `${checkId(id)}.odesign`)))
  },

  async remove(id: unknown): Promise<void> {
    const safe = checkId(id)
    await fs.rm(join(dir('recovery'), `${safe}.odesign`), { force: true })
    await fs.rm(join(dir('recovery'), `${safe}.json`), { force: true })
  }
}

// ----- Recent design thumbnails -----

const thumbPath = (projectPath: string) => join(dir('thumbnails'), `${createHash('sha1').update(projectPath).digest('hex')}.png`)

export async function saveThumbnail(projectPath: string, png: Uint8Array): Promise<void> {
  if (!(png instanceof Uint8Array) || png.byteLength > 2_000_000) return
  await fs.mkdir(dir('thumbnails'), { recursive: true })
  await writeFileAtomic(thumbPath(projectPath), png)
}

export async function readThumbnailDataUrl(projectPath: string): Promise<string | undefined> {
  try {
    return `data:image/png;base64,${(await fs.readFile(thumbPath(projectPath))).toString('base64')}`
  } catch {
    return undefined
  }
}
