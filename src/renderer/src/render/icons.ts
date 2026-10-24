import iconNodes from 'lucide-static/icon-nodes.json'
import iconTags from 'lucide-static/tags.json'

/**
 * The insertable icon set: every Lucide icon (ISC licence), bundled with the
 * app so it works offline. Icons are drawn on a 24 x 24 grid with round
 * strokes, and are turned into SVG path data so they stay sharp at any size.
 */

type IconNode = [string, Record<string, string | number>][]

const nodes = iconNodes as unknown as Record<string, IconNode>
const tags = iconTags as unknown as Record<string, string[]>

export const ICON_GRID = 24

export interface IconInfo {
  name: string
  label: string
  tags: string[]
}

export const iconList: IconInfo[] = Object.keys(nodes).map((name) => ({
  name,
  label: name.replace(/-/g, ' '),
  tags: tags[name] ?? []
}))

const pathCache = new Map<string, string[]>()

/** Path data for each stroke of an icon, or null when the icon is unknown. */
export function iconPaths(name: string): string[] | null {
  const cached = pathCache.get(name)
  if (cached) return cached
  const node = nodes[name]
  if (!node) return null
  const paths = node.map(([tag, a]) => toPath(tag, a)).filter((d): d is string => !!d)
  pathCache.set(name, paths)
  return paths
}

export function hasIcon(name: string): boolean {
  return name in nodes
}

const n = (v: string | number | undefined) => Number(v ?? 0)

function toPath(tag: string, a: Record<string, string | number>): string | null {
  switch (tag) {
    case 'path':
      return String(a.d)
    case 'circle': {
      const [cx, cy, r] = [n(a.cx), n(a.cy), n(a.r)]
      return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = [n(a.cx), n(a.cy), n(a.rx), n(a.ry)]
      return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`
    }
    case 'rect': {
      const [x, y, w, h] = [n(a.x), n(a.y), n(a.width), n(a.height)]
      const r = Math.min(n(a.rx ?? a.ry), w / 2, h / 2)
      if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`
      return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
    }
    case 'line':
      return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`
    case 'polyline':
    case 'polygon': {
      const pts = String(a.points).trim().split(/[\s,]+/).map(Number)
      let d = ''
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? 'M' : 'L'}${pts[i]} ${pts[i + 1]}`
      return tag === 'polygon' ? d + 'Z' : d
    }
    default:
      return null
  }
}

/** Curated groups for browsing. An icon belongs to a group when its name or tags mention one of the keywords. */
export const iconCategories: { id: string; label: string; keywords: string[] }[] = [
  { id: 'arrows', label: 'Arrows', keywords: ['arrow', 'chevron', 'move', 'corner', 'redo', 'undo', 'refresh'] },
  { id: 'communication', label: 'Communication', keywords: ['mail', 'message', 'phone', 'send', 'at-sign', 'bell', 'megaphone', 'inbox'] },
  { id: 'social', label: 'Social', keywords: ['heart', 'thumbs', 'share', 'user', 'users', 'smile', 'star', 'award', 'badge'] },
  { id: 'business', label: 'Business', keywords: ['briefcase', 'chart', 'trending', 'dollar', 'wallet', 'credit-card', 'building', 'presentation', 'target', 'handshake'] },
  { id: 'shopping', label: 'Shopping', keywords: ['shopping', 'store', 'tag', 'package', 'gift', 'receipt', 'truck', 'percent'] },
  { id: 'food', label: 'Food and drink', keywords: ['coffee', 'cup', 'pizza', 'utensils', 'wine', 'beer', 'cake', 'apple', 'cookie', 'croissant', 'ice-cream', 'chef'] },
  { id: 'nature', label: 'Nature', keywords: ['leaf', 'tree', 'flower', 'sprout', 'mountain', 'sun', 'moon', 'cloud', 'snow', 'wind', 'flame', 'droplet', 'waves'] },
  { id: 'travel', label: 'Travel', keywords: ['plane', 'map', 'compass', 'car', 'bike', 'train', 'ship', 'tent', 'luggage', 'globe', 'hotel'] },
  { id: 'media', label: 'Media', keywords: ['camera', 'image', 'video', 'film', 'music', 'mic', 'headphones', 'play', 'radio', 'tv'] },
  { id: 'tech', label: 'Technology', keywords: ['laptop', 'monitor', 'smartphone', 'cpu', 'wifi', 'database', 'server', 'code', 'cloud', 'bot', 'battery'] },
  { id: 'education', label: 'Education', keywords: ['book', 'graduation', 'school', 'pencil', 'pen', 'notebook', 'library', 'lightbulb', 'brain'] },
  { id: 'health', label: 'Health and fitness', keywords: ['heart-pulse', 'activity', 'dumbbell', 'pill', 'stethoscope', 'hospital', 'syringe', 'apple'] },
  { id: 'shapes', label: 'Shapes and symbols', keywords: ['circle', 'square', 'triangle', 'hexagon', 'diamond', 'octagon', 'pentagon', 'check', 'x', 'plus', 'minus', 'sparkle'] },
  { id: 'weather', label: 'Weather', keywords: ['sun', 'cloud', 'rain', 'snow', 'thermometer', 'umbrella', 'wind', 'zap'] }
]

export function iconsInCategory(categoryId: string): IconInfo[] {
  const category = iconCategories.find((c) => c.id === categoryId)
  if (!category) return []
  return iconList.filter((icon) => category.keywords.some((k) => icon.name === k || icon.name.startsWith(k + '-') || icon.name.includes('-' + k)))
}

/** Ranks icons by how well the name and tags match every word of the query. */
export function searchIcons(query: string, limit = 300): IconInfo[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return iconList.slice(0, limit)
  const scored: { icon: IconInfo; score: number }[] = []
  for (const icon of iconList) {
    let score = 0
    for (const word of words) {
      if (icon.name === word) score += 10
      else if (icon.name.startsWith(word)) score += 6
      else if (icon.label.includes(word)) score += 4
      else if (icon.tags.some((t) => t === word)) score += 3
      else if (icon.tags.some((t) => t.includes(word))) score += 1
      else {
        score = 0
        break
      }
    }
    if (score > 0) scored.push({ icon, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.icon.name.localeCompare(b.icon.name))
    .slice(0, limit)
    .map((s) => s.icon)
}
