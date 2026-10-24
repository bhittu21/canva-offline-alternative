import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { editorStore, selectIsDirty, type EditorState } from '@renderer/store/editorStore'

/**
 * Designs open in tabs. The shown tab lives in the editor store as usual; a
 * tab in the background keeps its whole editor state (undo history, page,
 * selection) here until it is shown again. A tab's id also names its copy in
 * the recovery cache, which is how unsaved tabs survive closing the app.
 */
export interface DesignTab {
  id: string
  title: string
  filePath: string | null
  /** Has changes that are not in a file. */
  dirty: boolean
  /** The editor state of a background tab; null for the shown tab and for tabs not loaded yet. */
  state: EditorState | null
  /** Restored after a restart but not loaded yet: where its content will come from. */
  pending?: 'recovery' | 'file'
}

interface TabsState {
  tabs: DesignTab[]
  /** The shown tab, or null on the home screen. */
  activeId: string | null
}

export const tabsStore = createStore<TabsState>(() => ({ tabs: [], activeId: null }))

export function useTabs<T>(selector: (state: TabsState) => T): T {
  return useStore(tabsStore, selector)
}

export const activeTabId = () => tabsStore.getState().activeId
export const findTab = (id: string) => tabsStore.getState().tabs.find((t) => t.id === id)

export function updateTab(id: string, patch: Partial<DesignTab>): void {
  tabsStore.setState((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
}

/** Adds a tab after the shown one, or replaces the tab with the same id. */
export function putTab(tab: DesignTab): void {
  tabsStore.setState((s) => {
    const at = s.tabs.findIndex((t) => t.id === tab.id)
    if (at >= 0) return { tabs: s.tabs.map((t, i) => (i === at ? tab : t)) }
    const after = s.tabs.findIndex((t) => t.id === s.activeId)
    const tabs = [...s.tabs]
    tabs.splice(after < 0 ? tabs.length : after + 1, 0, tab)
    return { tabs }
  })
}

export function removeTab(id: string): void {
  tabsStore.setState((s) => ({ tabs: s.tabs.filter((t) => t.id !== id) }))
}

export function moveTab(id: string, toIndex: number): void {
  tabsStore.setState((s) => {
    const from = s.tabs.findIndex((t) => t.id === id)
    if (from < 0) return s
    const tabs = [...s.tabs]
    const [tab] = tabs.splice(from, 1)
    tabs.splice(Math.max(0, Math.min(toIndex, tabs.length)), 0, tab)
    return { tabs }
  })
}

// ---------------------------------------------------------------- Remembered tabs

const SESSION_KEY = 'design-studio:tabs'

export interface TabSession {
  active: string | null
  tabs: { id: string; title: string; filePath: string | null }[]
}

export function saveTabSession(): void {
  const { tabs, activeId } = tabsStore.getState()
  const session: TabSession = { active: activeId, tabs: tabs.map(({ id, title, filePath }) => ({ id, title, filePath })) }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Without storage the tabs simply are not reopened next time.
  }
}

export function readTabSession(): TabSession | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
    if (!raw || !Array.isArray(raw.tabs)) return null
    const tabs = raw.tabs
      .filter((t: unknown): t is TabSession['tabs'][number] => !!t && typeof (t as { id?: unknown }).id === 'string')
      .map((t: TabSession['tabs'][number]) => ({ id: t.id, title: String(t.title ?? ''), filePath: typeof t.filePath === 'string' ? t.filePath : null }))
    return { active: typeof raw.active === 'string' ? raw.active : null, tabs }
  } catch {
    return null
  }
}

/**
 * Keeps the shown tab's title, file and unsaved mark in step with the editor,
 * and remembers the open tabs whenever they change.
 */
export function startTabSync(): () => void {
  const offEditor = editorStore.subscribe((state) => {
    const id = activeTabId()
    const tab = id ? findTab(id) : undefined
    if (!tab || !state.history) return
    const title = state.history.present.title
    const dirty = selectIsDirty(state)
    if (tab.title !== title || tab.dirty !== dirty || tab.filePath !== state.filePath) updateTab(tab.id, { title, dirty, filePath: state.filePath })
  })
  let timer: ReturnType<typeof setTimeout> | null = null
  const offTabs = tabsStore.subscribe((s, prev) => {
    if (s.tabs === prev.tabs && s.activeId === prev.activeId) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(saveTabSession, 400)
  })
  return () => {
    offEditor()
    offTabs()
    if (timer) clearTimeout(timer)
  }
}
