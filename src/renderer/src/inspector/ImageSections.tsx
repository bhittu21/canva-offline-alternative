import { ExternalLink, FlipHorizontal2, FlipVertical2, ImageMinus, ImagePlus, Images, RotateCcw, Wallpaper } from 'lucide-react'
import type { DesignDocument, ImageElement } from '@shared/model'
import { ColorField } from '@renderer/components/ColorPicker'
import { NumberField, SliderField } from '@renderer/components/ui'
import { showError } from '@renderer/components/toast'
import { insertImage, setPageBackgroundImage } from '@renderer/io/projectIo'
import { frameMasks, maskPath } from '@renderer/render/shapes'
import { assets } from '@renderer/store/assets'
import { showPanel } from '@renderer/store/uiStore'
import { BackgroundRemoval } from './BackgroundRemoval'
import { Section, ToggleButton, updater } from './common'

type Filters = NonNullable<ImageElement['filters']>

const filterPresets: { id: string; label: string; filters: Filters | undefined }[] = [
  { id: 'none', label: 'Original', filters: undefined },
  { id: 'bw', label: 'B&W', filters: { grayscale: 1, contrast: 1.1 } },
  { id: 'sepia', label: 'Sepia', filters: { sepia: 0.8, contrast: 1.05 } },
  { id: 'warm', label: 'Warm', filters: { sepia: 0.25, saturation: 1.2, brightness: 1.03 } },
  { id: 'cool', label: 'Cool', filters: { hue: -12, saturation: 0.9, brightness: 1.03 } },
  { id: 'vivid', label: 'Vivid', filters: { saturation: 1.5, contrast: 1.12 } },
  { id: 'fade', label: 'Fade', filters: { contrast: 0.8, brightness: 1.1, saturation: 0.75 } },
  { id: 'drama', label: 'Drama', filters: { contrast: 1.4, brightness: 0.92, saturation: 0.85 } }
]

async function pickInto(el: ImageElement): Promise<void> {
  try {
    const [image] = await window.api.importImagesDialog()
    if (image) await insertImage(image.bytes, image.mime, image.name.replace(/\.[^.]+$/, ''), { targetId: el.id, saveToLibrary: true })
  } catch (error) {
    showError(error, 'The image could not be added.')
  }
}

function MaskThumb({ id }: { id: string | undefined }) {
  const d = maskPath(id, 24, 24) ?? 'M0 0H24V24H0Z'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  )
}

/** Photo and frame settings: replace, frame shape, crop, filters, border and background removal. */
export function ImageSections({ el, doc }: { el: ImageElement; doc: DesignDocument }) {
  const update = updater(el)
  const info = el.assetId ? doc.assets.find((a) => a.id === el.assetId) : undefined
  const f = el.filters ?? {}
  const setFilter = (key: keyof Filters, value: number) => update({ filters: { ...f, [key]: value } }, 'Adjust photo')
  const crop = el.crop ?? { zoom: 1, focusX: 0.5, focusY: 0.5 }

  return (
    <>
      <Section title={el.assetId ? 'Photo' : 'Empty frame'}>
        {!el.assetId && (
          <p className="muted small" style={{ margin: '0 0 10px' }}>
            Drag a photo from Photos or Uploads onto this frame, or choose one here.
          </p>
        )}
        <div className="tool-row">
          <button className="btn sm" onClick={() => void pickInto(el)}>
            <ImagePlus size={14} /> {el.assetId ? 'Replace' : 'Choose image'}
          </button>
          <button className="btn sm" onClick={() => showPanel('photos')}>
            <Images size={14} /> Stock photos
          </button>
          {el.assetId && (
            <button className="btn sm ghost" title="Empty the frame, keeping its shape and size" onClick={() => update({ assetId: null, crop: undefined }, 'Remove photo')}>
              <ImageMinus size={14} /> Empty frame
            </button>
          )}
          {el.assetId && (
            <button
              className="btn sm ghost"
              title="Use this photo as the page background"
              onClick={() => {
                const a = assets.get(el.assetId!)
                if (a) void setPageBackgroundImage(a.bytes, a.mime, info?.name ?? 'Background', info?.credit)
              }}
            >
              <Wallpaper size={14} /> Set as background
            </button>
          )}
        </div>
        {info?.credit && (
          <p className="muted small" style={{ marginTop: 10 }}>
            Photo by{' '}
            {info.credit.authorUrl ? (
              <a href="#" onClick={(e) => (e.preventDefault(), window.api.openExternal(info.credit!.authorUrl!))}>
                {info.credit.author}
              </a>
            ) : (
              info.credit.author
            )}{' '}
            on {info.credit.source}
            {info.credit.sourceUrl && (
              <>
                {' '}
                <a href="#" title="Open the photo page" onClick={(e) => (e.preventDefault(), window.api.openExternal(info.credit!.sourceUrl!))}>
                  <ExternalLink size={11} />
                </a>
              </>
            )}
          </p>
        )}
      </Section>

      <Section title="Frame shape">
        <div className="tile-grid cols-5" style={{ gap: 6 }}>
          <button className="tile" title="Rectangle" aria-pressed={!el.mask || el.mask === 'rect'} onClick={() => update({ mask: undefined }, 'Frame shape')} style={!el.mask || el.mask === 'rect' ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined}>
            <MaskThumb id={undefined} />
          </button>
          {frameMasks
            .filter((m) => m.id !== 'rect')
            .map((m) => (
              <button key={m.id} className="tile" title={m.label} aria-pressed={el.mask === m.id} style={el.mask === m.id ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : undefined} onClick={() => update({ mask: m.id }, 'Frame shape')}>
                <MaskThumb id={m.id} />
              </button>
            ))}
        </div>
        {(!el.mask || el.mask === 'rect') && (
          <div style={{ marginTop: 10 }}>
            <NumberField label="Corner rounding" value={el.cornerRadius ?? 0} min={0} max={Math.min(el.width, el.height) / 2} onChange={(cornerRadius) => update({ cornerRadius }, 'Corners')} suffix="px" />
          </div>
        )}
      </Section>

      {el.assetId && (
        <Section
          title="Crop"
          action={
            el.crop && (
              <button className="icon-btn sm" title="Reset crop" aria-label="Reset crop" onClick={() => update({ crop: undefined }, 'Reset crop')}>
                <RotateCcw size={14} />
              </button>
            )
          }
        >
          <div className="stack" style={{ gap: 8 }}>
            <SliderField label="Zoom" value={crop.zoom} min={1} max={5} step={0.01} onChange={(zoom) => update({ crop: { ...crop, zoom } }, 'Crop')} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Left – right" value={crop.focusX} min={0} max={1} step={0.01} onChange={(focusX) => update({ crop: { ...crop, focusX } }, 'Crop')} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Top – bottom" value={crop.focusY} min={0} max={1} step={0.01} onChange={(focusY) => update({ crop: { ...crop, focusY } }, 'Crop')} display={{ scale: 100, suffix: '%' }} />
            <div className="tool-row">
              <ToggleButton on={!!el.flipX} title="Flip horizontally" onClick={() => update({ flipX: !el.flipX }, 'Flip')}>
                <FlipHorizontal2 size={16} />
              </ToggleButton>
              <ToggleButton on={!!el.flipY} title="Flip vertically" onClick={() => update({ flipY: !el.flipY }, 'Flip')}>
                <FlipVertical2 size={16} />
              </ToggleButton>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              The photo always fills the frame without stretching. Resize the frame to change the crop shape.
            </p>
          </div>
        </Section>
      )}

      {el.assetId && (
        <Section title="Filters and adjustments">
          <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {filterPresets.map((p) => (
              <button key={p.id} className={`chip${JSON.stringify(p.filters ?? {}) === JSON.stringify(el.filters ?? {}) ? ' on' : ''}`} onClick={() => update({ filters: p.filters }, 'Photo filter')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <SliderField label="Brightness" value={f.brightness ?? 1} min={0} max={2} step={0.01} onChange={(v) => setFilter('brightness', v)} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Contrast" value={f.contrast ?? 1} min={0} max={2} step={0.01} onChange={(v) => setFilter('contrast', v)} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Saturation" value={f.saturation ?? 1} min={0} max={3} step={0.01} onChange={(v) => setFilter('saturation', v)} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Hue" value={f.hue ?? 0} min={-180} max={180} onChange={(v) => setFilter('hue', v)} display={{ scale: 1, suffix: '°' }} />
            <SliderField label="Black and white" value={f.grayscale ?? 0} min={0} max={1} step={0.01} onChange={(v) => setFilter('grayscale', v)} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Sepia" value={f.sepia ?? 0} min={0} max={1} step={0.01} onChange={(v) => setFilter('sepia', v)} display={{ scale: 100, suffix: '%' }} />
            <SliderField label="Blur" value={f.blur ?? 0} min={0} max={30} step={0.5} onChange={(v) => setFilter('blur', v)} display={{ scale: 1, decimals: 1 }} />
          </div>
        </Section>
      )}

      <Section title="Border">
        <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
          <div className="grow">
            <NumberField label="Width" value={el.borderWidth ?? 0} min={0} max={500} onChange={(borderWidth) => update({ borderWidth, borderColor: el.borderColor ?? '#ffffff' }, 'Border')} suffix="px" />
          </div>
          <ColorField label="Border colour" value={el.borderColor ?? '#ffffff'} onChange={(borderColor) => update({ borderColor, borderWidth: el.borderWidth || 8 }, 'Border colour')} compact />
        </div>
      </Section>

      {el.assetId && <BackgroundRemoval element={el} />}
    </>
  )
}
