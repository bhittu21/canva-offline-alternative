import { Replace } from 'lucide-react'
import type { DesignElement, IconElement, LineElement, ShapeElement } from '@shared/model'
import { dashStyles, lineCaps } from '@shared/model'
import { ColorField } from '@renderer/components/ColorPicker'
import { NumberField, Segmented, SliderField, Switch } from '@renderer/components/ui'
import { showPanel } from '@renderer/store/uiStore'
import { Section, updater } from './common'

const dashLabels: Record<(typeof dashStyles)[number], string> = { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted' }
const capLabels: Record<(typeof lineCaps)[number], string> = { none: 'None', arrow: 'Arrow', triangle: 'Triangle', circle: 'Circle', square: 'Square', bar: 'Bar' }

export function ShapeSection({ el }: { el: ShapeElement }) {
  const update = updater(el)
  return (
    <Section title="Shape">
      <div className="stack" style={{ gap: 10 }}>
        <ColorField
          label="Fill"
          value={el.fill}
          gradient={el.gradient}
          allowTransparent
          onChange={(fill) => update({ fill, gradient: undefined }, 'Fill colour')}
          onGradient={(gradient) => update({ gradient }, 'Fill gradient')}
        />
        <ColorField label="Border colour" value={el.stroke} onChange={(stroke) => update({ stroke, strokeWidth: el.strokeWidth || 4 }, 'Border colour')} />
        <div className="prop-grid">
          <NumberField label="Border width" value={el.strokeWidth} min={0} max={1000} onChange={(strokeWidth) => update({ strokeWidth }, 'Border width')} suffix="px" />
          {(el.shape === 'rect' || el.shape === 'polygon' || el.shape === 'triangle' || el.shape === 'star' || el.shape === 'diamond') && (
            <NumberField label="Corner rounding" value={el.cornerRadius} min={0} max={2000} onChange={(cornerRadius) => update({ cornerRadius }, 'Corners')} suffix="px" />
          )}
        </div>
        {el.strokeWidth > 0 && (
          <Segmented block label="Border style" value={el.dash ?? 'solid'} onChange={(dash) => update({ dash }, 'Border style')} options={dashStyles.map((d) => ({ value: d, label: dashLabels[d] }))} />
        )}
        {el.shape === 'polygon' && <SliderField label="Sides" value={el.sides ?? 6} min={3} max={12} onChange={(sides) => update({ sides: Math.round(sides) }, 'Sides')} />}
        {el.shape === 'star' && (
          <>
            <SliderField label="Points" value={el.sides ?? 5} min={3} max={24} onChange={(sides) => update({ sides: Math.round(sides) }, 'Points')} />
            <SliderField label="Inner size" value={el.innerRatio ?? 0.45} min={0.1} max={0.9} step={0.01} onChange={(innerRatio) => update({ innerRatio }, 'Star shape')} display={{ scale: 100, suffix: '%' }} />
          </>
        )}
      </div>
    </Section>
  )
}

export function LineSection({ el }: { el: LineElement }) {
  const update = updater(el)
  const capSelect = (label: string, key: 'startCap' | 'endCap') => (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select" value={el[key]} onChange={(e) => update({ [key]: e.target.value } as Partial<LineElement>, 'Line ends')}>
        {lineCaps.map((c) => (
          <option key={c} value={c}>
            {capLabels[c]}
          </option>
        ))}
      </select>
    </label>
  )
  return (
    <Section title="Line">
      <div className="stack" style={{ gap: 10 }}>
        <ColorField label="Colour" value={el.stroke} onChange={(stroke) => update({ stroke }, 'Line colour')} />
        <NumberField
          label="Thickness"
          value={el.strokeWidth}
          min={0.5}
          max={500}
          decimals={1}
          onChange={(strokeWidth) => update({ strokeWidth, height: Math.max(strokeWidth * 4, 12), y: el.y + el.height / 2 - Math.max(strokeWidth * 4, 12) / 2 }, 'Line thickness')}
          suffix="px"
        />
        <Segmented block label="Style" value={el.dash} onChange={(dash) => update({ dash }, 'Line style')} options={dashStyles.map((d) => ({ value: d, label: dashLabels[d] }))} />
        <div className="prop-grid">
          {capSelect('Start', 'startCap')}
          {capSelect('End', 'endCap')}
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Drag the round handle above the line to change its angle.
        </p>
      </div>
    </Section>
  )
}

export function IconSection({ el }: { el: IconElement }) {
  const update = updater(el)
  return (
    <Section title="Icon">
      <div className="stack" style={{ gap: 10 }}>
        <ColorField label="Colour" value={el.color} onChange={(color) => update({ color }, 'Icon colour')} />
        <SliderField label="Line weight" value={el.strokeWidth} min={0.5} max={4} step={0.25} onChange={(strokeWidth) => update({ strokeWidth }, 'Icon weight')} display={{ scale: 1, decimals: 2 }} />
        <button className="btn sm" onClick={() => showPanel('icons')}>
          <Replace size={14} /> Replace icon
        </button>
      </div>
    </Section>
  )
}

export function ShadowSection({ el }: { el: DesignElement }) {
  const update = updater(el)
  const shadow = el.shadow
  const size = Math.max(4, Math.round(Math.min(el.width, el.height) * 0.06))
  return (
    <Section title="Shadow">
      <div className="stack" style={{ gap: 10 }}>
        <Switch
          label="Drop shadow"
          checked={!!shadow}
          onChange={(on) => update({ shadow: on ? { color: '#000000', blur: size * 2, offsetX: 0, offsetY: size, opacity: 0.25 } : undefined }, 'Shadow')}
        />
        {shadow && (
          <>
            <ColorField label="Shadow colour" value={shadow.color} onChange={(color) => update({ shadow: { ...shadow, color } }, 'Shadow')} />
            <SliderField label="Blur" value={shadow.blur} min={0} max={200} onChange={(blur) => update({ shadow: { ...shadow, blur } }, 'Shadow')} />
            <SliderField label="Strength" value={shadow.opacity} min={0} max={1} step={0.01} onChange={(opacity) => update({ shadow: { ...shadow, opacity } }, 'Shadow')} display={{ scale: 100, suffix: '%' }} />
            <div className="prop-grid">
              <NumberField label="Offset X" value={shadow.offsetX} min={-500} max={500} onChange={(offsetX) => update({ shadow: { ...shadow, offsetX } }, 'Shadow')} />
              <NumberField label="Offset Y" value={shadow.offsetY} min={-500} max={500} onChange={(offsetY) => update({ shadow: { ...shadow, offsetY } }, 'Shadow')} />
            </div>
          </>
        )}
      </div>
    </Section>
  )
}
