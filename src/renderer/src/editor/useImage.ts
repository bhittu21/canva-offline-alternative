import { useEffect, useState } from 'react'

const cache = new Map<string, HTMLImageElement>()

/** Loads an image from an object URL once and shares it between renders. */
export function useImage(url: string | undefined): HTMLImageElement | undefined {
  const [image, setImage] = useState(() => (url ? cache.get(url) : undefined))
  useEffect(() => {
    if (!url) return setImage(undefined)
    const cached = cache.get(url)
    if (cached) return setImage(cached)
    const img = new window.Image()
    let active = true
    img.onload = () => {
      cache.set(url, img)
      if (active) setImage(img)
    }
    img.src = url
    return () => {
      active = false
    }
  }, [url])
  return image
}
