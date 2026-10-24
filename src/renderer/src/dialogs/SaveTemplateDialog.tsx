import { useState } from 'react'
import type { DesignDocument } from '@shared/model'
import { Modal } from '@renderer/components/ui'
import { saveAsTemplate } from '@renderer/io/projectIo'
import { bumpLibrary } from '@renderer/store/libraryStore'

export function SaveTemplateDialog({ doc, onClose }: { doc: DesignDocument; onClose: () => void }) {
  const [title, setTitle] = useState(doc.title || 'My template')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    await saveAsTemplate(title.trim() || 'My template')
    bumpLibrary()
    setBusy(false)
    onClose()
  }
  return (
    <Modal
      title="Save as template"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy} onClick={() => void save()}>
            Save template
          </button>
        </>
      }
    >
      <label className="field">
        <span className="field-label">Template name</span>
        <input className="input" value={title} autoFocus maxLength={120} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
      </label>
      <p className="muted small">
        Saves all {doc.pages.length} page{doc.pages.length === 1 ? '' : 's'} with their images to My templates on this PC. You can start new designs from it or add its pages to other designs.
      </p>
    </Modal>
  )
}
