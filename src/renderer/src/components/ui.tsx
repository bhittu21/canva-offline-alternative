import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

/** Reusable controls. Every interactive part of the app is built from these, so they look and behave the same everywhere. */

// ---------------------------------------------------------------- Number fields

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  decimals?: number
  disabled?: boolean
}

/** A number box that lets you type freely, applies each valid value as you go, and steps with the arrow keys. */
export function NumberField({ label, value, onChange, min, max, step = 1, suffix, decimals = 0, disabled }: NumberFieldProps) {
  const format = (v: number) => String(Number(v.toFixed(decimals)))
  const [draft, setDraft] = useState(format(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
  const apply = (text: string) => {
    setDraft(text)
    const n = Number(text)
    if (text.trim() === '' || !Number.isFinite(n)) return
    const clamped = clamp(n)
    if (clamped !== value) onChange(clamped)
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          className="input"
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onFocus={(e) => {
            setFocused(true)
            e.target.select()
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => apply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)
              const next = clamp(Number((value + delta).toFixed(4)))
              onChange(next)
              setDraft(format(next))
            }
          }}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
    </label>
  )
}

export function SliderField(props: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  /** How the value is shown and typed, for example as a percentage. */
  display?: { scale: number; suffix?: string; decimals?: number }
}) {
  const { label, value, onChange, min, max, step = 1, display = { scale: 1 } } = props
  const shown = Number((value * display.scale).toFixed(display.decimals ?? 0))
  const [draft, setDraft] = useState(String(shown))
  useEffect(() => setDraft(String(shown)), [shown])
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="slider-field">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <input
          className="input"
          value={draft}
          aria-label={`${label} value`}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value) / display.scale
            if (e.target.value.trim() !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
          }}
          onBlur={() => setDraft(String(shown))}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Choice controls

export function Segmented<T extends string>(props: {
  value: T
  options: { value: T; label?: ReactNode; icon?: ReactNode; title?: string }[]
  onChange: (value: T) => void
  block?: boolean
  label?: string
}) {
  return (
    <div className={`segmented${props.block ? ' block' : ''}`} role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={props.value === o.value ? 'on' : ''}
          title={o.title}
          onClick={() => props.onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ label, checked, onChange, hint }: { label: ReactNode; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <label className="switch">
      <span className="stack" style={{ gap: 2 }}>
        <span>{label}</span>
        {hint && <span className="muted small">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function SearchInput(props: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEnter?: () => void }) {
  return (
    <div className="search">
      <Search size={16} />
      <input
        className="input"
        value={props.value}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        spellCheck={false}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.onEnter?.()
          if (e.key === 'Escape' && props.value) {
            e.stopPropagation()
            props.onChange('')
          }
        }}
      />
      {props.value && (
        <button className="icon-btn sm clear" title="Clear search" onClick={() => props.onChange('')}>
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Overlays

export function Modal(props: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: 'normal' | 'wide' | 'xwide'; headerExtra?: ReactNode }) {
  const { onClose } = props
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${props.size && props.size !== 'normal' ? ` ${props.size}` : ''}`} role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2>{props.title}</h2>
          <div className="row">
            {props.headerExtra}
            <button className="icon-btn" title="Close" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="modal-body">{props.children}</div>
        {props.footer && <footer className="modal-footer">{props.footer}</footer>}
      </div>
    </div>,
    document.body
  )
}

/** A floating box next to an anchor element. Closes on Escape or a click outside. */
export function Popover(props: { anchor: HTMLElement | null; onClose: () => void; children: ReactNode; width?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const { anchor, onClose } = props

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const a = anchor.getBoundingClientRect()
    const box = ref.current.getBoundingClientRect()
    let left = a.left
    let top = a.bottom + 6
    if (left + box.width > window.innerWidth - 8) left = Math.max(8, a.right - box.width)
    if (top + box.height > window.innerHeight - 8) top = Math.max(8, a.top - box.height - 6)
    if (top < 8) top = 8
    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchor?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [anchor, onClose])

  return createPortal(
    <div
      ref={ref}
      className={`popover ${props.className ?? ''}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: props.width }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {props.children}
    </div>,
    document.body
  )
}

export interface MenuEntry {
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onSelect: () => void
}

export function Menu(props: { x: number; y: number; items: (MenuEntry | 'sep')[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: props.x, top: props.y })
  const { onClose } = props

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setPos({
      left: Math.min(props.x, window.innerWidth - box.width - 8),
      top: Math.min(props.y, window.innerHeight - box.height - 8)
    })
  }, [props.x, props.y])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('blur', onClose)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('blur', onClose)
    }
  }, [onClose])

  return createPortal(
    <div ref={ref} className="menu" role="menu" style={{ left: pos.left, top: pos.top }} onContextMenu={(e) => e.preventDefault()}>
      {props.items.map((item, i) =>
        item === 'sep' ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            role="menuitem"
            className={`menu-item${item.danger ? ' danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onSelect()
            }}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.shortcut && <span className="kbd">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      {children && <div className="small">{children}</div>}
    </div>
  )
}

export function SectionHead({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h3>{title}</h3>
      {action}
    </div>
  )
}
