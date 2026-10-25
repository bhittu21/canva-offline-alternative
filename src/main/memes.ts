import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { MemeImage, MemeTemplateInfo } from '@shared/ipc'
import { downloadImage, expectOk, request, ServiceError, testOverride } from './net'
import { getPreferences } from './prefs'

/**
 * Real meme pictures from memegen.link, a free open-source meme service that
 * needs no account or key. It is off until the person turns it on in the
 * Memes gallery. Only template ids are sent (never designs or text), and
 * every picture is kept on disk after the first download, so a meme used
 * once also works offline afterwards.
 */

const base = () => testOverride('MEMEGEN_API_BASE') || 'https://api.memegen.link'
const SERVICE = 'memegen.link'
const LIST_TTL = 24 * 60 * 60 * 1000

const folder = () => join(app.getPath('userData'), 'memegen')
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/

export const isMemeId = (id: unknown): id is string => typeof id === 'string' && ID.test(id)

async function assertEnabled(): Promise<void> {
  if (!(await getPreferences()).memesOnline) throw new ServiceError('Turn on real meme pictures in the Memes gallery first.')
}

interface RawTemplate {
  id?: unknown
  name?: unknown
  lines?: unknown
  keywords?: unknown
  source?: unknown
}

function clean(raw: RawTemplate): MemeTemplateInfo | null {
  if (!isMemeId(raw.id)) return null
  const lines = Math.min(Math.max(1, Math.floor(Number(raw.lines) || 2)), 8)
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : raw.id,
    lines,
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((k): k is string => typeof k === 'string').map((k) => k.slice(0, 60)).slice(0, 12) : [],
    source: typeof raw.source === 'string' && /^https:\/\//.test(raw.source) ? raw.source.slice(0, 300) : null
  }
}

/** The list of meme templates, refreshed once a day and kept for offline use. */
export async function listMemeTemplates(): Promise<MemeTemplateInfo[]> {
  await assertEnabled()
  const file = join(folder(), 'templates.json')
  let cached: { at: number; templates: MemeTemplateInfo[] } | null = null
  try {
    cached = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    cached = null
  }
  if (cached && Date.now() - cached.at < LIST_TTL && cached.templates.length) return cached.templates
  try {
    const response = await expectOk(await request(`${base()}/templates/`, {}, SERVICE), SERVICE)
    const json = (await response.json()) as unknown
    const templates = (Array.isArray(json) ? json : []).map((t) => clean(t as RawTemplate)).filter((t): t is MemeTemplateInfo => !!t)
    if (!templates.length) throw new ServiceError(`${SERVICE} sent an empty list.`)
    await fs.mkdir(folder(), { recursive: true })
    await fs.writeFile(file, JSON.stringify({ at: Date.now(), templates }))
    return templates
  } catch (error) {
    if (cached?.templates.length) return cached.templates
    throw error
  }
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

/** The blank picture of one meme template (no text on it). */
export async function memeImage(id: string): Promise<MemeImage> {
  await assertEnabled()
  if (!isMemeId(id)) throw new ServiceError('Unknown meme.')
  const dir = folder()
  for (const [mime, ext] of Object.entries(EXT)) {
    try {
      return { id, mime, bytes: new Uint8Array(await fs.readFile(join(dir, `${id}.${ext}`))) }
    } catch {
      // Not downloaded yet in this format.
    }
  }
  // With no caption in the address, memegen sends the template's blank picture.
  const image = await downloadImage(`${base()}/images/${id}.jpg`, SERVICE, 8 * 1024 * 1024)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(join(dir, `${id}.${EXT[image.mime] ?? 'jpg'}`), image.bytes)
  return { id, ...image }
}

/** Forgets the downloaded pictures (used when the person turns the feature off and asks to clear them). */
export async function clearMemeCache(): Promise<void> {
  await fs.rm(folder(), { recursive: true, force: true })
}
