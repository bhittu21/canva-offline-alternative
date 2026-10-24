import { useEffect, useState } from 'react'
import type { RemoveBgAccount, RemoveBgState } from '@shared/ipc'
import { Modal } from '@renderer/components/Modal'
import { showError, showToast } from '@renderer/components/toast'

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; account: RemoveBgAccount } | { kind: 'error'; message: string }

/**
 * Settings for optional online services. Nothing here is needed for normal
 * editing; every feature that uses the internet is listed with its provider.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<RemoveBgState | null>(null)
  const [key, setKey] = useState('')
  const [check, setCheck] = useState<Check>({ kind: 'idle' })

  useEffect(() => {
    window.api.removeBg.state().then(setState).catch(() => setState({ configured: false, consent: false }))
  }, [])

  const runCheck = async (candidate?: string) => {
    setCheck({ kind: 'checking' })
    try {
      setCheck({ kind: 'ok', account: await window.api.removeBg.check(candidate) })
      return true
    } catch (error) {
      setCheck({ kind: 'error', message: cleanError(error) })
      return false
    }
  }

  const save = async () => {
    try {
      setState(await window.api.removeBg.setKey(key))
      setKey('')
      showToast('remove.bg key saved')
      void runCheck()
    } catch (error) {
      showError(error)
    }
  }

  const remove = async () => {
    if (!window.confirm('Remove the saved remove.bg API key from this computer?')) return
    setState(await window.api.removeBg.setKey(null))
    setCheck({ kind: 'idle' })
    showToast('remove.bg key removed')
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <section className="settings-section">
        <div className="settings-heading">
          <h3>Background removal</h3>
          <span className="badge online">Online · remove.bg</span>
        </div>
        <p className="muted small">
          Removes the background from a selected image. The image is uploaded to remove.bg and the result is downloaded back into your
          design. Your remove.bg account gets a number of free calls each month; after that, remove.bg charges credits on your account.
          This app never buys credits.
        </p>
        <p className="notice small">
          remove.bg has announced that its standalone service is moving to Canva on 1 December 2026, so this API may stop working after
          that date. A local, offline background remover is on the roadmap.
        </p>

        <div className="field">
          <span className="field-label">API key</span>
          {state?.configured ? (
            <div className="key-row">
              <span className="key-saved">Saved and encrypted on this PC</span>
              <button className="button" onClick={() => void runCheck()} disabled={check.kind === 'checking'}>
                Test connection
              </button>
              <button className="button danger" onClick={() => void remove()}>
                Remove key
              </button>
            </div>
          ) : (
            <div className="key-row">
              <span className="field-input grow">
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Paste your remove.bg API key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </span>
              <button className="button" disabled={!key.trim() || check.kind === 'checking'} onClick={() => void runCheck(key.trim())}>
                Test
              </button>
              <button className="button primary" disabled={!key.trim()} onClick={() => void save()}>
                Save key
              </button>
            </div>
          )}
          <span className="muted small">
            Get a key at remove.bg → My account → API keys. The key is stored with Windows encryption and is never saved in design files or
            exports.
          </span>
        </div>

        {check.kind === 'checking' && <p className="small">Checking…</p>}
        {check.kind === 'error' && <p className="small error-text">{check.message}</p>}
        {check.kind === 'ok' && (
          <p className="small ok-text">
            Connected.
            {check.account.freeCalls !== null && ` Free calls left this month: ${check.account.freeCalls}.`}
            {check.account.credits !== null && ` Credits: ${check.account.credits}.`}
          </p>
        )}

        {state?.configured && state.consent && (
          <label className="checkbox small">
            <input type="checkbox" checked onChange={async () => setState(await window.api.removeBg.setConsent(false))} />
            Allowed to send images to remove.bg (untick to be asked again)
          </label>
        )}
      </section>
    </Modal>
  )
}

export function cleanError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^Error invoking remote method '[^']+': (\w*Error: )?/, '')
}
