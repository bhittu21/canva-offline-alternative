import { useRef, useState } from 'react'
import { AlignCenter, AlignLeft, AlignRight, Bold, CaseUpper, ChevronDown, Italic, Pencil, Underline } from 'lucide-react'
import type { FontStyle, TextElement } from '@shared/model'
import { ColorField } from '@renderer/components/ColorPicker'
import { NumberField, Popover, SearchInput, Segmented, SliderField, Switch } from '@renderer/components/ui'
import { fontInfo, fonts } from '@renderer/fonts/fontList'
import { editor } from '@renderer/store/editorStore'
import { usePrefs } from '@renderer/store/uiStore'
import { Section, ToggleButton, updater } from './common'

const sizes = [12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 200]

function styleOf(bold: boolean, italic: boolean): FontStyle {
  if (bold && italic) return 'italic bold'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

export function FontPicker({ value, onChange }: { value: string; onChange: (family: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const brand = usePrefs()?.brand
  const brandFonts = brand ? [...new Set([brand.headingFont, brand.bodyFont])] : []
  const list = fonts.filter((f) => !query || f.family.toLowerCase().includes(query.toLowerCase()) || f.category.toLowerCase().includes(query.toLowerCase()))
  const option = (family: string, note: string) => (
    <button
      key={`${note}-${family}`}
      className={`font-option${family === value ? ' on' : ''}`}
      style={{ fontFamily: `"${family}"` }}
      onClick={() => {
        onChange(family)
        setOpen(false)
      }}
    >
      {family}
      <small>{note}</small>
    </button>
  )
  return (
    <>
      <button ref={ref} className="font-select" style={{ fontFamily: `"${value}"` }} onClick={() => setOpen((o) => !o)} aria-label={`Font: ${value}`}>
        <span>{value}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} width={280}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search fonts" autoFocus />
          <div className="font-list">
            {!query && brandFonts.map((f) => option(f, 'Brand'))}
            {list.map((f) => option(f.family, f.bundled ? f.category : 'Windows'))}
          </div>
        </Popover>
      )}
    </>
  )
}

/** Typography and text effects. */
export function TextSections({ el }: { el: TextElement }) {
  const update = updater(el)
  const bold = el.fontStyle.includes('bold')
  const italic = el.fontStyle.includes('italic')
  const info = fontInfo(el.fontFamily)

  return (
    <>
      <Section title="Text">
        <div className="stack" style={{ gap: 8 }}>
          <FontPicker value={el.fontFamily} onChange={(fontFamily) => update({ fontFamily }, 'Change font')} />
          <div className="prop-grid">
            <NumberField label="Size" value={el.fontSize} min={1} max={5000} decimals={1} onChange={(fontSize) => update({ fontSize }, 'Font size')} />
            <label className="field">
              <span className="field-label">Preset</span>
              <select className="select" value="" onChange={(e) => e.target.value && update({ fontSize: Number(e.target.value) }, 'Font size')}>
                <option value="">Choose…</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="tool-row">
            <ToggleButton on={bold} title={info && !info.bold ? 'Bold (this font has no bold, so it is simulated)' : 'Bold'} onClick={() => update({ fontStyle: styleOf(!bold, italic) }, 'Bold')}>
              <Bold size={16} />
            </ToggleButton>
            <ToggleButton on={italic} title="Italic" onClick={() => update({ fontStyle: styleOf(bold, !italic) }, 'Italic')}>
              <Italic size={16} />
            </ToggleButton>
            <ToggleButton on={el.underline} title="Underline" onClick={() => update({ underline: !el.underline }, 'Underline')}>
              <Underline size={16} />
            </ToggleButton>
            <ToggleButton on={!!el.uppercase} title="Capital letters" onClick={() => update({ uppercase: !el.uppercase }, 'Capitals')}>
              <CaseUpper size={16} />
            </ToggleButton>
            <span style={{ flex: 1 }} />
            <ColorField label="Text colour" value={el.fill} onChange={(fill) => update({ fill }, 'Text colour')} compact />
          </div>
          <Segmented
            block
            label="Alignment"
            value={el.align}
            onChange={(align) => update({ align }, 'Align text')}
            options={[
              { value: 'left', icon: <AlignLeft size={15} />, title: 'Left' },
              { value: 'center', icon: <AlignCenter size={15} />, title: 'Centre' },
              { value: 'right', icon: <AlignRight size={15} />, title: 'Right' }
            ]}
          />
          <div className="prop-grid">
            <NumberField label="Line height" value={el.lineHeight} min={0.5} max={4} step={0.05} decimals={2} onChange={(lineHeight) => update({ lineHeight }, 'Line height')} />
            <NumberField label="Letter spacing" value={el.letterSpacing} min={-50} max={500} step={0.5} decimals={1} onChange={(letterSpacing) => update({ letterSpacing }, 'Letter spacing')} />
          </div>
          <button className="btn sm" onClick={() => editor.setEditingText(el.id)}>
            <Pencil size={14} /> Edit text (or double-click it)
          </button>
        </div>
      </Section>
      <Section title="Effects">
        <div className="stack" style={{ gap: 10 }}>
          <Switch label="Outline" checked={!!el.strokeWidth} onChange={(on) => update(on ? { strokeWidth: Math.max(1, Math.round(el.fontSize * 0.04)), strokeColor: el.strokeColor ?? '#1f2329' } : { strokeWidth: 0 }, 'Outline')} />
          {!!el.strokeWidth && (
            <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
              <div className="grow">
                <NumberField label="Outline width" value={el.strokeWidth} min={0} max={200} step={0.5} decimals={1} onChange={(strokeWidth) => update({ strokeWidth }, 'Outline')} />
              </div>
              <ColorField label="Outline colour" value={el.strokeColor ?? '#1f2329'} onChange={(strokeColor) => update({ strokeColor }, 'Outline colour')} compact />
            </div>
          )}
          <Switch label="Highlight box" checked={!!el.background} onChange={(on) => update({ background: on ? '#ffd166' : undefined }, 'Highlight')} />
          {el.background && <ColorField label="Highlight colour" value={el.background} onChange={(background) => update({ background }, 'Highlight colour')} />}
          <SliderField label="Curve" value={el.curve ?? 0} min={-360} max={360} step={1} onChange={(curve) => update({ curve: Math.abs(curve) < 1 ? undefined : curve }, 'Curve text')} display={{ scale: 1, suffix: '°' }} />
          {!!el.curve && (
            <button className="btn sm" onClick={() => update({ curve: undefined }, 'Curve text')}>
              Straighten text
            </button>
          )}
        </div>
      </Section>
    </>
  )
}
