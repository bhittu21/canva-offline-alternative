import { promises as fs } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron'
import { PROJECT_EXTENSION } from '@shared/constants'
import {
  addRecentFile,
  imageExtensions,
  isProjectPath,
  listRecentFiles,
  readImage,
  removeRecentFile,
  writeFileAtomic
} from './files'
import type { AiChatRequest, AiImageRequest, Preferences } from '@shared/ipc'
import { activityLog, chat, generateImage, listModels, providerStates, removeProvider, saveProvider, setProviderConsent, setProviderKey, testProvider } from './ai'
import { buildMenu } from './menu'
import { isPhotoProvider, photoImageHosts, photoProviders, providerKey } from './photos'
import { getPreferences, setPreferences } from './prefs'
import { checkAccount, removeBackground } from './removeBg'
import { getRemoveBgState, serviceState, setRemoveBgConsent, setRemoveBgKey, setSecret } from './secrets'
import { library, recovery, saveThumbnail, templates } from './storage'
import { FONT_EXTENSIONS, addFontFiles, listCustomFonts, listSystemFonts, readFontFace, removeCustomFamily } from './fonts'
import { testOverride } from './net'
import { migrateUserData } from './migrate'

const isDev = !app.isPackaged && !!process.env['ELECTRON_RENDERER_URL']
const projectFilter = { name: 'Design project', extensions: [PROJECT_EXTENSION] }

let mainWindow: BrowserWindow | null = null
let documentState = { dirty: false, title: '' }
const exportFilters: Record<string, Electron.FileFilter> = {
  png: { name: 'PNG image', extensions: ['png'] },
  jpg: { name: 'JPEG image', extensions: ['jpg', 'jpeg'] },
  webp: { name: 'WebP image', extensions: ['webp'] },
  svg: { name: 'SVG vector image', extensions: ['svg'] },
  pdf: { name: 'PDF document', extensions: ['pdf'] },
  zip: { name: 'ZIP archive (one image per page)', extensions: ['zip'] }
}
let lastExportFolder: string | null = null
let pendingOpenPath: string | null = findProjectArg(process.argv)

function findProjectArg(argv: string[]): string | null {
  return argv.slice(1).find((arg) => !arg.startsWith('-') && isProjectPath(arg)) ?? null
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#f4f5f7',
    title: 'Design Studio',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })
  mainWindow = window

  window.once('ready-to-show', () => window.show())

  window.webContents.on('did-finish-load', () => {
    if (pendingOpenPath) {
      window.webContents.send('open-file', pendingOpenPath)
      pendingOpenPath = null
    }
  })

  // The editor never navigates away or opens other windows.
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())

  // Unsaved work in tabs is first kept in the recovery cache, so it reopens next
  // time. Only when that fails (or the page does not answer) does closing warn.
  let closeAllowed = false
  let closeAsked = false
  window.on('close', (event) => {
    if (closeAllowed || !documentState.dirty) return
    event.preventDefault()
    if (closeAsked) return
    closeAsked = true
    const finish = (kept: boolean) => {
      clearTimeout(timer)
      ipcMain.removeListener('close-ready', onReady)
      closeAsked = false
      if (!kept) {
        const choice = dialog.showMessageBoxSync(window, {
          type: 'warning',
          buttons: ['Close without saving', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          title: 'Unsaved changes',
          message: `"${documentState.title || 'Untitled design'}" has unsaved changes.`,
          detail: 'If you close now, your latest changes will be lost.'
        })
        if (choice === 1) return
      }
      closeAllowed = true
      window.close()
    }
    const onReady = (e: Electron.IpcMainEvent, kept: unknown) => {
      if (e.sender === window.webContents) finish(kept === true)
    }
    const timer = setTimeout(() => finish(false), 8000)
    ipcMain.on('close-ready', onReady)
    window.webContents.send('prepare-close')
  })
  window.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    // The template checks in the test scripts need a switch; packaged builds never pass it.
    const qa = !app.isPackaged && process.env['DS_TEMPLATE_QA'] === '1'
    window.loadFile(join(__dirname, '../renderer/index.html'), qa ? { search: 'template-qa=1' } : undefined)
  }
}

/**
 * The window itself cannot reach the internet: online services are called
 * from this process. The one exception is photo previews from the photo
 * providers' image servers, which their terms require apps to load directly.
 */
function blockNetwork(): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  const testBase = testOverride('UNSPLASH_API_BASE')
  const testHost = testBase ? new URL(testBase).host : null
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url
    const local = url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('devtools:')
    const dev = isDev && devUrl && (url.startsWith(devUrl) || url.startsWith(devUrl.replace('http', 'ws')))
    let photo = false
    if (details.resourceType === 'image') {
      try {
        const parsed = new URL(url)
        photo = (parsed.protocol === 'https:' && photoImageHosts.includes(parsed.host)) || parsed.host === testHost
      } catch {
        photo = false
      }
    }
    callback({ cancel: !(local || dev || photo) })
  })
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
}

function registerIpc(): void {
  ipcMain.handle('open-project-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Open design',
      filters: [projectFilter],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    return { path, bytes: new Uint8Array(await fs.readFile(path)) }
  })

  ipcMain.handle('open-project-path', async (_event, path: unknown) => {
    if (typeof path !== 'string' || !isProjectPath(path)) throw new Error('That is not a design project file.')
    return { path, bytes: new Uint8Array(await fs.readFile(path)) }
  })

  ipcMain.handle('choose-save-path', async (_event, suggestedName: unknown) => {
    const safeName = String(suggestedName || '').replace(/[<>:"/\\|?*]+/g, ' ').trim() || 'Untitled design'
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Save design',
      defaultPath: join(app.getPath('documents'), `${safeName}.${PROJECT_EXTENSION}`),
      filters: [projectFilter]
    })
    if (result.canceled || !result.filePath) return null
    return isProjectPath(result.filePath) ? result.filePath : `${result.filePath}.${PROJECT_EXTENSION}`
  })

  ipcMain.handle('write-project', async (_event, path: unknown, bytes: unknown) => {
    if (typeof path !== 'string' || !isProjectPath(path)) throw new Error('Designs can only be saved as .' + PROJECT_EXTENSION + ' files.')
    if (!(bytes instanceof Uint8Array)) throw new Error('Nothing to save.')
    await writeFileAtomic(path, bytes)
  })

  ipcMain.handle('import-images-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Import images',
      filters: [{ name: 'Images', extensions: imageExtensions }],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled) return []
    return Promise.all(result.filePaths.map(readImage))
  })

  ipcMain.handle('save-export', async (_event, bytes: unknown, suggestedName: unknown, extension: unknown) => {
    const filter = exportFilters[String(extension)]
    if (!filter) throw new Error('Unsupported export format.')
    if (!(bytes instanceof Uint8Array)) throw new Error('Nothing to export.')
    const name = String(suggestedName || `Design.${extension}`).replace(/[<>:"/\\|?*]+/g, ' ')
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export design',
      defaultPath: join(lastExportFolder ?? app.getPath('pictures'), name),
      filters: [filter]
    })
    if (result.canceled || !result.filePath) return null
    const path = extname(result.filePath).toLowerCase() === `.${extension}` ? result.filePath : `${result.filePath}.${extension}`
    await writeFileAtomic(path, bytes)
    lastExportFolder = dirname(path)
    return path
  })

  ipcMain.on('show-in-folder', (_event, path: unknown) => {
    if (typeof path === 'string') shell.showItemInFolder(path)
  })

  ipcMain.on('open-external', (_event, url: unknown) => {
    if (typeof url === 'string' && /^https:\/\/[^\s]+$/.test(url)) void shell.openExternal(url)
  })

  // ----- Preferences -----

  ipcMain.handle('prefs-get', () => getPreferences())
  ipcMain.handle('prefs-set', (_event, patch: unknown) => {
    if (!patch || typeof patch !== 'object') throw new Error('Invalid settings.')
    // Provider settings change only through the AI handlers, which validate them.
    const { aiProviders: _ignored, ...rest } = patch as Partial<Preferences>
    return setPreferences(rest)
  })

  // ----- Photos -----

  const photoStates = async () => ({ unsplash: await serviceState('photos:unsplash'), pexels: await serviceState('photos:pexels') })
  ipcMain.handle('photos-state', () => photoStates())
  ipcMain.handle('photos-set-key', async (_event, provider: unknown, key: unknown) => {
    if (!isPhotoProvider(provider)) throw new Error('Unknown photo provider.')
    const value = typeof key === 'string' ? key.trim() : ''
    if (value && !/^[A-Za-z0-9_-]{8,200}$/.test(value)) throw new Error('That does not look like an access key.')
    await setSecret(`photos:${provider}`, value || null)
    return photoStates()
  })
  ipcMain.handle('photos-test', async (_event, provider: unknown, key: unknown) => {
    if (!isPhotoProvider(provider)) throw new Error('Unknown photo provider.')
    return photoProviders[provider].test(await providerKey(provider, typeof key === 'string' ? key : undefined))
  })
  ipcMain.handle('photos-search', async (_event, provider: unknown, query: unknown, page: unknown) => {
    if (!isPhotoProvider(provider)) throw new Error('Unknown photo provider.')
    const q = String(query ?? '').trim().slice(0, 200)
    if (!q) throw new Error('Type something to search for.')
    const p = Math.min(Math.max(1, Math.floor(Number(page) || 1)), 500)
    return photoProviders[provider].search(await providerKey(provider), q, p)
  })
  ipcMain.handle('photos-download', async (_event, photo: unknown) => {
    const p = photo as { provider?: unknown; downloadRef?: unknown; author?: unknown }
    if (!p || !isPhotoProvider(p.provider) || typeof p.downloadRef !== 'string') throw new Error('Unknown photo.')
    const safe = { ...(photo as object), author: String(p.author ?? '').slice(0, 200) } as Parameters<(typeof photoProviders)['unsplash']['download']>[1]
    return photoProviders[p.provider].download(await providerKey(p.provider), safe)
  })

  // ----- AI -----

  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  ipcMain.handle('ai-providers', () => providerStates())
  ipcMain.handle('ai-save-provider', (_event, config: unknown) => saveProvider(config))
  ipcMain.handle('ai-remove-provider', (_event, id: unknown) => removeProvider(str(id)))
  ipcMain.handle('ai-set-key', (_event, id: unknown, key: unknown) => setProviderKey(str(id), typeof key === 'string' ? key : null))
  ipcMain.handle('ai-set-consent', (_event, id: unknown, consent: unknown) => setProviderConsent(str(id), consent === true))
  ipcMain.handle('ai-set-active', async (_event, id: unknown) => {
    await setPreferences({ activeAiProvider: typeof id === 'string' ? id : null })
  })
  ipcMain.handle('ai-list-models', (_event, id: unknown, key: unknown) => listModels(str(id), typeof key === 'string' ? key : undefined))
  ipcMain.handle('ai-test', (_event, id: unknown, key: unknown) => testProvider(str(id), typeof key === 'string' ? key : undefined))
  ipcMain.handle('ai-chat', (_event, request: unknown) => chat(request as AiChatRequest))
  ipcMain.handle('ai-generate-image', (_event, request: unknown) => generateImage(request as AiImageRequest))
  ipcMain.handle('ai-log', () => activityLog())

  // ----- Library, templates, recovery -----

  ipcMain.handle('library-list', () => library.list())
  ipcMain.handle('library-add', (_event, name: unknown, mime: unknown, bytes: unknown, width: unknown, height: unknown, thumbnail: unknown) =>
    library.add(str(name), str(mime), bytes as Uint8Array, Number(width), Number(height), str(thumbnail))
  )
  ipcMain.handle('library-read', (_event, id: unknown) => library.read(id))
  ipcMain.handle('library-remove', (_event, id: unknown) => library.remove(id))

  ipcMain.handle('templates-list', () => templates.list())
  ipcMain.handle('templates-save', (_event, title: unknown, project: unknown, info: unknown) =>
    templates.save(str(title), project as Uint8Array, (info ?? {}) as { width: number; height: number; pages: number; thumbnail?: string })
  )
  ipcMain.handle('templates-read', (_event, id: unknown) => templates.read(id))
  ipcMain.handle('templates-remove', (_event, id: unknown) => templates.remove(id))
  ipcMain.handle('templates-import-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { title: 'Import template', filters: [projectFilter], properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) return null
    const path = result.filePaths[0]
    return { project: new Uint8Array(await fs.readFile(path)), name: basename(path, extname(path)) }
  })

  // ----- Fonts -----

  ipcMain.handle('fonts-system', () => listSystemFonts())
  ipcMain.handle('fonts-custom', () => listCustomFonts())
  ipcMain.handle('fonts-add-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Add fonts',
      buttonLabel: 'Add fonts',
      filters: [{ name: 'Fonts', extensions: FONT_EXTENSIONS }],
      properties: ['openFile', 'multiSelections']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return addFontFiles(result.filePaths)
  })
  ipcMain.handle('fonts-remove', (_event, family: unknown) => removeCustomFamily(family))
  ipcMain.handle('fonts-read', (_event, id: unknown) => readFontFace(id))

  ipcMain.handle('recovery-write', (_event, id: unknown, title: unknown, filePath: unknown, project: unknown, thumbnail: unknown) =>
    recovery.write(id, str(title), typeof filePath === 'string' ? filePath : null, project as Uint8Array, typeof thumbnail === 'string' ? thumbnail : undefined)
  )
  ipcMain.handle('recovery-list', () => recovery.list())
  ipcMain.handle('recovery-read', (_event, id: unknown) => recovery.read(id))
  ipcMain.handle('recovery-remove', (_event, id: unknown) => recovery.remove(id))
  ipcMain.handle('recovery-prune', (_event, keep: unknown) => recovery.prune(keep))

  // ----- Optional online service: remove.bg -----

  ipcMain.handle('remove-bg-state', () => getRemoveBgState())

  ipcMain.handle('remove-bg-set-key', async (_event, key: unknown) => {
    const value = typeof key === 'string' ? key.trim() : ''
    if (value && !/^[A-Za-z0-9_-]{8,128}$/.test(value)) throw new Error('That does not look like a remove.bg API key.')
    await setRemoveBgKey(value || null)
    return getRemoveBgState()
  })

  ipcMain.handle('remove-bg-set-consent', async (_event, consent: unknown) => {
    await setRemoveBgConsent(consent === true)
    return getRemoveBgState()
  })

  ipcMain.handle('remove-bg-check', async (_event, key: unknown) =>
    checkAccount(typeof key === 'string' && key.trim() ? key.trim() : undefined)
  )

  ipcMain.handle('remove-bg-run', async (_event, bytes: unknown, mime: unknown) => {
    if (!(bytes instanceof Uint8Array) || typeof mime !== 'string') throw new Error('No image to process.')
    if (!(await getRemoveBgState()).consent) throw new Error('Please agree to send the image to remove.bg first.')
    return removeBackground(bytes, mime)
  })

  ipcMain.handle('list-recent-files', () => listRecentFiles())
  ipcMain.handle('add-recent-file', async (_event, path: unknown, title: unknown, thumbnail: unknown) => {
    if (typeof path !== 'string' || !isProjectPath(path)) return
    if (thumbnail instanceof Uint8Array) await saveThumbnail(path, thumbnail).catch(() => undefined)
    return addRecentFile(path, String(title ?? basename(path)))
  })
  ipcMain.handle('remove-recent-file', (_event, path: unknown) => {
    if (typeof path === 'string') return removeRecentFile(path)
  })

  ipcMain.on('document-state', (_event, state: { dirty?: unknown; title?: unknown }) => {
    documentState = { dirty: state?.dirty === true, title: String(state?.title ?? '') }
    mainWindow?.setTitle(documentState.title ? `${documentState.dirty ? '• ' : ''}${documentState.title} - Design Studio` : 'Design Studio')
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  migrateUserData()
  app.on('second-instance', (_event, argv) => {
    const path = findProjectArg(argv)
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    if (path) mainWindow.webContents.send('open-file', path)
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.design-studio.app')
    blockNetwork()
    registerIpc()
    Menu.setApplicationMenu(buildMenu(() => mainWindow, isDev))
    createWindow()
  })

  app.on('window-all-closed', () => app.quit())
}

// Links in the app (for example in an About dialog later) open in the system browser.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
})
