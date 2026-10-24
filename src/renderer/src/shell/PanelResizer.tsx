import { useRef } from 'react'

/**
 * A drag handle on the inner edge of a side panel. Dragging changes the
 * panel's width (a CSS variable on the page); double-click restores the
 * default. The chosen width is remembered on this computer.
 */
interface Props {
  /** CSS variable holding the width, e.g. --panel-w. */
  cssVar: '--panel-w' | '--inspector-w'
  /** Which edge of the panel the handle sits on. */
  edge: 'left' | 'right'
  min: number
  max: number
  label: string
}

const storageKey = (cssVar: string) => `design-studio:${cssVar}`

function setWidth(cssVar: string, px: number | null): void {
  if (px === null) document.documentElement.style.removeProperty(cssVar)
  else document.documentElement.style.setProperty(cssVar, `${Math.round(px)}px`)
}

/** Applies the widths saved earlier; called once at start-up. */
export function restorePanelWidths(): void {
  for (const cssVar of ['--panel-w', '--inspector-w']) {
    try {
      const saved = Number(localStorage.getItem(storageKey(cssVar)))
      if (saved > 0) setWidth(cssVar, saved)
    } catch {
      // Storage unavailable: keep the default widths.
    }
  }
}

function save(cssVar: string, px: number | null): void {
  try {
    if (px === null) localStorage.removeItem(storageKey(cssVar))
    else localStorage.setItem(storageKey(cssVar), String(Math.round(px)))
  } catch {
    // Not remembered, but the width still applies for this session.
  }
}

export function PanelResizer({ cssVar, edge, min, max, label }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const current = () => ref.current?.parentElement?.getBoundingClientRect().width ?? min
  // Never so wide that the canvas is squeezed out on a small window.
  const clamp = (px: number) => Math.min(max, window.innerWidth * 0.38, Math.max(min, px))

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startX = e.clientX
    const startW = current()
    let width = startW
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    document.body.classList.add('resizing-panel')
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      width = clamp(edge === 'right' ? startW + dx : startW - dx)
      setWidth(cssVar, width)
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      handle.removeEventListener('pointercancel', up)
      document.body.classList.remove('resizing-panel')
      save(cssVar, width)
      window.dispatchEvent(new Event('resize'))
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
    handle.addEventListener('pointercancel', up)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10
    const grow = e.key === (edge === 'right' ? 'ArrowRight' : 'ArrowLeft')
    const shrink = e.key === (edge === 'right' ? 'ArrowLeft' : 'ArrowRight')
    if (!grow && !shrink) return
    e.preventDefault()
    const width = clamp(current() + (grow ? step : -step))
    setWidth(cssVar, width)
    save(cssVar, width)
  }

  return (
    <div
      ref={ref}
      className={`panel-resizer ${edge}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => {
        setWidth(cssVar, null)
        save(cssVar, null)
        window.dispatchEvent(new Event('resize'))
      }}
    />
  )
}
