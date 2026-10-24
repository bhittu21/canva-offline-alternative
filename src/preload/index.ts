import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { EditorApi, MenuCommand } from '@shared/ipc'

const api: EditorApi = {
  openProjectDialog: () => ipcRenderer.invoke('open-project-dialog'),
  openProjectPath: (path) => ipcRenderer.invoke('open-project-path', path),
  chooseSavePath: (suggestedName) => ipcRenderer.invoke('choose-save-path', suggestedName),
  writeProject: (path, bytes) => ipcRenderer.invoke('write-project', path, bytes),
  importImagesDialog: () => ipcRenderer.invoke('import-images-dialog'),
  saveExport: (bytes, suggestedName, extension) => ipcRenderer.invoke('save-export', bytes, suggestedName, extension),
  showInFolder: (path) => ipcRenderer.send('show-in-folder', path),
  listRecentFiles: () => ipcRenderer.invoke('list-recent-files'),
  addRecentFile: (path, title) => ipcRenderer.invoke('add-recent-file', path, title),
  removeRecentFile: (path) => ipcRenderer.invoke('remove-recent-file', path),
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
