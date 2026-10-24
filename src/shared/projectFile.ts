import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { PROJECT_EXTENSION } from './constants'
import { designDocumentSchema, SCHEMA_VERSION, type DesignDocument } from './model'

/**
 * A project is one self-contained zip file:
 *
 *   manifest.json    format name and schema version
 *   document.json    the design document
 *   assets/<id>      every image the design uses, as the original bytes
 *
 * Keeping images inside the file means a design never loses its pictures when
 * the file is moved, copied or opened on another PC.
 */

export { PROJECT_EXTENSION }
export const PROJECT_FORMAT = 'offline-design-editor'

export interface ProjectContents {
  document: DesignDocument
  assets: Map<string, Uint8Array>
}

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectFileError'
  }
}

/** Returns the asset ids referenced by elements, in first-use order. */
export function usedAssetIds(document: DesignDocument): string[] {
  const ids = new Set<string>()
  for (const element of document.elements) {
    if (element.type === 'image') ids.add(element.assetId)
  }
  return [...ids]
}

export function encodeProject(document: DesignDocument, assets: ReadonlyMap<string, Uint8Array>): Uint8Array {
  const used = usedAssetIds(document)
  for (const id of used) {
    if (!assets.has(id)) throw new ProjectFileError(`Image ${id} is missing and cannot be saved.`)
  }
  const usedSet = new Set(used)
  const saved: DesignDocument = { ...document, assets: document.assets.filter((a) => usedSet.has(a.id)) }

  const manifest = { format: PROJECT_FORMAT, schemaVersion: SCHEMA_VERSION }
  const files: Zippable = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'document.json': strToU8(JSON.stringify(saved, null, 2))
  }
  for (const id of used) {
    // Images are already compressed, so store them as-is.
    files[`assets/${id}`] = [assets.get(id)!, { level: 0 }]
  }
  return zipSync(files, { level: 6 })
}

export function decodeProject(bytes: Uint8Array): ProjectContents {
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new ProjectFileError('This file is not a design project or it is damaged.')
  }

  const manifest = readJson(files, 'manifest.json') as { format?: unknown; schemaVersion?: unknown }
  if (manifest.format !== PROJECT_FORMAT) {
    throw new ProjectFileError('This file is not a design project made by this app.')
  }
  if (typeof manifest.schemaVersion !== 'number' || manifest.schemaVersion > SCHEMA_VERSION) {
    throw new ProjectFileError('This project was made with a newer version of the app. Please update the app.')
  }

  const raw = migrate(readJson(files, 'document.json'), manifest.schemaVersion)
  const parsed = designDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ProjectFileError('The design inside this file is damaged and cannot be opened.')
  }
  const document = parsed.data

  const assets = new Map<string, Uint8Array>()
  for (const info of document.assets) {
    const data = files[`assets/${info.id}`]
    if (data) assets.set(info.id, data)
  }
  for (const id of usedAssetIds(document)) {
    if (!assets.has(id)) throw new ProjectFileError('Some images in this project are missing from the file.')
  }
  return { document, assets }
}

function readJson(files: Record<string, Uint8Array>, name: string): unknown {
  const data = files[name]
  if (!data) throw new ProjectFileError(`This project file is incomplete (${name} is missing).`)
  try {
    return JSON.parse(strFromU8(data))
  } catch {
    throw new ProjectFileError(`This project file is damaged (${name} cannot be read).`)
  }
}

/** Upgrades older documents step by step. Version 1 is the first format, so there is nothing to do yet. */
function migrate(raw: unknown, fromVersion: number): unknown {
  let doc = raw
  for (let version = fromVersion; version < SCHEMA_VERSION; version++) {
    doc = migrations[version]?.(doc) ?? doc
  }
  return doc
}

const migrations: Record<number, (doc: unknown) => unknown> = {}
