/** The API the preload script exposes to the UI as `window.api`. */

export interface OpenedFile {
  path: string
  bytes: Uint8Array
}

export interface ImportedImage {
  name: string
  mime: string
  bytes: Uint8Array
}

export interface RecentFile {
  path: string
  title: string
  openedAt: string
}

export interface RemoveBgState {
  configured: boolean
  consent: boolean
}

export interface RemoveBgAccount {
  credits: number | null
  freeCalls: number | null
}

export interface RemoveBgResult {
  bytes: Uint8Array
  creditsCharged: number | null
}

export type MenuCommand =
  | 'new'
  | 'open'
  | 'save'
  | 'save-as'
  | 'undo'
  | 'redo'
  | 'import-image'
  | 'close-design'
  | 'export'
  | 'settings'

export interface EditorApi {
  /** Shows the Open dialog. Resolves to null when cancelled. */
  openProjectDialog(): Promise<OpenedFile | null>
  /** Reads a project from a known path, such as a recent file. */
  openProjectPath(path: string): Promise<OpenedFile>
  /** Shows the Save As dialog. Resolves to the chosen path, or null when cancelled. */
  chooseSavePath(suggestedName: string): Promise<string | null>
  /** Writes project bytes to a path safely (temporary file, then rename). */
  writeProject(path: string, bytes: Uint8Array): Promise<void>
  /** Shows the image picker and returns the chosen files' bytes. */
  importImagesDialog(): Promise<ImportedImage[]>
  /** Shows a Save dialog for an export and writes the file. Resolves to the saved path, or null when cancelled. */
  saveExport(bytes: Uint8Array, suggestedName: string, extension: string): Promise<string | null>
  /** Opens the folder containing a file in Windows Explorer, with the file selected. */
  showInFolder(path: string): void
  /** Optional online service. The API key stays in the main process; the UI only sees whether one is saved. */
  removeBg: {
    state(): Promise<RemoveBgState>
    /** Saves (encrypted) or, with null, deletes the key. */
    setKey(key: string | null): Promise<RemoveBgState>
    setConsent(consent: boolean): Promise<RemoveBgState>
    /** Checks a key (the given one, or the saved one) without using credits. */
    check(key?: string): Promise<RemoveBgAccount>
    run(bytes: Uint8Array, mime: string): Promise<RemoveBgResult>
  }
  listRecentFiles(): Promise<RecentFile[]>
  addRecentFile(path: string, title: string): Promise<void>
  removeRecentFile(path: string): Promise<void>
  /** Tells the main process whether there are unsaved changes, so closing the window can warn. */
  setDocumentState(state: { dirty: boolean; title: string }): void
  /** Subscribes to menu and keyboard-accelerator commands. Returns an unsubscribe function. */
  onMenuCommand(listener: (command: MenuCommand) => void): () => void
  /** Subscribes to files opened from outside, such as double-clicking a project. */
  onOpenFile(listener: (path: string) => void): () => void
}
