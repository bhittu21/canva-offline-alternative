import type { ChartType, DesignDocument, TableElement } from '@shared/model'
import { SectionHead } from '@renderer/components/ui'
import { createChart, createTable } from '@renderer/editor/elementFactory'
import { elementPresets } from '@renderer/library/elements'
import { presetThumb } from '@renderer/library/thumbnails'
import { InsertTile, PanelFrame } from './common'

type Size = { width: number; height: number }

const charts: { type: ChartType; label: string }[] = [
  { type: 'column', label: 'Column chart' },
  { type: 'bar', label: 'Bar chart' },
  { type: 'line', label: 'Line chart' },
  { type: 'area', label: 'Area chart' },
  { type: 'pie', label: 'Pie chart' },
  { type: 'donut', label: 'Donut chart' }
]

const tables: { id: string; label: string; rows: number; cols: number; style: Partial<TableElement> }[] = [
  { id: 'simple', label: 'Simple table', rows: 4, cols: 3, style: {} },
  { id: 'minimal', label: 'Minimal', rows: 4, cols: 3, style: { headerFill: '#ffffff', headerTextColor: '#1f2329', stripeFill: undefined, borderColor: '#1f2329', borderWidth: 1 } },
  { id: 'accent', label: 'Accent header', rows: 5, cols: 4, style: { headerFill: '#7c5cff', stripeFill: '#f3f0ff', borderColor: '#e2dcff' } },
  { id: 'warm', label: 'Warm', rows: 4, cols: 2, style: { headerFill: '#ff7a59', stripeFill: '#fff3ee', borderColor: '#ffd9cc', fontFamily: 'Poppins' } },
  {
    id: 'pricing',
    label: 'Pricing',
    rows: 4,
    cols: 4,
    style: {
      rows: [
        ['Feature', 'Basic', 'Pro', 'Team'],
        ['Projects', '3', 'Unlimited', 'Unlimited'],
        ['Storage', '1 GB', '50 GB', '1 TB'],
        ['Price', '$0', '$9', '$29']
      ],
      headerFill: '#0f172a',
      stripeFill: '#f1f5f9',
      align: 'center'
    }
  },
  {
    id: 'schedule',
    label: 'Schedule',
    rows: 5,
    cols: 2,
    style: {
      rows: [
        ['Time', 'Session'],
        ['09:00', 'Welcome and coffee'],
        ['10:00', 'Keynote'],
        ['12:30', 'Lunch'],
        ['14:00', 'Workshops']
      ],
      headerFill: '#12a37f',
      stripeFill: '#ecfdf5',
      borderColor: '#c9eedf'
    }
  }
]

/** Editable charts and tables (data is edited in the panel on the right), and diagram templates. */
export function ChartsPanel(_props: { doc: DesignDocument }) {
  const diagrams = elementPresets.filter((p) => p.category === 'diagrams')
  return (
    <PanelFrame title="Charts and tables">
      <section className="panel-section">
        <SectionHead title="Charts" />
        <div className="tile-grid">
          {charts.map((c) => {
            const make = (d: Size) => [createChart(d, c.type)]
            return <InsertTile key={c.type} thumbKey={`chart:${c.type}@120`} label={c.label} make={make} render={() => presetThumb(`chart:${c.type}`, make)} showLabel />
          })}
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Select a chart to type in your own labels and numbers, change colours or switch the chart type.
        </p>
      </section>
      <section className="panel-section">
        <SectionHead title="Tables" />
        <div className="tile-grid cols-2">
          {tables.map((t) => {
            const make = (d: Size) => [createTable(d, t.rows, t.cols, t.style)]
            return <InsertTile key={t.id} thumbKey={`table:${t.id}@160`} label={t.label} make={make} render={() => presetThumb(`table:${t.id}`, make, 160)} showLabel />
          })}
        </div>
      </section>
      <section className="panel-section">
        <SectionHead title="Diagrams and infographics" />
        <div className="tile-grid cols-2">
          {diagrams.map((p) => (
            <InsertTile key={p.id} thumbKey={`el:${p.id}@160`} label={p.label} make={p.make} render={() => presetThumb(`el:${p.id}`, p.make, 160)} showLabel />
          ))}
        </div>
      </section>
    </PanelFrame>
  )
}
