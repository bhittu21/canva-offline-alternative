import { promises as fs } from 'node:fs'
import { app, safeStorage } from 'electron'

/**
 * Local settings for optional online services. API keys are encrypted with
 * Windows' own user-account protection (DPAPI, via Electron safeStorage), and
 * they never leave the main process: the UI only learns whether a key is set.
 */

export interface RemoveBgSettings {
  /** Encrypted API key, base64. */
  key?: string
  /** The user agreed to send images to remove.bg. */
  consent?: boolean
}

interface Settings {
  removeBg?: RemoveBgSettings
}

const settingsPath = () => `${app.getPath('userData')}/online-services.json`

async function read(): Promise<Settings> {
  try {
    return JSON.parse(await fs.readFile(settingsPath(), 'utf8')) as Settings
  } catch {
    return {}
  }
}

async function write(settings: Settings): Promise<void> {
  const temp = `${settingsPath()}.tmp`
  await fs.writeFile(temp, JSON.stringify(settings, null, 2))
  await fs.rename(temp, settingsPath())
}

export async function getRemoveBgKey(): Promise<string | null> {
  const encrypted = (await read()).removeBg?.key
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export async function setRemoveBgKey(key: string | null): Promise<void> {
  const settings = await read()
  const removeBg = { ...settings.removeBg }
  if (key) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this computer, so the key cannot be saved.')
    removeBg.key = safeStorage.encryptString(key).toString('base64')
  } else {
    delete removeBg.key
    removeBg.consent = false
  }
  await write({ ...settings, removeBg })
}

export async function getRemoveBgState(): Promise<{ configured: boolean; consent: boolean }> {
  const removeBg = (await read()).removeBg
  return { configured: !!removeBg?.key, consent: removeBg?.consent === true }
}

export async function setRemoveBgConsent(consent: boolean): Promise<void> {
  const settings = await read()
  await write({ ...settings, removeBg: { ...settings.removeBg, consent } })
}
