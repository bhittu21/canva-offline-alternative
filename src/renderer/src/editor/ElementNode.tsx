import type Konva from 'konva'
import { memo, useLayoutEffect, useRef } from 'react'
import { Group } from 'react-konva'
import type { DesignElement } from '@shared/model'
import { buildContent } from '@renderer/render/nodes'
import { assets, useAssetVersion } from '@renderer/store/assets'
import { useUi } from '@renderer/store/uiStore'

export interface ElementHandlers {
  onPointerDown: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, element: DesignElement) => void
  onDoubleClick: (element: DesignElement) => void
  onContextMenu: (event: Konva.KonvaEventObject<PointerEvent>, element: DesignElement) => void
  onDragStart: (event: Konva.KonvaEventObject<DragEvent>, element: DesignElement) => void
  onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void
  onHover: (id: string | null) => void
}

/**
 * Each element is a Group placed at (x, y) with its rotation. Its content is
 * built by the shared renderer (the same code exports use) in local
 * coordinates from (0, 0) to (width, height), so moving, resizing and rotating
 * work the same way for every element type. Content is rebuilt only when the
 * element itself changes.
 */
export const ElementNode = memo(function ElementNode({ element, editing, handlers }: { element: DesignElement; editing: boolean; handlers: ElementHandlers }) {
  const ref = useRef<Konva.Group>(null)
  const assetVersion = useAssetVersion()
  const fontEpoch = useUi((s) => s.fontEpoch)
  const imageVersion = element.type === 'image' ? assetVersion : 0

  useLayoutEffect(() => {
    const group = ref.current
    if (!group) return
    group.destroyChildren()
    for (const node of buildContent(element, assets)) {
      if (editing && node.name() === 'text-content') node.visible(false)
      group.add(node)
    }
    group.getLayer()?.batchDraw()
  }, [element, editing, imageVersion, fontEpoch])

  return (
    <Group
      ref={ref}
      id={element.id}
      name="element"
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={!element.hidden}
      draggable={!element.locked}
      onMouseDown={(e) => handlers.onPointerDown(e, element)}
      onTouchStart={(e) => handlers.onPointerDown(e, element)}
      onDblClick={() => handlers.onDoubleClick(element)}
      onDblTap={() => handlers.onDoubleClick(element)}
      onContextMenu={(e) => handlers.onContextMenu(e, element)}
      onDragStart={(e) => handlers.onDragStart(e, element)}
      onDragMove={handlers.onDragMove}
      onDragEnd={handlers.onDragEnd}
      onMouseEnter={() => handlers.onHover(element.id)}
      onMouseLeave={() => handlers.onHover(null)}
    />
  )
})
