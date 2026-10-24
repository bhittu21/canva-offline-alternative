import { useCallback, useEffect, useState } from 'react'
import type { AiChatRequest, AiProviderState } from '@shared/ipc'
import { cleanError } from '@renderer/components/toast'
import { uiStore, useDialog, usePrefs } from '@renderer/store/uiStore'

export interface ConsentRequest {
  provider: AiProviderState
  what: string
  resolve: (ok: boolean) => void
}

let consentListener: ((request: ConsentRequest | null) => void) | null = null

/** Shared state for the AI Studio: the active provider, consent, and a safe way to send a request. */
export function useAi() {
  const prefs = usePrefs()
  const dialog = useDialog()
  const [providers, setProviders] = useState<AiProviderState[] | null>(null)
  const [consent, setConsent] = useState<ConsentRequest | null>(null)

  // Reload after Settings closes, in case a provider was added or changed.
  useEffect(() => {
    if (dialog) return
    window.api.ai
      .providers()
      .then(setProviders)
      .catch(() => setProviders([]))
  }, [dialog])

  useEffect(() => {
    consentListener = setConsent
    return () => {
      consentListener = null
    }
  }, [])

  const usable = (providers ?? []).filter((p) => p.enabled && p.model && (p.local || p.hasKey))
  const active = usable.find((p) => p.id === prefs?.activeAiProvider) ?? usable[0] ?? null

  /** Asks once per provider before anything is sent to an online service. */
  const ensureConsent = useCallback(
    async (provider: AiProviderState, what: string): Promise<boolean> => {
      if (provider.local || provider.consent) return true
      const ok = await new Promise<boolean>((resolve) => {
        if (consentListener) consentListener({ provider, what, resolve })
        else resolve(false)
      })
      setConsent(null)
      if (!ok) return false
      setProviders(await window.api.ai.setConsent(provider.id, true))
      return true
    },
    []
  )

  const send = useCallback(
    async (request: Omit<AiChatRequest, 'providerId'>, what: string): Promise<{ text: string } | { error: string }> => {
      if (!active) return { error: 'Set up an AI provider in Settings first.' }
      if (!(await ensureConsent(active, what))) return { error: 'Cancelled. Nothing was sent.' }
      try {
        const result = await window.api.ai.chat({ ...request, providerId: active.id })
        return { text: result.text }
      } catch (error) {
        return { error: cleanError(error, 'The AI request failed.') }
      }
    },
    [active, ensureConsent]
  )

  return { providers, usable, active, consent, ensureConsent, send, setActive: (id: string) => void window.api.ai.setActive(id).then(() => uiStore.setState({ prefs: uiStore.getState().prefs && { ...uiStore.getState().prefs!, activeAiProvider: id } })) }
}

/** Where a provider sends data, for consent messages. */
export function providerHost(p: AiProviderState): string {
  try {
    return new URL(p.baseUrl).host
  } catch {
    return p.baseUrl
  }
}
