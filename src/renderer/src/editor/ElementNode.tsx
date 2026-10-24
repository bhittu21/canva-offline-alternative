import type Konva from 'konva'
import { Ellipse, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva'
import type { DesignElement, ImageElement, ShapeElement, TextElement } from '@shared/model'
import { assets } from '@renderer/store/assets'
import { starPoints, trianglePoints } from './geometry'
import { useImage } from './useImage'

interface Props {
  element: DesignElement
  editing: boolean
  onPointerDown: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, element: DesignElement) => void
  onDoubleClick: (element: DesignElement) => void
  onDragStart: (event: Konva.KonvaEventObject<DragEvent>, element: DesignElement) => void
  onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => void
}

/**
 * Each element is a Group placed at (x, y) with its rotation. Its content is
 * drawn in local coordinates from (0, 0) to (width, height), so moving, resizing
 * and rotating work the same way for every element type.
 */
export function ElementNode({ element, editing, onPointerDown, onDoubleClick, onDragStart, onDragMove, onDragEnd }: Props) {
  return (
    <Group
      id={element.id}
      name="element"
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      visible={!element.hidden}
      draggable={!element.locked}
      onMouseDown={(e) => onPointerDown(e, element)}
      onTouchStart={(e) => onPointerDown(e, element)}
      onDblClick={() => onDoubleClick(element)}
      onDblTap={() => onDoubleClick(element)}
      onDragStart={(e) => onDragStart(e, element)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {element.type === 'text' && <TextContent element={element} editing={editing} />}
      {element.type === 'shape' && <ShapeContent element={element} />}
      {element.type === 'image' && <ImageContent element={element} />}
    </Group>
  )
}

function TextContent({ element, editing }: { element: TextElement; editing: boolean }) {
  return (
    <Text
      name="text-content"
      text={element.text}
      width={element.width}
      fontFamily={element.fontFamily}
      fontSize={element.fontSize}
      fontStyle={element.fontStyle}
      textDecoration={element.underline ? 'underline' : ''}
      fill={element.fill}
      align={element.align}
      lineHeight={element.lineHeight}
      letterSpacing={element.letterSpacing}
      wrap="word"
      visible={!editing}
    />
  )
}

function ShapeContent({ element }: { element: ShapeElement }) {
  const { width, height, fill, stroke, strokeWidth } = element
  const strokeProps = strokeWidth > 0 ? { stroke, strokeWidth } : { strokeEnabled: false }
  // A transparent box makes the whole bounding area clickable, as in Canva.
  const hitArea = <Rect width={width} height={height} fill="rgba(0,0,0,0)" />
  switch (element.shape) {
    case 'rect':
      return <Rect width={width} height={height} fill={fill} cornerRadius={element.cornerRadius} {...strokeProps} />
    case 'ellipse':
      return (
        <>
          {hitArea}
          <Ellipse x={width / 2} y={height / 2} radiusX={width / 2} radiusY={height / 2} fill={fill} {...strokeProps} />
        </>
      )
    case 'triangle':
      return (
        <>
          {hitArea}
          <Line points={trianglePoints(width, height)} closed fill={fill} lineJoin="round" {...strokeProps} />
        </>
      )
    case 'star':
      return (
        <>
          {hitArea}
          <Line points={starPoints(width, height)} closed fill={fill} lineJoin="round" {...strokeProps} />
        </>
      )
    case 'line':
      // A line is a filled bar, so its thickness is simply the element height.
      return <Rect width={width} height={height} fill={fill} cornerRadius={Math.min(height / 2, element.cornerRadius)} />
  }
}

function ImageContent({ element }: { element: ImageElement }) {
  const image = useImage(assets.url(element.assetId))
  if (!image) return <Rect width={element.width} height={element.height} fill="#e4e6eb" />
  return <KonvaImage image={image} width={element.width} height={element.height} />
}
