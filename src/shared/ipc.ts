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
  /** PNG data URL of the first page, when one was saved. */
  thumbnail?: string
}

export interface ServiceState {
  configured: boolean
  consent: boolean
}

export type RemoveBgState = ServiceState

export interface RemoveBgAccount {
  credits: number | null
  freeCalls: number | null
}

export interface RemoveBgResult {
  bytes: Uint8Array
  creditsCharged: number | null
}

// ----- Photos -----

export type PhotoProviderId = 'unsplash' | 'pexels'

export interface PhotoCredit {
  source: string
  author: string
  authorUrl?: string
  sourceUrl?: string
}

export interface PhotoResult {
  provider: PhotoProviderId
  id: string
  width: number
  height: number
  /** Small image for the results grid, loaded straight from the provider's image server. */
  thumbUrl: string
  description: string
  author: string
  authorUrl: string
  pageUrl: string
  color: string | null
  /** Opaque data the provider needs to download the photo later. */
  downloadRef: string
}

export interface PhotoSearchResult {
  results: PhotoResult[]
  page: number
  totalPages: number
  /** Requests left in the provider's current rate-limit window, when the provider reports it. */
  remaining: number | null
}

export interface DownloadedPhoto {
  bytes: Uint8Array
  mime: string
  credit: PhotoCredit
}

// ----- AI -----

export type AiProtocol = 'openai' | 'anthropic' | 'gemini'

/** Non-secret provider settings. API keys are stored separately, encrypted. */
export interface AiProviderConfig {
  id: string
  label: string
  protocol: AiProtocol
  baseUrl: string
  model: string
  /** Model for text-to-image, when the provider has one (OpenAI-style /images/generations). */
  imageModel: string
  enabled: boolean
  /** Runs on this computer (Ollama, LM Studio): no key needed and nothing leaves the PC. */
  local: boolean
}

export interface AiProviderState extends AiProviderConfig {
  hasKey: boolean
  consent: boolean
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiChatRequest {
  providerId: string
  messages: AiMessage[]
  /** Ask for a JSON object as the answer. */
  json?: boolean
  maxTokens?: number
  temperature?: number
  /** Short label for the activity log, such as "Design assistant". */
  feature: string
}

export interface AiUsage {
  inputTokens: number | null
  outputTokens: number | null
}

export interface AiChatResult {
  text: string
  model: string
  usage: AiUsage
}

export interface AiImageRequest {
  providerId: string
  prompt: string
  size: '1024x1024' | '1536x1024' | '1024x1536'
}

export interface AiLogEntry {
  time: string
  provider: string
  model: string
  feature: string
  ok: boolean
  ms: number
  inputTokens: number | null
  outputTokens: number | null
  error?: string
}

// ----- Fonts -----

/** One face (regular, bold, italic or bold italic) of a font installed on this computer or added by the user. */
export interface FontFaceInfo {
  id: string
  family: string
  /** The style name inside the font, e.g. "Bold Italic". */
  style: string
  bold: boolean
  italic: boolean
  /** File type: ttf, otf, ttc, woff or woff2. */
  format: string
  /** Original file name, for fonts the user added. */
  file?: string
}

export interface AddFontsResult {
  added: FontFaceInfo[]
  skipped: { name: string; reason: string }[]
}

// ----- Preferences, library, templates, recovery -----

export interface BrandKit {
  name: string
  colors: string[]
  headingFont: string
  bodyFont: string
  /** Library item ids of logos. */
  logos: string[]
}

export interface Preferences {
  theme: 'light' | 'dark' | 'system'
  /** Save designs that already have a file automatically, shortly after each change. */
  autosave: boolean
  showRulers: boolean
  snapping: boolean
  recentTemplates: string[]
  favoriteIcons: string[]
  recentIcons: string[]
  recentColors: string[]
  brand: BrandKit
  photoProvider: PhotoProviderId
  aiProviders: AiProviderConfig[]
  activeAiProvider: string | null
}

export interface LibraryItem {
  id: string
  name: string
  mime: string
  width: number
  height: number
  bytes: number
  addedAt: string
  /** Small preview as a data URL. */
  thumbnail: string
}

export interface TemplateItem {
  id: string
  title: string
  width: number
  height: number
  pages: number
  createdAt: string
  thumbnail?: string
}

export interface RecoveryItem {
  id: string
  title: string
  filePath: string | null
  savedAt: string
  thumbnail?: string
}

export type MenuCommand =
  | 'new'
  | 'open'
  | 'save'
  | 'save-as'
  | 'duplicate'
  | 'undo'
  | 'redo'
  | 'import-image'
  | 'close-design'
  | 'export'
  | 'settings'
  | 'command-palette'

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
  /** Opens an https link in the default browser. */
  openExternal(url: string): void

  listRecentFiles(): Promise<RecentFile[]>
  addRecentFile(path: string, title: string, thumbnail?: Uint8Array): Promise<void>
  removeRecentFile(path: string): Promise<void>

  prefs: {
    get(): Promise<Preferences>
    set(patch: Partial<Preferences>): Promise<Preferences>
  }

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

  photos: {
    state(): Promise<Record<PhotoProviderId, ServiceState>>
    setKey(provider: PhotoProviderId, key: string | null): Promise<Record<PhotoProviderId, ServiceState>>
    /** Checks a key (the given one, or the saved one) with a tiny search. */
    test(provider: PhotoProviderId, key?: string): Promise<{ remaining: number | null }>
    search(provider: PhotoProviderId, query: string, page: number): Promise<PhotoSearchResult>
    /** Downloads the photo for use in a design, and reports the download to the provider as its terms require. */
    download(photo: PhotoResult): Promise<DownloadedPhoto>
  }

  ai: {
    providers(): Promise<AiProviderState[]>
    saveProvider(config: AiProviderConfig): Promise<AiProviderState[]>
    removeProvider(id: string): Promise<AiProviderState[]>
    setKey(id: string, key: string | null): Promise<AiProviderState[]>
    setConsent(id: string, consent: boolean): Promise<AiProviderState[]>
    setActive(id: string | null): Promise<void>
    /** Lists the models the provider offers to this key. */
    listModels(id: string, key?: string): Promise<string[]>
    /** Sends a tiny request to check the key, address and model. */
    test(id: string, key?: string): Promise<AiChatResult>
    chat(request: AiChatRequest): Promise<AiChatResult>
    generateImage(request: AiImageRequest): Promise<{ bytes: Uint8Array; mime: string }>
    log(): Promise<AiLogEntry[]>
  }

  library: {
    list(): Promise<LibraryItem[]>
    add(name: string, mime: string, bytes: Uint8Array, width: number, height: number, thumbnail: string): Promise<LibraryItem>
    read(id: string): Promise<{ bytes: Uint8Array; mime: string }>
    remove(id: string): Promise<void>
  }

  templates: {
    list(): Promise<TemplateItem[]>
    save(title: string, project: Uint8Array, info: { width: number; height: number; pages: number; thumbnail?: string }): Promise<TemplateItem>
    read(id: string): Promise<Uint8Array>
    remove(id: string): Promise<void>
    /** Picks a .odesign file and adds it as a template. */
    importDialog(): Promise<{ project: Uint8Array; name: string } | null>
  }

  fonts: {
    /** Fonts installed on this computer. */
    system(): Promise<FontFaceInfo[]>
    /** Fonts the user added to the app. */
    custom(): Promise<FontFaceInfo[]>
    /** Picks font files and adds them; null if cancelled. */
    addDialog(): Promise<AddFontsResult | null>
    /** Removes every face of an added font family. */
    remove(family: string): Promise<void>
    read(id: string): Promise<Uint8Array>
  }

  recovery: {
    write(id: string, title: string, filePath: string | null, project: Uint8Array, thumbnail?: string): Promise<void>
    list(): Promise<RecoveryItem[]>
    read(id: string): Promise<Uint8Array>
    remove(id: string): Promise<void>
  }

  /** Tells the main process whether there are unsaved changes, so closing the window can warn. */
  setDocumentState(state: { dirty: boolean; title: string }): void
  /** Subscribes to menu and keyboard-accelerator commands. Returns an unsubscribe function. */
  onMenuCommand(listener: (command: MenuCommand) => void): () => void
  /** Subscribes to files opened from outside, such as double-clicking a project. */
  onOpenFile(listener: (path: string) => void): () => void
}
