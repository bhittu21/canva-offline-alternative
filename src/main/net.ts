import { app } from 'electron'
/**
 * Network requests for optional online services. They all run in the main
 * process (the window itself cannot reach the internet), with a timeout and
 * friendly error messages that never include API keys.
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
  }
}

export async function request(url: string, init: RequestInit, service: string, timeoutMs = 30_000): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') throw new ServiceError(`${service} took too long to answer. Please try again.`)
    throw new ServiceError(`Could not reach ${service}. Check your internet connection. (Everything else in the editor works offline.)`)
  }
}

/** Reads an error message out of a JSON error body, if there is one. */
export async function errorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text()
    try {
      const body = JSON.parse(text) as Record<string, unknown>
      const pick = (v: unknown): string | null => {
        if (typeof v === 'string') return v
        if (Array.isArray(v)) return v.map(pick).filter(Boolean).join('; ') || null
        if (v && typeof v === 'object') {
          const o = v as Record<string, unknown>
          return pick(o.message) ?? pick(o.detail) ?? pick(o.title) ?? pick(o.error) ?? null
        }
        return null
      }
      return (pick(body.error) ?? pick(body.errors) ?? pick(body.message) ?? '').slice(0, 300)
    } catch {
      return text.slice(0, 200)
    }
  } catch {
    return ''
  }
}

export function statusMessage(service: string, status: number, detail: string): string {
  const suffix = detail ? ` (${detail})` : ''
  switch (status) {
    case 400:
      return `${service} could not handle the request${suffix}.`
    case 401:
    case 403:
      return `${service} rejected the API key. Check it in Settings${suffix}.`
    case 402:
      return `Your ${service} account has no credit left${suffix}.`
    case 404:
      return `${service} could not find that model or address${suffix}.`
    case 429:
      return `${service} rate limit or quota reached. Wait a little and try again${suffix}.`
    default:
      return status >= 500 ? `${service} is having problems right now (${status}). Try again later.` : `${service} returned an error (${status})${suffix}.`
  }
}

export async function expectOk(response: Response, service: string): Promise<Response> {
  if (!response.ok) throw new ServiceError(statusMessage(service, response.status, await errorDetail(response)), response.status)
  return response
}

/** Downloads an image, refusing anything that is not an image or is too large. */
export async function downloadImage(url: string, service: string, maxBytes = 40 * 1024 * 1024): Promise<{ bytes: Uint8Array; mime: string }> {
  const response = await expectOk(await request(url, {}, service, 60_000), service)
  const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim()
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime)) throw new ServiceError(`${service} did not return an image.`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > maxBytes) throw new ServiceError('The image is too large.')
  return { bytes, mime }
}

/**
 * Test-only service addresses (for the automated tests' local mock servers).
 * Ignored in the installed app, so nothing can redirect requests or keys elsewhere.
 */
export function testOverride(name: string): string | undefined {
  return app.isPackaged ? undefined : process.env[name] || undefined
}
