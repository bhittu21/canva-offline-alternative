import { useEffect, useState } from 'react'
import { ImagePlus, Paintbrush, Plus, Trash2, Type, X } from 'lucide-react'
import type { BrandKit, LibraryItem } from '@shared/ipc'
import type { DesignDocument } from '@shared/model'
import { SectionHead } from '@renderer/components/ui'
import { createText } from '@renderer/editor/elementFactory'
import { fonts } from '@renderer/fonts/fontList'
import { addImageToLibrary } from '@renderer/io/projectIo'
import { editor, selectedElements } from '@renderer/store/editorStore'
import { useLibraryVersion } from '@renderer/store/libraryStore'
import { updatePrefs, usePrefs } from '@renderer/store/uiStore'
import { addLibraryItem } from './UploadsPanel'
import { insertElements, PanelFrame } from './common'

/** Applies a colour to whatever is selected: text colour, shape fill, line, icon or chart. */
function applyColor(color: string): boolean {
  const items = selectedElements()
  if (items.length === 0) return false
  editor.updateSelected((el) => {
    switch (el.type) {
      case 'text':
        return { fill: color }
      case 'shape':
        return { fill: color, gradient: undefined }
      case 'line':
        return { stroke: color }
      case 'icon':
        return { color }
      case 'table':
        return { headerFill: color }
      default:
        return null
    }
  }, 'Apply brand colour')
  return true
}

/**
 * The brand kit: colours, fonts and logos kept on this PC and offered in
 * colour pickers, new text and the AI design assistant.
 */
export function BrandPanel({ doc }: { doc: DesignDocument }) {
  const prefs = usePrefs()
  const libraryVersion = useLibraryVersion()
  const [logos, setLogos] = useState<LibraryItem[]>([])
  const brand = prefs?.brand

  useEffect(() => {
    if (!brand) return
    window.api.library
      .list()
      .then((items) => setLogos(items.filter((i) => brand.logos.includes(i.id))))
      .catch(() => setLogos([]))
  }, [brand, libraryVersion])

  if (!brand) return <PanelFrame title="Brand kit">{null}</PanelFrame>
  const save = (patch: Partial<BrandKit>) => void updatePrefs({ brand: { ...brand, ...patch } })

  const addLogo = async () => {
    const images = await window.api.importImagesDialog()
    const ids: string[] = []
    for (const image of images) {
      const item = await addImageToLibrary(image.bytes, image.mime, image.name.replace(/\.[^.]+$/, ''))
      if (item) ids.push(item.id)
    }
    if (ids.length) save({ logos: [...brand.logos, ...ids] })
  }

  const applyFonts = () =>
    editor.changePage('Apply brand fonts', (page) => {
      const texts = page.elements.filter((el) => el.type === 'text')
      const sizes = texts.map((t) => (t.type === 'text' ? t.fontSize : 0)).sort((a, b) => b - a)
      const headingCut = sizes[Math.floor(sizes.length / 3)] ?? 0
      for (const el of texts) if (el.type === 'text') el.fontFamily = el.fontSize >= headingCut ? brand.headingFont : brand.bodyFont
    })

  const fontSelect = (label: string, value: string, key: 'headingFont' | 'bodyFont') => (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select" value={value} style={{ fontFamily: `"${value}"` }} onChange={(e) => save({ [key]: e.target.value })}>
        {fonts.map((f) => (
          <option key={f.family} value={f.family}>
            {f.family}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <PanelFrame title="Brand kit">
      <section className="panel-section">
        <label className="field">
          <span className="field-label">Brand name</span>
          <input className="input" value={brand.name} placeholder="Your brand" onChange={(e) => save({ name: e.target.value })} />
        </label>
      </section>

      <section className="panel-section">
        <SectionHead title="Colours" />
        <div className="swatches">
          {brand.colors.map((c, i) => (
            <span key={i} style={{ position: 'relative' }}>
              <label className="swatch" style={{ background: c, display: 'block' }} title={`${c} · click to change, right-click to remove`} onContextMenu={(e) => (e.preventDefault(), save({ colors: brand.colors.filter((_, j) => j !== i) }))}>
                <input
                  type="color"
                  value={c}
                  aria-label={`Brand colour ${i + 1}`}
                  style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  onChange={(e) => save({ colors: brand.colors.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              </label>
            </span>
          ))}
          {brand.colors.length < 16 && (
            <button className="swatch add" title="Add a colour" aria-label="Add a brand colour" onClick={() => save({ colors: [...brand.colors, '#888888'] })}>
              <Plus size={14} />
            </button>
          )}
        </div>
        <div className="tool-row" style={{ marginTop: 8 }}>
          {brand.colors.slice(0, 6).map((c, i) => (
            <button key={i} className="btn sm" onClick={() => applyColor(c)} title="Apply to the selection">
              <span style={{ width: 12, height: 12, borderRadius: 3, background: c, border: '1px solid rgba(0,0,0,.15)' }} /> Apply
            </button>
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 6 }}>
          Click a swatch to change it, right-click to remove it. Brand colours appear in every colour picker.
        </p>
      </section>

      <section className="panel-section">
        <SectionHead title="Fonts" />
        <div className="stack" style={{ gap: 8 }}>
          {fontSelect('Headings', brand.headingFont, 'headingFont')}
          {fontSelect('Body text', brand.bodyFont, 'bodyFont')}
          <div className="tool-row">
            <button className="btn sm" onClick={() => insertElements([createText(doc, 'heading', { heading: brand.headingFont, body: brand.bodyFont })], 'Add heading')}>
              <Type size={14} /> Add heading
            </button>
            <button className="btn sm" onClick={() => insertElements([createText(doc, 'body', { heading: brand.headingFont, body: brand.bodyFont })], 'Add text')}>
              <Type size={14} /> Add body text
            </button>
            <button className="btn sm" onClick={applyFonts}>
              <Paintbrush size={14} /> Apply fonts to this page
            </button>
          </div>
        </div>
      </section>

      <section className="panel-section">
        <SectionHead
          title="Logos"
          action={
            <button className="link" onClick={() => void addLogo()}>
              <ImagePlus size={13} /> Add logo
            </button>
          }
        />
        {logos.length === 0 ? (
          <button className="btn block" onClick={() => void addLogo()}>
            <ImagePlus size={16} /> Upload a logo
          </button>
        ) : (
          <div className="tile-grid">
            {logos.map((item) => (
              <button key={item.id} className="tile" title={`Add ${item.name}`} onClick={() => void addLibraryItem(item)}>
                <img src={item.thumbnail} alt={item.name} />
                <span
                  className="fav"
                  role="button"
                  title="Remove from brand kit"
                  onClick={(e) => {
                    e.stopPropagation()
                    save({ logos: brand.logos.filter((id) => id !== item.id) })
                  }}
                >
                  <X size={12} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="panel-section">
        <button
          className="btn ghost sm"
          onClick={() => save({ name: '', colors: ['#1f2329', '#7c5cff', '#ff6b6b', '#ffd166', '#f7f4ee'], headingFont: 'Poppins', bodyFont: 'Inter', logos: [] })}
        >
          <Trash2 size={14} /> Reset brand kit
        </button>
      </section>
    </PanelFrame>
  )
}
