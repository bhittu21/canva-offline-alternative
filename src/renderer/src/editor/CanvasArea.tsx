import Konva from 'konva'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import { MousePointerClick } from 'lucide-react'
import type { DesignDocument, DesignElement, Page, TableElement, TextElement } from '@shared/model'
import { importImageFiles } from '@renderer/io/projectIo'
import { buildBackground } from '@renderer/render/nodes'
import { tableLayout } from '@renderer/render/layouts'
import { assets, useAssetVersion } from '@renderer/store/assets'
import { editor, editorStore, useEditor } from '@renderer/store/editorStore'
import { uiStore, usePrefs, useUi } from '@renderer/store/uiStore'
import { fitBox, panBy, useView, viewStore, zoomAround } from '@renderer/store/viewStore'
import { endPanelDrag, takePanelDrop } from './dnd'
import { ElementNode, type ElementHandlers } from './ElementNode'
import { rotatedBounds } from './geometry'
import { Rulers, RULER_SIZE } from './Rulers'
import { curvedText, isCurved, measureTextHeight } from '@renderer/render/text'
import { TextEditor } from './TextEditor'

const SNAP_PX = 6
const ACCENT = '#6d4aff'

interface Guides {
  vertical: number[]
  horizontal: number[]
}

interface Marquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function CanvasArea({ doc, page }: { doc: DesignDocument; page: Page }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const pageRef = useRef<Konva.Group>(null)
  const backgroundRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [snapGuides, setSnapGuides] = useState<Guides>({ vertical: [], horizontal: [] })
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const panning = useRef<{ x: number; y: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const selectedIds = useEditor((s) => s.selectedIds)
  const editingTextId = useEditor((s) => s.editingTextId)
  const view = useView((s) => s)
  const prefs = usePrefs()
  const showRulers = prefs?.showRulers ?? true
  const snapping = prefs?.snapping ?? true
  const fitRequest = useUi((s) => s.fitRequest)
  const assetVersion = useAssetVersion()

  // ----- Size and fitting -----

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => viewStore.setState({ width: el.clientWidth, height: el.clientHeight })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    update()
    return () => observer.disconnect()
  }, [showRulers])

  const fitPage = useCallback(() => {
    fitBox({ x: 0, y: 0, width: doc.width, height: doc.height }, 40)
    viewStore.setState({ fit: true })
  }, [doc.width, doc.height])

  useEffect(() => {
    if (view.fit && view.width > 0) fitBox({ x: 0, y: 0, width: doc.width, height: doc.height }, 40)
  }, [view.fit, view.width, view.height, doc.width, doc.height])

  // A new page or a new document starts fitted.
  useEffect(() => {
    viewStore.setState({ fit: true })
  }, [page.id])

  useEffect(() => {
    if (!fitRequest) return
    if (fitRequest.kind === 'page') return fitPage()
    const els = page.elements.filter((el) => editorStore.getState().selectedIds.includes(el.id))
    if (els.length === 0) return fitPage()
    const b = unionBounds(els.map(elementBounds))
    fitBox(b, 80, 4)
  }, [fitRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Page background (drawn by the shared renderer) -----

  useLayoutEffect(() => {
    const group = backgroundRef.current
    if (!group) return
    group.destroyChildren()
    group.add(buildBackground(page, doc.width, doc.height, assets))
    group.getLayer()?.batchDraw()
  }, [page.background, page.backgroundGradient, page.backgroundAssetId, doc.width, doc.height, assetVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Transformer (resize and rotate handles) -----

  const selectedElements = useMemo(() => page.elements.filter((el) => selectedIds.includes(el.id) && !el.hidden), [page.elements, selectedIds])

  useEffect(() => {
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return
    const nodes = editingTextId ? [] : selectedElements.map((el) => stage.findOne(`#${el.id}`)).filter((n): n is Konva.Node => !!n)
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedElements, editingTextId, page])

  const single = selectedElements.length === 1 ? selectedElements[0] : null
  const anyLocked = selectedElements.some((el) => el.locked)
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  const sides = ['middle-left', 'middle-right']
  const all = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']
  let anchors = corners
  let keepRatio = true
  if (single) {
    switch (single.type) {
      case 'text':
        anchors = isCurved(single) ? corners : [...corners, ...sides]
        break
      case 'table':
        anchors = [...corners, ...sides]
        break
      case 'line':
        anchors = sides
        keepRatio = false
        break
      case 'image':
        anchors = all
        break
      case 'shape':
      case 'chart':
        anchors = all
        keepRatio = false
        break
      case 'icon':
        anchors = corners
        break
    }
  }

  const toPagePoint = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition() ?? { x: 0, y: 0 }
    const v = viewStore.getState()
    return { x: (pointer.x - v.x) / v.zoom, y: (pointer.y - v.y) / v.zoom }
  }

  // ----- Element events -----

  const handlers: ElementHandlers = useMemo(
    () => ({
      onPointerDown(event, element) {
        if (panning.current || ('button' in event.evt && event.evt.button === 1)) return
        event.cancelBubble = true
        const additive = 'shiftKey' in event.evt && (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey)
        const { selectedIds: current } = editorStore.getState()
        if (additive) editor.toggleSelected(element.id)
        else if (!current.includes(element.id)) editor.select([element.id])
      },
      onDoubleClick(element) {
        if (element.type === 'text' && !element.locked) {
          editor.setEditingText(element.id)
          return
        }
        // Double-clicking inside a group selects just that element.
        if (element.groupId) editorStore.setState({ selectedIds: [element.id] })
      },
      onContextMenu(event, element) {
        event.evt.preventDefault()
        event.cancelBubble = true
        if (!editorStore.getState().selectedIds.includes(element.id)) editor.select([element.id])
        uiStore.setState({ contextMenu: { x: event.evt.clientX, y: event.evt.clientY } })
      },
      onDragStart(event, element) {
        const { selectedIds: current } = editorStore.getState()
        if (!current.includes(element.id)) editor.select(event.evt?.shiftKey ? [...current, element.id] : [element.id])
        // Other selected elements follow the dragged one.
        const stage = stageRef.current
        const start = new Map<string, { x: number; y: number }>()
        for (const id of editorStore.getState().selectedIds) {
          const node = stage?.findOne(`#${id}`)
          if (node) start.set(id, { x: node.x(), y: node.y() })
        }
        dragStart.current = { id: element.id, positions: start }
      },
      onDragMove(event) {
        const node = event.target
        const drag = dragStart.current
        if (!drag) return
        snapDrag(node)
        const origin = drag.positions.get(node.id())
        if (!origin) return
        const dx = node.x() - origin.x
        const dy = node.y() - origin.y
        const stage = stageRef.current
        for (const [id, pos] of drag.positions) {
          if (id === node.id()) continue
          const other = stage?.findOne(`#${id}`)
          if (other && other.draggable()) other.position({ x: pos.x + dx, y: pos.y + dy })
        }
      },
      onDragEnd() {
        setSnapGuides({ vertical: [], horizontal: [] })
        const stage = stageRef.current
        const drag = dragStart.current
        dragStart.current = null
        if (!stage || !drag) return
        // Every moved element is saved as one undo step.
        const patches: Record<string, Partial<DesignElement>> = {}
        for (const id of drag.positions.keys()) {
          const node = stage.findOne(`#${id}`)
          if (node) patches[id] = { x: node.x(), y: node.y() }
        }
        editor.updateElements(patches, 'Move')
      },
      onHover(id) {
        setHoverId(id)
      }
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const dragStart = useRef<{ id: string; positions: Map<string, { x: number; y: number }> } | null>(null)
  const pageRefLatest = useRef(page)
  pageRefLatest.current = page
  const snappingRef = useRef(snapping)
  snappingRef.current = snapping

  /** Snaps the dragged element (or the dragged selection's box) to the page, other elements and ruler guides. */
  const snapDrag = (node: Konva.Node) => {
    const pg = pageRef.current
    const current = pageRefLatest.current
    if (!pg || !snappingRef.current) {
      setSnapGuides({ vertical: [], horizontal: [] })
      return
    }
    const moving = new Set(editorStore.getState().selectedIds)
    moving.add(node.id())
    const rect = node.getClientRect({ relativeTo: pg, skipShadow: true })
    const others = current.elements.filter((el) => !moving.has(el.id) && !el.hidden).map(elementBounds)
    const w = doc.width
    const h = doc.height
    const xTargets = [0, w / 2, w, ...(current.guides?.x ?? []), ...others.flatMap((b) => [b.x, b.x + b.width / 2, b.x + b.width])]
    const yTargets = [0, h / 2, h, ...(current.guides?.y ?? []), ...others.flatMap((b) => [b.y, b.y + b.height / 2, b.y + b.height])]
    const threshold = SNAP_PX / viewStore.getState().zoom
    const snapX = findSnap([rect.x, rect.x + rect.width / 2, rect.x + rect.width], xTargets, threshold)
    const snapY = findSnap([rect.y, rect.y + rect.height / 2, rect.y + rect.height], yTargets, threshold)
    if (snapX) node.x(node.x() + snapX.delta)
    if (snapY) node.y(node.y() + snapY.delta)
    setSnapGuides({ vertical: snapX ? [snapX.target] : [], horizontal: snapY ? [snapY.target] : [] })
  }

  // ----- Empty-space events: marquee selection and panning -----

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current
    if (!stage) return
    const evt = event.evt as MouseEvent
    if (spaceDown || evt.button === 1) {
      evt.preventDefault()
      panning.current = { x: evt.clientX, y: evt.clientY }
      setIsPanning(true)
      return
    }
    if (evt.button === 2) return
    // Clicks on the transformer handles are not "empty space".
    if (event.target.getParent()?.className === 'Transformer') return
    if (event.target.name() === 'guide') return
    editor.select([])
    const p = toPagePoint(stage)
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }

  const handleStageMouseMove = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (panning.current) {
      const evt = event.evt
      panBy(evt.clientX - panning.current.x, evt.clientY - panning.current.y)
      panning.current = { x: evt.clientX, y: evt.clientY }
      return
    }
    const stage = stageRef.current
    if (!marquee || !stage) return
    const p = toPagePoint(stage)
    setMarquee({ ...marquee, x1: p.x, y1: p.y })
  }

  const handleStageMouseUp = () => {
    if (panning.current) {
      panning.current = null
      setIsPanning(false)
      return
    }
    if (!marquee) return
    const box = normalize(marquee)
    const zoom = viewStore.getState().zoom
    if (box.width > 2 / zoom || box.height > 2 / zoom) {
      const hits = page.elements.filter((el) => {
        if (el.hidden || el.locked) return false
        const b = elementBounds(el)
        return b.x < box.x + box.width && b.x + b.width > box.x && b.y < box.y + box.height && b.y + b.height > box.y
      })
      editor.select(hits.map((el) => el.id))
    }
    setMarquee(null)
  }

  const handleStageContextMenu = (event: Konva.KonvaEventObject<PointerEvent>) => {
    event.evt.preventDefault()
    if (event.target === stageRef.current || event.target.name() === 'page-hit') {
      editor.select([])
      uiStore.setState({ contextMenu: { x: event.evt.clientX, y: event.evt.clientY } })
    }
  }

  // Space bar held: drag to pan.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e.target) && !e.repeat) {
        setSpaceDown(true)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ----- Resizing and rotating -----

  const handleTransform = () => {
    const transformer = transformerRef.current
    if (!transformer || !single || (single.type !== 'text' && single.type !== 'table')) return
    const anchor = transformer.getActiveAnchor()
    if (anchor !== 'middle-left' && anchor !== 'middle-right') return
    if (single.type === 'text') {
      // Side handles change the text box width (text re-wraps) instead of stretching letters.
      const group = transformer.nodes()[0] as Konva.Group
      const text = group.findOne<Konva.Text>('.text-content')
      if (!text) return
      text.width(Math.max(text.fontSize(), text.width() * group.scaleX()))
      group.scaleX(1)
    }
  }

  const handleTransformEnd = () => {
    const transformer = transformerRef.current
    if (!transformer) return
    const anchor = transformer.getActiveAnchor() ?? ''
    const sideOnly = anchor === 'middle-left' || anchor === 'middle-right'
    const patches: Record<string, Partial<DesignElement>> = {}
    for (const node of transformer.nodes()) {
      const el = page.elements.find((e) => e.id === node.id())
      if (!el) continue
      const sx = node.scaleX()
      const sy = node.scaleY()
      node.scale({ x: 1, y: 1 })
      const base = { x: node.x(), y: node.y(), rotation: normalizeRotation(node.rotation()) }
      patches[el.id] = { ...base, ...resizedProps(el, node, sx, sy, sideOnly) }
    }
    editor.updateElements(patches, 'Resize')
  }

  // ----- Zoom and scroll -----

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    if (event.evt.ctrlKey || event.evt.metaKey) {
      const pointer = stage.getPointerPosition() ?? undefined
      zoomAround(viewStore.getState().zoom * Math.pow(1.0018, -event.evt.deltaY), pointer)
    } else {
      const dx = event.evt.shiftKey ? event.evt.deltaY : event.evt.deltaX
      const dy = event.evt.shiftKey ? 0 : event.evt.deltaY
      panBy(-dx, -dy)
    }
  }

  // ----- Drops: image files from Windows, or items dragged from the side panels -----

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const stage = stageRef.current
    const rect = containerRef.current?.getBoundingClientRect()
    const v = viewStore.getState()
    const point = rect ? { x: (event.clientX - rect.left - v.x) / v.zoom, y: (event.clientY - rect.top - v.y) / v.zoom } : { x: doc.width / 2, y: doc.height / 2 }
    const action = takePanelDrop()
    if (action) {
      // Dropping a photo onto an image frame fills the frame.
      const target = [...page.elements].reverse().find((el) => el.type === 'image' && !el.hidden && !el.locked && containsPoint(el, point))
      action(point, target?.id ?? null)
      return
    }
    const files = [...event.dataTransfer.files]
    if (files.length > 0 && stage) void importImageFiles(files, point)
  }

  // ----- Ruler guides -----

  const addGuide = (axis: 'x' | 'y', value: number) => {
    editor.changePage('Add guide', (pg) => {
      pg.guides ??= { x: [], y: [] }
      pg.guides[axis].push(Math.round(value))
    })
  }

  const moveGuide = (axis: 'x' | 'y', index: number, value: number) => {
    const limit = axis === 'x' ? doc.width : doc.height
    editor.changePage(value < 0 || value > limit ? 'Remove guide' : 'Move guide', (pg) => {
      if (!pg.guides) return
      if (value < 0 || value > limit) pg.guides[axis].splice(index, 1)
      else pg.guides[axis][index] = Math.round(value)
    })
  }

  const editingElement = page.elements.find((el) => el.id === editingTextId && el.type === 'text') as TextElement | undefined
  const marqueeBox = marquee ? normalize(marquee) : null
  const hovered = hoverId && !selectedIds.includes(hoverId) ? page.elements.find((el) => el.id === hoverId) : undefined
  const stroke = 1 / view.zoom

  return (
    <>
      {showRulers && <Rulers doc={doc} page={page} selection={selectedElements} onAddGuide={addGuide} />}
      <div
        className={`canvas-area${showRulers ? ' with-rulers' : ''}${spaceDown || isPanning ? ' panning' : ''}`}
        ref={containerRef}
        tabIndex={-1}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => undefined}
        onDrop={handleDrop}
        onDragEnd={endPanelDrag}
        onContextMenu={(e) => e.preventDefault()}
      >
        {view.width > 0 && (
          <Stage
            ref={stageRef}
            width={view.width}
            height={view.height}
            onMouseDown={handleStageMouseDown}
            onTouchStart={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            onMouseLeave={handleStageMouseUp}
            onWheel={handleWheel}
            onContextMenu={handleStageContextMenu}
          >
            <Layer>
              <Group ref={pageRef} x={view.x} y={view.y} scaleX={view.zoom} scaleY={view.zoom}>
                {/* Soft shadow under the page. */}
                <Rect width={doc.width} height={doc.height} fill="#ffffff" shadowColor="rgba(16,24,40,0.22)" shadowBlur={18 / view.zoom} shadowOffsetY={3 / view.zoom} listening={false} />
                <Rect name="page-hit" width={doc.width} height={doc.height} fill="rgba(0,0,0,0)" />
                {/* Content outside the page is hidden, the same as in exports. */}
                <Group clipX={0} clipY={0} clipWidth={doc.width} clipHeight={doc.height}>
                  <Group ref={backgroundRef} listening={false} />
                  {page.elements.map((el) => (
                    <ElementNode key={el.id} element={el} editing={el.id === editingTextId} handlers={handlers} />
                  ))}
                </Group>
                {hovered && !hovered.hidden && (
                  <Rect
                    x={hovered.x}
                    y={hovered.y}
                    width={hovered.width}
                    height={hovered.height}
                    rotation={hovered.rotation}
                    stroke={ACCENT}
                    strokeWidth={1.5 * stroke}
                    listening={false}
                  />
                )}
                {(page.guides?.x ?? []).map((x, i) => (
                  <Line
                    key={`gx${i}`}
                    name="guide"
                    points={[x, -100000, x, 100000]}
                    stroke="#00a3e0"
                    strokeWidth={stroke}
                    hitStrokeWidth={6 * stroke}
                    draggable
                    dragBoundFunc={function (this: Konva.Node, pos) {
                      return { x: pos.x, y: this.absolutePosition().y }
                    }}
                    onDragEnd={(e) => {
                      const dx = e.target.x()
                      e.target.x(0)
                      moveGuide('x', i, x + dx)
                    }}
                    onMouseEnter={(e) => ((e.target.getStage()!.container().style.cursor = 'ew-resize'))}
                    onMouseLeave={(e) => ((e.target.getStage()!.container().style.cursor = ''))}
                  />
                ))}
                {(page.guides?.y ?? []).map((y, i) => (
                  <Line
                    key={`gy${i}`}
                    name="guide"
                    points={[-100000, y, 100000, y]}
                    stroke="#00a3e0"
                    strokeWidth={stroke}
                    hitStrokeWidth={6 * stroke}
                    draggable
                    dragBoundFunc={function (this: Konva.Node, pos) {
                      return { x: this.absolutePosition().x, y: pos.y }
                    }}
                    onDragEnd={(e) => {
                      const dy = e.target.y()
                      e.target.y(0)
                      moveGuide('y', i, y + dy)
                    }}
                    onMouseEnter={(e) => ((e.target.getStage()!.container().style.cursor = 'ns-resize'))}
                    onMouseLeave={(e) => ((e.target.getStage()!.container().style.cursor = ''))}
                  />
                ))}
                {snapGuides.vertical.map((x) => (
                  <Line key={`v${x}`} points={[x, -100000, x, 100000]} stroke="#e8308c" strokeWidth={stroke} listening={false} />
                ))}
                {snapGuides.horizontal.map((y) => (
                  <Line key={`h${y}`} points={[-100000, y, 100000, y]} stroke="#e8308c" strokeWidth={stroke} listening={false} />
                ))}
                {marqueeBox && <Rect {...marqueeBox} fill="rgba(109,74,255,0.08)" stroke={ACCENT} strokeWidth={stroke} listening={false} />}
              </Group>
              <Transformer
                ref={transformerRef}
                rotateEnabled={!anyLocked}
                resizeEnabled={!anyLocked}
                enabledAnchors={anyLocked ? [] : anchors}
                keepRatio={keepRatio}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={4}
                anchorSize={10}
                anchorCornerRadius={5}
                anchorStroke={ACCENT}
                anchorStrokeWidth={1.5}
                borderStroke={ACCENT}
                borderStrokeWidth={1.5}
                borderDash={anyLocked ? [4, 4] : undefined}
                rotateAnchorOffset={26}
                padding={2}
                ignoreStroke
                flipEnabled={false}
                shouldOverdrawWholeArea={false}
                boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox)}
                onTransform={handleTransform}
                onTransformEnd={handleTransformEnd}
              />
            </Layer>
          </Stage>
        )}

        {editingElement && <TextEditor element={editingElement} view={view} />}

        {page.elements.length === 0 && !page.backgroundAssetId && (
          <div className="canvas-hint">
            <MousePointerClick size={15} /> Pick a template, or add text, elements and photos from the left
          </div>
        )}
      </div>
    </>
  )
}

/** New size properties after the transformer scaled a node. Text and tables grow their font instead of stretching. */
function resizedProps(el: DesignElement, node: Konva.Node, sx: number, sy: number, sideOnly: boolean): Partial<DesignElement> {
  switch (el.type) {
    case 'text': {
      const textNode = (node as Konva.Group).findOne<Konva.Text>('.text-content')
      const curved = isCurved(el)
      const width = curved ? el.width * sx : (textNode?.width() ?? el.width) * sx
      const scale = sideOnly ? 1 : sy
      const fontSize = Math.max(1, el.fontSize * scale)
      const next: TextElement = {
        ...el,
        width,
        fontSize,
        letterSpacing: el.letterSpacing * scale,
        ...(el.strokeWidth !== undefined && { strokeWidth: el.strokeWidth * scale })
      }
      if (curved) {
        const box = curvedText(next)
        return { fontSize, letterSpacing: next.letterSpacing, strokeWidth: next.strokeWidth, width: box.width, height: box.height }
      }
      return { width, fontSize, letterSpacing: next.letterSpacing, strokeWidth: next.strokeWidth, height: measureTextHeight(next) }
    }
    case 'table': {
      const scale = sideOnly ? 1 : sy
      const next: TableElement = { ...el, width: Math.max(20, el.width * sx), fontSize: Math.max(4, el.fontSize * scale), borderWidth: el.borderWidth * scale }
      return { width: next.width, fontSize: next.fontSize, borderWidth: next.borderWidth, height: tableLayout(next).height }
    }
    case 'line':
      return { width: Math.max(4, el.width * sx) }
    default:
      return { width: Math.max(1, el.width * sx), height: Math.max(1, el.height * sy) }
  }
}

function normalize(m: Marquee) {
  return { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), width: Math.abs(m.x1 - m.x0), height: Math.abs(m.y1 - m.y0) }
}

function normalizeRotation(rotation: number): number {
  const r = rotation % 360
  return r < 0 ? r + 360 : r
}

export function elementBounds(el: DesignElement) {
  return rotatedBounds(el.x, el.y, el.width, el.height, el.rotation)
}

function unionBounds(boxes: { x: number; y: number; width: number; height: number }[]) {
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  return { x, y, width: Math.max(...boxes.map((b) => b.x + b.width)) - x, height: Math.max(...boxes.map((b) => b.y + b.height)) - y }
}

/** Whether a point (design pixels) is inside an element, taking rotation into account. */
function containsPoint(el: DesignElement, p: { x: number; y: number }): boolean {
  const rad = (-el.rotation * Math.PI) / 180
  const dx = p.x - el.x
  const dy = p.y - el.y
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  return lx >= 0 && ly >= 0 && lx <= el.width && ly <= el.height
}

function findSnap(edges: number[], targets: number[], threshold: number) {
  let best: { delta: number; target: number } | null = null
  for (const edge of edges) {
    for (const target of targets) {
      const delta = target - edge
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target }
    }
  }
  return best
}

export { RULER_SIZE }
