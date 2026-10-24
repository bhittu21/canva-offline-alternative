import { promises as fs } from 'node:fs'
import { app, safeStorage } from 'electron'

/**
 * Credentials for optional online services. API keys are encrypted with
 * Windows' own user-account protection (DPAPI, via Electron safeStorage), and
 * they never leave the main process: the UI only learns whether a key is set.
 * Keys are never written into designs, exports or logs.
 *
 * File: <userData>/online-services.json
 *   secrets   name -> encrypted key (base64)
 *   consent   name -> the user agreed to send content to that service
 */

interface Settings {
  secrets?: Record<string, string>
  consent?: Record<string, boolean>
  /** Version 1 layout, still read so existing remove.bg keys keep working. */
  removeBg?: { key?: string; consent?: boolean }
}

const settingsPath = () => `${app.getPath('userData')}/online-services.json`

let queue: Promise<unknown> = Promise.resolve()

/** Serialises read-modify-write cycles so two quick changes never overwrite each other. */
function update<T>(fn: (settings: Settings) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const settings = await read()
    const result = await fn(settings)
    await write(settings)
    return result
  })
  queue = run.catch(() => undefined)
  return run
}

async function read(): Promise<Settings> {
  let settings: Settings
  try {
    settings = JSON.parse(await fs.readFile(settingsPath(), 'utf8')) as Settings
  } catch {
    settings = {}
  }
  // Move the version 1 remove.bg entry into the general layout.
  if (settings.removeBg) {
    settings.secrets = { ...settings.secrets }
    settings.consent = { ...settings.consent }
    if (settings.removeBg.key && !settings.secrets.removeBg) settings.secrets.removeBg = settings.removeBg.key
    if (settings.removeBg.consent && settings.consent.removeBg === undefined) settings.consent.removeBg = true
    delete settings.removeBg
  }
  return settings
}

async function write(settings: Settings): Promise<void> {
  const temp = `${settingsPath()}.tmp`
  await fs.writeFile(temp, JSON.stringify(settings, null, 2))
  await fs.rename(temp, settingsPath())
}

export async function getSecret(name: string): Promise<string | null> {
  const encrypted = (await read()).secrets?.[name]
  if (!encrypted) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export async function hasSecret(name: string): Promise<boolean> {
  return !!(await read()).secrets?.[name]
}

/** Saves a key encrypted, or deletes it (and the matching consent) when given null. */
export function setSecret(name: string, value: string | null): Promise<void> {
  if (value && !safeStorage.isEncryptionAvailable()) {
    return Promise.reject(new Error('Secure storage is not available on this computer, so the key cannot be saved.'))
  }
  return update((settings) => {
    settings.secrets = { ...settings.secrets }
    if (value) {
      settings.secrets[name] = safeStorage.encryptString(value).toString('base64')
    } else {
      delete settings.secrets[name]
      settings.consent = { ...settings.consent, [name]: false }
    }
  })
}

export async function getConsent(name: string): Promise<boolean> {
  return (await read()).consent?.[name] === true
}

export function setConsent(name: string, consent: boolean): Promise<void> {
  return update((settings) => {
    settings.consent = { ...settings.consent, [name]: consent }
  })
}

export async function serviceState(name: string): Promise<{ configured: boolean; consent: boolean }> {
  const settings = await read()
  return { configured: !!settings.secrets?.[name], consent: settings.consent?.[name] === true }
}

// remove.bg keeps its own names for the existing IPC calls.
export const getRemoveBgKey = () => getSecret('removeBg')
export const setRemoveBgKey = (key: string | null) => setSecret('removeBg', key)
export const getRemoveBgState = () => serviceState('removeBg')
export const setRemoveBgConsent = (consent: boolean) => setConsent('removeBg', consent)
