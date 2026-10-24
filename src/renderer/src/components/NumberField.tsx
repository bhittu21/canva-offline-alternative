import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  decimals?: number
}

/** A number box that lets you type freely and applies each valid value as you go. */
export function NumberField({ label, value, onChange, min, max, step = 1, suffix, decimals = 0 }: Props) {
  const format = (v: number) => String(Number(v.toFixed(decimals)))
  const [draft, setDraft] = useState(format(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDraft(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])

  const apply = (text: string) => {
    setDraft(text)
    const n = Number(text)
    if (text.trim() === '' || !Number.isFinite(n)) return
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n))
    if (clamped !== value) onChange(clamped)
  }

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={draft}
          min={min}
          max={max}
          step={step}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => apply(e.target.value)}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </span>
    </label>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field color-field">
      <span className="field-label">{label}</span>
      <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function toHex(color: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000'
}
