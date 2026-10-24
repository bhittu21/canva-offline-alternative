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
import { editor, editorStore, selectActivePage, selectIsDirty, type EditorState } from '@renderer/store/editorStore'
import { activeTabId, findTab, putTab, readTabSession, removeTab, saveTabSession, startTabSync, tabsStore, updateTab, type DesignTab } from './tabs'
import { bumpLibrary } from '@renderer/store/libraryStore'
import { confirmAction, uiStore } from '@renderer/store/uiStore'

// ---------------------------------------------------------------- Save status (of the shown tab)

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'autosaved' | 'draft' | 'error'

const statusStore = createStore<{ status: SaveStatus; at: number | null }>(() => ({ status: 'idle', at: null }))

export function useSaveStatus() {
  return useStore(statusStore, (s) => s)
}

// ---------------------------------------------------------------- Tabs, open and close

type AssetBytes = Map<string, { bytes: Uint8Array; mime: string }>

function assetBytesOf(project: { document: DesignDocument; assets: Map<string, Uint8Array> }): AssetBytes {
  const map: AssetBytes = new Map()
  for (const [id, bytes] of project.assets) {
    map.set(id, { bytes, mime: project.document.assets.find((a) => a.id === id)?.mime ?? 'application/octet-stream' })
  }
  return map
}

/** Asks before throwing away the shown tab's unsaved work. Resolves to true when it is fine to continue. */
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

/**
 * Puts the shown tab in the background: its editor state is kept with the tab
 * and, when it has unsaved changes, written to the recovery cache.
 */
function stashActiveTab(): void {
  const id = activeTabId()
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = null
  if (!id || !findTab(id)) return
  const state: EditorState = { ...editorStore.getState(), editingTextId: null }
  const dirty = selectIsDirty(state)
  updateTab(id, { state, dirty, filePath: state.filePath, title: state.history?.present.title ?? findTab(id)!.title })
  // No tab is shown until the next one is, so the editor's changes meanwhile belong to none.
  tabsStore.setState({ activeId: null })
  if (dirty) void keepRecoveryCopy(id, state)
}

function showTabState(id: string | null, state: EditorState | null): void {
  assets.setOwner(id)
  tabsStore.setState({ activeId: id })
  if (state) editorStore.setState(state, true)
  else editor.close()
  uiStore.setState({ contextMenu: null })
  statusStore.setState({ status: 'idle', at: null })
  scheduleTrim()
}

/** Opens a document in a new tab (or in the tab with `id`, which then reloads). */
export async function openDocument(
  doc: DesignDocument,
  filePath: string | null,
  options: { id?: string; dirty?: boolean; assets?: AssetBytes } = {}
): Promise<string> {
  stashActiveTab()
  const id = options.id ?? nanoid(12)
  assets.setOwner(id)
  for (const [assetId, a] of options.assets ?? []) assets.add(a.bytes, a.mime, assetId, id)
  editor.open(doc, filePath)
  if (options.dirty) editorStore.setState({ forceDirty: true })
  putTab({ id, title: doc.title, filePath, dirty: selectIsDirty(editorStore.getState()), state: null })
  showTabState(id, editorStore.getState())
  uiStore.setState({ panel: doc.pages.some((p) => p.elements.length > 0) ? 'elements' : 'design', panelOpen: true })
  return id
}

/** Shows another tab, loading it first when it was restored after a restart. */
export async function switchTab(id: string): Promise<void> {
  const tab = findTab(id)
  if (!tab || id === activeTabId()) return
  if (tab.pending) {
    await loadRestoredTab(tab)
    return
  }
  stashActiveTab()
  const state = tab.state
  updateTab(id, { state: null })
  showTabState(id, state)
}

/** Steps to the next (1) or previous (-1) tab. */
export function cycleTab(step: 1 | -1): void {
  const { tabs, activeId } = tabsStore.getState()
  if (tabs.length === 0) return
  const at = tabs.findIndex((t) => t.id === activeId)
  const next = at < 0 ? (step > 0 ? 0 : tabs.length - 1) : (at + step + tabs.length) % tabs.length
  void switchTab(tabs[next].id)
}

/** Shows the home screen. Open tabs stay open. */
export function goHome(): void {
  if (!activeTabId()) return
  stashActiveTab()
  showTabState(null, null)
}

/** Closes a tab (the shown one by default), asking first when it has unsaved changes. */
export async function closeTab(id: string | null = activeTabId()): Promise<boolean> {
  if (!id) return true
  const tab = findTab(id)
  if (!tab) return true
  if (id !== activeTabId()) {
    if (!tab.dirty) {
      discardTab(id)
      return true
    }
    // Show it, so the question and a possible save are about the right design.
    await switchTab(id)
    if (activeTabId() !== id) return false
  }
  if (!(await confirmDiscardChanges())) return false
  const { tabs } = tabsStore.getState()
  const at = tabs.findIndex((t) => t.id === id)
  const neighbour = tabs[at + 1] ?? tabs[at - 1]
  tabsStore.setState({ activeId: null })
  editor.close()
  discardTab(id)
  if (neighbour) await switchTab(neighbour.id)
  else showTabState(null, null)
  return true
}

function discardTab(id: string): void {
  removeTab(id)
  finishSession(id)
  assets.release(id)
}

/** Closes every tab, asking about each one with unsaved changes. */
export async function closeAllTabs(): Promise<void> {
  for (const tab of [...tabsStore.getState().tabs].reverse()) {
    if (!(await closeTab(tab.id))) return
  }
}

/** The tab that already shows this file, if any. */
function tabWithFile(path: string) {
  const key = path.toLowerCase()
  return tabsStore.getState().tabs.find((t) => t.filePath?.toLowerCase() === key)
}

export async function newDesign(width: number, height: number, title?: string): Promise<void> {
  await openDocument(createDocument(width, height, title), null)
}

/** Opens a ready-made document (for example a template) as a new, unsaved design in its own tab. */
export async function openAsNewDesign(doc: DesignDocument, assetBytes?: AssetBytes): Promise<void> {
  await openDocument(doc, null, { dirty: true, assets: assetBytes })
}

export async function closeDesign(): Promise<void> {
  await closeTab()
}

// ---------------------------------------------------------------- Save

let saving: Promise<boolean> | null = null

export async function saveDesign(saveAs = false, options: { quiet?: boolean } = {}): Promise<boolean> {
  if (saving) await saving
  const run = (async () => {
    const state = editorStore.getState()
    const doc = state.history?.present
    const tabId = activeTabId()
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
      // Only mark saved if nothing changed while writing. The tab may have gone
      // to the background meanwhile, so the mark goes to its kept state then.
      const saved = (s: EditorState): Partial<EditorState> =>
        s.history?.present === current ? { filePath: path, savedEntry: s.history.past[s.history.past.length - 1] ?? null, forceDirty: false } : { filePath: path }
      const kept = tabId ? findTab(tabId) : undefined
      if (activeTabId() === tabId) editorStore.setState(saved(editorStore.getState()))
      else if (kept?.state) {
        const state = { ...kept.state, ...saved(kept.state) }
        updateTab(kept.id, { state, filePath: path, dirty: selectIsDirty(state) })
      }
      await window.api.addRecentFile(path, current.title, thumbnail)
      finishSession(tabId)
      if (activeTabId() === tabId) statusStore.setState({ status: options.quiet ? 'autosaved' : 'saved', at: Date.now() })
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

// ---------------------------------------------------------------- Autosave and the recovery cache

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let lastPresent: DesignDocument | null = null

/**
 * Watches the shown design. A design that already has a file is saved to it a
 * few seconds after each change (when autosave is on). Every design with
 * unsaved changes also gets a copy in the recovery cache, so a crash, a power
 * cut or closing the app never loses more than a few seconds of work, and the
 * tabs open again next time.
 */
export function startAutosave(): () => void {
  const offTabs = startTabSync()
  const offEditor = editorStore.subscribe((state) => {
    const present = state.history?.present ?? null
    if (present === lastPresent) return
    lastPresent = present
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
    if (!present || !selectIsDirty(state)) return
    statusStore.setState({ status: 'idle' })
    autosaveTimer = setTimeout(() => void autosaveNow(), 2500)
  })
  const offClose = window.api.onPrepareClose(keepAllTabs)
  return () => {
    offTabs()
    offEditor()
    offClose()
  }
}

async function autosaveNow(): Promise<void> {
  autosaveTimer = null
  const state = editorStore.getState()
  const id = activeTabId()
  if (!id || !state.history || !selectIsDirty(state)) return
  if (state.editingTextId) {
    autosaveTimer = setTimeout(() => void autosaveNow(), 2500)
    return
  }
  const prefs = uiStore.getState().prefs
  if (prefs?.autosave && state.filePath) {
    await saveDesign(false, { quiet: true })
    return
  }
  if ((await keepRecoveryCopy(id, state)) && activeTabId() === id) statusStore.setState({ status: 'draft', at: Date.now() })
}

/** What each tab last wrote to the cache, so unchanged designs are never written twice. */
const written = new Map<string, DesignDocument>()
/** Cache previews are redrawn at most every 30 seconds per tab. */
const previews = new Map<string, { at: number; doc: DesignDocument; url: string }>()
/** Writes and removals for one tab run in order, so an old copy never lands after a newer one. */
const queues = new Map<string, Promise<unknown>>()

function queue<T>(id: string, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(id) ?? Promise.resolve()).then(task, task)
  const tail = run.catch(() => undefined)
  queues.set(id, tail)
  void tail.then(() => queues.get(id) === tail && queues.delete(id))
  return run
}

/** Writes a tab's unsaved work to the recovery cache. Resolves to false if that failed. */
function keepRecoveryCopy(id: string, state: EditorState): Promise<boolean> {
  return queue(id, async () => {
    const doc = state.history?.present
    if (!doc) return true
    if (written.get(id) === doc) return true
    try {
      let preview = previews.get(id)
      if (!preview || (preview.doc !== doc && Date.now() - preview.at > 30_000)) {
        // A small JPEG: the preview only helps recognise the design in the recovery list.
        const canvas = await renderThumbnail(doc, doc.pages[0], 200)
        preview = { at: Date.now(), doc, url: canvas.toDataURL('image/jpeg', 0.8) }
        previews.set(id, preview)
      }
      await window.api.recovery.write(id, doc.title, state.filePath, encodeProject(doc, assets.bytesMapFor(id)), preview.url)
      written.set(id, doc)
      return true
    } catch {
      // The cache is a safety net; a failure here must never interrupt editing.
      return false
    }
  })
}

/** The tab's work is in a file (or was discarded): its cache copy goes. */
function finishSession(id: string | null = activeTabId()): void {
  if (!id) return
  written.delete(id)
  previews.delete(id)
  void queue(id, () => window.api.recovery.remove(id)).catch(() => undefined)
}

/** Before the window closes: every tab with unsaved work is put in the cache. */
export async function keepAllTabs(): Promise<boolean> {
  const id = activeTabId()
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = null
  const jobs: Promise<boolean>[] = []
  const state = editorStore.getState()
  if (id && state.history && selectIsDirty(state)) jobs.push(keepRecoveryCopy(id, state))
  for (const tab of tabsStore.getState().tabs) {
    if (tab.id !== id && tab.dirty && tab.state) jobs.push(keepRecoveryCopy(tab.id, tab.state))
  }
  const results = await Promise.all(jobs)
  saveTabSession()
  return results.every(Boolean)
}

let trimTimer: ReturnType<typeof setTimeout> | null = null

/** A little after switching tabs, background designs give back their decoded images. */
function scheduleTrim(): void {
  if (trimTimer) clearTimeout(trimTimer)
  trimTimer = setTimeout(() => {
    trimTimer = null
    if (queues.size > 0) scheduleTrim()
    else assets.trimDecoded(activeTabId())
  }, 5000)
}

/** Reopens the tabs that were open when the app was last closed. */
export async function restoreTabs(): Promise<void> {
  const session = readTabSession()
  let cached = new Set<string>()
  try {
    cached = new Set((await window.api.recovery.list()).map((r) => r.id))
  } catch {
    // Without the cache list, only tabs with files can come back.
  }
  const tabs: DesignTab[] = (session?.tabs ?? [])
    .filter((t) => cached.has(t.id) || t.filePath)
    .map((t) => ({ ...t, dirty: cached.has(t.id), state: null, pending: cached.has(t.id) ? 'recovery' : 'file' }))
  if (tabs.length > 0) tabsStore.setState({ tabs })
  void window.api.recovery.prune(tabs.map((t) => t.id)).catch(() => undefined)
  const active = tabs.find((t) => t.id === session?.active)
  if (active) await switchTab(active.id)
}

/** Loads a tab that was restored after a restart, the first time it is shown. */
async function loadRestoredTab(tab: DesignTab): Promise<void> {
  try {
    if (tab.pending === 'recovery') {
      const project = decodeProject(await window.api.recovery.read(tab.id))
      await openDocument(project.document, tab.filePath, { id: tab.id, dirty: true, assets: assetBytesOf(project) })
      written.set(tab.id, project.document)
    } else if (tab.filePath) {
      const file = await window.api.openProjectPath(tab.filePath)
      const project = decodeProject(file.bytes)
      await openDocument(project.document, file.path, { id: tab.id, assets: assetBytesOf(project) })
      editor.markSaved(file.path)
    }
  } catch (error) {
    showError(error, `"${tab.title || 'Untitled design'}" could not be reopened.`)
    removeTab(tab.id)
    assets.release(tab.id)
  }
}

export async function openRecovered(id: string, filePath: string | null): Promise<void> {
  if (findTab(id)) return switchTab(id)
  try {
    const project = decodeProject(await window.api.recovery.read(id))
    await openDocument(project.document, filePath, { id, dirty: true, assets: assetBytesOf(project) })
    written.set(id, project.document)
    showToast('Recovered your unsaved design. Save it to keep it.')
  } catch (error) {
    showError(error, 'The recovered design could not be opened.')
  }
}

// ---------------------------------------------------------------- Open files

export async function openDesignDialog(): Promise<void> {
  try {
    const file = await window.api.openProjectDialog()
    if (file) await loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

export async function openDesignPath(path: string): Promise<void> {
  const open = tabWithFile(path)
  if (open) return switchTab(open.id)
  try {
    const file = await window.api.openProjectPath(path)
    await loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

async function loadProjectBytes(path: string, bytes: Uint8Array): Promise<void> {
  const open = tabWithFile(path)
  if (open) {
    await switchTab(open.id)
    showToast('That design is already open in a tab.')
    return
  }
  const project = decodeProject(bytes)
  await openDocument(project.document, path, { assets: assetBytesOf(project) })
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
