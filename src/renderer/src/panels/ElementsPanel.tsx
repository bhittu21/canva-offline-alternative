import { useMemo, useState } from 'react'
import { Shapes } from 'lucide-react'
import type { DesignDocument } from '@shared/model'
import { Empty, SearchInput, SectionHead } from '@renderer/components/ui'
import { elementCategories, elementPresets, searchPresets, type ElementPreset } from '@renderer/library/elements'
import { presetThumb } from '@renderer/library/thumbnails'
import { Chips, InsertTile, PanelFrame } from './common'

const PREVIEW = 9

function PresetTile({ preset }: { preset: ElementPreset }) {
  return <InsertTile thumbKey={`el:${preset.id}@120`} label={preset.label} make={preset.make} render={() => presetThumb(`el:${preset.id}`, preset.make)} />
}

/** Shapes, lines, decorations, callouts, diagrams and mockups from the built-in library. */
export function ElementsPanel(_props: { doc: DesignDocument }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const results = useMemo(() => searchPresets(query), [query])

  const visible = category === 'all' ? results : results.filter((p) => p.category === category)

  return (
    <PanelFrame
      title="Elements"
      head={
        <>
          <SearchInput value={query} onChange={setQuery} placeholder="Search shapes, arrows, badges…" autoFocus />
          <Chips value={category} onChange={setCategory} options={[{ id: 'all', label: 'All' }, ...elementCategories.map((c) => ({ id: c.id, label: c.label }))]} />
        </>
      }
    >
      {visible.length === 0 && (
        <Empty icon={<Shapes size={28} />} title="No elements found">
          Try a simpler word, such as “arrow”, “star” or “badge”.
        </Empty>
      )}
      {category === 'all' && !query
        ? elementCategories.map((c) => {
            const items = elementPresets.filter((p) => p.category === c.id)
            return (
              <section key={c.id} className="panel-section">
                <SectionHead
                  title={c.label}
                  action={
                    items.length > PREVIEW && (
                      <button className="link" onClick={() => setCategory(c.id)}>
                        See all ({items.length})
                      </button>
                    )
                  }
                />
                <div className="tile-grid">
                  {items.slice(0, PREVIEW).map((p) => (
                    <PresetTile key={p.id} preset={p} />
                  ))}
                </div>
              </section>
            )
          })
        : visible.length > 0 && (
            <section className="panel-section">
              <SectionHead title={query ? `${visible.length} result${visible.length === 1 ? '' : 's'}` : (elementCategories.find((c) => c.id === category)?.label ?? '')} />
              <div className="tile-grid">
                {visible.map((p) => (
                  <PresetTile key={p.id} preset={p} />
                ))}
              </div>
            </section>
          )}
      <p className="muted small" style={{ marginTop: 16 }}>
        Click to add, or drag onto the page. Every element is made of editable shapes, so you can recolour and resize it.
      </p>
    </PanelFrame>
  )
}
