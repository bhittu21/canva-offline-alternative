import { promises as fs } from 'node:fs'
import { app } from 'electron'
import type { AiProviderConfig, Preferences } from '@shared/ipc'

/** Ordinary settings (no secrets) in <userData>/preferences.json. */

export const defaultPreferences: Preferences = {
  theme: 'light',
  autosave: true,
  showRulers: true,
  snapping: true,
  recentTemplates: [],
  favoriteIcons: [],
  recentIcons: [],
  recentColors: [],
  brand: { name: 'My brand', colors: ['#1f2329', '#7c5cff', '#ff6b6b', '#ffd166', '#f7f4ee'], headingFont: 'Poppins', bodyFont: 'Inter', logos: [] },
  photoProvider: 'unsplash',
  aiProviders: [],
  activeAiProvider: null
}

const path = () => `${app.getPath('userData')}/preferences.json`
let cache: Preferences | null = null
let queue: Promise<unknown> = Promise.resolve()

export async function getPreferences(): Promise<Preferences> {
  if (cache) return cache
  try {
    cache = sanitize(JSON.parse(await fs.readFile(path(), 'utf8')))
  } catch {
    cache = structuredClone(defaultPreferences)
  }
  return cache
}

export function setPreferences(patch: Partial<Preferences>): Promise<Preferences> {
  const run = queue.then(async () => {
    const next = sanitize({ ...(await getPreferences()), ...patch })
    cache = next
    const temp = `${path()}.tmp`
    await fs.writeFile(temp, JSON.stringify(next, null, 2))
    await fs.rename(temp, path())
    return next
  })
  queue = run.catch(() => undefined)
  return run
}

const strings = (v: unknown, max: number, len = 200) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.length <= len).slice(0, max) : []

/** Keeps only known settings with the right types, so a damaged file can never break the app. */
function sanitize(raw: unknown): Preferences {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const d = defaultPreferences
  const brand = (p.brand && typeof p.brand === 'object' ? p.brand : {}) as Record<string, unknown>
  return {
    theme: p.theme === 'dark' || p.theme === 'system' ? p.theme : 'light',
    autosave: typeof p.autosave === 'boolean' ? p.autosave : d.autosave,
    showRulers: typeof p.showRulers === 'boolean' ? p.showRulers : d.showRulers,
    snapping: typeof p.snapping === 'boolean' ? p.snapping : d.snapping,
    recentTemplates: strings(p.recentTemplates, 12),
    favoriteIcons: strings(p.favoriteIcons, 200),
    recentIcons: strings(p.recentIcons, 24),
    recentColors: strings(p.recentColors, 16, 40),
    brand: {
      name: typeof brand.name === 'string' ? brand.name.slice(0, 80) : d.brand.name,
      colors: Array.isArray(brand.colors) ? strings(brand.colors, 24, 40) : d.brand.colors,
      headingFont: typeof brand.headingFont === 'string' ? brand.headingFont : d.brand.headingFont,
      bodyFont: typeof brand.bodyFont === 'string' ? brand.bodyFont : d.brand.bodyFont,
      logos: strings(brand.logos, 24)
    },
    photoProvider: p.photoProvider === 'pexels' ? 'pexels' : 'unsplash',
    aiProviders: Array.isArray(p.aiProviders) ? p.aiProviders.map(sanitizeProvider).filter((x): x is AiProviderConfig => !!x).slice(0, 20) : [],
    activeAiProvider: typeof p.activeAiProvider === 'string' ? p.activeAiProvider : null
  }
}

export function sanitizeProvider(raw: unknown): AiProviderConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  if (typeof c.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(c.id)) return null
  const protocol = c.protocol === 'anthropic' || c.protocol === 'gemini' ? c.protocol : 'openai'
  const baseUrl = typeof c.baseUrl === 'string' ? c.baseUrl.trim().replace(/\/+$/, '') : ''
  return {
    id: c.id,
    label: typeof c.label === 'string' ? c.label.slice(0, 80) : c.id,
    protocol,
    baseUrl: baseUrl.slice(0, 300),
    model: typeof c.model === 'string' ? c.model.trim().slice(0, 200) : '',
    imageModel: typeof c.imageModel === 'string' ? c.imageModel.trim().slice(0, 200) : '',
    enabled: c.enabled !== false,
    local: c.local === true
  }
}
