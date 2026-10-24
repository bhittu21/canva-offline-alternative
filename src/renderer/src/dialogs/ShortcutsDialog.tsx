import { Modal } from '@renderer/components/ui'
import { commands } from '@renderer/editor/commands'

const extra: [string, string][] = [
  ['Move selection 1 px / 10 px', 'Arrow keys / Shift + arrows'],
  ['Select several', 'Shift-click, or drag a box on empty canvas'],
  ['Pan the canvas', 'Hold Space and drag, or middle mouse button'],
  ['Zoom', 'Ctrl + mouse wheel'],
  ['Edit text', 'Double-click or Enter'],
  ['Cut', 'Ctrl+X'],
  ['Deselect / stop editing', 'Esc'],
  ['Change proportions on a corner', 'Shift while dragging'],
  ['Rotation snaps to 45° angles', 'Drag the round handle']
]

/** Every keyboard shortcut, read from the command list so it is always accurate. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const groups = [...new Set(commands.filter((c) => c.shortcut).map((c) => c.group))]
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} size="wide">
      <div style={{ columns: 2, columnGap: 28 }}>
        {groups.map((g) => (
          <div key={g} style={{ breakInside: 'avoid', marginBottom: 14 }}>
            <div className="palette-group" style={{ padding: '0 0 6px' }}>
              {g}
            </div>
            {commands
              .filter((c) => c.group === g && c.shortcut)
              .map((c) => (
                <div key={c.id} className="row" style={{ justifyContent: 'space-between', padding: '3px 0', gap: 12 }}>
                  <span className="small">{c.label}</span>
                  <span className="kbd">{c.shortcut}</span>
                </div>
              ))}
          </div>
        ))}
        <div style={{ breakInside: 'avoid' }}>
          <div className="palette-group" style={{ padding: '0 0 6px' }}>
            Mouse and canvas
          </div>
          {extra.map(([label, keys]) => (
            <div key={label} className="row" style={{ justifyContent: 'space-between', padding: '3px 0', gap: 12 }}>
              <span className="small">{label}</span>
              <span className="kbd">{keys}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="muted small">Press Ctrl+K to search every command by name.</p>
    </Modal>
  )
}
