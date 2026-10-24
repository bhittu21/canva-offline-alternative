import { promises as fs } from 'node:fs'
import { basename, extname } from 'node:path'
import { app } from 'electron'
import { readThumbnailDataUrl } from './storage'
import type { ImportedImage, RecentFile } from '@shared/ipc'
import { PROJECT_EXTENSION } from '@shared/constants'

const MAX_IMAGE_BYTES = 50 * 1024 * 1024
const MAX_RECENT = 12

const imageMimes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml'
}

export const imageExtensions = Object.keys(imageMimes).map((ext) => ext.slice(1))

export function isProjectPath(path: string): boolean {
  return extname(path).toLowerCase() === `.${PROJECT_EXTENSION}`
}

/**
 * Writes to a temporary file first and then renames it over the target, so a
 * crash or power cut during saving never leaves a half-written project behind.
 */
export async function writeFileAtomic(path: string, bytes: Uint8Array): Promise<void> {
  const temp = `${path}.${process.pid}.tmp`
  await fs.writeFile(temp, bytes)
  try {
    await renameWithRetry(temp, path)
  } catch (error) {
    await fs.rm(temp, { force: true })
    throw error
  }
}

// Windows can briefly lock a file (antivirus, search indexer), so retry a few times.
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (attempt >= 5 || (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES')) throw error
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)))
    }
  }
}

export async function readImage(path: string): Promise<ImportedImage> {
  const mime = imageMimes[extname(path).toLowerCase()]
  if (!mime) throw new Error(`${basename(path)} is not a supported image type.`)
  const stat = await fs.stat(path)
  if (stat.size > MAX_IMAGE_BYTES) throw new Error(`${basename(path)} is larger than 50 MB.`)
  const bytes = new Uint8Array(await fs.readFile(path))
  return { name: basename(path), mime, bytes }
}

function recentFilePath(): string {
  return `${app.getPath('userData')}/recent-files.json`
}

export async function listRecentFiles(): Promise<RecentFile[]> {
  let entries: RecentFile[]
  try {
    entries = JSON.parse(await fs.readFile(recentFilePath(), 'utf8'))
    if (!Array.isArray(entries)) return []
  } catch {
    return []
  }
  // Hide files that were deleted or moved since they were last opened.
  const checks = await Promise.all(
    entries.map(async (entry) => {
      try {
        await fs.access(entry.path)
        return true
      } catch {
        return false
      }
    })
  )
  const existing = entries.filter((_, i) => checks[i])
  return Promise.all(existing.map(async (entry) => ({ ...entry, thumbnail: await readThumbnailDataUrl(entry.path) })))
}

async function writeRecentFiles(entries: RecentFile[]): Promise<void> {
  await writeFileAtomic(recentFilePath(), new TextEncoder().encode(JSON.stringify(entries, null, 2)))
}

export async function addRecentFile(path: string, title: string): Promise<void> {
  const entries = (await listRecentFiles()).filter((entry) => entry.path !== path).map(({ thumbnail: _t, ...rest }) => rest)
  entries.unshift({ path, title, openedAt: new Date().toISOString() })
  await writeRecentFiles(entries.slice(0, MAX_RECENT))
  app.addRecentDocument(path)
}

export async function removeRecentFile(path: string): Promise<void> {
  const entries = await listRecentFiles()
  await writeRecentFiles(entries.filter((entry) => entry.path !== path).map(({ thumbnail: _t, ...rest }) => rest))
}
