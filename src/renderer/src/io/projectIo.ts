import { nanoid } from 'nanoid'
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { ImportedImage, LibraryItem, PhotoCredit } from '@shared/ipc'
import type { AssetInfo, DesignDocument, DesignElement, ImageElement } from '@shared/model'
import { createDocument } from '@shared/model'
import { decodeProject, encodeProject, PROJECT_EXTENSION } from '@shared/projectFile'
import { showError, showToast } from '@renderer/components/toast'
import { centerAt, createImage } from '@renderer/editor/elementFactory'
import { canvasToBlob, renderThumbnail, thumbnailPng } from '@renderer/export/renderDesign'
import { assets } from '@renderer/store/assets'
import { editor, editorStore, selectActivePage, selectIsDirty } from '@renderer/store/editorStore'
import { bumpLibrary } from '@renderer/store/libraryStore'
import { confirmAction, uiStore } from '@renderer/store/uiStore'

// ---------------------------------------------------------------- Save status

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'autosaved' | 'draft' | 'error'

const statusStore = createStore<{ status: SaveStatus; at: number | null }>(() => ({ status: 'idle', at: null }))

export function useSaveStatus() {
  return useStore(statusStore, (s) => s)
}

/** Identifies the open design's crash-recovery copy. */
let sessionId = nanoid(12)

// ---------------------------------------------------------------- Open and close

/** Asks before throwing away unsaved work. Resolves to true when it is fine to continue. */
export async function confirmDiscardChanges(): Promise<boolean> {
  if (!selectIsDirty(editorStore.getState())) return true
  const title = editorStore.getState().history?.present.title || 'Untitled design'
  const choice = await confirmAction({
    title: 'Save changes?',
    message: `"${title}" has changes that are not saved in a file yet.`,
    confirmLabel: 'Save',
    alternateLabel: "Don't save"
  })
  if (choice === 'cancel') return false
  if (choice === 'confirm') return saveDesign(false)
  return true
}

function startSession(id = nanoid(12)): void {
  sessionId = id
  statusStore.setState({ status: 'idle', at: null })
}

function finishSession(): void {
  void window.api.recovery.remove(sessionId).catch(() => undefined)
}

export async function openDocument(doc: DesignDocument, filePath: string | null, recoveryId?: string): Promise<void> {
  editor.open(doc, filePath)
  startSession(recoveryId)
  uiStore.setState({ panel: doc.pages.some((p) => p.elements.length > 0) ? 'elements' : 'design', panelOpen: true })
}

export async function newDesign(width: number, height: number, title?: string): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  finishSession()
  assets.clear()
  await openDocument(createDocument(width, height, title), null)
}

/** Opens a ready-made document (for example a template) as a new, unsaved design. */
export async function openAsNewDesign(doc: DesignDocument, assetBytes?: Map<string, { bytes: Uint8Array; mime: string }>): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  finishSession()
  assets.clear()
  for (const [id, a] of assetBytes ?? []) assets.add(a.bytes, a.mime, id)
  await openDocument(doc, null)
  editorStore.setState({ forceDirty: true })
}

export async function closeDesign(): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  finishSession()
  assets.clear()
  editor.close()
}

// ---------------------------------------------------------------- Save

async function encodeCurrent(withThumbnail: boolean): Promise<Uint8Array> {
  const doc = editorStore.getState().history!.present
  const thumbnail = withThumbnail ? await thumbnailPng(doc, 480) : undefined
  return encodeProject(doc, assets.bytesMap(), thumbnail)
}

let saving: Promise<boolean> | null = null

export async function saveDesign(saveAs = false, options: { quiet?: boolean } = {}): Promise<boolean> {
  if (saving) await saving
  const run = (async () => {
    const state = editorStore.getState()
    const doc = state.history?.present
    if (!doc) return false
    try {
      let path = saveAs ? null : state.filePath
      if (!path) {
        path = await window.api.chooseSavePath(doc.title)
        if (!path) return false
        // A design saved under a new name takes its title from the file name.
        editor.setTitleSilently(fileNameWithoutExtension(path) || doc.title)
      }
      statusStore.setState({ status: 'saving' })
      const savedHistory = editorStore.getState().history
      const current = savedHistory!.present
      const thumbnail = await thumbnailPng(current, 480)
      await window.api.writeProject(path, encodeProject(current, assets.bytesMap(), thumbnail))
      // Only mark saved if nothing changed while writing.
      if (editorStore.getState().history?.present === current) editor.markSaved(path)
      else editorStore.setState({ filePath: path })
      await window.api.addRecentFile(path, current.title, thumbnail)
      finishSession()
      statusStore.setState({ status: options.quiet ? 'autosaved' : 'saved', at: Date.now() })
      if (!options.quiet) showToast('Saved')
      return true
    } catch (error) {
      statusStore.setState({ status: 'error' })
      showError(error, 'The design could not be saved.')
      return false
    }
  })()
  saving = run
  try {
    return await run
  } finally {
    saving = null
  }
}

/** "Make a copy": saves the design under a new name and keeps editing the copy. */
export async function duplicateDesign(): Promise<void> {
  const doc = editorStore.getState().history?.present
  if (!doc) return
  editor.setTitleSilently(`${doc.title} (copy)`)
  const ok = await saveDesign(true)
  if (!ok) editor.setTitleSilently(doc.title)
}

// ---------------------------------------------------------------- Autosave and recovery

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let lastPresent: DesignDocument | null = null

/**
 * Watches the open design. A design that already has a file is saved to it a
 * few seconds after each change (when autosave is on). Every design with
 * unsaved changes also gets a recovery copy in the app's data folder, so a
 * crash or power cut never loses more than a few seconds of work.
 */
export function startAutosave(): () => void {
  return editorStore.subscribe((state) => {
    const present = state.history?.present ?? null
    if (present === lastPresent) return
    lastPresent = present
    if (autosaveTimer) clearTimeout(autosaveTimer)
    if (!present || !selectIsDirty(state)) return
    statusStore.setState({ status: 'idle' })
    autosaveTimer = setTimeout(() => void autosaveNow(), 2500)
  })
}

async function autosaveNow(): Promise<void> {
  const state = editorStore.getState()
  if (!state.history || !selectIsDirty(state) || editorStore.getState().editingTextId) {
    if (editorStore.getState().editingTextId) autosaveTimer = setTimeout(() => void autosaveNow(), 2500)
    return
  }
  const prefs = uiStore.getState().prefs
  if (prefs?.autosave && state.filePath) {
    await saveDesign(false, { quiet: true })
    return
  }
  try {
    const doc = state.history.present
    const thumb = await renderThumbnail(doc, doc.pages[0], 200)
    const thumbnail = thumb.toDataURL('image/png')
    await window.api.recovery.write(sessionId, doc.title, state.filePath, await encodeCurrent(false), thumbnail)
    statusStore.setState({ status: 'draft', at: Date.now() })
  } catch {
    // Recovery copies are a safety net; a failure here must never interrupt editing.
  }
}

export async function openRecovered(id: string, filePath: string | null): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  try {
    const project = decodeProject(await window.api.recovery.read(id))
    finishSession()
    assets.clear()
    for (const [assetId, data] of project.assets) {
      const info = project.document.assets.find((a) => a.id === assetId)
      assets.add(data, info?.mime ?? 'application/octet-stream', assetId)
    }
    await openDocument(project.document, filePath, id)
    editorStore.setState({ forceDirty: true })
    showToast('Recovered your unsaved design. Save it to keep it.')
  } catch (error) {
    showError(error, 'The recovered design could not be opened.')
  }
}

// ---------------------------------------------------------------- Open files

export async function openDesignDialog(): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  try {
    const file = await window.api.openProjectDialog()
    if (file) await loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

export async function openDesignPath(path: string): Promise<void> {
  if (!(await confirmDiscardChanges())) return
  try {
    const file = await window.api.openProjectPath(path)
    await loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

async function loadProjectBytes(path: string, bytes: Uint8Array): Promise<void> {
  const project = decodeProject(bytes)
  finishSession()
  assets.clear()
  for (const [id, data] of project.assets) {
    const info = project.document.assets.find((a) => a.id === id)
    assets.add(data, info?.mime ?? 'application/octet-stream', id)
  }
  await openDocument(project.document, path)
  editor.markSaved(path)
  void window.api.addRecentFile(path, project.document.title)
}

// ---------------------------------------------------------------- Images

export async function importImagesDialog(): Promise<void> {
  try {
    const images = await window.api.importImagesDialog()
    await addImages(images)
  } catch (error) {
    showError(error, 'The image could not be imported.')
  }
}

/** Adds dropped or pasted image files, optionally at a point on the page. */
export async function importImageFiles(files: File[], point?: { x: number; y: number }): Promise<void> {
  const images: ImportedImage[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    images.push({ name: file.name || 'Image', mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) })
  }
  if (images.length === 0) {
    showToast('Only image files can be added to the design.', 'error')
    return
  }
  await addImages(images, point)
}

async function addImages(images: ImportedImage[], point?: { x: number; y: number }): Promise<void> {
  const added: string[] = []
  for (const image of images) {
    const id = await insertImage(image.bytes, image.mime, image.name.replace(/\.[^.]+$/, ''), { point, saveToLibrary: true, select: false })
    if (id) added.push(id)
  }
  if (added.length > 0) editor.select(added)
}

/**
 * Puts an image into the design: into a frame when one is given, otherwise as
 * a new element. Returns the new element id. One undo step covers it all.
 */
export async function insertImage(
  bytes: Uint8Array,
  mime: string,
  name: string,
  options: { point?: { x: number; y: number }; targetId?: string | null; credit?: PhotoCredit; saveToLibrary?: boolean; select?: boolean } = {}
): Promise<string | null> {
  const doc = editorStore.getState().history?.present
  if (!doc) return null
  const assetId = assets.add(bytes, mime)
  let size: { width: number; height: number }
  try {
    const decoded = await assets.load(assetId)
    size = { width: decoded.width, height: decoded.height }
  } catch {
    showToast(`${name} could not be read as an image.`, 'error')
    return null
  }
  const info: AssetInfo = { id: assetId, name, mime, ...(options.credit && { credit: options.credit }) }
  const page = selectActivePage(editorStore.getState())
  const target = options.targetId ? page?.elements.find((el) => el.id === options.targetId && el.type === 'image') : undefined
  let elementId: string
  if (target) {
    elementId = target.id
    editor.change('Fill frame', (d) => {
      d.assets.push(info)
      for (const p of d.pages) {
        const el = p.elements.find((e) => e.id === target.id)
        if (el && el.type === 'image') {
          el.assetId = assetId
          delete el.crop
        }
      }
    })
  } else {
    let element: ImageElement = createImage(doc, assetId, name, size.width, size.height)
    if (options.point) element = centerAt([element], options.point)[0]
    elementId = element.id
    editor.changePage('Add image', (p, d) => {
      d.assets.push(info)
      p.elements.push(element)
    })
  }
  if (options.select !== false) editor.select([elementId])
  if (options.saveToLibrary) void addToLibrary(bytes, mime, name, size)
  return elementId
}

/** Keeps a copy of imported images in "Your uploads", so they can be reused in other designs. */
async function addToLibrary(bytes: Uint8Array, mime: string, name: string, size: { width: number; height: number }): Promise<LibraryItem | null> {
  try {
    const thumbnail = await imageThumbnail(bytes, mime, 240)
    const item = await window.api.library.add(name, mime, bytes, size.width, size.height, thumbnail)
    bumpLibrary()
    return item
  } catch {
    // The design itself already has the image; the library copy is a convenience.
    return null
  }
}

/** Adds an image to the uploads library without putting it in the design (for example a brand logo). */
export async function addImageToLibrary(bytes: Uint8Array, mime: string, name: string): Promise<LibraryItem | null> {
  const id = assets.add(bytes, mime)
  try {
    const decoded = await assets.load(id)
    return await addToLibrary(bytes, mime, name, { width: decoded.width, height: decoded.height })
  } catch {
    return null
  }
}

export async function imageThumbnail(bytes: Uint8Array, mime: string, max: number): Promise<string> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * scale))
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    // JPEG keeps previews small; other formats may be transparent, so they stay PNG.
    const blob = await canvasToBlob(canvas, mime === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.82)
    return await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.readAsDataURL(blob)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Sets a photo as the background of the current page. */
export async function setPageBackgroundImage(bytes: Uint8Array, mime: string, name: string, credit?: PhotoCredit): Promise<void> {
  const assetId = assets.add(bytes, mime)
  try {
    await assets.load(assetId)
  } catch {
    showToast('That image could not be read.', 'error')
    return
  }
  editor.changePage('Set background image', (page, doc) => {
    doc.assets.push({ id: assetId, name, mime, ...(credit && { credit }) })
    page.backgroundAssetId = assetId
  })
}

// ---------------------------------------------------------------- Templates

/** Saves the open design as a reusable template in the app's template library. */
export async function saveAsTemplate(title: string): Promise<void> {
  const doc = editorStore.getState().history?.present
  if (!doc) return
  try {
    const canvas = await renderThumbnail(doc, doc.pages[0], 360)
    await window.api.templates.save(title, encodeProject({ ...doc, title }, assets.bytesMap()), {
      width: doc.width,
      height: doc.height,
      pages: doc.pages.length,
      thumbnail: canvas.toDataURL('image/png')
    })
    showToast(`Saved "${title}" to My templates`)
  } catch (error) {
    showError(error, 'The template could not be saved.')
  }
}

/** Reads a saved template and registers its images, so its pages can be shown or copied. */
export async function loadUserTemplate(id: string): Promise<DesignDocument> {
  const project = decodeProject(await window.api.templates.read(id))
  for (const [assetId, data] of project.assets) {
    if (!assets.has(assetId)) assets.add(data, project.document.assets.find((a) => a.id === assetId)?.mime ?? 'image/png', assetId)
  }
  return project.document
}

export async function openUserTemplate(id: string, title: string): Promise<void> {
  try {
    const project = decodeProject(await window.api.templates.read(id))
    const bytes = new Map<string, { bytes: Uint8Array; mime: string }>()
    for (const [assetId, data] of project.assets) {
      bytes.set(assetId, { bytes: data, mime: project.document.assets.find((a) => a.id === assetId)?.mime ?? 'image/png' })
    }
    await openAsNewDesign({ ...project.document, title }, bytes)
  } catch (error) {
    showError(error, 'The template could not be opened.')
  }
}

/** Copies a template's pages into the open design (after the current page). */
export function addTemplatePages(template: DesignDocument, replaceCurrent: boolean): void {
  const state = editorStore.getState()
  const doc = state.history?.present
  if (!doc) return
  const sx = doc.width / template.width
  const sy = doc.height / template.height
  const scale = Math.min(sx, sy)
  const dx = (doc.width - template.width * scale) / 2
  const dy = (doc.height - template.height * scale) / 2
  const pages = template.pages.map((page) => ({
    ...structuredClone(page),
    id: nanoid(10),
    elements: page.elements.map((el) => ({ ...scaleElement(el, scale), x: el.x * scale + dx, y: el.y * scale + dy, id: nanoid() }))
  }))
  const activeId = state.activePageId
  editor.change(replaceCurrent ? 'Apply template' : 'Add template page', (d) => {
    for (const info of template.assets) if (!d.assets.some((a) => a.id === info.id)) d.assets.push(structuredClone(info))
    const index = d.pages.findIndex((p) => p.id === activeId)
    if (replaceCurrent) d.pages.splice(index, 1, ...pages)
    else d.pages.splice(index + 1, 0, ...pages)
  })
  editor.setActivePage(pages[0].id)
}

function scaleElement(el: DesignElement, scale: number): DesignElement {
  const s = { ...structuredClone(el), width: el.width * scale, height: el.height * scale }
  if (s.shadow) s.shadow = { ...s.shadow, blur: s.shadow.blur * scale, offsetX: s.shadow.offsetX * scale, offsetY: s.shadow.offsetY * scale }
  if (s.type === 'text') {
    s.fontSize *= scale
    s.letterSpacing *= scale
    if (s.strokeWidth) s.strokeWidth *= scale
  }
  if (s.type === 'shape') {
    s.strokeWidth *= scale
    s.cornerRadius *= scale
  }
  if (s.type === 'line') s.strokeWidth *= scale
  if (s.type === 'table') s.fontSize *= scale
  return s
}

function fileNameWithoutExtension(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? ''
  return name.endsWith(`.${PROJECT_EXTENSION}`) ? name.slice(0, -PROJECT_EXTENSION.length - 1) : name
}
