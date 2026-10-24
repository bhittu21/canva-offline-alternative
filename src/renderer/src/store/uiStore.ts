import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Preferences } from '@shared/ipc'

export type DialogName = 'export' | 'resize' | 'settings' | 'shortcuts' | 'save-template' | null
export type SettingsTab = 'general' | 'photos' | 'ai' | 'background' | 'about'

export type PanelId =
  | 'design'
  | 'elements'
  | 'text'
  | 'photos'
  | 'icons'
  | 'uploads'
  | 'backgrounds'
  | 'frames'
  | 'charts'
  | 'brand'
  | 'ai'
  | 'projects'
  | 'layers'

export interface ContextMenuState {
  x: number
  y: number
}

export interface ConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  /** An extra button, such as "Don't save". */
  alternateLabel?: string
  resolve: (choice: 'confirm' | 'alternate' | 'cancel') => void
}

interface UiState {
  dialog: DialogName
  settingsTab: SettingsTab
  panel: PanelId
  panelOpen: boolean
  contextMenu: ContextMenuState | null
  palette: boolean
  confirm: ConfirmRequest | null
  prefs: Preferences | null
  /** Bumped when bundled fonts finish loading, so text is measured again. */
  fontEpoch: number
  /** Asks the canvas to fit the page or the selection into view. */
  fitRequest: { kind: 'page' | 'selection'; n: number } | null
  zoom: number
}

export const uiStore = createStore<UiState>(() => ({
  dialog: null,
  settingsTab: 'general',
  panel: 'design',
  panelOpen: true,
  contextMenu: null,
  palette: false,
  confirm: null,
  prefs: null,
  fontEpoch: 0,
  fitRequest: null,
  zoom: 1
}))

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector)
}

export function openDialog(dialog: DialogName, settingsTab?: SettingsTab): void {
  uiStore.setState({ dialog, ...(settingsTab && { settingsTab }) })
}

export function useDialog(): DialogName {
  return useStore(uiStore, (s) => s.dialog)
}

export function openPanel(panel: PanelId): void {
  const { panel: current, panelOpen } = uiStore.getState()
  uiStore.setState({ panel, panelOpen: current === panel ? !panelOpen : true })
}

export function showPanel(panel: PanelId): void {
  uiStore.setState({ panel, panelOpen: true })
}

export function requestFit(kind: 'page' | 'selection'): void {
  const n = (uiStore.getState().fitRequest?.n ?? 0) + 1
  uiStore.setState({ fitRequest: { kind, n } })
}

/** An in-app confirmation box (replaces the browser's plain confirm()). */
export function confirmAction(options: Omit<ConfirmRequest, 'resolve'>): Promise<'confirm' | 'alternate' | 'cancel'> {
  return new Promise((resolve) => {
    uiStore.setState({
      confirm: {
        ...options,
        resolve: (choice) => {
          uiStore.setState({ confirm: null })
          resolve(choice)
        }
      }
    })
  })
}

// ----- Preferences (saved by the main process) -----

export async function loadPrefs(): Promise<Preferences> {
  const prefs = await window.api.prefs.get()
  uiStore.setState({ prefs })
  return prefs
}

export async function updatePrefs(patch: Partial<Preferences>): Promise<void> {
  const current = uiStore.getState().prefs
  if (current) uiStore.setState({ prefs: { ...current, ...patch } })
  const saved = await window.api.prefs.set(patch)
  uiStore.setState({ prefs: saved })
}

export function usePrefs(): Preferences | null {
  return useStore(uiStore, (s) => s.prefs)
}

/** Remembers a colour the user picked, for the colour picker's "recent" row. */
export function rememberColor(color: string): void {
  const prefs = uiStore.getState().prefs
  if (!prefs || !/^#[0-9a-f]{6}$/i.test(color)) return
  const recent = [color, ...prefs.recentColors.filter((c) => c.toLowerCase() !== color.toLowerCase())].slice(0, 12)
  void updatePrefs({ recentColors: recent })
}
