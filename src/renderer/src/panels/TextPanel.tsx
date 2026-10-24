import { useMemo, useState } from 'react'
import { Plus, Trash2, Type } from 'lucide-react'
import type { DesignDocument } from '@shared/model'
import { Empty, LoadMore, SearchInput, SectionHead } from '@renderer/components/ui'
import { createText, textPresets, type TextPreset } from '@renderer/editor/elementFactory'
import { endPanelDrag, startPanelDrag } from '@renderer/editor/dnd'
import { textCombos } from '@renderer/library/textCombos'
import { presetThumb } from '@renderer/library/thumbnails'
import { ensureFontFamily, fontNote, useFonts } from '@renderer/fonts/fontList'
import { addFontFiles, removeFontFamily } from '@renderer/fonts/fontActions'
import { usePaged } from '@renderer/library/templateThumbs'
import { editor, selectedElements } from '@renderer/store/editorStore'
import { brandFonts, InsertTile, insertElements, PanelFrame } from './common'

const quick: { id: TextPreset; className: string }[] = [
  { id: 'heading', className: 'text-add heading' },
  { id: 'subheading', className: 'text-add subheading' },
  { id: 'body', className: 'text-add body' }
]

const extra: TextPreset[] = ['caption', 'quote', 'label']

/** Text styles, ready-made combinations and fonts. */
export function TextPanel({ doc }: { doc: DesignDocument }) {
  const [query, setQuery] = useState('')
  const q = query.toLowerCase().trim()
  const combos = useMemo(() => textCombos.filter((c) => !q || `${c.label} ${c.keywords}`.toLowerCase().includes(q)), [q])
  const fonts = useFonts()
  const fontMatches = useMemo(() => fonts.filter((f) => !q || `${f.family} ${fontNote(f)}`.toLowerCase().includes(q)), [q, fonts])
  const fontPage = usePaged(fontMatches, 60)

  const add = (preset: TextPreset, point?: { x: number; y: number }) => insertElements([createText(doc, preset, brandFonts())], 'Add text', point)

  /** Applies a font to the selected text, or adds a sample text box in that font. */
  const applyFont = async (family: string) => {
    await ensureFontFamily(family)
    const texts = selectedElements().filter((el) => el.type === 'text')
    if (texts.length > 0) editor.updateSelected((el) => (el.type === 'text' ? { fontFamily: family } : null), 'Change font')
    else insertElements([createText(doc, 'subheading', brandFonts(), { fontFamily: family, text: family })], 'Add text')
  }

  return (
    <PanelFrame title="Text" head={<SearchInput value={query} onChange={setQuery} placeholder="Search text styles and fonts" />}>
      {!q && (
        <section className="panel-section">
          {quick.map((p) => (
            <button
              key={p.id}
              className={p.className}
              draggable
              onDragStart={(e) => startPanelDrag(e, (point) => add(p.id, point))}
              onDragEnd={endPanelDrag}
              onClick={() => add(p.id)}
            >
              {textPresets[p.id].text}
            </button>
          ))}
          <div className="tool-row" style={{ marginTop: 4 }}>
            {extra.map((id) => (
              <button key={id} className="btn sm" onClick={() => add(id)}>
                {textPresets[id].label}
              </button>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Double-click text on the page to type. Shortcut: press T to add a text box.
          </p>
        </section>
      )}

      {combos.length > 0 && (
        <section className="panel-section">
          <SectionHead title="Text combinations" />
          <div className="tile-grid cols-2">
            {combos.map((c) => (
              <InsertTile key={c.id} thumbKey={`combo:${c.id}@180`} label={c.label} make={c.make} render={() => presetThumb(`combo:${c.id}`, c.make, 180)} className="wide" />
            ))}
          </div>
        </section>
      )}

      <section className="panel-section">
        <SectionHead
          title="Fonts"
          action={
            <button className="btn sm ghost" onClick={() => void addFontFiles()} title="Add .ttf, .otf, .woff or .woff2 font files">
              <Plus size={14} /> Add fonts
            </button>
          }
        />
        <p className="muted small" style={{ margin: '0 0 6px' }}>
          Click a font to use it on the selected text, or to add a sample. Fonts installed on this computer are listed too; add font files to use any other font offline.
        </p>
        {fontMatches.length > 0 && (
          <div className="font-list" style={{ maxHeight: 'none', margin: 0 }}>
            {fontPage.shown.map((f) => (
              <div key={f.family} className="font-row">
                <button className="font-option" style={{ fontFamily: `"${f.family}"` }} onClick={() => void applyFont(f.family)}>
                  {f.family}
                  <small>{fontNote(f)}</small>
                </button>
                {f.source === 'custom' && (
                  <button className="icon-btn sm" title={`Remove “${f.family}”`} aria-label={`Remove ${f.family}`} onClick={() => void removeFontFamily(f.family)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
            <LoadMore remaining={fontPage.more} onMore={fontPage.showMore} label="Show more fonts" />
          </div>
        )}
      </section>

      {combos.length === 0 && fontMatches.length === 0 && (
        <Empty icon={<Type size={28} />} title="Nothing matches">
          Try “sale”, “quote” or a font name.
        </Empty>
      )}
    </PanelFrame>
  )
}
