import { useEffect, useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import type { DesignDocument, Page } from '@shared/model'
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
import { Modal, Segmented, SliderField, Switch } from '@renderer/components/ui'
import { SizeFields } from '@renderer/components/SizeFields'
import { cleanError, showToast } from '@renderer/components/toast'
import { exportDesign } from '@renderer/export/exportDesign'
import { renderPage } from '@renderer/export/renderDesign'
import { useEditor } from '@renderer/store/editorStore'

type Status = { kind: 'idle' } | { kind: 'working'; step: string } | { kind: 'error'; message: string }
type PageChoice = 'all' | 'current' | 'pick'

const scales = [0.5, 1, 2, 3, 4]
const dpis = [72, 96, 150, 300]

/** Download the design as PNG, JPG, WebP, SVG or PDF, at any size, with a live preview. */
export function ExportDialog({ doc, onClose }: { doc: DesignDocument; onClose: () => void }) {
  const activePageId = useEditor((s) => s.activePageId)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [size, setSize] = useState({ width: doc.width, height: doc.height })
  const [locked, setLocked] = useState(true)
  const [fit, setFit] = useState<FitMode>('contain')
  const [quality, setQuality] = useState(0.92)
  const [transparent, setTransparent] = useState(false)
  const [dpi, setDpi] = useState(doc.width >= 2000 || doc.height >= 2000 ? 300 : 150)
  const [fileName, setFileName] = useState(fileNameFor(doc.title, 'png'))
  const [choice, setChoice] = useState<PageChoice>(doc.pages.length > 1 ? 'all' : 'current')
  const [picked, setPicked] = useState<Set<string>>(() => new Set(doc.pages.map((p) => p.id)))
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const formatInfo = exportFormats.find((f) => f.id === format)!
  const sameRatio = Math.abs(size.width / size.height - doc.width / doc.height) < 0.001
  const problem = validateExport(size)
  const busy = status.kind === 'working'

  const pages: Page[] = useMemo(() => {
    if (choice === 'current') return [doc.pages.find((p) => p.id === activePageId) ?? doc.pages[0]]
    if (choice === 'pick') return doc.pages.filter((p) => picked.has(p.id))
    return doc.pages
  }, [choice, picked, doc.pages, activePageId])

  const emptyFrames = pages.reduce((n, p) => n + p.elements.filter((el) => el.type === 'image' && !el.assetId && !el.hidden).length, 0)
  const zipped = format !== 'pdf' && pages.length > 1
  const extension = zipped ? 'zip' : formatInfo.extension

  const chooseFormat = (next: ExportFormat) => {
    setFormat(next)
    const ext = exportFormats.find((f) => f.id === next)!.extension
    setFileName((name) => name.replace(/\.[a-z]+$/i, '') + '.' + ext)
  }

  const options: ExportOptions = { format, width: size.width, height: size.height, fit, quality, transparent, dpi }

  const run = async () => {
    if (problem || pages.length === 0) return
    try {
      setStatus({ kind: 'working', step: `Creating ${formatInfo.label}…` })
      // Let the progress message paint before the heavy rendering starts.
      await new Promise((r) => setTimeout(r, 30))
      const result = await exportDesign(doc, options, pages, (done, total) => total > 1 && setStatus({ kind: 'working', step: `Rendering page ${Math.min(done + 1, total)} of ${total}…` }))
      setStatus({ kind: 'working', step: 'Choose where to save…' })
      const name = fileName.replace(/\.[a-z]+$/i, '') + '.' + result.extension
      const path = await window.api.saveExport(result.bytes, name, result.extension)
      if (!path) {
        setStatus({ kind: 'idle' })
        return
      }
      showToast(`Exported ${path.split(/[\\/]/).pop()}`)
      onClose()
    } catch (error) {
      setStatus({ kind: 'error', message: cleanError(error, 'The export failed.') })
    }
  }

  const pdfPage = pdfPageSize(size.width, size.height, dpi)
  const mm = (pt: number) => Math.round((pt / 72) * 25.4)

  return (
    <Modal
      title="Download"
      onClose={busy ? () => {} : onClose}
      size="wide"
      footer={
        <>
          <span className={`export-status${status.kind === 'error' ? ' error' : ''}`} role="status">
            {status.kind === 'working' && <span className="spinner" aria-hidden="true" />}
            {status.kind === 'working' ? status.step : status.kind === 'error' ? status.message : (problem ?? (pages.length === 0 ? 'Choose at least one page.' : ''))}
          </span>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => void run()} disabled={busy || !!problem || pages.length === 0}>
            <Download size={16} /> Download {zipped ? `${pages.length} pages (ZIP)` : formatInfo.label}
          </button>
        </>
      }
    >
      <div className="export-layout">
        <div className="export-options">
          <div className="field">
            <span className="field-label">File type</span>
            <Segmented block label="File type" value={format} onChange={chooseFormat} options={exportFormats.map((f) => ({ value: f.id, label: f.label }))} />
            <span className="muted small">{formatInfo.note}</span>
          </div>

          {doc.pages.length > 1 && (
            <div className="field">
              <span className="field-label">Pages</span>
              <Segmented
                block
                label="Pages"
                value={choice}
                onChange={setChoice}
                options={[
                  { value: 'all', label: `All (${doc.pages.length})` },
                  { value: 'current', label: 'Current page' },
                  { value: 'pick', label: 'Choose…' }
                ]}
              />
              {choice === 'pick' && (
                <div className="chips" style={{ flexWrap: 'wrap', marginTop: 6 }}>
                  {doc.pages.map((p, i) => (
                    <button
                      key={p.id}
                      className={`chip${picked.has(p.id) ? ' on' : ''}`}
                      aria-pressed={picked.has(p.id)}
                      onClick={() =>
                        setPicked((s) => {
                          const next = new Set(s)
                          if (next.has(p.id)) next.delete(p.id)
                          else next.add(p.id)
                          return next
                        })
                      }
                    >
                      {p.name || `Page ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              {zipped && <span className="muted small">{formatInfo.label} saves one file per page, packed in a ZIP. PDF keeps all pages in one file.</span>}
            </div>
          )}

          <label className="field">
            <span className="field-label">File name</span>
            <input className="input" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            <span className="muted small">You choose the folder in the next step.{zipped ? ' The file will end in .zip.' : ''}</span>
          </label>

          <SizeFields width={size.width} height={size.height} locked={locked} max={MAX_SIDE} original={{ width: doc.width, height: doc.height }} onChange={setSize} onLockChange={setLocked} />

          <div className="field">
            <span className="field-label">Quick size</span>
            <Segmented
              block
              label="Scale"
              value={sameRatio ? String(size.width / doc.width) : ''}
              onChange={(s) => setSize({ width: Math.round(doc.width * Number(s)), height: Math.round(doc.height * Number(s)) })}
              options={scales.map((s) => ({ value: String(s), label: `${s}×` }))}
            />
          </div>

          {!sameRatio && (
            <div className="field">
              <span className="field-label">The new shape differs from your design</span>
              <Segmented
                block
                value={fit}
                onChange={setFit}
                options={[
                  { value: 'contain', label: 'Show all (adds margins)' },
                  { value: 'cover', label: 'Fill (crops edges)' }
                ]}
              />
              <span className="muted small">Your design is never stretched.</span>
            </div>
          )}

          {supportsQuality(format) && <SliderField label="Quality" value={quality} min={0.3} max={1} step={0.01} onChange={setQuality} display={{ scale: 100, suffix: '%' }} />}

          {supportsTransparency(format) && <Switch label="Transparent background" hint="Leaves out the page background colour and photo." checked={transparent} onChange={setTransparent} />}

          {format === 'pdf' && (
            <label className="field">
              <span className="field-label">Print resolution</span>
              <select className="select" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {dpis.map((d) => (
                  <option key={d} value={d}>
                    {d} DPI{d === 300 ? ' (print quality)' : d === 96 ? ' (screen)' : ''}
                  </option>
                ))}
              </select>
              <span className="muted small">
                Page size: {mm(pdfPage.width)} × {mm(pdfPage.height)} mm ({(pdfPage.width / 72).toFixed(2)} × {(pdfPage.height / 72).toFixed(2)} in)
              </span>
            </label>
          )}

          {emptyFrames > 0 && (
            <div className="notice info">
              {emptyFrames} empty photo frame{emptyFrames === 1 ? '' : 's'} will appear as grey placeholders. Drop photos onto them, or delete them, before you export.
            </div>
          )}
        </div>

        <ExportPreview doc={doc} page={pages[0]} width={size.width} height={size.height} fit={fit} transparent={transparent && supportsTransparency(format)} />
      </div>
      <p className="export-summary">
        Output: <strong>
          {size.width.toLocaleString()} × {size.height.toLocaleString()} px
        </strong>{' '}
        · {ratioLabel(size.width, size.height)} · {formatInfo.label} · {pages.length} page{pages.length === 1 ? '' : 's'} · .{extension}
      </p>
    </Modal>
  )
}

const PREVIEW_MAX = 280

/** A small live render of the export, so you see margins, cropping and transparency before saving. */
function ExportPreview(props: { doc: DesignDocument; page: Page | undefined; width: number; height: number; fit: FitMode; transparent: boolean }) {
  const { doc, page, width, height, fit, transparent } = props
  const holder = useRef<HTMLDivElement>(null)
  const valid = validateExport({ width, height }) === null

  useEffect(() => {
    if (!valid || !page) {
      holder.current?.replaceChildren()
      return
    }
    let cancelled = false
    const scale = Math.min(PREVIEW_MAX / width, PREVIEW_MAX / height)
    const timer = setTimeout(() => {
      renderPage(doc, page, { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), fit, transparent })
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
  }, [doc, page, width, height, fit, transparent, valid])

  return (
    <div className="export-preview">
      <div className="checkerboard" ref={holder} />
      <span className="muted small">Preview{page ? ` · ${page.name || `page ${doc.pages.indexOf(page) + 1}`}` : ''}</span>
    </div>
  )
}
