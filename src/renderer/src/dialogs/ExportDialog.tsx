import { useEffect, useRef, useState } from 'react'
import type { DesignDocument } from '@shared/model'
import {
  exportFormats,
  fileNameFor,
  MAX_SIDE,
  pdfPageSize,
  supportsQuality,
  supportsTransparency,
  validateExport,
  type ExportFormat,
  type ExportOptions,
  type FitMode
} from '@shared/exportOptions'
import { ratioLabel } from '@shared/resize'
import { Modal } from '@renderer/components/Modal'
import { SizeFields } from '@renderer/components/SizeFields'
import { showError, showToast } from '@renderer/components/toast'
import { exportDesign } from '@renderer/export/exportDesign'
import { renderDesign } from '@renderer/export/renderDesign'

type Status = { kind: 'idle' } | { kind: 'working'; step: string } | { kind: 'error'; message: string }

const scales = [0.5, 1, 2, 3]
const dpis = [72, 96, 150, 300]

export function ExportDialog({ doc, onClose }: { doc: DesignDocument; onClose: () => void }) {
  const [format, setFormat] = useState<ExportFormat>('png')
  const [size, setSize] = useState({ width: doc.width, height: doc.height })
  const [locked, setLocked] = useState(true)
  const [fit, setFit] = useState<FitMode>('contain')
  const [quality, setQuality] = useState(0.92)
  const [transparent, setTransparent] = useState(false)
  const [dpi, setDpi] = useState(doc.width >= 2000 || doc.height >= 2000 ? 300 : 96)
  const [fileName, setFileName] = useState(fileNameFor(doc.title, 'png'))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const formatInfo = exportFormats.find((f) => f.id === format)!
  const sameRatio = Math.abs(size.width / size.height - doc.width / doc.height) < 0.001
  const problem = validateExport(size)
  const busy = status.kind === 'working'

  const chooseFormat = (next: ExportFormat) => {
    setFormat(next)
    const ext = exportFormats.find((f) => f.id === next)!.extension
    setFileName((name) => name.replace(/\.[a-z]+$/i, '') + '.' + ext)
  }

  const options: ExportOptions = { format, width: size.width, height: size.height, fit, quality, transparent, dpi }

  const run = async () => {
    if (problem) return
    try {
      setStatus({ kind: 'working', step: `Creating ${formatInfo.label}…` })
      // Let the progress message paint before the heavy rendering starts.
      await new Promise((r) => setTimeout(r, 30))
      const bytes = await exportDesign(doc, options)
      setStatus({ kind: 'working', step: 'Choose where to save…' })
      const path = await window.api.saveExport(bytes, fileName, formatInfo.extension)
      if (!path) {
        setStatus({ kind: 'idle' })
        return
      }
      showToast(`Exported ${path.split(/[\\/]/).pop()}`)
      onClose()
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'The export failed.' })
      showError(error, 'The export failed.')
    }
  }

  const page = pdfPageSize(size.width, size.height, dpi)
  const mm = (pt: number) => Math.round((pt / 72) * 25.4)

  return (
    <Modal
      title="Export design"
      onClose={busy ? () => {} : onClose}
      wide
      footer={
        <>
          <span className={`export-status${status.kind === 'error' ? ' error' : ''}`} role="status">
            {status.kind === 'working' && <span className="spinner" aria-hidden="true" />}
            {status.kind === 'working' ? status.step : status.kind === 'error' ? status.message : problem ?? ''}
          </span>
          <button className="button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="button primary" onClick={() => void run()} disabled={busy || !!problem}>
            Export {formatInfo.label}
          </button>
        </>
      }
    >
      <div className="export-layout">
        <div className="export-options">
          <div className="field">
            <span className="field-label">File type</span>
            <div className="segmented" role="radiogroup" aria-label="File type">
              {exportFormats.map((f) => (
                <button key={f.id} role="radio" aria-checked={format === f.id} className={format === f.id ? 'on' : ''} onClick={() => chooseFormat(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <span className="muted small">{formatInfo.note}</span>
          </div>

          <label className="field">
            <span className="field-label">File name</span>
            <span className="field-input">
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </span>
            <span className="muted small">You choose the folder in the next step.</span>
          </label>

          <SizeFields
            width={size.width}
            height={size.height}
            locked={locked}
            max={MAX_SIDE}
            original={{ width: doc.width, height: doc.height }}
            onChange={setSize}
            onLockChange={setLocked}
          />

          <div className="field">
            <span className="field-label">Quick size</span>
            <div className="segmented">
              {scales.map((s) => (
                <button
                  key={s}
                  className={sameRatio && Math.round(doc.width * s) === size.width ? 'on' : ''}
                  onClick={() => setSize({ width: Math.round(doc.width * s), height: Math.round(doc.height * s) })}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {!sameRatio && (
            <div className="field">
              <span className="field-label">The new shape differs from your design</span>
              <label className="radio">
                <input type="radio" checked={fit === 'contain'} onChange={() => setFit('contain')} />
                Show the whole design (adds margins)
              </label>
              <label className="radio">
                <input type="radio" checked={fit === 'cover'} onChange={() => setFit('cover')} />
                Fill the image (crops the edges)
              </label>
              <span className="muted small">Your design is never stretched.</span>
            </div>
          )}

          {supportsQuality(format) && (
            <label className="field">
              <span className="field-label">Quality: {Math.round(quality * 100)}%</span>
              <input type="range" min={0.3} max={1} step={0.01} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
            </label>
          )}

          {supportsTransparency(format) && (
            <label className="checkbox">
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} />
              Transparent background
            </label>
          )}

          {format === 'pdf' && (
            <label className="field">
              <span className="field-label">Print resolution</span>
              <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {dpis.map((d) => (
                  <option key={d} value={d}>
                    {d} DPI{d === 300 ? ' (print quality)' : d === 96 ? ' (screen)' : ''}
                  </option>
                ))}
              </select>
              <span className="muted small">
                Page size: {mm(page.width)} × {mm(page.height)} mm ({(page.width / 72).toFixed(2)} × {(page.height / 72).toFixed(2)} in)
              </span>
            </label>
          )}
        </div>

        <ExportPreview doc={doc} width={size.width} height={size.height} fit={fit} transparent={transparent && supportsTransparency(format)} />
      </div>
      <p className="export-summary">
        Output: <strong>{size.width.toLocaleString()} × {size.height.toLocaleString()} px</strong> · {ratioLabel(size.width, size.height)} ·{' '}
        {formatInfo.label}
      </p>
    </Modal>
  )
}

const PREVIEW_MAX = 260

/** A small live render of the export, so you see margins, cropping and transparency before saving. */
function ExportPreview(props: { doc: DesignDocument; width: number; height: number; fit: FitMode; transparent: boolean }) {
  const { doc, width, height, fit, transparent } = props
  const holder = useRef<HTMLDivElement>(null)
  const valid = validateExport({ width, height }) === null

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const scale = Math.min(PREVIEW_MAX / width, PREVIEW_MAX / height)
    const timer = setTimeout(() => {
      renderDesign(doc, { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), fit, transparent })
        .then((canvas) => {
          if (cancelled || !holder.current) return
          holder.current.replaceChildren(canvas)
        })
        .catch(() => holder.current?.replaceChildren())
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [doc, width, height, fit, transparent, valid])

  return (
    <div className="export-preview">
      <div className="checkerboard" ref={holder} />
      <span className="muted small">Preview</span>
    </div>
  )
}
