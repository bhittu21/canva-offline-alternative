import { useMemo, useRef, useState } from 'react'
import { Pipette, Plus } from 'lucide-react'
import type { Gradient } from '@shared/model'
import { allElements } from '@shared/model'
import { useEditor } from '@renderer/store/editorStore'
import { rememberColor, updatePrefs, usePrefs } from '@renderer/store/uiStore'
import { Popover, Segmented } from './ui'

export const defaultPalette = [
  '#000000', '#3f4450', '#7a8090', '#b9bec9', '#e4e6eb', '#ffffff', '#ff5757', '#ff914d',
  '#ffbd59', '#ffde59', '#c9e265', '#7ed957', '#00bf63', '#0cc0df', '#38b6ff', '#5271ff',
  '#004aad', '#8c52ff', '#cb6ce6', '#ff66c4', '#f5e6d3', '#c8a27a', '#7b4b2a', '#1b3a2f'
]

export const gradientPresets: Gradient[] = [
  { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#7c5cff' }, { offset: 1, color: '#22a6c8' }] },
  { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#ff9a8b' }, { offset: 1, color: '#ff6a88' }] },
  { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#f6d365' }, { offset: 1, color: '#fda085' }] },
  { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#0f2027' }, { offset: 1, color: '#2c5364' }] },
  { kind: 'linear', angle: 45, stops: [{ offset: 0, color: '#a1ffce' }, { offset: 1, color: '#faffd1' }] },
  { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#fdfbfb' }, { offset: 1, color: '#e2d1c3' }] },
  { kind: 'radial', angle: 0, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#c3cfe2' }] },
  { kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#1a1a2e' }, { offset: 0.5, color: '#16213e' }, { offset: 1, color: '#e94560' }] }
]

function gradientCss(g: Gradient): string {
  const stops = g.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')
  return g.kind === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${g.angle + 90}deg, ${stops})`
}

export function paintCss(color: string, gradient?: Gradient): string {
  return gradient ? gradientCss(gradient) : color
}

/** Every solid colour used on the current page, most used first. */
function useDocumentColors(): string[] {
  const history = useEditor((s) => s.history)
  return useMemo(() => {
    const doc = history?.present
    if (!doc) return []
    const counts = new Map<string, number>()
    const add = (c: string | undefined) => {
      if (c && /^#[0-9a-f]{6}$/i.test(c)) counts.set(c.toLowerCase(), (counts.get(c.toLowerCase()) ?? 0) + 1)
    }
    for (const page of doc.pages) add(page.background)
    for (const el of allElements(doc)) {
      if (el.type === 'text') add(el.fill)
      if (el.type === 'shape') add(el.fill)
      if (el.type === 'line') add(el.stroke)
      if (el.type === 'icon') add(el.color)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 16)
  }, [history])
}

interface Props {
  label: string
  value: string
  onChange: (color: string) => void
  gradient?: Gradient
  /** When given, the picker also offers gradients. */
  onGradient?: (gradient: Gradient | undefined) => void
  allowTransparent?: boolean
  /** Inline layout (label left, swatch right) or just the swatch. */
  compact?: boolean
}

export function ColorField(props: Props) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const swatch = (
    <button
      ref={ref}
      type="button"
      className="swatch-btn"
      title={`${props.label}: ${props.gradient ? 'gradient' : props.value}`}
      aria-label={props.label}
      onClick={() => setOpen((o) => !o)}
    >
      <span style={{ background: paintCss(props.value, props.gradient) }} />
    </button>
  )
  return (
    <>
      {props.compact ? (
        swatch
      ) : (
        <div className="color-row">
          <span className="field-label">{props.label}</span>
          {swatch}
        </div>
      )}
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} width={272}>
          <ColorPanel {...props} />
        </Popover>
      )}
    </>
  )
}

function ColorPanel({ value, onChange, gradient, onGradient, allowTransparent }: Props) {
  const prefs = usePrefs()
  const docColors = useDocumentColors()
  const [mode, setMode] = useState<'solid' | 'gradient'>(gradient ? 'gradient' : 'solid')
  const [hex, setHex] = useState(value)

  const pick = (color: string) => {
    onGradient?.(undefined)
    onChange(color)
    setHex(color)
    rememberColor(color)
  }

  const Row = ({ title, colors, extra }: { title: string; colors: string[]; extra?: React.ReactNode }) =>
    colors.length === 0 && !extra ? null : (
      <div className="stack" style={{ gap: 6, marginTop: 10 }}>
        <span className="field-label">{title}</span>
        <div className="swatches">
          {colors.map((c, i) => (
            <button
              key={`${c}${i}`}
              className={`swatch${!gradient && c.toLowerCase() === value.toLowerCase() ? ' on' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => pick(c)}
            />
          ))}
          {extra}
        </div>
      </div>
    )

  const g = gradient ?? gradientPresets[0]

  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      {onGradient && (
        <Segmented
          block
          value={mode}
          onChange={(m) => {
            setMode(m)
            if (m === 'gradient' && !gradient) onGradient(gradientPresets[0])
            if (m === 'solid' && gradient) onGradient(undefined)
          }}
          options={[
            { value: 'solid', label: 'Solid' },
            { value: 'gradient', label: 'Gradient' }
          ]}
        />
      )}

      {mode === 'solid' || !onGradient ? (
        <>
          <div className="row" style={{ marginTop: onGradient ? 10 : 0 }}>
            <label className="swatch-btn" title="Custom colour" style={{ cursor: 'pointer' }}>
              <span style={{ background: value }} />
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
                onChange={(e) => pick(e.target.value)}
                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
              />
            </label>
            <input
              className="input sm grow"
              value={hex}
              spellCheck={false}
              aria-label="Hex colour"
              onChange={(e) => {
                setHex(e.target.value)
                const v = e.target.value.trim()
                const normal = v.startsWith('#') ? v : `#${v}`
                if (/^#[0-9a-f]{6}$/i.test(normal)) pick(normal.toLowerCase())
              }}
            />
            {'EyeDropper' in window && (
              <button
                className="icon-btn sm"
                title="Pick a colour from the screen"
                onClick={async () => {
                  try {
                    const result = await new (window as unknown as { EyeDropper: new () => { open(): Promise<{ sRGBHex: string }> } }).EyeDropper().open()
                    pick(result.sRGBHex)
                  } catch {
                    // Cancelled.
                  }
                }}
              >
                <Pipette size={15} />
              </button>
            )}
          </div>
          {allowTransparent && (
            <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => pick('transparent')}>
              No colour (transparent)
            </button>
          )}
          <Row title="Document colours" colors={docColors} />
          <Row
            title={prefs?.brand.name ? `Brand: ${prefs.brand.name}` : 'Brand colours'}
            colors={prefs?.brand.colors ?? []}
            extra={
              prefs && /^#[0-9a-f]{6}$/i.test(value) && !prefs.brand.colors.includes(value) ? (
                <button
                  className="swatch add"
                  title="Add this colour to your brand kit"
                  onClick={() => void updatePrefs({ brand: { ...prefs.brand, colors: [...prefs.brand.colors, value] } })}
                >
                  <Plus size={12} />
                </button>
              ) : undefined
            }
          />
          <Row title="Recent" colors={prefs?.recentColors ?? []} />
          <Row title="Default colours" colors={defaultPalette} />
        </>
      ) : (
        <div className="stack" style={{ marginTop: 10, gap: 10 }}>
          <div style={{ height: 36, borderRadius: 8, background: gradientCss(g), border: '1px solid var(--border)' }} />
          <div className="row">
            {g.stops.map((stop, i) => (
              <label key={i} className="swatch-btn" title={`Colour ${i + 1}`} style={{ cursor: 'pointer' }}>
                <span style={{ background: stop.color }} />
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => onGradient({ ...g, stops: g.stops.map((s, j) => (j === i ? { ...s, color: e.target.value } : s)) })}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                />
              </label>
            ))}
            <Segmented
              value={g.kind}
              onChange={(kind) => onGradient({ ...g, kind })}
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'radial', label: 'Radial' }
              ]}
            />
          </div>
          {g.kind === 'linear' && (
            <label className="field">
              <span className="field-label">Angle: {Math.round(g.angle)}°</span>
              <input type="range" min={0} max={360} value={g.angle} onChange={(e) => onGradient({ ...g, angle: Number(e.target.value) })} />
            </label>
          )}
          <span className="field-label">Presets</span>
          <div className="swatches" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {gradientPresets.map((p, i) => (
              <button key={i} className="swatch" style={{ background: gradientCss(p), aspectRatio: '2 / 1' }} onClick={() => onGradient(p)} title="Gradient preset" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

