import { nanoid } from 'nanoid'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { ImageSource, RenderContext } from '@renderer/render/nodes'

/**
 * Image bytes live outside the undoable document, keyed by asset id. Assets are
 * kept until the design is closed, so undoing a delete can always bring an image
 * back. Only the assets still in use are written when saving.
 *
 * Decoded images are cached here too, so the canvas and exports never decode
 * the same photo twice. `version` changes whenever a decode finishes, which
 * tells the canvas to redraw.
 */

interface StoredAsset {
  bytes: Uint8Array
  mime: string
  url: string
  decoded?: ImageSource
  loading?: Promise<ImageSource>
}

const versionStore = createStore<{ version: number }>(() => ({ version: 0 }))

export function useAssetVersion(): number {
  return useStore(versionStore, (s) => s.version)
}

export class AssetRegistry implements RenderContext {
  private assets = new Map<string, StoredAsset>()

  add(bytes: Uint8Array, mime: string, id: string = nanoid()): string {
    const existing = this.assets.get(id)
    if (existing) URL.revokeObjectURL(existing.url)
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
    this.assets.set(id, { bytes, mime, url })
    void this.load(id).catch(() => {})
    return id
  }

  has(id: string): boolean {
    return this.assets.has(id)
  }

  url(id: string): string | undefined {
    return this.assets.get(id)?.url
  }

  get(id: string): { bytes: Uint8Array; mime: string } | undefined {
    const asset = this.assets.get(id)
    return asset && { bytes: asset.bytes, mime: asset.mime }
  }

  /** The decoded image if it is ready. Starts decoding otherwise. */
  image(id: string): ImageSource | undefined {
    const asset = this.assets.get(id)
    if (!asset) return undefined
    if (!asset.decoded && !asset.loading) void this.load(id).catch(() => {})
    return asset.decoded
  }

  load(id: string): Promise<ImageSource> {
    const asset = this.assets.get(id)
    if (!asset) return Promise.reject(new Error('An image in this design is missing.'))
    if (asset.decoded) return Promise.resolve(asset.decoded)
    asset.loading ??= new Promise<ImageSource>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        asset.decoded = { image: img, width: img.naturalWidth || 512, height: img.naturalHeight || 512 }
        versionStore.setState((s) => ({ version: s.version + 1 }))
        resolve(asset.decoded)
      }
      img.onerror = () => {
        asset.loading = undefined
        reject(new Error('An image in this design could not be loaded.'))
      }
      img.src = asset.url
    })
    return asset.loading
  }

  bytesMap(): Map<string, Uint8Array> {
    return new Map([...this.assets].map(([id, asset]) => [id, asset.bytes]))
  }

  clear(): void {
    for (const asset of this.assets.values()) URL.revokeObjectURL(asset.url)
    this.assets.clear()
  }
}

export const assets = new AssetRegistry()
