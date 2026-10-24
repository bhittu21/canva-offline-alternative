import type { ReactNode } from 'react'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  BarChart3,
  BringToFront,
  CopyPlus,
  FileText,
  Frame,
  Group,
  Image,
  Lock,
  MousePointer2,
  SendToBack,
  Shapes,
  Slash,
  Smile,
  Table2,
  Trash2,
  Type,
  Ungroup,
  Unlock
} from 'lucide-react'
import type { DesignDocument, DesignElement, Page } from '@shared/model'
import { ColorField } from '@renderer/components/ColorPicker'
import { NumberField, SliderField, Switch } from '@renderer/components/ui'
import { duplicateSelection } from '@renderer/editor/commands'
import { editor, useEditor } from '@renderer/store/editorStore'
import { openDialog, updatePrefs, usePrefs } from '@renderer/store/uiStore'
import { Section, ToggleButton, updater } from './common'
import { TextSections } from './TextSections'
import { ImageSections } from './ImageSections'
import { IconSection, LineSection, ShadowSection, ShapeSection } from './StyleSections'
import { PanelResizer } from '@renderer/shell/PanelResizer'
import { ChartSections, TableSections } from './DataSections'

const typeInfo: Record<DesignElement['type'], { label: string; icon: ReactNode }> = {
  text: { label: 'Text', icon: <Type size={15} /> },
  shape: { label: 'Shape', icon: <Shapes size={15} /> },
  line: { label: 'Line', icon: <Slash size={15} /> },
  image: { label: 'Image', icon: <Image size={15} /> },
  icon: { label: 'Icon', icon: <Smile size={15} /> },
  chart: { label: 'Chart', icon: <BarChart3 size={15} /> },
  table: { label: 'Table', icon: <Table2 size={15} /> }
}

/** The panel on the right. It shows the settings that make sense for what is selected. */
export function Inspector({ doc, page }: { doc: DesignDocument; page: Page }) {
  const selectedIds = useEditor((s) => s.selectedIds)
  const selection = page.elements.filter((el) => selectedIds.includes(el.id))

  let title: ReactNode
  let icon: ReactNode
  let body: ReactNode
  if (selection.length === 0) {
    title = 'Page'
    icon = <FileText size={15} />
    body = <PageSections doc={doc} page={page} />
  } else if (selection.length === 1) {
    const el = selection[0]
    const info = el.type === 'image' && !el.assetId ? { label: 'Frame', icon: <Frame size={15} /> } : typeInfo[el.type]
    title = el.name || info.label
    icon = info.icon
    body = <ElementSections el={el} doc={doc} />
  } else {
    const groupIds = new Set(selection.map((el) => el.groupId))
    const isGroup = groupIds.size === 1 && !groupIds.has(undefined)
    title = isGroup ? `Group of ${selection.length}` : `${selection.length} selected`
    icon = isGroup ? <Group size={15} /> : <MousePointer2 size={15} />
    body = <MultiSections selection={selection} isGroup={isGroup} />
  }

  return (
    <aside className="inspector" aria-label="Properties">
      <PanelResizer cssVar="--inspector-w" edge="left" min={240} max={520} label="Resize properties panel" />
      <header className="inspector-head">
        <span className="type-icon">{icon}</span>
        <h2>{title}</h2>
      </header>
      <div className="inspector-body">{body}</div>
    </aside>
  )
}

// ---------------------------------------------------------------- Nothing selected

function PageSections({ doc, page }: { doc: DesignDocument; page: Page }) {
  const prefs = usePrefs()
  const index = doc.pages.findIndex((p) => p.id === page.id)
  return (
    <>
      <Section title={`Page ${index + 1} of ${doc.pages.length}`}>
        <div className="stack" style={{ gap: 10 }}>
          <label className="field">
            <span className="field-label">Page name</span>
            <input
              className="input"
              value={page.name}
              placeholder={`Page ${index + 1}`}
              onChange={(e) => editor.changePage('Rename page', (p) => void (p.name = e.target.value), { mergeKey: `page-name-${page.id}` })}
            />
          </label>
          <ColorField
            label="Background"
            value={page.background}
            gradient={page.backgroundGradient}
            onChange={(c) =>
              editor.changePage(
                'Background colour',
                (p) => {
                  p.background = c
                  delete p.backgroundGradient
                },
                { mergeKey: `bg-${page.id}` }
              )
            }
            onGradient={(g) => editor.changePage('Background gradient', (p) => (g ? (p.backgroundGradient = g) : delete p.backgroundGradient), { mergeKey: `bg-${page.id}` })}
          />
          {page.backgroundAssetId && (
            <button className="btn sm" onClick={() => editor.changePage('Remove background image', (p) => delete p.backgroundAssetId)}>
              Remove background photo
            </button>
          )}
          <div className="tool-row">
            <button className="btn sm" onClick={() => editor.addPage(page.id)}>
              Add page
            </button>
            <button className="btn sm" onClick={() => editor.duplicatePage(page.id)}>
              Duplicate
            </button>
            <button className="btn sm danger" disabled={doc.pages.length < 2} onClick={() => editor.deletePage(page.id)}>
              Delete
            </button>
          </div>
        </div>
      </Section>
      <Section title="Design size">
        <p className="muted small" style={{ margin: '0 0 8px' }}>
          {doc.width} × {doc.height} px · {doc.pages.length} page{doc.pages.length === 1 ? '' : 's'}
        </p>
        <button className="btn sm block" onClick={() => openDialog('resize')}>
          Resize or make a copy in another size…
        </button>
      </Section>
      <Section title="Canvas">
        <div className="stack" style={{ gap: 10 }}>
          <Switch label="Show rulers" checked={prefs?.showRulers ?? true} onChange={(v) => void updatePrefs({ showRulers: v })} />
          <Switch label="Snap to edges and centres" checked={prefs?.snapping ?? true} onChange={(v) => void updatePrefs({ snapping: v })} />
          {page.guides && (page.guides.x.length > 0 || page.guides.y.length > 0) && (
            <button className="btn sm" onClick={() => editor.changePage('Remove guides', (p) => delete p.guides)}>
              Remove {page.guides.x.length + page.guides.y.length} guide{page.guides.x.length + page.guides.y.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          Drag from a ruler to add a guide. Hold Space and drag to pan; Ctrl + scroll to zoom. Press Ctrl+K to search every command.
        </p>
      </Section>
    </>
  )
}

// ---------------------------------------------------------------- One element

function ArrangeRow({ locked }: { locked: boolean }) {
  return (
    <div className="tool-row spread">
      <button className="icon-btn" data-tip="Bring to front" aria-label="Bring to front" onClick={() => editor.arrange('front')}>
        <BringToFront size={17} />
      </button>
      <button className="icon-btn" data-tip="Bring forward" aria-label="Bring forward" onClick={() => editor.arrange('forward')}>
        <ArrowUpToLine size={17} />
      </button>
      <button className="icon-btn" data-tip="Send backward" aria-label="Send backward" onClick={() => editor.arrange('backward')}>
        <ArrowDownToLine size={17} />
      </button>
      <button className="icon-btn" data-tip="Send to back" aria-label="Send to back" onClick={() => editor.arrange('back')}>
        <SendToBack size={17} />
      </button>
      <ToggleButton on={locked} title={locked ? 'Unlock' : 'Lock'} onClick={editor.toggleLock}>
        {locked ? <Lock size={17} /> : <Unlock size={17} />}
      </ToggleButton>
      <button className="icon-btn" data-tip="Duplicate (Ctrl+D)" aria-label="Duplicate" onClick={duplicateSelection}>
        <CopyPlus size={17} />
      </button>
      <button className="icon-btn" data-tip="Delete" aria-label="Delete" onClick={editor.deleteSelected}>
        <Trash2 size={17} />
      </button>
    </div>
  )
}

function AlignRow({ distribute }: { distribute?: boolean }) {
  const items: [string, ReactNode, () => void][] = [
    ['Align left', <AlignStartVertical size={17} key="l" />, () => editor.align('left')],
    ['Align centre', <AlignCenterVertical size={17} key="c" />, () => editor.align('center')],
    ['Align right', <AlignEndVertical size={17} key="r" />, () => editor.align('right')],
    ['Align top', <AlignStartHorizontal size={17} key="t" />, () => editor.align('top')],
    ['Align middle', <AlignCenterHorizontal size={17} key="m" />, () => editor.align('middle')],
    ['Align bottom', <AlignEndHorizontal size={17} key="b" />, () => editor.align('bottom')]
  ]
  if (distribute) {
    items.push(['Space evenly across', <AlignHorizontalDistributeCenter size={17} key="dx" />, () => editor.distribute('x')])
    items.push(['Space evenly down', <AlignVerticalDistributeCenter size={17} key="dy" />, () => editor.distribute('y')])
  }
  return (
    <div className="tool-row spread">
      {items.map(([label, icon, run]) => (
        <button key={label} className="icon-btn" data-tip={label} aria-label={label} onClick={run}>
          {icon}
        </button>
      ))}
    </div>
  )
}

function ElementSections({ el, doc }: { el: DesignElement; doc: DesignDocument }) {
  const update = updater(el)
  return (
    <>
      {el.locked && (
        <div className="insp-section">
          <div className="notice info">
            <Lock size={14} /> Locked. Unlock it to make changes.
          </div>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={editor.toggleLock}>
            <Unlock size={14} /> Unlock
          </button>
        </div>
      )}
      <fieldset disabled={el.locked} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
      {el.type === 'text' && <TextSections el={el} />}
      {el.type === 'shape' && <ShapeSection el={el} />}
      {el.type === 'line' && <LineSection el={el} />}
      {el.type === 'icon' && <IconSection el={el} />}
      {el.type === 'image' && <ImageSections el={el} doc={doc} />}
      {el.type === 'chart' && <ChartSections el={el} />}
      {el.type === 'table' && <TableSections el={el} />}

      {el.type !== 'line' && <ShadowSection el={el} />}

      <Section title="Position and size">
        <div className="prop-grid">
          <NumberField label="X" value={el.x} onChange={(x) => update({ x }, 'Move')} suffix="px" />
          <NumberField label="Y" value={el.y} onChange={(y) => update({ y }, 'Move')} suffix="px" />
          <NumberField label="Width" value={el.width} min={1} onChange={(width) => update({ width }, 'Resize')} suffix="px" />
          <NumberField
            label="Height"
            value={el.height}
            min={1}
            onChange={(height) => update({ height }, 'Resize')}
            suffix="px"
            disabled={el.type === 'text' || el.type === 'table' || el.type === 'line'}
          />
          <NumberField label="Rotation" value={el.rotation} min={-360} max={360} onChange={(rotation) => update({ rotation }, 'Rotate')} suffix="°" />
        </div>
        <div style={{ marginTop: 10 }}>
          <SliderField label="Transparency" value={el.opacity} min={0} max={1} step={0.01} onChange={(opacity) => update({ opacity }, 'Opacity')} display={{ scale: 100, suffix: '%' }} />
        </div>
      </Section>
      <Section title="Align to page">
        <AlignRow />
      </Section>
      </fieldset>
      <Section title="Arrange">
        <ArrangeRow locked={el.locked} />
      </Section>
    </>
  )
}

// ---------------------------------------------------------------- Several elements

function MultiSections({ selection, isGroup }: { selection: DesignElement[]; isGroup: boolean }) {
  const opacity = selection.reduce((sum, el) => sum + el.opacity, 0) / selection.length
  const allLocked = selection.every((el) => el.locked)
  return (
    <>
      <Section title="Group">
        <div className="tool-row">
          {isGroup ? (
            <button className="btn sm" onClick={editor.ungroup}>
              <Ungroup size={15} /> Ungroup
            </button>
          ) : (
            <button className="btn sm" onClick={editor.group}>
              <Group size={15} /> Group (Ctrl+G)
            </button>
          )}
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          {isGroup ? 'Grouped elements move and resize together. Ungroup to edit them one by one.' : 'Shift-click on the page or in Layers to add or remove elements from the selection.'}
        </p>
      </Section>
      <Section title={isGroup ? 'Align to page' : selection.length > 2 ? 'Align and space' : 'Align'}>
        <AlignRow distribute={!isGroup && selection.length > 2} />
        <p className="muted small" style={{ marginTop: 8 }}>
          {isGroup ? 'Moves the whole group.' : 'Aligns the selected elements to each other.'}
        </p>
      </Section>
      <Section title="Transparency">
        <SliderField
          label="All selected"
          value={opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => editor.updateSelected({ opacity: v }, 'Opacity', 'multi-opacity')}
          display={{ scale: 100, suffix: '%' }}
        />
      </Section>
      <Section title="Arrange">
        <ArrangeRow locked={allLocked} />
      </Section>
    </>
  )
}
