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
import { buildMenu } from './menu'

const isDev = !app.isPackaged && !!process.env['ELECTRON_RENDERER_URL']
const projectFilter = { name: 'Design project', extensions: [PROJECT_EXTENSION] }

let mainWindow: BrowserWindow | null = null
let documentState = { dirty: false, title: '' }
const exportFilters: Record<string, Electron.FileFilter> = {
  png: { name: 'PNG image', extensions: ['png'] },
  jpg: { name: 'JPEG image', extensions: ['jpg', 'jpeg'] },
  webp: { name: 'WebP image', extensions: ['webp'] },
  svg: { name: 'SVG vector image', extensions: ['svg'] },
  pdf: { name: 'PDF document', extensions: ['pdf'] }
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
    backgroundColor: '#f2f3f5',
    title: 'Offline Design Editor',
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

  window.on('close', (event) => {
    if (!documentState.dirty) return
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      buttons: ['Close without saving', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Unsaved changes',
      message: `"${documentState.title || 'Untitled design'}" has unsaved changes.`,
      detail: 'If you close now, your latest changes will be lost.'
    })
    if (choice === 1) event.preventDefault()
  })
  window.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Blocks every network request except the local dev server, so the app is offline by design. */
function blockNetwork(): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url
    const local = url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('devtools:')
    const dev = isDev && devUrl && (url.startsWith(devUrl) || url.startsWith(devUrl.replace('http', 'ws')))
    callback({ cancel: !(local || dev) })
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

  ipcMain.handle('list-recent-files', () => listRecentFiles())
  ipcMain.handle('add-recent-file', (_event, path: unknown, title: unknown) => {
    if (typeof path === 'string' && isProjectPath(path)) return addRecentFile(path, String(title ?? basename(path)))
  })
  ipcMain.handle('remove-recent-file', (_event, path: unknown) => {
    if (typeof path === 'string') return removeRecentFile(path)
  })

  ipcMain.on('document-state', (_event, state: { dirty?: unknown; title?: unknown }) => {
    documentState = { dirty: state?.dirty === true, title: String(state?.title ?? '') }
    mainWindow?.setTitle(`${documentState.dirty ? '• ' : ''}${documentState.title || 'Untitled design'} - Offline Design Editor`)
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const path = findProjectArg(argv)
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    if (path) mainWindow.webContents.send('open-file', path)
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('com.offline-design-editor.app')
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
