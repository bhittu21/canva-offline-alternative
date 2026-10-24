import { ImageMinus, ImagePlus, Image as ImageIcon } from 'lucide-react'
import type { DesignDocument, Gradient } from '@shared/model'
import { ColorField, defaultPalette, gradientPresets, paintCss } from '@renderer/components/ColorPicker'
import { SectionHead } from '@renderer/components/ui'
import { setPageBackgroundImage } from '@renderer/io/projectIo'
import { editor, selectActivePage, useEditor } from '@renderer/store/editorStore'
import { rememberColor, showPanel, usePrefs } from '@renderer/store/uiStore'
import { PanelFrame } from './common'

const softColors = ['#f7f4ee', '#fdf2f8', '#eef6ff', '#ecfdf5', '#fff7e6', '#f3f0ff', '#f1f5f9', '#1f2329', '#0f172a', '#14532d', '#7c2d12', '#312e81']

const moreGradients: Gradient[] = [
  { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#fbc2eb' }, { offset: 1, color: '#a6c1ee' }] },
  { kind: 'linear', angle: 120, stops: [{ offset: 0, color: '#84fab0' }, { offset: 1, color: '#8fd3f4' }] },
  { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#434343' }, { offset: 1, color: '#000000' }] },
  { kind: 'radial', angle: 0, stops: [{ offset: 0, color: '#fff1d6' }, { offset: 1, color: '#ffb385' }] },
  { kind: 'linear', angle: 45, stops: [{ offset: 0, color: '#ff512f' }, { offset: 1, color: '#dd2476' }] },
  { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '#e0eafc' }, { offset: 1, color: '#cfdef3' }] },
  { kind: 'radial', angle: 0, stops: [{ offset: 0, color: '#3a3f73' }, { offset: 1, color: '#11132b' }] },
  { kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#fceabb' }, { offset: 1, color: '#f8b500' }] }
]

/** The page background: a solid colour, a gradient or a photo. */
export function BackgroundsPanel({ doc }: { doc: DesignDocument }) {
  const page = useEditor(selectActivePage) ?? doc.pages[0]
  const brand = usePrefs()?.brand.colors ?? []

  const setColor = (color: string) => {
    editor.changePage(
      'Background colour',
      (p) => {
        p.background = color
        delete p.backgroundGradient
      },
      { mergeKey: `bg-${page.id}` }
    )
    rememberColor(color)
  }
  const setGradient = (gradient: Gradient | undefined) =>
    editor.changePage(
      'Background gradient',
      (p) => {
        if (gradient) p.backgroundGradient = gradient
        else delete p.backgroundGradient
      },
      { mergeKey: `bg-${page.id}` }
    )

  const uploadImage = async () => {
    const [image] = await window.api.importImagesDialog()
    if (image) await setPageBackgroundImage(image.bytes, image.mime, image.name)
  }

  const swatches = (colors: string[]) => (
    <div className="swatches">
      {colors.map((c, i) => (
        <button
          key={`${c}-${i}`}
          className={`swatch${!page.backgroundGradient && page.background.toLowerCase() === c.toLowerCase() ? ' on' : ''}`}
          style={{ background: c }}
          title={c}
          aria-label={`Background ${c}`}
          onClick={() => setColor(c)}
        />
      ))}
    </div>
  )

  return (
    <PanelFrame title="Background">
      <section className="panel-section">
        <div className="color-row">
          <span className="field-label">This page’s background</span>
          <ColorField label="Background" value={page.background} gradient={page.backgroundGradient} onChange={setColor} onGradient={setGradient} compact />
        </div>
        <div className="tool-row" style={{ marginTop: 8 }}>
          <button
            className="btn sm"
            onClick={() =>
              editor.change('Apply background to all pages', (d) => {
                for (const p of d.pages) {
                  p.background = page.background
                  if (page.backgroundGradient) p.backgroundGradient = structuredClone(page.backgroundGradient)
                  else delete p.backgroundGradient
                  if (page.backgroundAssetId) p.backgroundAssetId = page.backgroundAssetId
                  else delete p.backgroundAssetId
                }
              })
            }
            disabled={doc.pages.length < 2}
          >
            Apply to all pages
          </button>
        </div>
      </section>

      {brand.length > 0 && (
        <section className="panel-section">
          <SectionHead title="Brand colours" />
          {swatches(brand)}
        </section>
      )}

      <section className="panel-section">
        <SectionHead title="Solid colours" />
        {swatches(softColors)}
        <div style={{ height: 8 }} />
        {swatches(defaultPalette)}
      </section>

      <section className="panel-section">
        <SectionHead title="Gradients" />
        <div className="tile-grid cols-4">
          {[...gradientPresets, ...moreGradients].map((g, i) => (
            <button key={i} className="tile" style={{ background: paintCss('#fff', g) }} aria-label="Gradient background" onClick={() => setGradient(g)} />
          ))}
        </div>
      </section>

      <section className="panel-section">
        <SectionHead title="Photo background" />
        <div className="stack" style={{ gap: 8 }}>
          <button className="btn block" onClick={() => void uploadImage()}>
            <ImagePlus size={16} /> Use an image from this PC
          </button>
          <button className="btn block" onClick={() => showPanel('photos')}>
            <ImageIcon size={16} /> Find a stock photo (right-click a photo)
          </button>
          {page.backgroundAssetId && (
            <button className="btn block danger" onClick={() => editor.changePage('Remove background image', (p) => delete p.backgroundAssetId)}>
              <ImageMinus size={16} /> Remove background image
            </button>
          )}
        </div>
      </section>
    </PanelFrame>
  )
}
