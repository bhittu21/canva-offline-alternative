import type { DesignDocument } from '@shared/model'
import { createText, type TextPreset } from '@renderer/editor/elementFactory'
import { measureTextHeight } from '@renderer/editor/textMeasure'
import { editor } from '@renderer/store/editorStore'

const presets: { id: TextPreset; label: string; className: string }[] = [
  { id: 'heading', label: 'Add a heading', className: 'text-add heading' },
  { id: 'subheading', label: 'Add a subheading', className: 'text-add subheading' },
  { id: 'body', label: 'Add a little bit of body text', className: 'text-add body' }
]

export function TextPanel({ doc }: { doc: DesignDocument }) {
  const add = (preset: TextPreset) => {
    const el = createText(doc, preset)
    const height = measureTextHeight(el)
    editor.addElements([{ ...el, height, y: (doc.height - height) / 2 }], 'Add text')
  }
  return (
    <div className="panel">
      <h2 className="panel-title">Text</h2>
      <p className="muted small">Click to add, then double-click the text on the page to type.</p>
      {presets.map((p) => (
        <button key={p.id} className={p.className} onClick={() => add(p.id)}>
          {p.label}
        </button>
      ))}
    </div>
  )
}
