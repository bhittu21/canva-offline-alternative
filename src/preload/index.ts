import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { EditorApi, MenuCommand } from '@shared/ipc'

const invoke = ipcRenderer.invoke.bind(ipcRenderer)

const api: EditorApi = {
  openProjectDialog: () => invoke('open-project-dialog'),
  openProjectPath: (path) => invoke('open-project-path', path),
  chooseSavePath: (suggestedName) => invoke('choose-save-path', suggestedName),
  writeProject: (path, bytes) => invoke('write-project', path, bytes),
  importImagesDialog: () => invoke('import-images-dialog'),
  saveExport: (bytes, suggestedName, extension) => invoke('save-export', bytes, suggestedName, extension),
  showInFolder: (path) => ipcRenderer.send('show-in-folder', path),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  listRecentFiles: () => invoke('list-recent-files'),
  addRecentFile: (path, title, thumbnail) => invoke('add-recent-file', path, title, thumbnail),
  removeRecentFile: (path) => invoke('remove-recent-file', path),
  prefs: {
    get: () => invoke('prefs-get'),
    set: (patch) => invoke('prefs-set', patch)
  },
  removeBg: {
    state: () => invoke('remove-bg-state'),
    setKey: (key) => invoke('remove-bg-set-key', key),
    setConsent: (consent) => invoke('remove-bg-set-consent', consent),
    check: (key) => invoke('remove-bg-check', key),
    run: (bytes, mime) => invoke('remove-bg-run', bytes, mime)
  },
  photos: {
    state: () => invoke('photos-state'),
    setKey: (provider, key) => invoke('photos-set-key', provider, key),
    test: (provider, key) => invoke('photos-test', provider, key),
    search: (provider, query, page) => invoke('photos-search', provider, query, page),
    download: (photo) => invoke('photos-download', photo)
  },
  ai: {
    providers: () => invoke('ai-providers'),
    saveProvider: (config) => invoke('ai-save-provider', config),
    removeProvider: (id) => invoke('ai-remove-provider', id),
    setKey: (id, key) => invoke('ai-set-key', id, key),
    setConsent: (id, consent) => invoke('ai-set-consent', id, consent),
    setActive: (id) => invoke('ai-set-active', id),
    listModels: (id, key) => invoke('ai-list-models', id, key),
    test: (id, key) => invoke('ai-test', id, key),
    chat: (request) => invoke('ai-chat', request),
    generateImage: (request) => invoke('ai-generate-image', request),
    log: () => invoke('ai-log')
  },
  library: {
    list: () => invoke('library-list'),
    add: (name, mime, bytes, width, height, thumbnail) => invoke('library-add', name, mime, bytes, width, height, thumbnail),
    read: (id) => invoke('library-read', id),
    remove: (id) => invoke('library-remove', id)
  },
  templates: {
    list: () => invoke('templates-list'),
    save: (title, project, info) => invoke('templates-save', title, project, info),
    read: (id) => invoke('templates-read', id),
    remove: (id) => invoke('templates-remove', id),
    importDialog: () => invoke('templates-import-dialog')
  },
  fonts: {
    system: () => invoke('fonts-system'),
    custom: () => invoke('fonts-custom'),
    addDialog: () => invoke('fonts-add-dialog'),
    remove: (family) => invoke('fonts-remove', family),
    read: (id) => invoke('fonts-read', id)
  },
  recovery: {
    write: (id, title, filePath, project, thumbnail) => invoke('recovery-write', id, title, filePath, project, thumbnail),
    list: () => invoke('recovery-list'),
    read: (id) => invoke('recovery-read', id),
    remove: (id) => invoke('recovery-remove', id),
    prune: (keep) => invoke('recovery-prune', keep)
  },
  onPrepareClose: (listener) => {
    const handler = () => {
      listener().then(
        (ok) => ipcRenderer.send('close-ready', ok === true),
        () => ipcRenderer.send('close-ready', false)
      )
    }
    ipcRenderer.on('prepare-close', handler)
    return () => ipcRenderer.removeListener('prepare-close', handler)
  },
  setDocumentState: (state) => ipcRenderer.send('document-state', state),
  onMenuCommand: (listener) => {
    const handler = (_event: IpcRendererEvent, command: MenuCommand) => listener(command)
    ipcRenderer.on('menu-command', handler)
    return () => ipcRenderer.removeListener('menu-command', handler)
  },
  onOpenFile: (listener) => {
    const handler = (_event: IpcRendererEvent, path: string) => listener(path)
    ipcRenderer.on('open-file', handler)
    return () => ipcRenderer.removeListener('open-file', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
