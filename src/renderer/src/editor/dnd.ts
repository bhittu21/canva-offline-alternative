/**
 * Drag and drop from the side panels onto the page. HTML drag events can only
 * carry text, so the panel registers what to do on drop here, and the canvas
 * calls it with the drop position in design pixels.
 */

export type DropAction = (point: { x: number; y: number }, targetId: string | null) => void

let pending: DropAction | null = null

export function startPanelDrag(event: React.DragEvent, action: DropAction): void {
  pending = action
  event.dataTransfer.setData('text/x-design-item', '1')
  event.dataTransfer.effectAllowed = 'copy'
}

export function takePanelDrop(): DropAction | null {
  const action = pending
  pending = null
  return action
}

export function endPanelDrag(): void {
  pending = null
}
