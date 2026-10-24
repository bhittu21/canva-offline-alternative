import type { DesignDocument, ShapeKind } from '@shared/model'
import { createShape } from '@renderer/editor/elementFactory'
import { starPoints, trianglePoints } from '@renderer/editor/geometry'
import { editor } from '@renderer/store/editorStore'

const shapes: { kind: ShapeKind; label: string }[] = [
  { kind: 'rect', label: 'Square' },
  { kind: 'ellipse', label: 'Circle' },
  { kind: 'triangle', label: 'Triangle' },
  { kind: 'star', label: 'Star' },
  { kind: 'line', label: 'Line' }
]

const toSvg = (points: number[]) => points.join(' ')

function ShapePreview({ kind }: { kind: ShapeKind }) {
  const fill = 'currentColor'
  switch (kind) {
    case 'rect':
      return <rect x="6" y="6" width="36" height="36" fill={fill} />
    case 'ellipse':
      return <circle cx="24" cy="24" r="18" fill={fill} />
    case 'triangle':
      return <polygon points={toSvg(trianglePoints(36, 36).map((v) => v + 6))} fill={fill} />
    case 'star':
      return <polygon points={toSvg(starPoints(38, 38).map((v) => v + 5))} fill={fill} />
    case 'line':
      return <rect x="4" y="22" width="40" height="4" rx="2" fill={fill} />
  }
}

export function ElementsPanel({ doc }: { doc: DesignDocument }) {
  return (
    <div className="panel">
      <h2 className="panel-title">Shapes</h2>
      <div className="shape-grid">
        {shapes.map((s) => (
          <button
            key={s.kind}
            className="shape-tile"
            title={s.label}
            onClick={() => editor.addElements([createShape(doc, s.kind)], `Add ${s.label.toLowerCase()}`)}
          >
            <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
              <ShapePreview kind={s.kind} />
            </svg>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
