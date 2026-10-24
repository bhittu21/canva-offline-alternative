import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchInput } from '@renderer/components/ui'
import { commands, type Command } from '@renderer/editor/commands'
import { uiStore, useUi } from '@renderer/store/uiStore'

/** Ctrl+K: search every command in the app by name and run it. */
export function CommandPalette() {
  const open = useUi((s) => s.palette)
  if (!open) return null
  return <Palette />
}

function Palette() {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const close = () => uiStore.setState({ palette: false })

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return commands.filter((c) => {
      if (c.enabled && !c.enabled()) return false
      const hay = `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [query])

  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('.menu-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (c: Command | undefined) => {
    if (!c) return
    close()
    c.run()
  }

  let lastGroup = ''
  return createPortal(
    <>
      <div className="modal-backdrop" style={{ background: 'rgba(10,12,18,0.25)' }} onMouseDown={close} />
      <div
        className="palette"
        role="dialog"
        aria-label="Search commands"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            close()
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex((i) => Math.min(results.length - 1, i + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex((i) => Math.max(0, i - 1))
          }
        }}
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Search commands, e.g. “align”, “export”, “group”" autoFocus onEnter={() => run(results[index])} />
        <div className="palette-list" ref={listRef}>
          {results.length === 0 && <div className="empty">No matching commands</div>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return (
              <div key={c.id}>
                {header && <div className="palette-group">{header}</div>}
                <button className={`menu-item${i === index ? ' active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => run(c)}>
                  {c.icon ?? <span style={{ width: 16 }} />}
                  <span>{c.label}</span>
                  {c.shortcut && <span className="kbd">{c.shortcut}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>,
    document.body
  )
}
