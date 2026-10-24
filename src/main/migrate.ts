import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/**
 * The app was called "Offline Design Studio" (and "offline-design-editor"
 * before that), and Electron keeps settings in a folder named after the app.
 * On the first start under the new name, copy the user's own files across so
 * preferences, saved keys, recent designs, uploads, templates and recovery
 * copies are kept. The old folder is left untouched.
 */
const previousNames = ['Offline Design Studio', 'offline-design-editor']
const ownEntries = ['preferences.json', 'online-services.json', 'recent-files.json', 'library', 'templates', 'recovery', 'thumbnails']

export function migrateUserData(): void {
  try {
    const target = app.getPath('userData')
    if (existsSync(join(target, 'preferences.json')) || existsSync(join(target, 'recent-files.json'))) return
    const appData = app.getPath('appData')
    const source = previousNames.map((name) => join(appData, name)).find((dir) => dir !== target && ownEntries.some((entry) => existsSync(join(dir, entry))))
    if (!source) return
    for (const entry of ownEntries) {
      const from = join(source, entry)
      if (existsSync(from)) cpSync(from, join(target, entry), { recursive: true, force: false, errorOnExist: false })
    }
  } catch {
    // Starting fresh is better than not starting at all.
  }
}
