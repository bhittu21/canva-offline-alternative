import { useState } from 'react'
import type { DesignDocument } from '@shared/model'
import { canvasPresets } from '@shared/presets'
import { ratioLabel, resizeDocument, resizeModes, type ResizeMode } from '@shared/resize'
import { Modal } from '@renderer/components/ui'
import { SizeFields } from '@renderer/components/SizeFields'
import { showToast } from '@renderer/components/toast'
import { openAsNewDesign } from '@renderer/io/projectIo'
import { assets } from '@renderer/store/assets'
import { editor } from '@renderer/store/editorStore'

const MAX_PAGE = 10000

/** Resize the whole design (every page), or make a resized copy as a new design. */
export function ResizeDialog({ doc, onClose }: { doc: DesignDocument; onClose: () => void }) {
  const [size, setSize] = useState({ width: doc.width, height: doc.height })
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState<ResizeMode>('scale')
  const valid = size.width >= 1 && size.height >= 1 && size.width <= MAX_PAGE && size.height <= MAX_PAGE
  const unchanged = size.width === doc.width && size.height === doc.height

  const applyHere = () => {
    const resized = resizeDocument(doc, size.width, size.height, mode)
    editor.change('Resize design', (draft) => {
      draft.width = resized.width
      draft.height = resized.height
      draft.pages = resized.pages
    })
    showToast(`Resized to ${resized.width} × ${resized.height} px. Ctrl+Z undoes it.`)
    onClose()
  }

  /** A new, unsaved design with the adapted layout; this one stays as it is. */
  const createCopy = async () => {
    const resized = resizeDocument(doc, size.width, size.height, mode)
    const bytes = new Map([...assets.bytesMap()].map(([id, data]) => [id, { bytes: data, mime: doc.assets.find((a) => a.id === id)?.mime ?? 'image/png' }]))
    onClose()
    await openAsNewDesign({ ...resized, title: `${doc.title} ${ratioLabel(resized.width, resized.height)}` }, bytes)
  }

  return (
    <Modal
      title="Resize design"
      onClose={onClose}
      footer={
        <>
          <span className="export-status">{!valid ? `Width and height must be between 1 and ${MAX_PAGE} px.` : ''}</span>
          <button className="btn" onClick={() => void createCopy()} disabled={!valid || unchanged}>
            Copy and resize
          </button>
          <button className="btn primary" onClick={applyHere} disabled={!valid || unchanged}>
            Resize this design
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <label className="field">
          <span className="field-label">Common sizes</span>
          <select
            className="select"
            value=""
            onChange={(e) => {
              const preset = canvasPresets.find((p) => p.id === e.target.value)
              if (preset) setSize({ width: preset.width, height: preset.height })
            }}
          >
            <option value="">Choose a preset…</option>
            {canvasPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.width} × {p.height})
              </option>
            ))}
          </select>
        </label>

        <SizeFields width={size.width} height={size.height} locked={locked} max={MAX_PAGE} original={{ width: doc.width, height: doc.height }} onChange={setSize} onLockChange={setLocked} />

        <div className="field">
          <span className="field-label">Existing content</span>
          <div className="resize-options">
            {resizeModes.map((m) => (
              <label key={m.id} className={`resize-option${mode === m.id ? ' on' : ''}`}>
                <input type="radio" checked={mode === m.id} onChange={() => setMode(m.id)} />
                <span>
                  <strong className="small">{m.label}</strong>
                  <span className="muted small" style={{ display: 'block' }}>
                    {m.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Current size {doc.width} × {doc.height} px ({ratioLabel(doc.width, doc.height)}), {doc.pages.length} page{doc.pages.length === 1 ? '' : 's'}. All pages are resized. Elements are never stretched.
        </p>
      </div>
    </Modal>
  )
}
