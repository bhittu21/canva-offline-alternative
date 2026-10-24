import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import type { MenuCommand } from '@shared/ipc'

export function buildMenu(getWindow: () => BrowserWindow | null, isDev: boolean): Menu {
  const send = (command: MenuCommand) => () => getWindow()?.webContents.send('menu-command', command)

  // Undo and redo are handled by the editor itself so that text boxes keep their
  // own undo while typing. The menu only shows the shortcut.
  const template: MenuItemConstructorOptions[] = [
    {
      label: '&File',
      submenu: [
        { label: 'New design', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: send('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { label: 'Save as...', accelerator: 'CmdOrCtrl+Shift+S', click: send('save-as') },
        { label: 'Make a copy', click: send('duplicate') },
        { type: 'separator' },
        { label: 'Export...', accelerator: 'CmdOrCtrl+E', click: send('export') },
        { label: 'Import image...', accelerator: 'CmdOrCtrl+I', click: send('import-image') },
        { type: 'separator' },
        { label: 'Settings...', click: send('settings') },
        { type: 'separator' },
        { label: 'Close tab', accelerator: 'CmdOrCtrl+W', click: send('close-design') },
        { role: 'quit', label: 'Exit' }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', registerAccelerator: false, click: send('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', registerAccelerator: false, click: send('redo') },
        { type: 'separator' },
        // The editor handles Ctrl+C / Ctrl+V itself (elements and images), so these
        // menu items must not swallow the shortcuts.
        { role: 'cut', registerAccelerator: false },
        { role: 'copy', registerAccelerator: false },
        { role: 'paste', registerAccelerator: false },
        { type: 'separator' },
        { label: 'Search commands...', accelerator: 'CmdOrCtrl+K', registerAccelerator: false, click: send('command-palette') }
      ]
    },
    {
      label: '&View',
      submenu: [
        { role: 'togglefullscreen' },
        ...(isDev ? ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] as const) : [])
      ]
    }
  ]
  return Menu.buildFromTemplate(template)
}
