import { Link2, Link2Off } from 'lucide-react'
import { aspectRatios, ratioLabel, sizeForRatio } from '@shared/resize'
import { NumberField } from './ui'

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
  const presetValue = Math.abs(ratio - original.width / original.height) < 0.001 ? 'original' : (aspectRatios.find((r) => r.id === currentRatio)?.id ?? 'custom')

  const setWidth = (w: number) => onChange({ width: w, height: locked ? Math.max(1, Math.round(w / ratio)) : height })
  const setHeight = (h: number) => onChange({ width: locked ? Math.max(1, Math.round(h * ratio)) : width, height: h })

  return (
    <div className="stack" style={{ gap: 10 }}>
      <label className="field">
        <span className="field-label">Aspect ratio</span>
        <select
          className="select"
          value={presetValue}
          onChange={(e) => {
            const id = e.target.value
            if (id === 'original') onChange(sizeForRatio(width, height, { w: original.width, h: original.height }))
            else {
              const preset = aspectRatios.find((r) => r.id === id)
              if (preset) onChange(sizeForRatio(width, height, preset))
            }
            onLockChange(id !== 'custom')
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
      <div className="size-fields">
        <NumberField label="Width" value={width} min={1} max={max} suffix="px" onChange={(v) => setWidth(Math.round(v))} />
        <button
          className={`icon-btn${locked ? ' active' : ''}`}
          style={{ marginBottom: 2 }}
          title={locked ? 'Aspect ratio locked: click to unlock' : 'Aspect ratio unlocked: click to lock'}
          aria-label={locked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          aria-pressed={locked}
          onClick={() => onLockChange(!locked)}
        >
          {locked ? <Link2 size={16} /> : <Link2Off size={16} />}
        </button>
        <NumberField label="Height" value={height} min={1} max={max} suffix="px" onChange={(v) => setHeight(Math.round(v))} />
      </div>
    </div>
  )
}
