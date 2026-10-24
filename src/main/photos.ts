import type { DownloadedPhoto, PhotoProviderId, PhotoResult, PhotoSearchResult } from '@shared/ipc'
import { downloadImage, expectOk, request, ServiceError, testOverride } from './net'
import { getSecret } from './secrets'

/**
 * Photo search providers. Each provider follows its API terms:
 *  - Unsplash: images are shown from Unsplash's servers (hotlinked), a
 *    download is reported to Unsplash when a photo is added to a design, and
 *    every photo is credited to its photographer with a link.
 *  - Pexels: photos are credited to the photographer and to Pexels.
 * New providers only need to implement this interface.
 */

interface PhotoProvider {
  label: string
  search(key: string, query: string, page: number): Promise<PhotoSearchResult>
  download(key: string, photo: PhotoResult): Promise<DownloadedPhoto>
  test(key: string): Promise<{ remaining: number | null }>
}

const APP_NAME = 'offline_design_studio'
const PER_PAGE = 30

const unsplashBase = () => testOverride('UNSPLASH_API_BASE') || 'https://api.unsplash.com'
const pexelsBase = () => testOverride('PEXELS_API_BASE') || 'https://api.pexels.com/v1'

const utm = (url: string) => `${url}${url.includes('?') ? '&' : '?'}utm_source=${APP_NAME}&utm_medium=referral`

function remaining(response: Response): number | null {
  const value = Number(response.headers.get('x-ratelimit-remaining'))
  return Number.isFinite(value) && response.headers.has('x-ratelimit-remaining') ? value : null
}

/** Only download from the provider's own servers, whatever the window sends. */
function assertHost(url: string, hosts: string[]): void {
  let host: string
  try {
    host = new URL(url).host
  } catch {
    throw new ServiceError('That photo link is not valid.')
  }
  if (!hosts.includes(host)) throw new ServiceError('That photo link is not from the photo provider.')
}

interface UnsplashPhoto {
  id: string
  width: number
  height: number
  color: string | null
  description: string | null
  alt_description: string | null
  urls: { raw: string; small: string }
  links: { html: string; download_location: string }
  user: { name: string; links: { html: string } }
}

const unsplash: PhotoProvider = {
  label: 'Unsplash',
  async search(key, query, page) {
    const url = `${unsplashBase()}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}&content_filter=high`
    const response = await expectOk(await request(url, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } }, 'Unsplash'), 'Unsplash')
    const json = (await response.json()) as { total_pages?: number; results?: UnsplashPhoto[] }
    return {
      page,
      totalPages: json.total_pages ?? 0,
      remaining: remaining(response),
      results: (json.results ?? []).map((p) => ({
        provider: 'unsplash' as const,
        id: p.id,
        width: p.width,
        height: p.height,
        thumbUrl: p.urls.small,
        description: p.alt_description || p.description || '',
        author: p.user.name,
        authorUrl: utm(p.user.links.html),
        pageUrl: utm(p.links.html),
        color: p.color,
        downloadRef: JSON.stringify({ track: p.links.download_location, raw: p.urls.raw })
      }))
    }
  },
  async download(key, photo) {
    const ref = JSON.parse(photo.downloadRef) as { track: string; raw: string }
    const apiHost = new URL(unsplashBase()).host
    assertHost(ref.track, [apiHost])
    assertHost(ref.raw, ['images.unsplash.com', apiHost])
    // Unsplash asks apps to report each download (it counts towards the photographer's stats).
    void request(ref.track, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } }, 'Unsplash').catch(() => undefined)
    const image = await downloadImage(`${ref.raw}${ref.raw.includes('?') ? '&' : '?'}w=2400&q=85&fm=jpg&fit=max`, 'Unsplash')
    return { ...image, credit: { source: 'Unsplash', author: photo.author, authorUrl: photo.authorUrl, sourceUrl: photo.pageUrl } }
  },
  async test(key) {
    const response = await expectOk(
      await request(`${unsplashBase()}/photos?per_page=1`, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } }, 'Unsplash'),
      'Unsplash'
    )
    return { remaining: remaining(response) }
  }
}

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  alt: string | null
  avg_color: string | null
  photographer: string
  photographer_url: string
  src: { original: string; medium: string }
}

const pexels: PhotoProvider = {
  label: 'Pexels',
  async search(key, query, page) {
    const url = `${pexelsBase()}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${PER_PAGE}`
    const response = await expectOk(await request(url, { headers: { Authorization: key } }, 'Pexels'), 'Pexels')
    const json = (await response.json()) as { total_results?: number; photos?: PexelsPhoto[] }
    return {
      page,
      totalPages: Math.ceil((json.total_results ?? 0) / PER_PAGE),
      remaining: remaining(response),
      results: (json.photos ?? []).map((p) => ({
        provider: 'pexels' as const,
        id: String(p.id),
        width: p.width,
        height: p.height,
        thumbUrl: p.src.medium,
        description: p.alt ?? '',
        author: p.photographer,
        authorUrl: p.photographer_url,
        pageUrl: p.url,
        color: p.avg_color,
        downloadRef: p.src.original
      }))
    }
  },
  async download(_key, photo) {
    assertHost(photo.downloadRef, ['images.pexels.com', new URL(pexelsBase()).host])
    const image = await downloadImage(`${photo.downloadRef}?auto=compress&cs=tinysrgb&w=2400`, 'Pexels')
    return { ...image, credit: { source: 'Pexels', author: photo.author, authorUrl: photo.authorUrl, sourceUrl: photo.pageUrl } }
  },
  async test(key) {
    const response = await expectOk(await request(`${pexelsBase()}/curated?per_page=1`, { headers: { Authorization: key } }, 'Pexels'), 'Pexels')
    return { remaining: remaining(response) }
  }
}

export const photoProviders: Record<PhotoProviderId, PhotoProvider> = { unsplash, pexels }

export function isPhotoProvider(id: unknown): id is PhotoProviderId {
  return id === 'unsplash' || id === 'pexels'
}

export async function providerKey(id: PhotoProviderId, given?: string): Promise<string> {
  const key = given?.trim() || (await getSecret(`photos:${id}`))
  if (!key) throw new ServiceError(`Add your ${photoProviders[id].label} access key in Settings first.`)
  return key
}

/** Hosts the window may load photo thumbnails from. */
export const photoImageHosts = ['images.unsplash.com', 'images.pexels.com']
