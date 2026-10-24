import type { ImportedImage } from '@shared/ipc'
import type { AssetInfo, ImageElement } from '@shared/model'
import { createDocument } from '@shared/model'
import { decodeProject, encodeProject, PROJECT_EXTENSION } from '@shared/projectFile'
import { showError, showToast } from '@renderer/components/toast'
import { createImage } from '@renderer/editor/elementFactory'
import { assets } from '@renderer/store/assets'
import { editor, editorStore, selectIsDirty } from '@renderer/store/editorStore'

/** Asks before throwing away unsaved work. Returns true when it is fine to continue. */
export function confirmDiscardChanges(): boolean {
  if (!selectIsDirty(editorStore.getState())) return true
  return window.confirm('Your design has unsaved changes. Continue without saving?')
}

export function newDesign(width: number, height: number, title?: string): void {
  if (!confirmDiscardChanges()) return
  assets.clear()
  editor.open(createDocument(width, height, title), null)
}

export function closeDesign(): void {
  if (!confirmDiscardChanges()) return
  assets.clear()
  editor.close()
}

export async function saveDesign(saveAs = false): Promise<boolean> {
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
    const current = editorStore.getState().history!.present
    await window.api.writeProject(path, encodeProject(current, assets.bytesMap()))
    editor.markSaved(path)
    await window.api.addRecentFile(path, current.title)
    showToast('Saved')
    return true
  } catch (error) {
    showError(error, 'The design could not be saved.')
    return false
  }
}

export async function openDesignDialog(): Promise<void> {
  if (!confirmDiscardChanges()) return
  try {
    const file = await window.api.openProjectDialog()
    if (file) loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

export async function openDesignPath(path: string): Promise<void> {
  if (!confirmDiscardChanges()) return
  try {
    const file = await window.api.openProjectPath(path)
    loadProjectBytes(file.path, file.bytes)
  } catch (error) {
    showError(error, 'The design could not be opened.')
  }
}

function loadProjectBytes(path: string, bytes: Uint8Array): void {
  const project = decodeProject(bytes)
  assets.clear()
  for (const [id, data] of project.assets) {
    const info = project.document.assets.find((a) => a.id === id)
    assets.add(data, info?.mime ?? 'application/octet-stream', id)
  }
  editor.open(project.document, path)
  editor.markSaved(path)
  void window.api.addRecentFile(path, project.document.title)
}

export async function importImagesDialog(): Promise<void> {
  try {
    const images = await window.api.importImagesDialog()
    await addImages(images)
  } catch (error) {
    showError(error, 'The image could not be imported.')
  }
}

/** Adds dropped or pasted image files. */
export async function importImageFiles(files: File[]): Promise<void> {
  const images: ImportedImage[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    images.push({ name: file.name || 'Image', mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) })
  }
  if (images.length === 0) {
    showToast('Only image files can be added to the design.', 'error')
    return
  }
  await addImages(images)
}

async function addImages(images: ImportedImage[]): Promise<void> {
  const doc = editorStore.getState().history?.present
  if (!doc || images.length === 0) return
  const added: { info: AssetInfo; element: ImageElement }[] = []
  for (const image of images) {
    const id = assets.add(image.bytes, image.mime)
    let size: { width: number; height: number }
    try {
      size = await imageSize(assets.url(id)!)
    } catch {
      showToast(`${image.name} could not be read as an image.`, 'error')
      continue
    }
    const name = image.name.replace(/\.[^.]+$/, '')
    added.push({ info: { id, name, mime: image.mime }, element: createImage(doc, id, name, size.width, size.height) })
  }
  if (added.length === 0) return
  editor.change('Add image', (draft) => {
    for (const { info, element } of added) {
      draft.assets.push(info)
      draft.elements.push(element)
    }
  })
  editor.select(added.map((a) => a.element.id))
}

function imageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth || 512, height: img.naturalHeight || 512 })
    img.onerror = () => reject(new Error('Unreadable image'))
    img.src = url
  })
}

function fileNameWithoutExtension(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? ''
  return name.endsWith(`.${PROJECT_EXTENSION}`) ? name.slice(0, -PROJECT_EXTENSION.length - 1) : name
}
