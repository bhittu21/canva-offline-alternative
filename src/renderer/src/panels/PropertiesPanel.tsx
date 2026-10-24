import type { DesignDocument, DesignElement, FontStyle, ShapeElement, TextAlign, TextElement } from '@shared/model'
import { Icon } from '@renderer/components/Icon'
import { ColorField, NumberField } from '@renderer/components/NumberField'
import { rotatedBounds } from '@renderer/editor/geometry'
import { duplicateSelection } from '@renderer/editor/shortcuts'
import { withTextHeight } from '@renderer/editor/textMeasure'
import { editor, useEditor } from '@renderer/store/editorStore'

/** Fonts that ship with every Windows 10 and 11 PC, so designs look the same offline. */
const fonts = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Candara',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier New',
  'Franklin Gothic Medium',
  'Gabriola',
  'Georgia',
  'Impact',
  'Ink Free',
  'Lucida Console',
  'Palatino Linotype',
  'Segoe Print',
  'Segoe Script',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana'
]

export function PropertiesPanel({ doc }: { doc: DesignDocument }) {
  const selectedIds = useEditor((s) => s.selectedIds)
  const selected = doc.elements.filter((el) => selectedIds.includes(el.id))

  if (selected.length === 0) return <PageProperties doc={doc} />
  if (selected.length > 1) return <MultiProperties doc={doc} elements={selected} />
  return <ElementProperties doc={doc} element={selected[0]} />
}

function PageProperties({ doc }: { doc: DesignDocument }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Page</h2>
      <div className="field-row">
        <NumberField
          label="Width"
          value={doc.width}
          min={1}
          max={10000}
          suffix="px"
          onChange={(v) => editor.change('Resize page', (d) => void (d.width = Math.round(v)), { mergeKey: 'page-width' })}
        />
        <NumberField
          label="Height"
          value={doc.height}
          min={1}
          max={10000}
          suffix="px"
          onChange={(v) => editor.change('Resize page', (d) => void (d.height = Math.round(v)), { mergeKey: 'page-height' })}
        />
      </div>
      <ColorField
        label="Background"
        value={doc.background}
        onChange={(v) => editor.change('Page colour', (d) => void (d.background = v), { mergeKey: 'page-bg' })}
      />
      <p className="muted small">Select an element on the page to edit it.</p>
    </div>
  )
}

function MultiProperties({ doc, elements }: { doc: DesignDocument; elements: DesignElement[] }) {
  return (
    <div className="panel">
      <h2 className="panel-title">{elements.length} elements selected</h2>
      <ArrangeSection doc={doc} elements={elements} />
    </div>
  )
}

function ElementProperties({ doc, element }: { doc: DesignDocument; element: DesignElement }) {
  const update = (patch: Partial<DesignElement>, field: string) =>
    editor.updateElement(element.id, patch, 'Edit', `${field}-${element.id}`)

  return (
    <div className="panel">
      <h2 className="panel-title">{element.type === 'text' ? 'Text' : element.type === 'image' ? 'Image' : 'Shape'}</h2>

      {element.type === 'text' && <TextSection element={element} />}
      {element.type === 'shape' && <ShapeSection element={element} />}

      <h3 className="panel-subtitle">Position and size</h3>
      <div className="field-row">
        <NumberField label="X" value={element.x} onChange={(v) => update({ x: v }, 'x')} />
        <NumberField label="Y" value={element.y} onChange={(v) => update({ y: v }, 'y')} />
      </div>
      <div className="field-row">
        <NumberField
          label="Width"
          value={element.width}
          min={1}
          onChange={(v) => update(element.type === 'text' ? withTextHeight(element, { width: v }) : { width: v }, 'width')}
        />
        <NumberField
          label="Height"
          value={element.height}
          min={1}
          onChange={(v) => element.type !== 'text' && update({ height: v }, 'height')}
        />
      </div>
      <div className="field-row">
        <NumberField label="Rotation" value={element.rotation} suffix="°" onChange={(v) => update({ rotation: ((v % 360) + 360) % 360 }, 'rotation')} />
        <NumberField
          label="Opacity"
          value={Math.round(element.opacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v) => update({ opacity: v / 100 }, 'opacity')}
        />
      </div>

      <ArrangeSection doc={doc} elements={[element]} />
    </div>
  )
}

function TextSection({ element }: { element: TextElement }) {
  const update = (patch: Partial<TextElement>, field: string, relayout = true) =>
    editor.updateElement(element.id, relayout ? withTextHeight(element, patch) : patch, 'Edit text', `${field}-${element.id}`)
  const bold = element.fontStyle.includes('bold')
  const italic = element.fontStyle.includes('italic')
  const style = (b: boolean, i: boolean): FontStyle => (b && i ? 'italic bold' : b ? 'bold' : i ? 'italic' : 'normal')

  return (
    <>
      <label className="field">
        <span className="field-label">Font</span>
        <select
          value={element.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value }, 'font')}
          style={{ fontFamily: element.fontFamily }}
        >
          {!fonts.includes(element.fontFamily) && <option value={element.fontFamily}>{element.fontFamily}</option>}
          {fonts.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <div className="field-row">
        <NumberField label="Size" value={element.fontSize} min={1} max={2000} decimals={1} onChange={(v) => update({ fontSize: v }, 'size')} />
        <ColorField label="Colour" value={element.fill} onChange={(v) => update({ fill: v }, 'fill', false)} />
      </div>
      <div className="toggle-row" role="group" aria-label="Text style">
        <button className={`toggle${bold ? ' on' : ''}`} title="Bold" onClick={() => update({ fontStyle: style(!bold, italic) }, 'style')}>
          <b>B</b>
        </button>
        <button className={`toggle${italic ? ' on' : ''}`} title="Italic" onClick={() => update({ fontStyle: style(bold, !italic) }, 'style')}>
          <i>I</i>
        </button>
        <button
          className={`toggle${element.underline ? ' on' : ''}`}
          title="Underline"
          onClick={() => update({ underline: !element.underline }, 'underline', false)}
        >
          <u>U</u>
        </button>
        <span className="toggle-gap" />
        {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
          <button
            key={align}
            className={`toggle${element.align === align ? ' on' : ''}`}
            title={`Align ${align}`}
            onClick={() => update({ align }, 'align', false)}
          >
            <AlignIcon align={align} />
          </button>
        ))}
      </div>
      <div className="field-row">
        <NumberField label="Line height" value={element.lineHeight} min={0.5} max={4} step={0.1} decimals={2} onChange={(v) => update({ lineHeight: v }, 'line-height')} />
        <NumberField label="Letter spacing" value={element.letterSpacing} min={-50} max={500} onChange={(v) => update({ letterSpacing: v }, 'letter-spacing')} />
      </div>
      <button className="button wide" onClick={() => editor.setEditingText(element.id)} disabled={element.locked}>
        Edit text
      </button>
    </>
  )
}

function ShapeSection({ element }: { element: ShapeElement }) {
  const update = (patch: Partial<ShapeElement>, field: string) => editor.updateElement(element.id, patch, 'Edit shape', `${field}-${element.id}`)
  return (
    <>
      <ColorField label="Fill" value={element.fill} onChange={(v) => update({ fill: v }, 'fill')} />
      {element.shape !== 'line' && (
        <div className="field-row">
          <ColorField label="Border" value={element.stroke} onChange={(v) => update({ stroke: v }, 'stroke')} />
          <NumberField label="Border width" value={element.strokeWidth} min={0} max={200} onChange={(v) => update({ strokeWidth: v }, 'stroke-width')} />
        </div>
      )}
      {(element.shape === 'rect' || element.shape === 'line') && (
        <NumberField label="Corner radius" value={element.cornerRadius} min={0} max={1000} onChange={(v) => update({ cornerRadius: v }, 'radius')} />
      )}
    </>
  )
}

function ArrangeSection({ doc, elements }: { doc: DesignDocument; elements: DesignElement[] }) {
  const locked = elements.every((el) => el.locked)

  /** Aligns the selection's bounding box to the page, moving all selected elements together. */
  const alignToPage = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const boxes = elements.map((el) => rotatedBounds(el.x, el.y, el.width, el.height, el.rotation))
    const minX = Math.min(...boxes.map((b) => b.x))
    const minY = Math.min(...boxes.map((b) => b.y))
    const maxX = Math.max(...boxes.map((b) => b.x + b.width))
    const maxY = Math.max(...boxes.map((b) => b.y + b.height))
    const dx = mode === 'left' ? -minX : mode === 'center' ? (doc.width - (maxX - minX)) / 2 - minX : mode === 'right' ? doc.width - maxX : 0
    const dy = mode === 'top' ? -minY : mode === 'middle' ? (doc.height - (maxY - minY)) / 2 - minY : mode === 'bottom' ? doc.height - maxY : 0
    const patches: Record<string, Partial<DesignElement>> = {}
    for (const el of elements) if (!el.locked) patches[el.id] = { x: el.x + dx, y: el.y + dy }
    editor.updateElements(patches, 'Align')
  }

  return (
    <>
      <h3 className="panel-subtitle">Align to page</h3>
      <div className="button-grid three">
        <button className="button" onClick={() => alignToPage('left')}>Left</button>
        <button className="button" onClick={() => alignToPage('center')}>Centre</button>
        <button className="button" onClick={() => alignToPage('right')}>Right</button>
        <button className="button" onClick={() => alignToPage('top')}>Top</button>
        <button className="button" onClick={() => alignToPage('middle')}>Middle</button>
        <button className="button" onClick={() => alignToPage('bottom')}>Bottom</button>
      </div>

      <h3 className="panel-subtitle">Layer order</h3>
      <div className="button-grid two">
        <button className="button" title="Bring forward (Ctrl+])" onClick={() => editor.arrange('forward')}>
          <Icon name="up" size={16} /> Forward
        </button>
        <button className="button" title="Send backward (Ctrl+[)" onClick={() => editor.arrange('backward')}>
          <Icon name="down" size={16} /> Backward
        </button>
        <button className="button" title="Bring to front (Ctrl+Shift+])" onClick={() => editor.arrange('front')}>
          <Icon name="front" size={16} /> To front
        </button>
        <button className="button" title="Send to back (Ctrl+Shift+[)" onClick={() => editor.arrange('back')}>
          <Icon name="back" size={16} /> To back
        </button>
      </div>

      <div className="button-grid three actions">
        <button className="button" title="Duplicate (Ctrl+D)" onClick={duplicateSelection}>
          <Icon name="copy" size={16} /> Copy
        </button>
        <button
          className="button"
          title={locked ? 'Unlock' : 'Lock'}
          onClick={() => editor.updateElements(Object.fromEntries(elements.map((el) => [el.id, { locked: !locked }])), 'Lock/unlock')}
        >
          <Icon name={locked ? 'unlock' : 'lock'} size={16} /> {locked ? 'Unlock' : 'Lock'}
        </button>
        <button className="button danger" title="Delete (Del)" onClick={editor.deleteSelected}>
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </>
  )
}

function AlignIcon({ align }: { align: TextAlign }) {
  const lines = align === 'left' ? [[4, 20], [4, 14], [4, 18]] : align === 'right' ? [[4, 20], [10, 20], [6, 20]] : [[4, 20], [7, 17], [5, 19]]
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      {lines.map(([x1, x2], i) => (
        <line key={i} x1={x1} x2={x2} y1={7 + i * 5} y2={7 + i * 5} />
      ))}
    </svg>
  )
}
