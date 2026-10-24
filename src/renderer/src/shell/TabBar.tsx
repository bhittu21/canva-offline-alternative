import { useEffect, useRef, useState } from 'react'
import { FileImage, Home, Plus, X } from 'lucide-react'
import { Menu } from '@renderer/components/ui'
import { closeTab, cycleTab, goHome, switchTab } from '@renderer/io/projectIo'
import { moveTab, tabsStore, useTabs, type DesignTab } from '@renderer/io/tabs'

/**
 * The row of open designs at the very top. Each tab keeps its own undo
 * history, page and selection. Ctrl+Tab and Ctrl+Shift+Tab step through the
 * tabs, Ctrl+W closes the shown one.
 */
export function TabBar() {
  const tabs = useTabs((s) => s.tabs)
  const activeId = useTabs((s) => s.activeId)
  const [menu, setMenu] = useState<{ x: number; y: number; tab: DesignTab } | null>(null)
  const dragId = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Tab' || e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault()
        cycleTab(e.key === 'PageUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  // Keep the shown tab in view when there are more tabs than fit.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.design-tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeId, tabs.length])

  if (tabs.length === 0) return null

  const closeOthers = async (keep: DesignTab) => {
    for (const t of [...tabsStore.getState().tabs].reverse()) {
      if (t.id !== keep.id && !(await closeTab(t.id))) return
    }
    void switchTab(keep.id)
  }

  return (
    <div className="tabbar" role="tablist" aria-label="Open designs">
      <button
        className={`tab-home${activeId === null ? ' on' : ''}`}
        role="tab"
        aria-selected={activeId === null}
        data-tip="Home"
       
        aria-label="Home"
        onClick={goHome}
      >
        <Home size={16} />
      </button>
      <div className="tab-list" ref={listRef}>
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            className={`design-tab${tab.id === activeId ? ' on' : ''}`}
            role="tab"
            aria-selected={tab.id === activeId}
            tabIndex={0}
            title={tab.filePath ?? `${tab.title || 'Untitled design'} (not saved to a file yet)`}
            draggable
            onDragStart={(e) => {
              dragId.current = tab.id
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              if (dragId.current) e.preventDefault()
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId.current && dragId.current !== tab.id) moveTab(dragId.current, index)
              dragId.current = null
            }}
            onDragEnd={() => (dragId.current = null)}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault()
            }}
            onClick={() => void switchTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) void closeTab(tab.id)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                void switchTab(tab.id)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ x: e.clientX, y: e.clientY, tab })
            }}
          >
            <FileImage size={14} className="tab-icon" />
            <span className="tab-title">{tab.title || 'Untitled design'}</span>
            {tab.dirty && <span className="tab-dirty" aria-label="Unsaved changes" title="Unsaved changes (kept safe in the app until you save)" />}
            <button
              className="tab-close"
              aria-label={`Close ${tab.title || 'Untitled design'}`}
              onClick={(e) => {
                e.stopPropagation()
                void closeTab(tab.id)
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button className="tab-new" data-tip="New design" aria-label="New design" onClick={goHome}>
        <Plus size={16} />
      </button>
      {menu && (
        <Menu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Close tab', shortcut: 'Ctrl+W', onSelect: () => void closeTab(menu.tab.id) },
            { label: 'Close other tabs', disabled: tabs.length < 2, onSelect: () => void closeOthers(menu.tab) },
            'sep',
            { label: 'Next tab', shortcut: 'Ctrl+Tab', onSelect: () => cycleTab(1) },
            { label: 'Previous tab', shortcut: 'Ctrl+Shift+Tab', onSelect: () => cycleTab(-1) }
          ]}
        />
      )}
    </div>
  )
}
