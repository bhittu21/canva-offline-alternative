import { useEffect, useState } from 'react'
import type { RemoveBgState } from '@shared/ipc'
import type { ImageElement } from '@shared/model'
import { Modal } from '@renderer/components/Modal'
import { showToast } from '@renderer/components/toast'
import { cleanError } from '@renderer/dialogs/SettingsDialog'
import { assets } from '@renderer/store/assets'
import { editor } from '@renderer/store/editorStore'
import { openDialog, useDialog } from '@renderer/store/uiStore'

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; message: string }

/** "Remove background" for the selected image, using the optional remove.bg service. */
export function BackgroundRemoval({ element }: { element: ImageElement }) {
  const [state, setState] = useState<RemoveBgState | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [askConsent, setAskConsent] = useState(false)
  const dialog = useDialog()

  // Refresh after the Settings dialog closes, in case a key was added or removed.
  useEffect(() => {
    if (dialog === null) window.api.removeBg.state().then(setState).catch(() => setState(null))
  }, [dialog])

  useEffect(() => setStatus({ kind: 'idle' }), [element.id])

  const run = async () => {
    const source = assets.get(element.assetId)
    if (!source) return setStatus({ kind: 'error', message: 'The image data is missing.' })
    setStatus({ kind: 'working' })
    try {
      const result = await window.api.removeBg.run(source.bytes, source.mime)
      const assetId = assets.add(result.bytes, 'image/png')
      // One undo step brings the original image back.
      editor.change('Remove background', (doc) => {
        doc.assets.push({ id: assetId, name: `${element.name} (no background)`, mime: 'image/png' })
        const el = doc.elements.find((e) => e.id === element.id)
        if (el && el.type === 'image') el.assetId = assetId
      })
      setStatus({ kind: 'idle' })
      showToast(
        result.creditsCharged !== null
          ? `Background removed (remove.bg charged ${result.creditsCharged} credit${result.creditsCharged === 1 ? '' : 's'})`
          : 'Background removed'
      )
    } catch (error) {
      setStatus({ kind: 'error', message: cleanError(error) })
    }
  }

  const start = () => {
    if (!state?.configured) return openDialog('settings')
    if (!state.consent) return setAskConsent(true)
    void run()
  }

  const agree = async () => {
    setState(await window.api.removeBg.setConsent(true))
    setAskConsent(false)
    void run()
  }

  return (
    <div className="ai-tool">
      <div className="settings-heading">
        <h3 className="panel-subtitle">Background</h3>
        <span className="badge online">Online · remove.bg</span>
      </div>
      <button className="button wide" onClick={start} disabled={status.kind === 'working' || element.locked}>
        {status.kind === 'working' ? (
          <>
            <span className="spinner" aria-hidden="true" /> Removing background…
          </>
        ) : state?.configured ? (
          'Remove background'
        ) : (
          'Set up background removal…'
        )}
      </button>
      {status.kind === 'error' && <p className="small error-text">{status.message}</p>}
      {!state?.configured && <p className="muted small">Needs an internet connection and your own remove.bg API key.</p>}

      {askConsent && (
        <Modal
          title="Send this image to remove.bg?"
          onClose={() => setAskConsent(false)}
          footer={
            <>
              <span className="export-status" />
              <button className="button" onClick={() => setAskConsent(false)}>
                Cancel
              </button>
              <button className="button primary" onClick={() => void agree()}>
                Agree and remove background
              </button>
            </>
          }
        >
          <p>
            To remove the background, this image is uploaded over the internet to <strong>remove.bg</strong>, an online service, using your
            API key. The result is downloaded back into your design.
          </p>
          <p className="muted small">
            Each request uses one of your monthly free calls or your remove.bg credits. You will only be asked once; you can change this in
            Settings. Nothing else from your design is sent.
          </p>
        </Modal>
      )}
    </div>
  )
}
