import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Eraser,
  Expand,
  ImagePlus,
  LayoutDashboard,
  PenLine,
  RefreshCw,
  Settings,
  Sparkles,
  SunMedium,
  Wand2,
  WandSparkles,
  ZoomIn
} from 'lucide-react'
import { editPrompt, layoutPrompt, parseEdits, parseLayout, parseSuggestions, type LayoutEdit } from '@shared/aiLayout'
import type { AiProviderState } from '@shared/ipc'
import type { DesignDocument, Page } from '@shared/model'
import { SCHEMA_VERSION } from '@shared/model'
import { Modal, Segmented, Switch } from '@renderer/components/ui'
import { cleanError, showToast } from '@renderer/components/toast'
import { createText } from '@renderer/editor/elementFactory'
import { renderThumbnail } from '@renderer/export/renderDesign'
import { fonts } from '@renderer/fonts/fontList'
import { addTemplatePages, insertImage } from '@renderer/io/projectIo'
import { editPatches, layoutToPage, summarizePage } from '@renderer/ai/layoutToPage'
import { providerHost, useAi, type ConsentRequest } from '@renderer/ai/useAi'
import { searchTemplates, templateDocument } from '@renderer/library/templates'
import { editor, editorStore, selectActivePage, selectedElements, useEditor } from '@renderer/store/editorStore'
import { openDialog, usePrefs } from '@renderer/store/uiStore'
import { applyTemplate } from './DesignPanel'
import { brandFonts, insertElements, PanelFrame } from './common'

type Tab = 'design' | 'write' | 'layout' | 'photo'

const styles = ['Modern', 'Minimal', 'Bold', 'Playful', 'Elegant', 'Corporate', 'Retro']

/** AI Studio: the design, writing, layout and photo assistants, with honest labels for what each one needs. */
export function AiPanel({ doc }: { doc: DesignDocument }) {
  const ai = useAi()
  const [tab, setTab] = useState<Tab>('design')

  return (
    <PanelFrame
      title={
        <span className="row" style={{ gap: 8 }}>
          <Sparkles size={17} style={{ color: 'var(--accent)' }} /> AI Studio
        </span>
      }
      action={
        <button className="icon-btn sm" title="AI settings" aria-label="AI settings" onClick={() => openDialog('settings', 'ai')}>
          <Settings size={15} />
        </button>
      }
      head={
        <div className="ai-tabs" role="tablist">
          {(
            [
              ['design', 'Design', <WandSparkles key="d" size={17} />],
              ['write', 'Write', <PenLine key="w" size={17} />],
              ['layout', 'Layout', <LayoutDashboard key="l" size={17} />],
              ['photo', 'Photo', <ImagePlus key="p" size={17} />]
            ] as const
          ).map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {icon}
              {label}
            </button>
          ))}
        </div>
      }
    >
      <ProviderBar providers={ai.usable} active={ai.active} loaded={ai.providers !== null} onPick={ai.setActive} />
      {tab === 'design' && <DesignAssistant doc={doc} ai={ai} />}
      {tab === 'write' && <WritingAssistant doc={doc} ai={ai} />}
      {tab === 'layout' && <LayoutAssistant doc={doc} ai={ai} />}
      {tab === 'photo' && <PhotoTools ai={ai} />}
      {ai.consent && <ConsentDialog request={ai.consent} />}
    </PanelFrame>
  )
}

type Ai = ReturnType<typeof useAi>

function ProviderBar({ providers, active, loaded, onPick }: { providers: AiProviderState[]; active: AiProviderState | null; loaded: boolean; onPick: (id: string) => void }) {
  if (!loaded) return null
  if (!active)
    return (
      <div className="ai-hero" style={{ marginTop: 4 }}>
        <h3>
          <Bot size={17} /> Connect an AI provider
        </h3>
        <p className="small muted" style={{ margin: '6px 0 10px' }}>
          The assistants need an AI model. Use a free local model with Ollama or LM Studio (private, nothing leaves this PC), or your own key for Gemini, Groq, OpenRouter, OpenAI or Anthropic. Nothing is
          sent anywhere until you set one up and agree.
        </p>
        <button className="btn primary sm" onClick={() => openDialog('settings', 'ai')}>
          <Settings size={14} /> Set up AI
        </button>
      </div>
    )
  return (
    <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
      <span className={`badge ${active.local ? 'local' : 'online'}`}>{active.local ? 'On this PC' : 'Online'}</span>
      {providers.length > 1 ? (
        <select className="select sm grow" value={active.id} onChange={(e) => onPick(e.target.value)} aria-label="AI provider">
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} · {p.model}
            </option>
          ))}
        </select>
      ) : (
        <span className="small muted grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active.label} · {active.model}
        </span>
      )}
    </div>
  )
}

function ConsentDialog({ request }: { request: ConsentRequest }) {
  return (
    <Modal
      title={`Send to ${request.provider.label}?`}
      onClose={() => request.resolve(false)}
      footer={
        <>
          <button className="btn ghost" onClick={() => request.resolve(false)}>
            Cancel
          </button>
          <button className="btn primary" onClick={() => request.resolve(true)}>
            Agree and send
          </button>
        </>
      }
    >
      <p>
        {request.what} will be sent over the internet to <strong>{request.provider.label}</strong> ({providerHost(request.provider)}) using your API key, and processed under that provider’s terms and privacy
        policy. Some providers’ free tiers may use requests to improve their models.
      </p>
      <p className="muted small">Your API key stays encrypted on this PC. Images and the rest of your design are not sent unless a tool says so. You will be asked once for this provider; withdraw consent any time in Settings › AI.</p>
    </Modal>
  )
}

function Busy({ label }: { label: string }) {
  return (
    <div className="row" style={{ gap: 8, padding: '10px 0' }}>
      <span className="spinner" /> <span className="small muted">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------- Design assistant

function DesignAssistant({ doc, ai }: { doc: DesignDocument; ai: Ai }) {
  const prefs = usePrefs()
  const [brief, setBrief] = useState('')
  const [style, setStyle] = useState('Modern')
  const [useBrand, setUseBrand] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ page: Page; skipped: number; title: string } | null>(null)
  const preview = useRef<HTMLDivElement>(null)

  const generate = async () => {
    if (!brief.trim()) return
    setBusy(true)
    setError(null)
    const brand = prefs?.brand
    const prompt = layoutPrompt({
      width: doc.width,
      height: doc.height,
      brief,
      style,
      brandColors: useBrand ? brand?.colors : undefined,
      brandName: useBrand ? brand?.name : undefined,
      fonts: fonts.filter((f) => f.bundled).map((f) => f.family)
    })
    const answer = await ai.send(
      {
        feature: 'Design assistant',
        json: true,
        maxTokens: 4000,
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'You are a senior graphic designer. You answer with a single JSON object and nothing else.' },
          { role: 'user', content: prompt }
        ]
      },
      'Your design request (the words you typed, the page size and your brand colours)'
    )
    setBusy(false)
    if ('error' in answer) return setError(answer.error)
    try {
      const { layout, skipped } = parseLayout(answer.text)
      const fallback = useBrand && brand ? { heading: brand.headingFont, body: brand.bodyFont } : { heading: 'Poppins', body: 'Inter' }
      setResult({ page: layoutToPage(layout, doc, fallback), skipped, title: layout.title })
    } catch (e) {
      setError(cleanError(e, 'The AI answer could not be used.'))
    }
  }

  useEffect(() => {
    if (!result || !preview.current) return
    const tmp: DesignDocument = { schemaVersion: SCHEMA_VERSION, title: result.title, width: doc.width, height: doc.height, pages: [result.page], assets: [] }
    let cancelled = false
    void renderThumbnail(tmp, result.page, 520).then((canvas) => {
      if (!cancelled && preview.current) preview.current.replaceChildren(canvas)
    })
    return () => {
      cancelled = true
    }
  }, [result, doc.width, doc.height])

  const accept = (replace: boolean) => {
    if (!result) return
    const tmp: DesignDocument = { schemaVersion: SCHEMA_VERSION, title: result.title, width: doc.width, height: doc.height, pages: [result.page], assets: [] }
    if (replace) {
      const pageId = editorStore.getState().activePageId
      editor.change('AI design', (d) => {
        const i = d.pages.findIndex((p) => p.id === pageId)
        d.pages.splice(i < 0 ? 0 : i, 1, structuredClone(result.page))
      })
      editor.setActivePage(result.page.id)
    } else {
      // The button already says "Add as new page", so don't ask again.
      addTemplatePages(tmp, false)
    }
    setResult(null)
    showToast('Added. Everything is editable; drop photos onto the grey frames.')
  }

  // Offline: templates that match the words typed.
  const matches = brief.trim() ? searchTemplates(brief.split(/\s+/).filter((w) => w.length > 3).slice(0, 1).join(' ')).slice(0, 4) : []

  return (
    <div className="panel-section">
      <label className="field">
        <span className="field-label">Describe the design you need</span>
        <textarea
          className="textarea"
          rows={4}
          value={brief}
          maxLength={1500}
          placeholder="e.g. Instagram post for a bakery’s weekend croissant sale, 20% off, warm and friendly"
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && void generate()}
        />
      </label>
      <div className="chips" style={{ flexWrap: 'wrap', margin: '8px 0' }}>
        {styles.map((s) => (
          <button key={s} className={`chip${style === s ? ' on' : ''}`} onClick={() => setStyle(s)}>
            {s}
          </button>
        ))}
      </div>
      <Switch label="Use my brand colours and fonts" checked={useBrand} onChange={setUseBrand} />
      <button className="btn primary block" style={{ marginTop: 10 }} disabled={!ai.active || busy || !brief.trim()} onClick={() => void generate()}>
        <Wand2 size={16} /> {result ? 'Generate another' : 'Generate design'}
      </button>
      {busy && <Busy label="Designing… this can take up to a minute with local models." />}
      {error && <div className="notice error" style={{ marginTop: 10 }}>{error}</div>}

      {result && (
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          <div className="ai-preview" ref={preview} />
          {result.skipped > 0 && <p className="small muted">{result.skipped} part{result.skipped === 1 ? ' was' : 's were'} not valid and left out.</p>}
          <div className="tool-row">
            <button className="btn primary sm" onClick={() => accept(false)}>
              <Check size={14} /> Add as new page
            </button>
            <button className="btn sm" onClick={() => accept(true)}>
              Replace this page
            </button>
            <button className="btn sm ghost" onClick={() => void generate()} disabled={busy}>
              <RefreshCw size={14} /> Regenerate
            </button>
          </div>
          <p className="small muted">AI output can be wrong; check the text before you publish.</p>
        </div>
      )}

      {matches.length > 0 && !result && (
        <div style={{ marginTop: 14 }}>
          <span className="field-label">Works offline: matching templates</span>
          <div className="tool-row" style={{ marginTop: 6 }}>
            {matches.map((t) => (
              <button key={t.id} className="btn sm" onClick={() => void applyTemplate(templateDocument(t), `builtin:${t.id}`)}>
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Writing assistant

const rewrites = [
  { id: 'shorter', label: 'Shorter', instruction: 'Make it shorter and punchier, keeping the meaning.' },
  { id: 'longer', label: 'Longer', instruction: 'Expand it a little with one or two helpful details.' },
  { id: 'formal', label: 'Professional', instruction: 'Rewrite it in a clear, professional tone.' },
  { id: 'friendly', label: 'Friendly', instruction: 'Rewrite it in a warm, friendly tone.' },
  { id: 'fix', label: 'Fix grammar', instruction: 'Correct spelling, grammar and punctuation only. Keep the wording otherwise.' },
  { id: 'translate', label: 'Translate', instruction: 'Translate it into {language}.' }
]

function WritingAssistant({ doc, ai }: { doc: DesignDocument; ai: Ai }) {
  const selectedText = useEditor((s) => {
    const page = selectActivePage(s)
    const el = page?.elements.find((e) => s.selectedIds.length === 1 && e.id === s.selectedIds[0])
    return el?.type === 'text' ? el : null
  })
  const [mode, setMode] = useState<'new' | 'rewrite' | 'headlines'>('new')
  const [prompt, setPrompt] = useState('')
  const [language, setLanguage] = useState('Spanish')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    if (selectedText && mode === 'new') setMode('rewrite')
  }, [selectedText?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (instruction: string, source: string) => {
    setBusy(true)
    setError(null)
    setSuggestions([])
    const answer = await ai.send(
      {
        feature: 'Writing assistant',
        json: true,
        maxTokens: 1200,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'You are a concise copywriter for graphic designs. Answer only with JSON: {"suggestions": [string, ...]}.' },
          { role: 'user', content: `${instruction}\nGive 3 alternative versions.\n\n${source}` }
        ]
      },
      mode === 'rewrite' ? 'The selected text and your instruction' : 'The words you typed'
    )
    setBusy(false)
    if ('error' in answer) return setError(answer.error)
    const list = parseSuggestions(answer.text, 6)
    if (list.length === 0) setError('The AI answer was empty. Try again.')
    setSuggestions(list)
  }

  const place = (value: string) => {
    if (selectedText && mode === 'rewrite') {
      editor.updateElement(selectedText.id, { text: value }, 'AI rewrite')
    } else {
      const fontsFor = brandFonts()
      insertElements([createText(doc, mode === 'headlines' ? 'heading' : 'body', fontsFor, { text: value })], 'Add AI text')
    }
  }

  return (
    <div className="panel-section">
      <Segmented
        block
        value={mode}
        onChange={(m) => {
          setMode(m)
          setSuggestions([])
        }}
        options={[
          { value: 'new', label: 'Write' },
          { value: 'rewrite', label: 'Rewrite' },
          { value: 'headlines', label: 'Headlines' }
        ]}
      />
      {mode === 'rewrite' ? (
        selectedText ? (
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            <div className="ai-result" style={{ maxHeight: 100, overflow: 'auto' }}>
              {selectedText.text}
            </div>
            <div className="tool-row">
              {rewrites.map((r) => (
                <button key={r.id} className="btn sm" disabled={!ai.active || busy} onClick={() => void run(r.instruction.replace('{language}', language), `Text: """${selectedText.text}"""`)}>
                  {r.label}
                </button>
              ))}
            </div>
            <label className="field">
              <span className="field-label">Translate into</span>
              <input className="input sm" value={language} onChange={(e) => setLanguage(e.target.value.slice(0, 40))} />
            </label>
          </div>
        ) : (
          <p className="small muted" style={{ marginTop: 10 }}>
            Select a text box on the page to rewrite it.
          </p>
        )
      ) : (
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          <textarea
            className="textarea"
            rows={3}
            value={prompt}
            maxLength={1000}
            placeholder={mode === 'headlines' ? 'What is it about? e.g. a summer yoga retreat by the sea' : 'What should it say? e.g. a short welcome message for a café menu'}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button
            className="btn primary block"
            disabled={!ai.active || busy || !prompt.trim()}
            onClick={() =>
              void run(
                mode === 'headlines' ? 'Write short, catchy headlines (at most 8 words each) for a design about the topic below.' : 'Write short copy for a graphic design as described below. Keep each version under 60 words.',
                `Topic: """${prompt}"""`
              )
            }
          >
            <PenLine size={15} /> {mode === 'headlines' ? 'Suggest headlines' : 'Write text'}
          </button>
        </div>
      )}
      {busy && <Busy label="Writing…" />}
      {error && <div className="notice error" style={{ marginTop: 10 }}>{error}</div>}
      {suggestions.map((s, i) => (
        <div key={i} className="ai-result" style={{ marginTop: 8 }}>
          {s}
          <div className="tool-row" style={{ marginTop: 6 }}>
            <button className="btn sm" onClick={() => place(s)}>
              {selectedText && mode === 'rewrite' ? 'Replace text' : 'Add to page'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- Layout assistant

const layoutExamples = ['Make the headline bigger and centre it', 'Use a dark background with light text', 'Line everything up on the left margin', 'Make it feel more minimal']

function LayoutAssistant({ doc, ai }: { doc: DesignDocument; ai: Ai }) {
  const page = useEditor(selectActivePage) ?? doc.pages[0]
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState<{ summary: string; edits: LayoutEdit[]; skipped: number } | null>(null)

  const ask = async () => {
    setBusy(true)
    setError(null)
    setPlan(null)
    const answer = await ai.send(
      {
        feature: 'Layout assistant',
        json: true,
        maxTokens: 3000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'You are a precise layout designer. You answer with a single JSON object and nothing else.' },
          {
            role: 'user',
            content: editPrompt({ width: doc.width, height: doc.height, request, items: summarizePage(page), background: page.background, fonts: fonts.map((f) => f.family) })
          }
        ]
      },
      'A text description of this page (element types, positions, colours and the words in your text boxes; no images) and your request'
    )
    setBusy(false)
    if ('error' in answer) return setError(answer.error)
    try {
      const result = parseEdits(answer.text, new Set(page.elements.map((e) => e.id)), doc)
      if (result.edits.length === 0) setError('The AI did not suggest any changes it could make. Try describing the change differently.')
      else setPlan(result)
    } catch (e) {
      setError(cleanError(e, 'The AI answer could not be used.'))
    }
  }

  const apply = () => {
    if (!plan) return
    const { patches, deletes, background } = editPatches(page, plan.edits)
    editor.changePage('AI layout changes', (p) => {
      for (const el of p.elements) if (patches[el.id]) Object.assign(el, patches[el.id])
      p.elements = p.elements.filter((el) => !deletes.includes(el.id) || el.locked)
      if (background) {
        p.background = background
        delete p.backgroundGradient
      }
    })
    setPlan(null)
    showToast('Changes applied. Press Ctrl+Z to undo them all at once.')
  }

  // Offline helpers that need no AI.
  const centreAll = () =>
    editor.changePage('Centre everything', (p) => {
      for (const el of p.elements) if (!el.locked) el.x = (doc.width - el.width) / 2
    })
  const spaceEvenly = () =>
    editor.changePage('Space evenly', (p) => {
      const items = p.elements.filter((el) => !el.locked && el.width < doc.width * 0.95).sort((a, b) => a.y - b.y)
      if (items.length < 2) return
      const margin = doc.height * 0.08
      const total = items.reduce((s, el) => s + el.height, 0)
      const gap = Math.max(0, (doc.height - margin * 2 - total) / (items.length - 1))
      let y = margin
      for (const el of items) {
        el.y = y
        y += el.height + gap
      }
    })

  const counts = plan ? plan.edits.reduce((m, e) => ((m[e.op] = (m[e.op] ?? 0) + 1), m), {} as Record<string, number>) : {}

  return (
    <div className="panel-section">
      <label className="field">
        <span className="field-label">What should change on this page?</span>
        <textarea className="textarea" rows={3} value={request} maxLength={1000} placeholder="e.g. Make the title larger and move the date under it" onChange={(e) => setRequest(e.target.value)} />
      </label>
      <div className="chips" style={{ flexWrap: 'wrap', margin: '8px 0' }}>
        {layoutExamples.map((x) => (
          <button key={x} className="chip" onClick={() => setRequest(x)}>
            {x}
          </button>
        ))}
      </div>
      <button className="btn primary block" disabled={!ai.active || busy || !request.trim() || page.elements.length === 0} onClick={() => void ask()}>
        <Sparkles size={15} /> Suggest changes
      </button>
      {page.elements.length === 0 && <p className="small muted">This page is empty. Add something first, or use the Design tab.</p>}
      {busy && <Busy label="Looking at your page…" />}
      {error && <div className="notice error" style={{ marginTop: 10 }}>{error}</div>}
      {plan && (
        <div className="ai-result" style={{ marginTop: 10 }}>
          <strong>{plan.summary || 'Suggested changes'}</strong>
          <div className="small muted" style={{ marginTop: 4 }}>
            {[counts.update && `${counts.update} element${counts.update === 1 ? '' : 's'} changed`, counts.delete && `${counts.delete} removed`, counts.background && 'background changed'].filter(Boolean).join(' · ')}
            {plan.skipped > 0 && ` · ${plan.skipped} invalid suggestion${plan.skipped === 1 ? '' : 's'} ignored`}
          </div>
          <div className="tool-row" style={{ marginTop: 8 }}>
            <button className="btn primary sm" onClick={apply}>
              <Check size={14} /> Apply
            </button>
            <button className="btn sm ghost" onClick={() => setPlan(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <span className="field-label">Quick fixes (offline)</span>
        <div className="tool-row" style={{ marginTop: 6 }}>
          <button className="btn sm" onClick={centreAll} disabled={page.elements.length === 0}>
            Centre everything
          </button>
          <button className="btn sm" onClick={spaceEvenly} disabled={page.elements.length < 2}>
            Space evenly top to bottom
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Photo tools

function Capability(props: { icon: React.ReactNode; title: string; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="capability">
      <span className="cap-icon">{props.icon}</span>
      <div className="grow">
        <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
          <strong>{props.title}</strong>
          {props.badge}
        </div>
        <div className="small muted" style={{ marginTop: 2 }}>
          {props.children}
        </div>
      </div>
    </div>
  )
}

function PhotoTools({ ai }: { ai: Ai }) {
  const imageProvider = ai.usable.find((p) => p.imageModel) ?? null
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<'1024x1024' | '1536x1024' | '1024x1536'>('1024x1024')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selected = useEditor((s) => s.selectedIds.length)
  const imageSelected = selected === 1 && selectedElements()[0]?.type === 'image'

  const generate = async () => {
    if (!imageProvider || !prompt.trim()) return
    if (!(await ai.ensureConsent(imageProvider, 'Your image description'))) return
    setBusy(true)
    setError(null)
    try {
      const image = await window.api.ai.generateImage({ providerId: imageProvider.id, prompt, size })
      await insertImage(image.bytes, image.mime, prompt.slice(0, 50), { credit: { source: `${imageProvider.label} (AI generated)`, author: 'AI image' }, saveToLibrary: true })
      showToast('Generated image added')
    } catch (e) {
      setError(cleanError(e, 'The image could not be generated.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel-section">
      <Capability icon={<ImagePlus size={16} />} title="Generate an image" badge={<span className={`badge ${imageProvider ? 'online' : 'planned'}`}>{imageProvider ? 'Online' : 'Needs set-up'}</span>}>
        {imageProvider ? (
          <>
            Uses {imageProvider.label} · {imageProvider.imageModel}. Image generation is usually paid per image; check your provider’s pricing.
            <textarea className="textarea" rows={2} style={{ marginTop: 8 }} value={prompt} maxLength={1000} placeholder="e.g. Watercolour lemons on a pale blue background" onChange={(e) => setPrompt(e.target.value)} />
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <select className="select sm" value={size} onChange={(e) => setSize(e.target.value as typeof size)} aria-label="Image size">
                <option value="1024x1024">Square</option>
                <option value="1536x1024">Landscape</option>
                <option value="1024x1536">Portrait</option>
              </select>
              <button className="btn primary sm grow" disabled={busy || !prompt.trim()} onClick={() => void generate()}>
                {busy ? <span className="spinner" /> : <Wand2 size={14} />} Generate
              </button>
            </div>
            {error && <div className="notice error" style={{ marginTop: 8 }}>{error}</div>}
          </>
        ) : (
          <>
            Needs a provider with an image model, such as OpenAI (set the image model in{' '}
            <a href="#" onClick={(e) => (e.preventDefault(), openDialog('settings', 'ai'))}>
              AI settings
            </a>
            ). Local text models cannot make images.
          </>
        )}
      </Capability>
      <Capability icon={<Eraser size={16} />} title="Remove background" badge={<span className="badge online">Online · remove.bg</span>}>
        {imageSelected ? 'Use “Background remover” in the panel on the right.' : 'Select a photo, then use “Background remover” in the panel on the right.'} Needs your own remove.bg key.
      </Capability>
      <Capability icon={<SunMedium size={16} />} title="Filters, crop, flip and frames" badge={<span className="badge offline">Offline</span>}>
        Select a photo to adjust brightness, contrast, colour, blur, crop and frame shape. Works without internet.
      </Capability>
      <Capability icon={<Wand2 size={16} />} title="Magic eraser (remove objects)" badge={<span className="badge planned">Planned</span>}>
        Not available yet.
      </Capability>
      <Capability icon={<ZoomIn size={16} />} title="Upscale / enhance" badge={<span className="badge planned">Planned</span>}>
        Not available yet.
      </Capability>
      <Capability icon={<Expand size={16} />} title="Expand image (fill beyond the edges)" badge={<span className="badge planned">Planned</span>}>
        Not available yet.
      </Capability>
    </div>
  )
}
