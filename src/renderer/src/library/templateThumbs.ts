import { useEffect, useState } from 'react'
import { renderThumbnail } from '@renderer/export/renderDesign'
import { templateDocument, type BuiltInTemplate } from './templates'

const cache = new Map<string, string>()
let queue: Promise<unknown> = Promise.resolve()

/** Preview of a built-in template's first page. Drawn one at a time in the background, then cached. */
export function useTemplateThumb(template: BuiltInTemplate, max = 240): string | null {
  const key = `${template.id}@${max}`
  const [url, setUrl] = useState(() => cache.get(key) ?? null)
  useEffect(() => {
    if (url) return
    let cancelled = false
    queue = queue.then(async () => {
      if (cancelled) return
      try {
        const doc = templateDocument(template)
        const canvas = await renderThumbnail(doc, doc.pages[0], max)
        const data = canvas.toDataURL('image/png')
        cache.set(key, data)
        if (!cancelled) setUrl(data)
      } catch {
        // Left blank if it cannot be drawn.
      }
    })
    return () => {
      cancelled = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return url
}

export function clearTemplateThumbs(): void {
  cache.clear()
}
