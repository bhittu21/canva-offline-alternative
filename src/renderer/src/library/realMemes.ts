import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AssetInfo, DesignDocument, DesignElement, ImageElement } from '@shared/model'
import type { MemeTemplateInfo } from '@shared/ipc'
import type { ImageSource, RenderContext } from '@renderer/render/nodes'
import { assets } from '@renderer/store/assets'
import { uiStore, updatePrefs } from '@renderer/store/uiStore'
import { imageSourceRect } from '@renderer/render/draw'
import { frame, text } from './templateKit'
import { createDocument } from '@shared/model'
import { memePicks, type MemePick } from './gen/memeArt'
import type { BuiltInTemplate } from './templates'

/**
 * Real meme pictures from memegen.link (optional, online). When the person
 * turns them on, the drawn pictures in the meme templates are swapped for the
 * classic meme photos, and the "Popular memes" gallery lists memegen's
 * templates. Pictures are fetched by the main process and kept on disk.
 */

interface MemeState {
  list: MemeTemplateInfo[] | null
  loading: boolean
  error: string | null
}

export const memeStore = createStore<MemeState>(() => ({ list: null, loading: false, error: null }))
export const useMemes = <T>(selector: (s: MemeState) => T) => useStore(memeStore, selector)

export const realMemesOn = () => uiStore.getState().prefs?.memesOnline === true
export const useRealMemesOn = () => useStore(uiStore, (s) => s.prefs?.memesOnline === true)

export async function setRealMemes(on: boolean): Promise<void> {
  await updatePrefs({ memesOnline: on })
  if (on) void loadMemeList()
}

export async function loadMemeList(): Promise<void> {
  if (memeStore.getState().loading) return
  memeStore.setState({ loading: true, error: null })
  try {
    memeStore.setState({ list: await window.api.memes.list(), loading: false })
  } catch (e) {
    memeStore.setState({ loading: false, error: (e as Error).message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '') })
  }
}

interface Decoded extends ImageSource {
  bytes: Uint8Array
  mime: string
  url: string
}

const decoded = new Map<string, Decoded>()
const loading = new Map<string, Promise<Decoded>>()

export const memeAssetId = (id: string) => `memegen-${id}`

/** Downloads (or reads from the disk cache) and decodes one meme picture. */
export function memePicture(id: string): Promise<Decoded> {
  const hit = decoded.get(id)
  if (hit) return Promise.resolve(hit)
  let job = loading.get(id)
  if (!job) {
    job = (async () => {
      const { bytes, mime } = await window.api.memes.image(id)
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
      const img = new window.Image()
      img.src = url
      await img.decode()
      const d = { image: img, width: img.naturalWidth, height: img.naturalHeight, bytes, mime, url }
      decoded.set(id, d)
      return d
    })()
    loading.set(id, job)
    job.catch(() => loading.delete(id))
  }
  return job
}

/** Draws meme pictures for thumbnails, and everything else from the open designs. */
export const memeRenderContext: RenderContext = {
  image(assetId) {
    if (assetId.startsWith('memegen-')) return decoded.get(assetId.slice(8))
    return assets.image(assetId)
  }
}

/** The crop that shows `region` of a picture in a frame of the given size. */
function cropFor(w: number, h: number, iw: number, ih: number, region?: MemePick['region']): ImageElement['crop'] | undefined {
  if (!region) return undefined
  const [u0, v0, u1, v1] = region
  const rw = (u1 - u0) * iw
  const rh = (v1 - v0) * ih
  const cover = Math.max(w / iw, h / ih)
  const zoom = Math.min(10, Math.max(1, Math.max(w / rw, h / rh) / cover))
  const { sw, sh } = imageSourceRect({ width: w, height: h, crop: { zoom, focusX: 0.5, focusY: 0.5 } }, iw, ih)
  const focus = (centre: number, size: number, whole: number) => (whole - size < 1 ? 0.5 : Math.min(1, Math.max(0, (centre - size / 2) / (whole - size))))
  return { zoom, focusX: focus(((u0 + u1) / 2) * iw, sw, iw), focusY: focus(((v0 + v1) / 2) * ih, sh, ih) }
}

const credit = (id: string, info?: MemeTemplateInfo) => ({
  source: 'memegen.link',
  author: info?.name ?? id,
  sourceUrl: info?.source ?? `https://api.memegen.link/templates/${id}`
})

export interface RealMemeDocument {
  doc: DesignDocument
  bytes: Map<string, { bytes: Uint8Array; mime: string }>
}

/**
 * Swaps each drawn meme picture for its real meme photo. A picture whose photo
 * cannot be fetched keeps its drawing, so this never fails a design.
 */
export async function withRealPictures(doc: DesignDocument): Promise<RealMemeDocument> {
  const bytes: RealMemeDocument['bytes'] = new Map()
  const picks = doc.pages.flatMap((p) => p.elements.flatMap((el) => (memePicks.has(el) ? [[el, memePicks.get(el)!] as const] : [])))
  if (!picks.length) return { doc, bytes }
  const ids = [...new Set(picks.map(([, pick]) => pick.id))]
  const got = new Map<string, Decoded>()
  await Promise.all(ids.map((id) => memePicture(id).then((d) => got.set(id, d)).catch(() => undefined)))
  const names = new Map((memeStore.getState().list ?? []).map((t) => [t.id, t]))
  const infos: AssetInfo[] = []
  for (const id of got.keys()) {
    const d = got.get(id)!
    bytes.set(memeAssetId(id), { bytes: d.bytes, mime: d.mime })
    infos.push({ id: memeAssetId(id), name: names.get(id)?.name ?? id, mime: d.mime, credit: credit(id, names.get(id)) })
  }
  const pages = doc.pages.map((page) => {
    let elements: DesignElement[] = page.elements
    for (const el of page.elements) {
      const pick = memePicks.get(el)
      const d = pick && got.get(pick.id)
      if (!pick || !d) continue
      const photo = frame(el.x, el.y, el.width, el.height, {
        assetId: memeAssetId(pick.id),
        name: `Meme picture: ${names.get(pick.id)?.name ?? pick.id}`,
        ...(el.type === 'shape' && el.cornerRadius ? { cornerRadius: el.cornerRadius } : {}),
        ...(pick.region ? { crop: cropFor(el.width, el.height, d.width, d.height, pick.region) } : {})
      })
      const index = elements.indexOf(el)
      elements = [...elements.slice(0, index), photo, ...elements.slice(index + 1)].filter((e) => e === photo || !el.groupId || e.groupId !== el.groupId)
    }
    return elements === page.elements ? page : { ...page, elements }
  })
  return { doc: { ...doc, pages, assets: [...doc.assets, ...infos] }, bytes }
}

/** True for templates whose pictures can be swapped for real meme photos. */
export const hasRealPictures = (t: BuiltInTemplate) => t.category === 'memes'

/**
 * A new design from one of memegen's templates: the photo fills the page and
 * each caption is its own text box in classic meme lettering, ready to edit
 * and move.
 */
export async function popularMemeDocument(info: MemeTemplateInfo): Promise<RealMemeDocument> {
  const d = await memePicture(info.id)
  const width = 1080
  const height = Math.round(Math.min(2400, Math.max(400, (width * d.height) / d.width)))
  const doc = createDocument(width, height, info.name)
  const page = doc.pages[0]
  page.background = '#000000'
  page.elements.push(frame(0, 0, width, height, { assetId: memeAssetId(info.id), name: `Meme picture: ${info.name}` }))
  const lines = Math.max(1, info.lines)
  const pad = 30
  const size = Math.round(Math.min(96, Math.max(44, Math.min(width, height) / (lines > 2 ? 11 : 9))))
  const boxes = captionBoxes(info.id, lines, width, height, pad)
  boxes.forEach((b, i) => {
    const t = text(lines === 1 ? 'Your caption' : `Caption ${i + 1}`, b.x, b.y, b.w, size, {
      fontFamily: 'Anton',
      fontStyle: 'normal',
      uppercase: true,
      fill: '#ffffff',
      align: 'center',
      strokeColor: '#000000',
      strokeWidth: Math.max(2, Math.round(size * 0.075)),
      name: `Caption ${i + 1}`
    })
    page.elements.push(t)
  })
  doc.assets.push({ id: memeAssetId(info.id), name: info.name, mime: d.mime, credit: credit(info.id, info) })
  return { doc, bytes: new Map([[memeAssetId(info.id), { bytes: d.bytes, mime: d.mime }]]) }
}

/** Where each caption starts. Well-known layouts get their usual spots; others go top, bottom, then down the middle. */
function captionBoxes(id: string, lines: number, w: number, h: number, pad: number): { x: number; y: number; w: number }[] {
  if (id === 'drake' && lines >= 2)
    return [
      { x: w * 0.52, y: h * 0.18, w: w * 0.45 },
      { x: w * 0.52, y: h * 0.68, w: w * 0.45 }
    ]
  if (lines === 1) return [{ x: pad, y: h * 0.78, w: w - pad * 2 }]
  if (lines === 2)
    return [
      { x: pad, y: pad, w: w - pad * 2 },
      { x: pad, y: h * 0.8, w: w - pad * 2 }
    ]
  return Array.from({ length: lines }, (_, i) => ({ x: pad, y: pad + ((h - pad * 2) * i) / lines, w: w - pad * 2 }))
}
