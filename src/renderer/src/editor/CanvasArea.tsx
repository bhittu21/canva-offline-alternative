import Konva from 'konva'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import type { DesignDocument, DesignElement, TextElement } from '@shared/model'
import { importImageFiles } from '@renderer/io/projectIo'
import { editor, editorStore, useEditor } from '@renderer/store/editorStore'
import { ElementNode } from './ElementNode'
import { rotatedBounds } from './geometry'
import { measureTextHeight } from './textMeasure'
import { TextEditor } from './TextEditor'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 5
const FIT_MARGIN = 48
const SNAP_PX = 6

interface View {
  zoom: number
  x: number
  y: number
}

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

export function CanvasArea({ doc }: { doc: DesignDocument }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const pageRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 })
  const [fitMode, setFitMode] = useState(true)
  const [guides, setGuides] = useState<Guides>({ vertical: [], horizontal: [] })
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const selectedIds = useEditor((s) => s.selectedIds)
  const editingTextId = useEditor((s) => s.editingTextId)

  // Track the canvas area's size.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setSize({ width: el.clientWidth, height: el.clientHeight }))
    observer.observe(el)
    setSize({ width: el.clientWidth, height: el.clientHeight })
    return () => observer.disconnect()
  }, [])

  const fitView = useCallback((): View => {
    const zoom = clampZoom(
      Math.min((size.width - FIT_MARGIN * 2) / doc.width, (size.height - FIT_MARGIN * 2) / doc.height)
    )
    return { zoom, x: (size.width - doc.width * zoom) / 2, y: (size.height - doc.height * zoom) / 2 }
  }, [size.width, size.height, doc.width, doc.height])

  useEffect(() => {
    if (fitMode && size.width > 0) setView(fitView())
  }, [fitMode, fitView, size.width])

  const zoomAround = useCallback((nextZoom: number, point: { x: number; y: number }) => {
    setFitMode(false)
    setView((v) => {
      const zoom = clampZoom(nextZoom)
      const pageX = (point.x - v.x) / v.zoom
      const pageY = (point.y - v.y) / v.zoom
      return { zoom, x: point.x - pageX * zoom, y: point.y - pageY * zoom }
    })
  }, [])

  // Attach the transformer (resize and rotate handles) to the selected elements.
  const selectedElements = useMemo(
    () => doc.elements.filter((el) => selectedIds.includes(el.id) && !el.hidden),
    [doc.elements, selectedIds]
  )
  useEffect(() => {
    const transformer = transformerRef.current
    const stage = stageRef.current
    if (!transformer || !stage) return
    const nodes = editingTextId
      ? []
      : selectedElements.map((el) => stage.findOne(`#${el.id}`)).filter((n): n is Konva.Node => !!n)
    transformer.nodes(nodes)
    transformer.getLayer()?.batchDraw()
  }, [selectedElements, editingTextId, doc])

  const single = selectedElements.length === 1 ? selectedElements[0] : null
  const anyLocked = selectedElements.some((el) => el.locked)
  const anchors = !single
    ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    : single.type === 'image'
      ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      : single.type === 'text'
        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']
        : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']
  const keepRatio = !single || single.type !== 'shape'

  const toPagePoint = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition() ?? { x: 0, y: 0 }
    return { x: (pointer.x - view.x) / view.zoom, y: (pointer.y - view.y) / view.zoom }
  }

  // ----- Selection -----

  const handleElementPointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, element: DesignElement) => {
    event.cancelBubble = true
    const shift = 'shiftKey' in event.evt && (event.evt.shiftKey || event.evt.ctrlKey)
    const { selectedIds: current } = editorStore.getState()
    if (shift) editor.toggleSelected(element.id)
    else if (!current.includes(element.id)) editor.select([element.id])
  }

  const handleDoubleClick = (element: DesignElement) => {
    if (element.type === 'text' && !element.locked) editor.setEditingText(element.id)
  }

  const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current
    if (!stage) return
    // Clicks on the transformer handles are not "empty space".
    if (event.target.getParent()?.className === 'Transformer') return
    editor.select([])
    const p = toPagePoint(stage)
    setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }

  const handleStageMouseMove = () => {
    const stage = stageRef.current
    if (!marquee || !stage) return
    const p = toPagePoint(stage)
    setMarquee({ ...marquee, x1: p.x, y1: p.y })
  }

  const handleStageMouseUp = () => {
    if (!marquee) return
    const box = normalize(marquee)
    if (box.width > 2 / view.zoom || box.height > 2 / view.zoom) {
      const hits = doc.elements.filter((el) => {
        if (el.hidden) return false
        const b = elementBounds(el)
        return b.x < box.x + box.width && b.x + b.width > box.x && b.y < box.y + box.height && b.y + b.height > box.y
      })
      editor.select(hits.map((el) => el.id))
    }
    setMarquee(null)
  }

  // ----- Dragging, with snapping to the page and to other elements -----

  const handleDragStart = (event: Konva.KonvaEventObject<DragEvent>, element: DesignElement) => {
    const { selectedIds: current } = editorStore.getState()
    if (!current.includes(element.id)) {
      const shift = event.evt?.shiftKey
      editor.select(shift ? [...current, element.id] : [element.id])
    }
  }

  const handleDragMove = (event: Konva.KonvaEventObject<DragEvent>) => {
    const node = event.target
    const page = pageRef.current
    if (!page || editorStore.getState().selectedIds.length > 1) {
      setGuides({ vertical: [], horizontal: [] })
      return
    }
    const rect = node.getClientRect({ relativeTo: page })
    const others = doc.elements.filter((el) => el.id !== node.id() && !el.hidden).map(elementBounds)
    const xTargets = [0, doc.width / 2, doc.width, ...others.flatMap((b) => [b.x, b.x + b.width / 2, b.x + b.width])]
    const yTargets = [0, doc.height / 2, doc.height, ...others.flatMap((b) => [b.y, b.y + b.height / 2, b.y + b.height])]
    const threshold = SNAP_PX / view.zoom
    const snapX = findSnap([rect.x, rect.x + rect.width / 2, rect.x + rect.width], xTargets, threshold)
    const snapY = findSnap([rect.y, rect.y + rect.height / 2, rect.y + rect.height], yTargets, threshold)
    if (snapX) node.x(node.x() + snapX.delta)
    if (snapY) node.y(node.y() + snapY.delta)
    setGuides({ vertical: snapX ? [snapX.target] : [], horizontal: snapY ? [snapY.target] : [] })
  }

  const handleDragEnd = () => {
    setGuides({ vertical: [], horizontal: [] })
    const stage = stageRef.current
    if (!stage) return
    // When several elements move together, every node's position is saved as one undo step.
    const patches: Record<string, Partial<DesignElement>> = {}
    for (const id of editorStore.getState().selectedIds) {
      const node = stage.findOne(`#${id}`)
      if (node) patches[id] = { x: node.x(), y: node.y() }
    }
    editor.updateElements(patches, 'Move')
  }

  // ----- Resizing and rotating -----

  const handleTransform = () => {
    const transformer = transformerRef.current
    if (!transformer || !single || single.type !== 'text') return
    const anchor = transformer.getActiveAnchor()
    if (anchor !== 'middle-left' && anchor !== 'middle-right') return
    // Side handles change the text box width (text re-wraps) instead of stretching letters.
    const group = transformer.nodes()[0] as Konva.Group
    const text = group.findOne<Konva.Text>('.text-content')
    if (!text) return
    text.width(Math.max(text.fontSize(), text.width() * group.scaleX()))
    group.scaleX(1)
  }

  const handleTransformEnd = () => {
    const transformer = transformerRef.current
    if (!transformer) return
    const patches: Record<string, Partial<DesignElement>> = {}
    for (const node of transformer.nodes()) {
      const el = doc.elements.find((e) => e.id === node.id())
      if (!el) continue
      const sx = node.scaleX()
      const sy = node.scaleY()
      node.scale({ x: 1, y: 1 })
      const base = { x: node.x(), y: node.y(), rotation: normalizeRotation(node.rotation()) }
      if (el.type === 'text') {
        const textNode = (node as Konva.Group).findOne<Konva.Text>('.text-content')
        const width = (textNode?.width() ?? el.width) * sx
        const fontSize = Math.abs(sy - 1) > 0.001 ? Math.max(1, el.fontSize * sy) : el.fontSize
        const next: TextElement = { ...el, ...base, width, fontSize }
        patches[el.id] = { ...base, width, fontSize, height: measureTextHeight(next) }
      } else {
        patches[el.id] = { ...base, width: Math.max(1, el.width * sx), height: Math.max(1, el.height * sy) }
      }
    }
    editor.updateElements(patches, 'Resize')
  }

  // ----- Zoom and scroll -----

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    if (event.evt.ctrlKey || event.evt.metaKey) {
      const pointer = stage.getPointerPosition() ?? { x: size.width / 2, y: size.height / 2 }
      zoomAround(view.zoom * Math.pow(1.0015, -event.evt.deltaY), pointer)
    } else {
      setFitMode(false)
      const dx = event.evt.shiftKey ? event.evt.deltaY : event.evt.deltaX
      const dy = event.evt.shiftKey ? 0 : event.evt.deltaY
      setView((v) => ({ ...v, x: v.x - dx, y: v.y - dy }))
    }
  }

  // ----- Drop image files onto the canvas -----

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const files = [...event.dataTransfer.files]
    if (files.length > 0) void importImageFiles(files)
  }

  const editingElement = doc.elements.find((el) => el.id === editingTextId && el.type === 'text') as TextElement | undefined
  const marqueeBox = marquee ? normalize(marquee) : null
  const center = { x: size.width / 2, y: size.height / 2 }

  return (
    <div className="canvas-area" ref={containerRef} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {size.width > 0 && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
          onWheel={handleWheel}
        >
          <Layer>
            <Group ref={pageRef} x={view.x} y={view.y} scaleX={view.zoom} scaleY={view.zoom}>
              <Rect
                width={doc.width}
                height={doc.height}
                fill={doc.background}
                shadowColor="rgba(0,0,0,0.18)"
                shadowBlur={12}
                shadowOffsetY={2}
                listening={false}
              />
              {/* Content outside the page is hidden, the same as in exports. */}
              <Group clipX={0} clipY={0} clipWidth={doc.width} clipHeight={doc.height}>
                {doc.elements.map((el) => (
                  <ElementNode
                    key={el.id}
                    element={el}
                    editing={el.id === editingTextId}
                    onPointerDown={handleElementPointerDown}
                    onDoubleClick={handleDoubleClick}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </Group>
              {guides.vertical.map((x) => (
                <Line key={`v${x}`} points={[x, -10000, x, 10000]} stroke="#e8308c" strokeWidth={1 / view.zoom} listening={false} />
              ))}
              {guides.horizontal.map((y) => (
                <Line key={`h${y}`} points={[-10000, y, 10000, y]} stroke="#e8308c" strokeWidth={1 / view.zoom} listening={false} />
              ))}
              {marqueeBox && (
                <Rect
                  {...marqueeBox}
                  fill="rgba(124,92,255,0.08)"
                  stroke="#7c5cff"
                  strokeWidth={1 / view.zoom}
                  listening={false}
                />
              )}
            </Group>
            <Transformer
              ref={transformerRef}
              rotateEnabled={!anyLocked}
              resizeEnabled={!anyLocked}
              enabledAnchors={anchors}
              keepRatio={keepRatio}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={4}
              anchorSize={9}
              anchorCornerRadius={5}
              anchorStroke="#7c5cff"
              borderStroke="#7c5cff"
              rotateAnchorOffset={28}
              ignoreStroke
              flipEnabled={false}
              boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox)}
              onTransform={handleTransform}
              onTransformEnd={handleTransformEnd}
            />
          </Layer>
        </Stage>
      )}

      {editingElement && <TextEditor element={editingElement} view={view} />}

      <div className="zoom-controls">
        <button title="Zoom out" onClick={() => zoomAround(view.zoom / 1.25, center)}>
          −
        </button>
        <button className="zoom-value" title="Fit page to screen" onClick={() => setFitMode(true)}>
          {Math.round(view.zoom * 100)}%
        </button>
        <button title="Zoom in" onClick={() => zoomAround(view.zoom * 1.25, center)}>
          +
        </button>
      </div>
    </div>
  )
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

function normalize(m: Marquee) {
  return { x: Math.min(m.x0, m.x1), y: Math.min(m.y0, m.y1), width: Math.abs(m.x1 - m.x0), height: Math.abs(m.y1 - m.y0) }
}

function normalizeRotation(rotation: number): number {
  const r = rotation % 360
  return r < 0 ? r + 360 : r
}

function elementBounds(el: DesignElement) {
  return rotatedBounds(el.x, el.y, el.width, el.height, el.rotation)
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
