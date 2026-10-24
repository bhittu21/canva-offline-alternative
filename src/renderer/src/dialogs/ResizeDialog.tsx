import { useState } from 'react'
import type { DesignDocument } from '@shared/model'
import { canvasPresets } from '@shared/presets'
import { ratioLabel, resizeDocument, resizeModes, type ResizeMode } from '@shared/resize'
import { Modal } from '@renderer/components/Modal'
import { SizeFields } from '@renderer/components/SizeFields'
import { showToast } from '@renderer/components/toast'
import { confirmDiscardChanges } from '@renderer/io/projectIo'
import { editor } from '@renderer/store/editorStore'

const MAX_PAGE = 10000

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
      draft.elements = resized.elements
    })
    showToast(`Resized to ${resized.width} × ${resized.height} px`)
    onClose()
  }

  /** Magic Resize-style: a new, unsaved design with the adapted layout; the original stays untouched on disk. */
  const createCopy = () => {
    if (!confirmDiscardChanges()) return
    const resized = resizeDocument(doc, size.width, size.height, mode)
    editor.open({ ...resized, title: `${doc.title} ${ratioLabel(resized.width, resized.height)}` }, null)
    showToast('Created a resized copy. Save it to keep it.')
    onClose()
  }

  return (
    <Modal
      title="Resize design"
      onClose={onClose}
      footer={
        <>
          <span className="export-status">{!valid ? `Width and height must be between 1 and ${MAX_PAGE} px.` : ''}</span>
          <button className="button" onClick={createCopy} disabled={!valid || unchanged}>
            Create resized copy
          </button>
          <button className="button primary" onClick={applyHere} disabled={!valid || unchanged}>
            Resize this design
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Common sizes</span>
        <select
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

      <SizeFields
        width={size.width}
        height={size.height}
        locked={locked}
        max={MAX_PAGE}
        original={{ width: doc.width, height: doc.height }}
        onChange={setSize}
        onLockChange={setLocked}
      />

      <div className="field">
        <span className="field-label">Existing content</span>
        {resizeModes.map((m) => (
          <label key={m.id} className="radio">
            <input type="radio" checked={mode === m.id} onChange={() => setMode(m.id)} />
            <span>
              {m.label}
              <span className="muted small block">{m.description}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="muted small">
        Current size {doc.width} × {doc.height} px ({ratioLabel(doc.width, doc.height)}). Elements are never stretched; you can fine-tune the
        layout afterwards. Resizing this design can be undone.
      </p>
    </Modal>
  )
}
