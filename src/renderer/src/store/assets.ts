import { nanoid } from 'nanoid'

/**
 * Image bytes live outside the undoable document, keyed by asset id. Assets are
 * kept until the design is closed, so undoing a delete can always bring an image
 * back. Only the assets still in use are written when saving.
 */

interface StoredAsset {
  bytes: Uint8Array
  mime: string
  url: string
}

export class AssetRegistry {
  private assets = new Map<string, StoredAsset>()

  add(bytes: Uint8Array, mime: string, id: string = nanoid()): string {
    const existing = this.assets.get(id)
    if (existing) URL.revokeObjectURL(existing.url)
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
    this.assets.set(id, { bytes, mime, url })
    return id
  }

  url(id: string): string | undefined {
    return this.assets.get(id)?.url
  }

  get(id: string): { bytes: Uint8Array; mime: string } | undefined {
    const asset = this.assets.get(id)
    return asset && { bytes: asset.bytes, mime: asset.mime }
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
