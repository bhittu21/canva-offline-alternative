import { getRemoveBgKey } from './secrets'
import { testOverride } from './net'

/**
 * Optional online feature: background removal by remove.bg
 * (https://www.remove.bg/api). Requests are made from the main process so the
 * API key never reaches the UI. Everything else in the app works offline.
 */

const API_BASE = testOverride('REMOVE_BG_API_BASE') || 'https://api.remove.bg/v1.0'
const MAX_UPLOAD_BYTES = 22 * 1024 * 1024
const TIMEOUT_MS = 60_000

export interface RemoveBgResult {
  bytes: Uint8Array
  creditsCharged: number | null
}

export interface RemoveBgAccount {
  credits: number | null
  freeCalls: number | null
}

export class RemoveBgError extends Error {}

export async function removeBackground(image: Uint8Array, mime: string, apiKey?: string): Promise<RemoveBgResult> {
  const key = apiKey ?? (await getRemoveBgKey())
  if (!key) throw new RemoveBgError('Add your remove.bg API key in Settings first.')
  if (image.byteLength > MAX_UPLOAD_BYTES) throw new RemoveBgError('This image is larger than 22 MB, the remove.bg upload limit.')

  const form = new FormData()
  form.append('image_file', new Blob([Buffer.from(image)], { type: mime }), `image.${mime.split('/')[1] ?? 'png'}`)
  form.append('size', 'auto')
  form.append('format', 'png')

  const response = await request(`${API_BASE}/removebg`, { method: 'POST', headers: { 'X-Api-Key': key }, body: form })
  if (!response.ok) throw new RemoveBgError(await describeError(response))
  const charged = Number(response.headers.get('x-credits-charged'))
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    creditsCharged: Number.isFinite(charged) ? charged : null
  }
}

/** Checks a key and reads the balance. This call does not use any credits. */
export async function checkAccount(apiKey?: string): Promise<RemoveBgAccount> {
  const key = apiKey ?? (await getRemoveBgKey())
  if (!key) throw new RemoveBgError('No remove.bg API key is saved.')
  const response = await request(`${API_BASE}/account`, { headers: { 'X-Api-Key': key } })
  if (!response.ok) throw new RemoveBgError(await describeError(response))
  const json = (await response.json()) as {
    data?: { attributes?: { credits?: { total?: number }; api?: { free_calls?: number } } }
  }
  const attributes = json.data?.attributes
  return {
    credits: typeof attributes?.credits?.total === 'number' ? attributes.credits.total : null,
    freeCalls: typeof attributes?.api?.free_calls === 'number' ? attributes.api.free_calls : null
  }
}

async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') throw new RemoveBgError('remove.bg took too long to answer. Please try again.')
    throw new RemoveBgError('Could not reach remove.bg. Check your internet connection. (The rest of the editor works offline.)')
  }
}

async function describeError(response: Response): Promise<string> {
  let detail = ''
  try {
    const body = (await response.json()) as { errors?: { title?: string; detail?: string }[] }
    detail = body.errors?.[0]?.detail || body.errors?.[0]?.title || ''
  } catch {
    // Not JSON; fall back to the status code.
  }
  switch (response.status) {
    case 400:
      return `remove.bg could not process this image${detail ? `: ${detail}` : '.'}`
    case 402:
      return 'Your remove.bg account has no free calls or credits left.'
    case 403:
      return 'remove.bg rejected the API key. Check it in Settings.'
    case 429:
      return 'Too many requests to remove.bg. Wait a minute and try again (no credits were charged).'
    default:
      return `remove.bg returned an error (${response.status})${detail ? `: ${detail}` : '.'}`
  }
}
