import { memo, useMemo, useState } from 'react'
import { Smile, Star } from 'lucide-react'
import type { DesignDocument } from '@shared/model'
import { Empty, SearchInput, SectionHead } from '@renderer/components/ui'
import { createIcon } from '@renderer/editor/elementFactory'
import { endPanelDrag, startPanelDrag } from '@renderer/editor/dnd'
import { ICON_GRID, iconCategories, iconList, iconPaths, iconsInCategory, searchIcons, type IconInfo } from '@renderer/render/icons'
import { editor, useEditor } from '@renderer/store/editorStore'
import { updatePrefs, usePrefs, uiStore } from '@renderer/store/uiStore'
import { Chips, currentDoc, insertElements, PanelFrame } from './common'

const PAGE = 180

export const IconGlyph = memo(function IconGlyph({ name, size = 26, strokeWidth = 2 }: { name: string; size?: number; strokeWidth?: number }) {
  const paths = iconPaths(name) ?? []
  return (
    <svg width={size} height={size} viewBox={`0 0 ${ICON_GRID} ${ICON_GRID}`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
})

function remember(name: string): void {
  const prefs = uiStore.getState().prefs
  if (!prefs) return
  void updatePrefs({ recentIcons: [name, ...prefs.recentIcons.filter((n) => n !== name)].slice(0, 24) })
}

/** Searchable, insertable line icons (Lucide, ISC licence). */
export function IconsPanel(_props: { doc: DesignDocument }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [limit, setLimit] = useState(PAGE)
  const prefs = usePrefs()
  const selectedIcon = useEditor((s) => {
    if (s.selectedIds.length !== 1 || !s.history) return null
    const page = s.history.present.pages.find((p) => p.id === s.activePageId)
    const el = page?.elements.find((e) => e.id === s.selectedIds[0])
    return el?.type === 'icon' ? el : null
  })
  const favorites = prefs?.favoriteIcons ?? []
  const recent = prefs?.recentIcons ?? []

  const list: IconInfo[] = useMemo(() => {
    if (query.trim()) return searchIcons(query, 2000)
    if (category === 'favorites') return iconList.filter((i) => favorites.includes(i.name))
    if (category !== 'all') return iconsInCategory(category)
    return iconList
  }, [query, category, favorites])

  const pick = (name: string, point?: { x: number; y: number }) => {
    remember(name)
    if (selectedIcon && !point) {
      editor.updateElement(selectedIcon.id, { icon: name, name: name.replace(/-/g, ' ') }, 'Replace icon')
      return
    }
    const color = uiStore.getState().prefs?.brand.colors[0] ?? '#1f2329'
    insertElements([createIcon(currentDoc(), name, color)], 'Add icon', point)
  }

  const toggleFavorite = (name: string) => {
    void updatePrefs({ favoriteIcons: favorites.includes(name) ? favorites.filter((n) => n !== name) : [name, ...favorites].slice(0, 200) })
  }

  const grid = (items: IconInfo[] | string[]) => (
    <div className="tile-grid cols-5">
      {items.map((item) => {
        const name = typeof item === 'string' ? item : item.name
        return (
          <button
            key={name}
            className="tile"
            title={name.replace(/-/g, ' ')}
            aria-label={`${selectedIcon ? 'Use' : 'Add'} icon ${name}`}
            draggable
            onDragStart={(e) => startPanelDrag(e, (point) => pick(name, point))}
            onDragEnd={endPanelDrag}
            onClick={() => pick(name)}
            onContextMenu={(e) => {
              e.preventDefault()
              toggleFavorite(name)
            }}
          >
            <IconGlyph name={name} />
            <span
              className={`fav${favorites.includes(name) ? ' on' : ''}`}
              role="button"
              title={favorites.includes(name) ? 'Remove from favourites' : 'Add to favourites'}
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(name)
              }}
            >
              <Star size={11} fill={favorites.includes(name) ? 'currentColor' : 'none'} />
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <PanelFrame
      title="Icons"
      head={
        <>
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v)
              setLimit(PAGE)
            }}
            placeholder={`Search ${iconList.length.toLocaleString()} icons`}
            autoFocus
          />
          {!query && (
            <Chips
              value={category}
              onChange={(v) => {
                setCategory(v)
                setLimit(PAGE)
              }}
              options={[{ id: 'all', label: 'All' }, { id: 'favorites', label: '★ Favourites' }, ...iconCategories.map((c) => ({ id: c.id, label: c.label }))]}
            />
          )}
        </>
      }
    >
      {selectedIcon && (
        <div className="notice info" style={{ marginTop: 4 }}>
          An icon is selected: click any icon to swap it. Press Esc to add new icons instead.
        </div>
      )}
      {!query && category === 'all' && recent.length > 0 && (
        <section className="panel-section">
          <SectionHead title="Recently used" />
          {grid(recent.filter((n) => iconPaths(n)).slice(0, 10))}
        </section>
      )}
      <section className="panel-section">
        {(query || category !== 'all') && <SectionHead title={`${list.length.toLocaleString()} icon${list.length === 1 ? '' : 's'}`} />}
        {list.length === 0 ? (
          <Empty icon={<Smile size={28} />} title={category === 'favorites' ? 'No favourites yet' : 'No icons found'}>
            {category === 'favorites' ? 'Click the star on an icon to keep it here.' : 'Try another word, such as “home”, “phone” or “leaf”.'}
          </Empty>
        ) : (
          grid(list.slice(0, limit))
        )}
        {list.length > limit && (
          <button className="btn block" style={{ marginTop: 10 }} onClick={() => setLimit((l) => l + PAGE * 2)}>
            Show more
          </button>
        )}
      </section>
      <p className="muted small" style={{ marginTop: 14 }}>
        Icons from Lucide (ISC licence). Right-click or use the star to save favourites. Change colour and line weight in the panel on the right.
      </p>
    </PanelFrame>
  )
}
