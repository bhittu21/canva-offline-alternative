import { useEffect, useState, type ReactNode } from 'react'
import { Bot, CheckCircle2, Eraser, ExternalLink, Image, Info, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { AiLogEntry, AiProviderState, PhotoProviderId, RemoveBgAccount, RemoveBgState, ServiceState } from '@shared/ipc'
import { aiPresets, presetFor } from '@shared/aiPresets'
import { Modal, Segmented, Switch } from '@renderer/components/ui'
import { cleanError, showToast } from '@renderer/components/toast'
import { confirmAction, uiStore, updatePrefs, usePrefs, useUi, type SettingsTab } from '@renderer/store/uiStore'

const tabs: { id: SettingsTab; label: string; icon: ReactNode }[] = [
  { id: 'general', label: 'General', icon: <SlidersHorizontal size={16} /> },
  { id: 'photos', label: 'Stock photos', icon: <Image size={16} /> },
  { id: 'ai', label: 'AI providers', icon: <Bot size={16} /> },
  { id: 'background', label: 'Background removal', icon: <Eraser size={16} /> },
  { id: 'about', label: 'About and privacy', icon: <Info size={16} /> }
]

const link = (url: string, label: ReactNode) => (
  <a href="#" onClick={(e) => (e.preventDefault(), window.api.openExternal(url))}>
    {label} <ExternalLink size={11} style={{ verticalAlign: '-1px' }} />
  </a>
)

/**
 * Settings. Normal editing needs none of this: every online feature is
 * optional, listed with its provider, and uses keys stored encrypted on this
 * PC by the main process. The window never sees a saved key again.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const tab = useUi((s) => s.settingsTab)
  return (
    <Modal title="Settings" onClose={onClose} size="xwide">
      <div className="settings">
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id} onClick={() => uiStore.setState({ settingsTab: t.id })}>
              {t.icon} {t.label}
            </button>
          ))}
        </nav>
        <div className="settings-content">
          {tab === 'general' && <GeneralTab />}
          {tab === 'photos' && <PhotosTab />}
          {tab === 'ai' && <AiTab />}
          {tab === 'background' && <RemoveBgTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </Modal>
  )
}

function Heading({ title, badge }: { title: string; badge?: ReactNode }) {
  return (
    <div className="settings-heading">
      <h3>{title}</h3>
      {badge}
    </div>
  )
}

// ---------------------------------------------------------------- Key entry

type Check = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string }

/** Paste, test, save and remove an API key. The saved key itself is never shown again. */
function KeyField(props: {
  name: string
  configured: boolean
  placeholder: string
  test: (key?: string) => Promise<string>
  save: (key: string | null) => Promise<void>
  help?: ReactNode
}) {
  const [key, setKey] = useState('')
  const [check, setCheck] = useState<Check>({ kind: 'idle' })
  const [replacing, setReplacing] = useState(false)

  const runTest = async (candidate?: string) => {
    setCheck({ kind: 'checking' })
    try {
      setCheck({ kind: 'ok', message: await props.test(candidate) })
      return true
    } catch (error) {
      setCheck({ kind: 'error', message: cleanError(error) })
      return false
    }
  }

  const save = async () => {
    try {
      await props.save(key.trim())
      setKey('')
      setReplacing(false)
      showToast(`${props.name} key saved`)
      void runTest()
    } catch (error) {
      setCheck({ kind: 'error', message: cleanError(error) })
    }
  }

  const remove = async () => {
    if ((await confirmAction({ title: 'Remove key?', message: `Remove the saved ${props.name} key from this PC?`, confirmLabel: 'Remove', danger: true })) !== 'confirm') return
    await props.save(null)
    setCheck({ kind: 'idle' })
    showToast(`${props.name} key removed`)
  }

  return (
    <div className="field">
      <span className="field-label">API key</span>
      {props.configured && !replacing ? (
        <div className="key-row">
          <span className="key-saved">
            <CheckCircle2 size={15} /> Saved, encrypted on this PC
          </span>
          <button className="btn sm" onClick={() => void runTest()} disabled={check.kind === 'checking'}>
            Test
          </button>
          <button className="btn sm" onClick={() => setReplacing(true)}>
            Replace
          </button>
          <button className="btn sm danger" onClick={() => void remove()}>
            Remove
          </button>
        </div>
      ) : (
        <div className="key-row">
          <input
            className="input grow"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={props.placeholder}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label={`${props.name} API key`}
          />
          <button className="btn sm" disabled={!key.trim() || check.kind === 'checking'} onClick={() => void runTest(key.trim())}>
            Test
          </button>
          <button className="btn sm primary" disabled={!key.trim()} onClick={() => void save()}>
            Save
          </button>
          {replacing && (
            <button className="btn sm ghost" onClick={() => setReplacing(false)}>
              Cancel
            </button>
          )}
        </div>
      )}
      {props.help && <span className="muted small">{props.help}</span>}
      {check.kind === 'checking' && (
        <span className="small row" style={{ gap: 6 }}>
          <span className="spinner" /> Checking…
        </span>
      )}
      {check.kind === 'error' && <span className="small error-text">{check.message}</span>}
      {check.kind === 'ok' && <span className="small ok-text">{check.message}</span>}
    </div>
  )
}

// ---------------------------------------------------------------- General

function GeneralTab() {
  const prefs = usePrefs()
  if (!prefs) return <span className="spinner" />
  return (
    <>
      <section className="settings-section">
        <Heading title="Appearance" />
        <Segmented
          block
          value={prefs.theme}
          label="Theme"
          onChange={(theme) => void updatePrefs({ theme })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'Same as Windows' }
          ]}
        />
      </section>
      <section className="settings-section">
        <Heading title="Saving" />
        <div className="stack" style={{ gap: 12 }}>
          <Switch
            label="Autosave"
            hint="Designs that already have a file are saved a few seconds after each change. New designs get a recovery copy until you save them."
            checked={prefs.autosave}
            onChange={(autosave) => void updatePrefs({ autosave })}
          />
          <p className="muted small" style={{ margin: 0 }}>
            Even with autosave off, a recovery copy of unsaved work is kept, so a crash or power cut never loses more than a few seconds. Recovered designs are offered on the home screen.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <Heading title="Canvas" />
        <div className="stack" style={{ gap: 12 }}>
          <Switch label="Show rulers" checked={prefs.showRulers} onChange={(showRulers) => void updatePrefs({ showRulers })} />
          <Switch label="Snap to page, elements and guides" checked={prefs.snapping} onChange={(snapping) => void updatePrefs({ snapping })} />
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------- Photos

const photoInfo: Record<PhotoProviderId, { name: string; keyUrl: string; terms: string; help: string }> = {
  unsplash: {
    name: 'Unsplash',
    keyUrl: 'https://unsplash.com/oauth/applications',
    terms: 'https://unsplash.com/api-terms',
    help: 'Create a free developer account, then “New Application” and copy its Access Key. New applications start in demo mode (50 searches per hour), which is plenty for personal use.'
  },
  pexels: {
    name: 'Pexels',
    keyUrl: 'https://www.pexels.com/api/',
    terms: 'https://www.pexels.com/api/documentation/#guidelines',
    help: 'Sign in to Pexels, open “Image & Video API” and request your free API key.'
  }
}

function PhotosTab() {
  const prefs = usePrefs()
  const [state, setState] = useState<Record<PhotoProviderId, ServiceState> | null>(null)
  useEffect(() => {
    window.api.photos.state().then(setState).catch(() => setState(null))
  }, [])
  return (
    <>
      <p className="settings-intro">
        Optional. Stock photo search sends only your search words to the provider. Thumbnails load from the provider’s servers, and the photo you choose is downloaded into your design with the
        photographer’s credit. Uploading your own images always works without a key.
      </p>
      {(['unsplash', 'pexels'] as const).map((id) => (
        <section key={id} className="settings-section">
          <Heading title={photoInfo[id].name} badge={<span className="badge online">Online · optional</span>} />
          <KeyField
            name={photoInfo[id].name}
            configured={state?.[id]?.configured ?? false}
            placeholder={`Paste your ${photoInfo[id].name} ${id === 'unsplash' ? 'Access Key' : 'API key'}`}
            test={async (key) => {
              const r = await window.api.photos.test(id, key)
              return `Connected.${r.remaining !== null ? ` ${r.remaining} requests left this hour.` : ''}`
            }}
            save={async (key) => setState(await window.api.photos.setKey(id, key))}
            help={
              <>
                {photoInfo[id].help} {link(photoInfo[id].keyUrl, 'Get a key')} · {link(photoInfo[id].terms, 'API terms')}
              </>
            }
          />
          {prefs && (
            <label className="radio small" style={{ marginTop: 8 }}>
              <input type="radio" checked={prefs.photoProvider === id} onChange={() => void updatePrefs({ photoProvider: id })} /> Use {photoInfo[id].name} in the Photos panel
            </label>
          )}
        </section>
      ))}
    </>
  )
}

// ---------------------------------------------------------------- AI

function AiTab() {
  const prefs = usePrefs()
  const [providers, setProviders] = useState<AiProviderState[] | null>(null)
  const [log, setLog] = useState<AiLogEntry[]>([])
  const [adding, setAdding] = useState('')

  const reload = async () => {
    setProviders(await window.api.ai.providers())
    setLog(await window.api.ai.log())
  }
  useEffect(() => {
    void reload().catch(() => setProviders([]))
  }, [])

  const add = async (presetId: string) => {
    const preset = aiPresets.find((p) => p.id === presetId)
    if (!preset) return
    const taken = providers?.some((p) => p.id === preset.id)
    const id = taken ? `${preset.id}-${nanoid(4).toLowerCase()}` : preset.id
    try {
      setProviders(
        await window.api.ai.saveProvider({
          id,
          label: preset.label,
          protocol: preset.protocol,
          baseUrl: preset.baseUrl || 'https://',
          model: '',
          imageModel: preset.imageModel,
          enabled: true,
          local: preset.local
        })
      )
    } catch {
      // A custom service needs its address first; add it with a placeholder the user then edits.
      setProviders(await window.api.ai.saveProvider({ id, label: preset.label, protocol: preset.protocol, baseUrl: 'https://example.com/v1', model: '', imageModel: '', enabled: false, local: false }))
    }
    setAdding('')
  }

  // Same rule as the AI Studio: the chosen provider if it is ready, otherwise the first ready one.
  const ready = (providers ?? []).filter((p) => p.enabled && p.model && (p.local || p.hasKey))
  const activeId = (ready.find((p) => p.id === prefs?.activeAiProvider) ?? ready[0])?.id

  return (
    <>
      <p className="settings-intro">
        AI Studio works with a model on this PC (free, private) or with your own key for an online service. Requests are made by the app’s background process, keys are encrypted with Windows, and
        online services are only contacted after you agree. Prompts and keys are never written to logs or design files.
      </p>
      <section className="settings-section">
        <Heading title="Your providers" />
        {providers === null && <span className="spinner" />}
        {providers?.length === 0 && <p className="small muted">No AI provider yet. Add one below.</p>}
        {providers?.map((p) => (
          <ProviderCard key={p.id} provider={p} active={activeId === p.id} onChange={setProviders} />
        ))}
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <select className="select grow" value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Provider to add">
            <option value="">Add a provider…</option>
            {aiPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.local ? ' · free, runs on this PC' : ''}
              </option>
            ))}
          </select>
          <button className="btn primary" disabled={!adding} onClick={() => void add(adding)}>
            <Plus size={15} /> Add
          </button>
        </div>
        {adding && <p className="small muted">{aiPresets.find((p) => p.id === adding)?.note}</p>}
      </section>
      <section className="settings-section">
        <Heading title="Recent AI activity" badge={<button className="btn sm ghost" onClick={() => void reload()}>Refresh</button>} />
        {log.length === 0 ? (
          <p className="small muted">No requests yet. Only the time, provider, model, feature, duration and token counts are recorded here, and only until the app closes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Feature</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Tokens in / out</th>
                  <th>Time taken</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 30).map((e, i) => (
                  <tr key={i}>
                    <td>{new Date(e.time).toLocaleTimeString()}</td>
                    <td>{e.feature}</td>
                    <td>{e.provider}</td>
                    <td>{e.model}</td>
                    <td>
                      {e.inputTokens ?? '–'} / {e.outputTokens ?? '–'}
                    </td>
                    <td>{(e.ms / 1000).toFixed(1)} s</td>
                    <td className={e.ok ? 'ok-text' : 'error-text'} title={e.error}>
                      {e.ok ? 'OK' : 'Failed'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">Token counts are what the provider reported. Costs depend on your plan; check the provider’s pricing page.</p>
      </section>
    </>
  )
}

function ProviderCard({ provider: p, active, onChange }: { provider: AiProviderState; active: boolean; onChange: (list: AiProviderState[]) => void }) {
  const preset = presetFor(p.id)
  const [models, setModels] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(p.baseUrl)

  const save = async (patch: Partial<AiProviderState>) => {
    try {
      setError(null)
      const { hasKey: _k, consent: _c, ...config } = { ...p, ...patch }
      onChange(await window.api.ai.saveProvider(config))
    } catch (e) {
      setError(cleanError(e))
    }
  }

  const loadModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.api.ai.listModels(p.id)
      setModels(list)
      if (list.length === 0) setError('The service returned no models. For Ollama, run “ollama pull llama3.2” first.')
      else if (!p.model) void save({ model: list[0] })
    } catch (e) {
      setError(cleanError(e))
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if ((await confirmAction({ title: `Remove ${p.label}?`, message: 'Its settings and saved key are deleted from this PC.', confirmLabel: 'Remove', danger: true })) !== 'confirm') return
    onChange(await window.api.ai.removeProvider(p.id))
  }

  const needsKey = !p.local
  const ready = p.enabled && !!p.model && (p.local || p.hasKey)

  return (
    <div className={`provider-card${active ? ' active' : ''}`}>
      <div className="settings-heading">
        <h3>
          {p.label} {active && <span className="badge accent">In use</span>}
        </h3>
        <span className="row" style={{ gap: 6 }}>
          <span className={`badge ${p.local ? 'local' : 'online'}`}>{p.local ? 'On this PC' : 'Online'}</span>
          <span className={`badge ${ready ? 'ok' : 'warn'}`}>{ready ? 'Ready' : !p.enabled ? 'Off' : !p.model ? 'Choose a model' : 'Needs key'}</span>
        </span>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {(preset?.id === 'custom' || p.local) && (
          <label className="field">
            <span className="field-label">Service address</span>
            <div className="key-row">
              <input className="input grow" value={baseUrl} spellCheck={false} onChange={(e) => setBaseUrl(e.target.value)} />
              <button className="btn sm" disabled={baseUrl === p.baseUrl} onClick={() => void save({ baseUrl: baseUrl.trim(), enabled: true })}>
                Save
              </button>
            </div>
          </label>
        )}
        {needsKey && (
          <KeyField
            name={p.label}
            configured={p.hasKey}
            placeholder={`Paste your ${p.label} API key`}
            test={async (key) => {
              // Without a model yet, listing the models still proves the key works.
              if (!p.model) {
                const list = await window.api.ai.listModels(p.id, key)
                return `Key works. ${list.length} model${list.length === 1 ? '' : 's'} available: choose one below.`
              }
              const r = await window.api.ai.test(p.id, key)
              return `Connected to ${r.model}.`
            }}
            save={async (key) => onChange(await window.api.ai.setKey(p.id, key))}
            help={
              preset?.keyUrl && (
                <>
                  {link(preset.keyUrl, 'Get a key')}
                  {preset.pricingUrl && <> · {link(preset.pricingUrl, 'Pricing and free limits')}</>}
                </>
              )
            }
          />
        )}
        <div className="field">
          <span className="field-label">Model</span>
          <div className="key-row">
            {models && models.length > 0 ? (
              <select className="select grow" value={p.model} onChange={(e) => void save({ model: e.target.value })}>
                {!models.includes(p.model) && p.model && <option value={p.model}>{p.model}</option>}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input grow" value={p.model} placeholder="Load the list, or type a model name" spellCheck={false} onChange={(e) => void save({ model: e.target.value.trim() })} />
            )}
            <button className="btn sm" disabled={loading || (needsKey && !p.hasKey)} onClick={() => void loadModels()}>
              {loading ? <span className="spinner" /> : null} Load models
            </button>
          </div>
          {p.local && <span className="muted small">{preset?.note}</span>}
        </div>
        {p.protocol === 'openai' && !p.local && (
          <label className="field">
            <span className="field-label">Image model (optional, for “Generate an image”)</span>
            <input className="input" value={p.imageModel} placeholder="Leave empty if the service cannot make images" spellCheck={false} onChange={(e) => void save({ imageModel: e.target.value.trim() })} />
          </label>
        )}
        {error && <span className="small error-text">{error}</span>}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Switch label="Enabled" checked={p.enabled} onChange={(enabled) => void save({ enabled })} />
          {!active && ready && (
            <button
              className="btn sm"
              onClick={() =>
                void window.api.ai.setActive(p.id).then(() => {
                  const prefs = uiStore.getState().prefs
                  if (prefs) uiStore.setState({ prefs: { ...prefs, activeAiProvider: p.id } })
                })
              }
            >
              Use this one
            </button>
          )}
          {!p.local && p.consent && (
            <button className="btn sm ghost" onClick={async () => onChange(await window.api.ai.setConsent(p.id, false))}>
              Withdraw consent
            </button>
          )}
          <span className="grow" />
          <button className="btn sm danger" onClick={() => void remove()}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- remove.bg

function RemoveBgTab() {
  const [state, setState] = useState<RemoveBgState | null>(null)
  useEffect(() => {
    window.api.removeBg.state().then(setState).catch(() => setState({ configured: false, consent: false }))
  }, [])
  const describe = (a: RemoveBgAccount) => `Connected.${a.freeCalls !== null ? ` Free calls left this month: ${a.freeCalls}.` : ''}${a.credits !== null ? ` Credits: ${a.credits}.` : ''}`
  return (
    <section className="settings-section">
      <Heading title="remove.bg" badge={<span className="badge online">Online · optional</span>} />
      <p className="muted small">
        Removes the background from a selected photo. The image is uploaded to remove.bg and the result is downloaded back into your design. Your remove.bg account gets a number of free calls each
        month; after that, remove.bg charges credits on your account. This app never buys credits.
      </p>
      <p className="notice small">remove.bg has announced that its standalone service is moving to Canva on 1 December 2026, so this API may stop working after that date. A local, offline background remover is on the roadmap.</p>
      <KeyField
        name="remove.bg"
        configured={state?.configured ?? false}
        placeholder="Paste your remove.bg API key"
        test={async (key) => describe(await window.api.removeBg.check(key))}
        save={async (key) => setState(await window.api.removeBg.setKey(key))}
        help={<>Get a key at {link('https://www.remove.bg/dashboard#api-key', 'remove.bg › Dashboard › API keys')}. It is stored with Windows encryption and never saved in design files or exports.</>}
      />
      {state?.configured && state.consent && (
        <label className="checkbox small" style={{ marginTop: 10 }}>
          <input type="checkbox" checked onChange={async () => setState(await window.api.removeBg.setConsent(false))} />
          Allowed to send images to remove.bg (untick to be asked again)
        </label>
      )}
    </section>
  )
}

// ---------------------------------------------------------------- About

function AboutTab() {
  return (
    <>
      <section className="settings-section">
        <Heading title="Offline Design Studio" />
        <p className="small">
          A design editor that runs entirely on this PC. There is no account, no cloud and no tracking. Designs are ordinary <code>.odesign</code> files wherever you save them.
        </p>
      </section>
      <section className="settings-section">
        <Heading title="What goes online, and when" />
        <ul className="small" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
          <li>Nothing, unless you add a key or a local AI model in these settings.</li>
          <li>Stock photos: your search words go to Unsplash or Pexels; photo thumbnails load from their servers.</li>
          <li>AI Studio: what each tool describes (your prompt, and for the layout assistant a text summary of the page) goes to the provider you chose, after you agree. Local models send nothing out.</li>
          <li>Background removal: the selected image goes to remove.bg, after you agree.</li>
        </ul>
      </section>
      <section className="settings-section">
        <Heading title="Credits and licences" />
        <ul className="small" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
          <li>Icons: {link('https://lucide.dev', 'Lucide')} (ISC licence).</li>
          <li>Fonts: open-source fonts under the SIL Open Font Licence, bundled through Fontsource.</li>
          <li>Templates, elements and illustrations: original work made for this app, free to use.</li>
          <li>Stock photos: under the {link('https://unsplash.com/license', 'Unsplash')} or {link('https://www.pexels.com/license/', 'Pexels')} licence; credits are kept in your design.</li>
          <li>Inspired by the workflow of online design tools; not affiliated with or endorsed by Canva.</li>
        </ul>
      </section>
    </>
  )
}
