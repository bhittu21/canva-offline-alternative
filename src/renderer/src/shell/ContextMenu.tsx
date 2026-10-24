import { Menu, type MenuEntry } from '@renderer/components/ui'
import { command } from '@renderer/editor/commands'
import { editorStore, selectedElements } from '@renderer/store/editorStore'
import { uiStore, useUi } from '@renderer/store/uiStore'

const entry = (id: string, label?: string): MenuEntry => {
  const c = command(id)
  return { label: label ?? c.label, icon: c.icon, shortcut: c.shortcut, disabled: c.enabled ? !c.enabled() : false, onSelect: c.run }
}

/** The right-click menu on the canvas. It offers the same commands as the keyboard and the command search. */
export function ContextMenu() {
  const menu = useUi((s) => s.contextMenu)
  if (!menu) return null
  const selection = editorStore.getState().selectedIds.length > 0
  const items: (MenuEntry | 'sep')[] = selection
    ? [
        entry('copy'),
        entry('paste'),
        entry('duplicate'),
        { ...entry('delete'), danger: true },
        'sep',
        entry('front'),
        entry('forward'),
        entry('backward'),
        entry('back'),
        'sep',
        selectedElements().some((el) => el.groupId) ? entry('ungroup') : entry('group'),
        entry('lock', selectedElements().every((el) => el.locked) ? 'Unlock' : 'Lock'),
        entry('hide', 'Hide'),
        'sep',
        entry('align-center', 'Align centre'),
        entry('align-middle', 'Align middle'),
        entry('fit-selection')
      ]
    : [entry('paste'), entry('select-all'), 'sep', entry('add-text'), entry('add-rect'), entry('add-page'), 'sep', entry('show-all'), entry('clear-guides'), entry('fit')]
  return <Menu x={menu.x} y={menu.y} items={items} onClose={() => uiStore.setState({ contextMenu: null })} />
}
