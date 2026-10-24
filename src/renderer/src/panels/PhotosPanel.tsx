import { useCallback, useEffect, useState } from 'react'
import { ImageOff, KeyRound, Upload } from 'lucide-react'
import type { PhotoProviderId, PhotoResult, ServiceState } from '@shared/ipc'
import type { DesignDocument } from '@shared/model'
import { Empty, SearchInput, Segmented } from '@renderer/components/ui'
import { cleanError, showError } from '@renderer/components/toast'
import { endPanelDrag, startPanelDrag } from '@renderer/editor/dnd'
import { importImagesDialog, insertImage, setPageBackgroundImage } from '@renderer/io/projectIo'
import { openDialog, updatePrefs, useDialog, usePrefs } from '@renderer/store/uiStore'
import { PanelFrame } from './common'

const providerNames: Record<PhotoProviderId, string> = { unsplash: 'Unsplash', pexels: 'Pexels' }
const suggestions = ['nature', 'office', 'coffee', 'city', 'abstract', 'food', 'people', 'texture']

/**
 * Free stock photos from Unsplash or Pexels (optional, needs the user's own
 * free API key). Thumbnails load straight from the provider, as their terms
 * require; a photo is downloaded into the design only when it is used, and
 * the download is reported to the provider. Credits are kept with the image.
 */
export function PhotosPanel(_props: { doc: DesignDocument }) {
  const prefs = usePrefs()
  const provider = prefs?.photoProvider ?? 'unsplash'
  const [states, setStates] = useState<Record<PhotoProviderId, ServiceState> | null>(null)
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [results, setResults] = useState<PhotoResult[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const dialog = useDialog()

  // Checked again after the settings dialog closes, in case a key was added.
  useEffect(() => {
    if (dialog) return
    window.api.photos.state().then(setStates).catch(() => setStates(null))
  }, [dialog])

  const configured = states?.[provider]?.configured ?? false

  const search = useCallback(
    async (q: string, p: number) => {
      if (!q.trim()) return
      setLoading(true)
      setError(null)
      try {
        const r = await window.api.photos.search(provider, q.trim(), p)
        setResults((prev) => (p === 1 ? r.results : [...prev, ...r.results]))
        setPage(r.page)
        setTotalPages(r.totalPages)
        setSubmitted(q.trim())
      } catch (e) {
        setError(cleanError(e, 'The search failed.'))
      } finally {
        setLoading(false)
      }
    },
    [provider]
  )

  useEffect(() => {
    setResults([])
    setSubmitted('')
  }, [provider])

  const use = async (photo: PhotoResult, mode: 'add' | 'background', point?: { x: number; y: number }, targetId?: string | null) => {
    setBusy(photo.id)
    try {
      const d = await window.api.photos.download(photo)
      const name = photo.description ? photo.description.slice(0, 60) : `Photo by ${photo.author}`
      if (mode === 'background') await setPageBackgroundImage(d.bytes, d.mime, name, d.credit)
      else await insertImage(d.bytes, d.mime, name, { point, targetId, credit: d.credit })
    } catch (e) {
      showError(e, 'The photo could not be downloaded.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <PanelFrame
      title="Photos"
      action={
        <Segmented
          value={provider}
          options={[
            { value: 'unsplash', label: 'Unsplash' },
            { value: 'pexels', label: 'Pexels' }
          ]}
          onChange={(v) => void updatePrefs({ photoProvider: v as PhotoProviderId })}
        />
      }
      head={
        configured && (
          <SearchInput value={query} onChange={setQuery} placeholder={`Search ${providerNames[provider]} photos`} autoFocus onEnter={() => void search(query, 1)} />
        )
      }
    >
      {states && !configured && (
        <div className="panel-section">
          <Empty icon={<KeyRound size={28} />} title={`Connect ${providerNames[provider]} to search photos`}>
            Stock photo search is optional and needs a free {providerNames[provider]} API key. Only your search words are sent to {providerNames[provider]}; your designs stay on this PC.
          </Empty>
          <button className="btn primary block" onClick={() => openDialog('settings', 'photos')}>
            <KeyRound size={16} /> Add a free API key
          </button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => void importImagesDialog()}>
            <Upload size={16} /> Use your own photos instead
          </button>
        </div>
      )}

      {configured && !submitted && !loading && (
        <div className="panel-section">
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {suggestions.map((s) => (
              <button
                key={s}
                className="chip"
                onClick={() => {
                  setQuery(s)
                  void search(s, 1)
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            Your search words are sent to {providerNames[provider]}. Photos are free to use under the{' '}
            <a href="#" onClick={(e) => (e.preventDefault(), window.api.openExternal(provider === 'unsplash' ? 'https://unsplash.com/license' : 'https://www.pexels.com/license/'))}>
              {providerNames[provider]} licence
            </a>
            . The photographer’s credit is saved with the design.
          </p>
        </div>
      )}

      {error && <div className="notice error">{error}</div>}

      {configured && submitted && results.length === 0 && !loading && !error && (
        <Empty icon={<ImageOff size={28} />} title={`No photos for “${submitted}”`}>
          Try a different word.
        </Empty>
      )}

      {results.length > 0 && (
        <div className="photo-grid" style={{ marginTop: 6 }}>
          {results.map((photo) => (
            <div
              key={`${photo.provider}:${photo.id}`}
              className="photo"
              role="button"
              tabIndex={0}
              title={`${photo.description || 'Photo'} — click to add, drag onto a frame to fill it`}
              style={{ aspectRatio: `${photo.width} / ${photo.height}`, background: photo.color ?? undefined }}
              draggable
              onDragStart={(e) => startPanelDrag(e, (point, targetId) => void use(photo, 'add', point, targetId))}
              onDragEnd={endPanelDrag}
              onClick={() => busy || void use(photo, 'add')}
              onKeyDown={(e) => e.key === 'Enter' && void use(photo, 'add')}
              onContextMenu={(e) => {
                e.preventDefault()
                void use(photo, 'background')
              }}
            >
              <img src={photo.thumbUrl} alt={photo.description} loading="lazy" draggable={false} />
              <span className="credit">
                Photo by{' '}
                <a
                  href="#"
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.api.openExternal(photo.authorUrl)
                  }}
                >
                  {photo.author}
                </a>{' '}
                on {providerNames[photo.provider]}
              </span>
              {busy === photo.id && (
                <span className="busy">
                  <span className="spinner" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
          <span className="spinner" />
        </div>
      )}

      {results.length > 0 && page < totalPages && !loading && (
        <button className="btn block" onClick={() => void search(submitted, page + 1)}>
          Load more
        </button>
      )}
      {results.length > 0 && (
        <p className="muted small" style={{ marginTop: 10 }}>
          Click to add · drag onto a frame to fill it · right-click to use as the page background.
        </p>
      )}
    </PanelFrame>
  )
}
