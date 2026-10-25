import { type RefObject, useEffect, useState } from 'react'
import { renderThumbnail } from '@renderer/export/renderDesign'
import { loadFonts } from '@renderer/fonts/fontList'
import { templateDocument, type BuiltInTemplate } from './templates'
import { hasRealPictures, memeRenderContext, useRealMemesOn, withRealPictures } from './realMemes'

/** Recently drawn previews; the oldest are dropped so a long scroll does not hold every image. */
const cache = new Map<string, string>()
const CACHE_LIMIT = 400
let queue: Promise<unknown> = Promise.resolve()

function remember(key: string, url: string): void {
  cache.set(key, url)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!)
}

/**
 * Preview of a built-in template's first page. Drawn one at a time in the
 * background, only once the card is on screen, then cached.
 */
export function useTemplateThumb(template: BuiltInTemplate, max = 240, visible = true): string | null {
  const real = useRealMemesOn() && hasRealPictures(template)
  const key = `${template.id}@${max}${real ? '@real' : ''}`
  // The preview belongs to one key: when real meme pictures are turned on or off, the old preview is dropped.
  const [shown, setShown] = useState(() => ({ key, url: cache.get(key) ?? null }))
  const url = shown.key === key ? shown.url : (cache.get(key) ?? null)
  const setUrl = (u: string) => setShown({ key, url: u })
  useEffect(() => {
    if (url || !visible) return
    let cancelled = false
    queue = queue.then(async () => {
      if (cancelled) return
      const hit = cache.get(key)
      if (hit) return setUrl(hit)
      try {
        // Templates measure their text, so the fonts must be ready first.
        await loadFonts()
        let doc = templateDocument(template)
        if (real) doc = (await withRealPictures(doc)).doc
        const canvas = await renderThumbnail(doc, doc.pages[0], max, real ? memeRenderContext : undefined)
        const data = canvas.toDataURL('image/png')
        remember(key, data)
        if (!cancelled) setUrl(data)
      } catch {
        // Left blank if it cannot be drawn.
      }
    })
    return () => {
      cancelled = true
    }
  }, [key, visible]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

/** True once the element has come near the visible area (and stays true). */
export function useNearView(ref: RefObject<Element | null>, margin = '300px'): boolean {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') return setNear(true)
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near, margin])
  return near
}

/** Shows a long list a page at a time; the next page loads when the end comes into view. */
export function usePaged<T>(items: T[], step: number): { shown: T[]; more: number; showMore: () => void } {
  const [count, setCount] = useState(step)
  useEffect(() => setCount(step), [items, step])
  return { shown: items.slice(0, count), more: Math.max(0, items.length - count), showMore: () => setCount((n) => n + step) }
}

export function clearTemplateThumbs(): void {
  cache.clear()
}
