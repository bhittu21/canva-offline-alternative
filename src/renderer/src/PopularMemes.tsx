import { useEffect, useMemo, useRef, useState } from 'react'
import { Globe, Laugh } from 'lucide-react'
import type { MemeTemplateInfo } from '@shared/ipc'
import { LoadMore } from './components/ui'
import { showError, showToast } from './components/toast'
import { openAsNewDesign } from './io/projectIo'
import { loadFonts } from './fonts/fontList'
import { useNearView, usePaged } from './library/templateThumbs'
import { clearTemplateThumbs } from './library/templateThumbs'
import { loadMemeList, memePicture, popularMemeDocument, setRealMemes, useMemes, useRealMemesOn } from './library/realMemes'

/**
 * The top of the Memes gallery: the switch for real meme pictures
 * (memegen.link, online, off by default) and, when it is on, memegen's
 * popular meme templates.
 */
export function PopularMemes({ query }: { query: string }) {
  const on = useRealMemesOn()
  const list = useMemes((s) => s.list)
  const loading = useMemes((s) => s.loading)
  const error = useMemes((s) => s.error)

  useEffect(() => {
    if (on && !list) void loadMemeList()
  }, [on, list])

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (list ?? []).filter((t) => words.every((w) => `${t.name} ${t.id} ${t.keywords.join(' ')}`.toLowerCase().includes(w)))
  }, [list, query])
  const paged = usePaged(shown, 24)

  const toggle = async (next: boolean) => {
    await setRealMemes(next)
    clearTemplateThumbs()
  }

  if (!on)
    return (
      <div className="notice info meme-optin">
        <Laugh size={18} />
        <div>
          <strong>Want the classic meme photos?</strong> Design Studio can fetch real meme pictures (Drake, This is fine, Distracted boyfriend and 200 more) from{' '}
          <b>memegen.link</b>, a free meme service. They replace the drawings in these templates and add a Popular memes gallery.
          <div className="small" style={{ marginTop: 6 }}>
            This contacts api.memegen.link over the internet. Only the name of the meme picture is sent, never your designs or words. Downloaded pictures are kept on
            this PC, so they also work offline later. The photos belong to their owners; use them for personal, fair-use memes.
          </div>
          <button className="btn primary sm" style={{ marginTop: 10 }} onClick={() => void toggle(true)}>
            <Globe size={14} /> Turn on real meme pictures
          </button>
        </div>
      </div>
    )

  return (
    <div className="popular-memes">
      <div className="home-section-head">
        <h2>Popular memes</h2>
        <span className="small muted">Real meme pictures from memegen.link. Click one, then type your captions.</span>
        <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => void toggle(false)}>
          Turn off real pictures
        </button>
        <button
          className="btn sm ghost"
          title="Removes the meme pictures saved on this PC. Designs that already use one keep their copy."
          onClick={() =>
            void window.api.memes
              .clearCache()
              .then(() => showToast('Downloaded meme pictures deleted.'))
              .catch((e) => showError(e, 'Could not delete the pictures.'))
          }
        >
          Delete downloaded pictures
        </button>
      </div>
      {error && (
        <div className="notice error" style={{ marginBottom: 12 }}>
          {error}{' '}
          <button className="btn sm" onClick={() => void loadMemeList()}>
            Try again
          </button>
        </div>
      )}
      {loading && !list && <div className="small muted">Loading memes…</div>}
      {list && shown.length === 0 && <div className="small muted">No popular memes match “{query}”.</div>}
      <div className="card-grid">
        {paged.shown.map((t) => (
          <PopularMemeCard key={t.id} meme={t} />
        ))}
      </div>
      <LoadMore remaining={paged.more} onMore={paged.showMore} label="Show more popular memes" />
      <div className="home-section-head" style={{ marginTop: 24 }}>
        <h2>Meme templates</h2>
      </div>
    </div>
  )
}

function PopularMemeCard({ meme }: { meme: MemeTemplateInfo }) {
  const ref = useRef<HTMLButtonElement>(null)
  const near = useNearView(ref)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!near || url) return
    let live = true
    memePicture(meme.id)
      .then((d) => live && setUrl(d.url))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [near, url, meme.id])

  const open = async () => {
    setBusy(true)
    try {
      await loadFonts()
      const { doc, bytes } = await popularMemeDocument(meme)
      await openAsNewDesign(doc, bytes)
    } catch (e) {
      showError(e, 'That meme could not be downloaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button ref={ref} className="design-card" disabled={busy} onClick={() => void open()} title={`Make a “${meme.name}” meme`}>
      <span className="thumb">{url ? <img src={url} alt="" /> : <span className="skeleton" style={{ width: '70%', height: '70%' }} />}</span>
      <span className="title">{meme.name}</span>
      <span className="meta">
        {meme.lines} {meme.lines === 1 ? 'caption' : 'captions'} · memegen.link
      </span>
    </button>
  )
}
