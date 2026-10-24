import type { DesignDocument, DesignElement } from '@shared/model'
import { SectionHead } from '@renderer/components/ui'
import { createFrame, grouped } from '@renderer/editor/elementFactory'
import { elementPresets } from '@renderer/library/elements'
import { presetThumb } from '@renderer/library/thumbnails'
import { frameMasks } from '@renderer/render/shapes'
import { InsertTile, PanelFrame } from './common'

type Size = { width: number; height: number }

const ratios = [
  { id: 'square', label: 'Square', aspect: 1 },
  { id: 'portrait', label: 'Portrait 4:5', aspect: 4 / 5 },
  { id: 'landscape', label: 'Landscape 3:2', aspect: 3 / 2 },
  { id: 'wide', label: 'Wide 16:9', aspect: 16 / 9 },
  { id: 'tall', label: 'Story 9:16', aspect: 9 / 16 }
]

/** Photo grids: frames side by side with a small gap. */
function grid(cols: number, rows: number, spans?: [number, number, number, number][]) {
  return (d: Size): DesignElement[] => {
    const w = Math.min(d.width, d.height) * 0.8
    const h = w * (rows / cols)
    const gap = w * 0.02
    const cw = (w - gap * (cols - 1)) / cols
    const ch = (h - gap * (rows - 1)) / rows
    const x0 = (d.width - w) / 2
    const y0 = (d.height - h) / 2
    const cells = spans ?? Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols), 1, 1] as [number, number, number, number])
    return grouped(
      cells.map(([c, r, cs, rs], i) => ({
        ...createFrame(d, 'rect', 1, { name: `Photo ${i + 1}` }),
        x: x0 + c * (cw + gap),
        y: y0 + r * (ch + gap),
        width: cw * cs + gap * (cs - 1),
        height: ch * rs + gap * (rs - 1)
      }))
    )
  }
}

const grids = [
  { id: 'grid-2', label: 'Two side by side', make: grid(2, 1) },
  { id: 'grid-3', label: 'Three in a row', make: grid(3, 1) },
  { id: 'grid-4', label: 'Four squares', make: grid(2, 2) },
  { id: 'grid-1-2', label: 'One large, two small', make: grid(3, 2, [[0, 0, 2, 2], [2, 0, 1, 1], [2, 1, 1, 1]]) },
  { id: 'grid-6', label: 'Six squares', make: grid(3, 2) },
  { id: 'grid-9', label: 'Nine squares', make: grid(3, 3) }
]

/** Frames that crop a photo to a shape, photo grids and device mockups. Drop a photo onto a frame to fill it. */
export function FramesPanel(_props: { doc: DesignDocument }) {
  const mockups = elementPresets.filter((p) => p.category === 'mockups')
  return (
    <PanelFrame title="Frames and mockups">
      <p className="muted small" style={{ margin: '0 0 4px' }}>
        Add a frame, then drag a photo from Photos or Uploads onto it. Use the Crop settings on the right to move or zoom the photo inside the frame.
      </p>
      <section className="panel-section">
        <SectionHead title="Shapes" />
        <div className="tile-grid cols-4">
          {frameMasks.map((m) => {
            const make = (d: Size) => [createFrame(d, m.id, 1)]
            return <InsertTile key={m.id} thumbKey={`frame:${m.id}@96`} label={`${m.label} frame`} make={make} render={() => presetThumb(`frame:${m.id}`, make, 96)} />
          })}
        </div>
      </section>
      <section className="panel-section">
        <SectionHead title="Sizes" />
        <div className="tile-grid">
          {ratios.map((r) => {
            const make = (d: Size) => [createFrame(d, 'rect', r.aspect, { name: `${r.label} frame` })]
            return <InsertTile key={r.id} thumbKey={`ratio:${r.id}@110`} label={r.label} make={make} render={() => presetThumb(`ratio:${r.id}`, make, 110)} showLabel />
          })}
        </div>
      </section>
      <section className="panel-section">
        <SectionHead title="Photo grids" />
        <div className="tile-grid">
          {grids.map((g) => (
            <InsertTile key={g.id} thumbKey={`grid:${g.id}@110`} label={g.label} make={g.make} render={() => presetThumb(`grid:${g.id}`, g.make, 110)} />
          ))}
        </div>
      </section>
      <section className="panel-section">
        <SectionHead title="Mockups" />
        <div className="tile-grid cols-2">
          {mockups.map((p) => (
            <InsertTile key={p.id} thumbKey={`el:${p.id}@160`} label={p.label} make={p.make} render={() => presetThumb(`el:${p.id}`, p.make, 160)} showLabel />
          ))}
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Mockups are original line drawings with a frame for your screenshot; no third-party device artwork is used.
        </p>
      </section>
    </PanelFrame>
  )
}
