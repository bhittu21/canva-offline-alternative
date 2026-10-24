import { aspectRatios, ratioLabel, sizeForRatio } from '@shared/resize'
import { Icon } from './Icon'
import { NumberField } from './NumberField'

interface Props {
  width: number
  height: number
  locked: boolean
  max: number
  /** The design's own size, offered as "Original ratio". */
  original: { width: number; height: number }
  onChange: (size: { width: number; height: number }) => void
  onLockChange: (locked: boolean) => void
}

/** Width, height, aspect-ratio presets and a ratio lock, shared by Export and Resize. */
export function SizeFields({ width, height, locked, max, original, onChange, onLockChange }: Props) {
  const ratio = width / height
  const currentRatio = ratioLabel(width, height)
  const presetValue = Math.abs(ratio - original.width / original.height) < 0.001
    ? 'original'
    : aspectRatios.find((r) => r.id === currentRatio)?.id ?? 'custom'

  const setWidth = (w: number) => onChange({ width: w, height: locked ? Math.max(1, Math.round(w / ratio)) : height })
  const setHeight = (h: number) => onChange({ width: locked ? Math.max(1, Math.round(h * ratio)) : width, height: h })

  return (
    <div className="size-fields">
      <label className="field">
        <span className="field-label">Aspect ratio</span>
        <select
          value={presetValue}
          onChange={(e) => {
            const id = e.target.value
            if (id === 'original') onChange(sizeForRatio(width, height, { w: original.width, h: original.height }))
            else {
              const preset = aspectRatios.find((r) => r.id === id)
              if (preset) onChange(sizeForRatio(width, height, preset))
            }
            if (id !== 'custom') onLockChange(true)
            else onLockChange(false)
          }}
        >
          <option value="original">Original ({ratioLabel(original.width, original.height)})</option>
          {aspectRatios.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
          <option value="custom">Custom{presetValue === 'custom' ? ` (${currentRatio})` : ''}</option>
        </select>
      </label>
      <div className="field-row align-end">
        <NumberField label="Width" value={width} min={1} max={max} suffix="px" onChange={(v) => setWidth(Math.round(v))} />
        <button
          className={`toggle lock-toggle${locked ? ' on' : ''}`}
          title={locked ? 'Aspect ratio locked: click to unlock' : 'Aspect ratio unlocked: click to lock'}
          aria-pressed={locked}
          onClick={() => onLockChange(!locked)}
        >
          <Icon name={locked ? 'lock' : 'unlock'} size={16} />
        </button>
        <NumberField label="Height" value={height} min={1} max={max} suffix="px" onChange={(v) => setHeight(Math.round(v))} />
      </div>
    </div>
  )
}
