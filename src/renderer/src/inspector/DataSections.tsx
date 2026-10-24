import { AlignCenter, AlignLeft, AlignRight, AreaChart, BarChart3, BarChartHorizontal, LineChart, Minus, PieChart, Plus, Trash2 } from 'lucide-react'
import type { ChartElement, ChartType, TableElement } from '@shared/model'
import { ColorField } from '@renderer/components/ColorPicker'
import { NumberField, Segmented, Switch } from '@renderer/components/ui'
import { tableLayout } from '@renderer/render/layouts'
import { Section, updater } from './common'
import { FontPicker } from './TextSections'

const chartTypes: { value: ChartType; title: string; icon: React.ReactNode }[] = [
  { value: 'column', title: 'Columns', icon: <BarChart3 size={15} /> },
  { value: 'bar', title: 'Bars', icon: <BarChartHorizontal size={15} /> },
  { value: 'line', title: 'Line', icon: <LineChart size={15} /> },
  { value: 'area', title: 'Area', icon: <AreaChart size={15} /> },
  { value: 'pie', title: 'Pie', icon: <PieChart size={15} /> },
  { value: 'donut', title: 'Donut', icon: <PieChart size={15} strokeWidth={3} /> }
]

const seriesColors = ['#7c5cff', '#22a6c8', '#ff7a59', '#12a37f', '#ffd166', '#ef476f', '#3a86ff', '#8d99ae']

const cellInput: React.CSSProperties = { height: 28, padding: '0 6px', fontSize: 12, minWidth: 0 }

/** Chart type, data and style. */
export function ChartSections({ el }: { el: ChartElement }) {
  const update = updater(el)
  const round = el.chartType === 'pie' || el.chartType === 'donut'
  const series = round ? el.series.slice(0, 1) : el.series

  const setValue = (s: number, i: number, text: string) => {
    const n = Number(text)
    if (!Number.isFinite(n)) return
    update({ series: el.series.map((x, j) => (j === s ? { ...x, values: el.labels.map((_, k) => (k === i ? n : (x.values[k] ?? 0))) } : x)) }, 'Chart data')
  }
  const addRow = () =>
    update({ labels: [...el.labels, `Item ${el.labels.length + 1}`], series: el.series.map((x) => ({ ...x, values: [...x.values, x.values[x.values.length - 1] ?? 10] })) }, 'Add data row')
  const removeRow = (i: number) => update({ labels: el.labels.filter((_, k) => k !== i), series: el.series.map((x) => ({ ...x, values: x.values.filter((_, k) => k !== i) })) }, 'Remove data row')
  const addSeries = () =>
    update({ series: [...el.series, { name: `Series ${el.series.length + 1}`, color: seriesColors[el.series.length % seriesColors.length], values: el.labels.map(() => 10) }], showLegend: true }, 'Add series')

  return (
    <>
      <Section title="Chart">
        <div className="stack" style={{ gap: 10 }}>
          <Segmented block label="Chart type" value={el.chartType} onChange={(chartType) => update({ chartType }, 'Chart type')} options={chartTypes} />
          <div className="prop-grid">
            <Switch label="Values" checked={el.showValues} onChange={(showValues) => update({ showValues }, 'Chart labels')} />
            <Switch label="Legend" checked={el.showLegend} onChange={(showLegend) => update({ showLegend }, 'Chart legend')} />
            {!round && <Switch label="Grid lines" checked={el.showGrid} onChange={(showGrid) => update({ showGrid }, 'Chart grid')} />}
          </div>
          <FontPicker value={el.fontFamily} onChange={(fontFamily) => update({ fontFamily }, 'Chart font')} />
          <ColorField label="Text colour" value={el.textColor} onChange={(textColor) => update({ textColor }, 'Chart text colour')} />
        </div>
      </Section>
      <Section title="Data" action={<span className="muted small">{round ? 'Slices' : `${el.labels.length} × ${series.length}`}</span>}>
        <div style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1.4fr) repeat(${series.length}, minmax(0, 1fr)) 24px`, gap: 4, alignItems: 'center' }}>
          <span className="field-label">Label</span>
          {series.map((s, si) => (
            <span key={si} className="row" style={{ gap: 3, minWidth: 0 }}>
              <ColorField label={`${s.name} colour`} value={s.color} onChange={(color) => update({ series: el.series.map((x, j) => (j === si ? { ...x, color } : x)) }, 'Series colour')} compact />
              <input
                className="input"
                style={cellInput}
                value={s.name}
                aria-label={`Series ${si + 1} name`}
                onChange={(e) => update({ series: el.series.map((x, j) => (j === si ? { ...x, name: e.target.value } : x)) }, 'Series name')}
              />
            </span>
          ))}
          <span />
          {el.labels.map((label, i) => (
            <Row key={i}>
              <input
                className="input"
                style={cellInput}
                value={label}
                aria-label={`Label ${i + 1}`}
                onChange={(e) => update({ labels: el.labels.map((l, k) => (k === i ? e.target.value : l)) }, 'Chart labels')}
              />
              {series.map((s, si) => (
                <input
                  key={si}
                  className="input"
                  style={cellInput}
                  type="number"
                  value={s.values[i] ?? 0}
                  aria-label={`${s.name} value for ${label}`}
                  onChange={(e) => setValue(si, i, e.target.value)}
                />
              ))}
              <button className="icon-btn sm" title="Remove row" aria-label={`Remove ${label}`} disabled={el.labels.length <= 1} onClick={() => removeRow(i)}>
                <Minus size={13} />
              </button>
            </Row>
          ))}
        </div>
        <div className="tool-row" style={{ marginTop: 8 }}>
          <button className="btn sm" onClick={addRow} disabled={el.labels.length >= 50}>
            <Plus size={14} /> Row
          </button>
          {!round && (
            <button className="btn sm" onClick={addSeries} disabled={el.series.length >= 8}>
              <Plus size={14} /> Series
            </button>
          )}
          {!round && el.series.length > 1 && (
            <button className="btn sm ghost" onClick={() => update({ series: el.series.slice(0, -1) }, 'Remove series')}>
              <Trash2 size={14} /> Last series
            </button>
          )}
        </div>
        {round && <p className="muted small" style={{ marginTop: 8 }}>Pie and donut charts use the first series; slice colours are shades of its colour.</p>}
      </Section>
    </>
  )
}

/** Renders its children directly into the parent grid. */
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Table cells and style. */
export function TableSections({ el }: { el: TableElement }) {
  const base = updater(el)
  const update = (patch: Partial<TableElement>, label: string) => base({ ...patch, height: tableLayout({ ...el, ...patch }).height }, label)
  const cols = el.rows[0]?.length ?? 1

  const setCell = (r: number, c: number, value: string) => update({ rows: el.rows.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value : v)) : row)) }, 'Edit table')
  const addRow = () => update({ rows: [...el.rows, Array.from({ length: cols }, () => '')] }, 'Add table row')
  const addCol = () => update({ rows: el.rows.map((row, i) => [...row, i === 0 && el.headerRow ? 'Column' : '']) }, 'Add table column')
  const removeRow = (r: number) => update({ rows: el.rows.filter((_, i) => i !== r) }, 'Remove table row')
  const removeCol = (c: number) => update({ rows: el.rows.map((row) => row.filter((_, j) => j !== c)) }, 'Remove table column')

  return (
    <>
      <Section title="Cells" action={<span className="muted small">{el.rows.length} × {cols}</span>}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr)) 24px`, gap: 4, alignItems: 'center' }}>
            {el.rows.map((row, r) => (
              <Row key={r}>
                {row.map((cell, c) => (
                  <input
                    key={c}
                    className="input"
                    style={{ ...cellInput, fontWeight: r === 0 && el.headerRow ? 650 : 400 }}
                    value={cell}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                    onChange={(e) => setCell(r, c, e.target.value)}
                  />
                ))}
                <button className="icon-btn sm" title="Remove row" aria-label={`Remove row ${r + 1}`} disabled={el.rows.length <= 1} onClick={() => removeRow(r)}>
                  <Minus size={13} />
                </button>
              </Row>
            ))}
            {Array.from({ length: cols }, (_, c) => (
              <button key={c} className="btn sm ghost" style={{ height: 24, padding: 0 }} title="Remove column" aria-label={`Remove column ${c + 1}`} disabled={cols <= 1} onClick={() => removeCol(c)}>
                <Minus size={13} />
              </button>
            ))}
          </div>
        </div>
        <div className="tool-row" style={{ marginTop: 8 }}>
          <button className="btn sm" onClick={addRow} disabled={el.rows.length >= 60}>
            <Plus size={14} /> Row
          </button>
          <button className="btn sm" onClick={addCol} disabled={cols >= 20}>
            <Plus size={14} /> Column
          </button>
        </div>
      </Section>
      <Section title="Table style">
        <div className="stack" style={{ gap: 10 }}>
          <FontPicker value={el.fontFamily} onChange={(fontFamily) => update({ fontFamily }, 'Table font')} />
          <div className="prop-grid">
            <NumberField label="Text size" value={el.fontSize} min={4} max={400} decimals={1} onChange={(fontSize) => update({ fontSize }, 'Table text size')} />
            <NumberField label="Border width" value={el.borderWidth} min={0} max={50} decimals={1} onChange={(borderWidth) => update({ borderWidth }, 'Table border')} />
          </div>
          <Segmented
            block
            label="Text alignment"
            value={el.align}
            onChange={(align) => update({ align }, 'Table alignment')}
            options={[
              { value: 'left', icon: <AlignLeft size={15} />, title: 'Left' },
              { value: 'center', icon: <AlignCenter size={15} />, title: 'Centre' },
              { value: 'right', icon: <AlignRight size={15} />, title: 'Right' }
            ]}
          />
          <Switch label="Header row" checked={el.headerRow} onChange={(headerRow) => update({ headerRow }, 'Table header')} />
          {el.headerRow && (
            <>
              <ColorField label="Header fill" value={el.headerFill} onChange={(headerFill) => update({ headerFill }, 'Table header colour')} />
              <ColorField label="Header text" value={el.headerTextColor} onChange={(headerTextColor) => update({ headerTextColor }, 'Table header colour')} />
            </>
          )}
          <ColorField label="Cell fill" value={el.fill} onChange={(fill) => update({ fill }, 'Table colour')} />
          <ColorField label="Text colour" value={el.textColor} onChange={(textColor) => update({ textColor }, 'Table colour')} />
          <Switch label="Striped rows" checked={!!el.stripeFill} onChange={(on) => update({ stripeFill: on ? '#f3f4f7' : undefined }, 'Table stripes')} />
          {el.stripeFill && <ColorField label="Stripe colour" value={el.stripeFill} onChange={(stripeFill) => update({ stripeFill }, 'Table stripes')} />}
          <ColorField label="Border colour" value={el.borderColor} onChange={(borderColor) => update({ borderColor }, 'Table border')} />
        </div>
      </Section>
    </>
  )
}
