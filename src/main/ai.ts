import type { AiChatRequest, AiChatResult, AiImageRequest, AiLogEntry, AiMessage, AiProviderConfig, AiProviderState } from '@shared/ipc'
import { errorDetail, request, ServiceError, statusMessage } from './net'
import { getPreferences, sanitizeProvider, setPreferences } from './prefs'
import { getSecret, serviceState, setConsent, setSecret } from './secrets'

/**
 * AI providers. Three protocols cover most services:
 *   openai     /chat/completions (OpenAI, Groq, OpenRouter, Ollama, LM Studio, and others)
 *   anthropic  /v1/messages
 *   gemini     /v1beta/models/<model>:generateContent
 * Requests are made here in the main process: API keys never reach the window,
 * and nothing is sent until the user has agreed to that provider.
 */

const secretName = (id: string) => `ai:${id}`
const log: AiLogEntry[] = []
const MAX_LOG = 100

export async function providerStates(): Promise<AiProviderState[]> {
  const prefs = await getPreferences()
  return Promise.all(
    prefs.aiProviders.map(async (p) => {
      const state = await serviceState(secretName(p.id))
      return { ...p, hasKey: state.configured, consent: p.local || state.consent }
    })
  )
}

function validateBaseUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ServiceError('Enter the service address, for example https://api.example.com/v1.')
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local)) {
    throw new ServiceError('The address must start with https:// (http:// is allowed only for services on this computer).')
  }
}

export async function saveProvider(raw: unknown): Promise<AiProviderState[]> {
  const config = sanitizeProvider(raw)
  if (!config) throw new ServiceError('These provider settings are not valid.')
  validateBaseUrl(config.baseUrl)
  const prefs = await getPreferences()
  const others = prefs.aiProviders.filter((p) => p.id !== config.id)
  await setPreferences({ aiProviders: [...others, config], activeAiProvider: prefs.activeAiProvider ?? config.id })
  return providerStates()
}

export async function removeProvider(id: string): Promise<AiProviderState[]> {
  const prefs = await getPreferences()
  await setSecret(secretName(id), null)
  const remaining = prefs.aiProviders.filter((p) => p.id !== id)
  await setPreferences({ aiProviders: remaining, activeAiProvider: prefs.activeAiProvider === id ? (remaining[0]?.id ?? null) : prefs.activeAiProvider })
  return providerStates()
}

export async function setProviderKey(id: string, key: string | null): Promise<AiProviderState[]> {
  const value = key?.trim() || null
  if (value && (value.length < 8 || value.length > 400 || /\s/.test(value))) throw new ServiceError('That does not look like an API key.')
  await setSecret(secretName(id), value)
  return providerStates()
}

export async function setProviderConsent(id: string, consent: boolean): Promise<AiProviderState[]> {
  await setConsent(secretName(id), consent)
  return providerStates()
}

async function resolve(id: string, givenKey?: string): Promise<{ config: AiProviderConfig; key: string | null }> {
  const config = (await getPreferences()).aiProviders.find((p) => p.id === id)
  if (!config) throw new ServiceError('This AI provider is not set up. Add it in AI settings.')
  const key = givenKey?.trim() || (await getSecret(secretName(id)))
  if (!key && !config.local) throw new ServiceError(`Add your ${config.label} API key in AI settings first.`)
  return { config, key }
}

// ---------------------------------------------------------------- Chat

export async function chat(req: AiChatRequest, options: { givenKey?: string; skipConsent?: boolean } = {}): Promise<AiChatResult> {
  if (!req || typeof req.providerId !== 'string' || !Array.isArray(req.messages)) throw new ServiceError('Invalid AI request.')
  const messages = req.messages
    .filter((m): m is AiMessage => !!m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 60_000) }))
  if (messages.length === 0) throw new ServiceError('Nothing to send.')
  const { config, key } = await resolve(req.providerId, options.givenKey)
  if (!config.enabled) throw new ServiceError(`${config.label} is turned off in AI settings.`)
  if (!options.skipConsent && !config.local && !(await serviceState(secretName(config.id))).consent) {
    throw new ServiceError(`Please agree to send this request to ${config.label} first.`)
  }
  if (!config.model) throw new ServiceError(`Choose a model for ${config.label} in AI settings.`)

  const started = Date.now()
  const entry = (ok: boolean, result?: AiChatResult, error?: string): AiLogEntry => ({
    time: new Date().toISOString(),
    provider: config.label,
    model: config.model,
    feature: String(req.feature ?? 'AI').slice(0, 60),
    ok,
    ms: Date.now() - started,
    inputTokens: result?.usage.inputTokens ?? null,
    outputTokens: result?.usage.outputTokens ?? null,
    error
  })
  try {
    const maxTokens = Math.min(Math.max(16, req.maxTokens ?? 2000), 16_000)
    const temperature = typeof req.temperature === 'number' ? Math.min(2, Math.max(0, req.temperature)) : undefined
    const params = { messages, json: !!req.json, maxTokens, temperature }
    const result =
      config.protocol === 'anthropic'
        ? await anthropicChat(config, key!, params)
        : config.protocol === 'gemini'
          ? await geminiChat(config, key!, params)
          : await openaiChat(config, key, params)
    addLog(entry(true, result))
    return result
  } catch (error) {
    addLog(entry(false, undefined, (error as Error).message))
    throw error
  }
}

function addLog(entry: AiLogEntry): void {
  log.unshift(entry)
  if (log.length > MAX_LOG) log.length = MAX_LOG
}

export function activityLog(): AiLogEntry[] {
  return [...log]
}

interface ChatParams {
  messages: AiMessage[]
  json: boolean
  maxTokens: number
  temperature?: number
}

async function post(config: AiProviderConfig, url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  return request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, config.label, 120_000)
}

async function fail(config: AiProviderConfig, response: Response): Promise<never> {
  throw new ServiceError(statusMessage(config.label, response.status, await errorDetail(response)), response.status)
}

async function openaiChat(config: AiProviderConfig, key: string | null, p: ChatParams): Promise<AiChatResult> {
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {}
  if (config.baseUrl.includes('openrouter.ai')) {
    headers['X-Title'] = 'Design Studio'
  }
  const official = config.baseUrl.includes('api.openai.com')
  const body: Record<string, unknown> = { model: config.model, messages: p.messages }
  // OpenAI's newer models take max_completion_tokens; most compatible services take max_tokens.
  body[official ? 'max_completion_tokens' : 'max_tokens'] = p.maxTokens
  if (p.temperature !== undefined) body.temperature = p.temperature
  if (p.json) body.response_format = { type: 'json_object' }

  let response = await post(config, `${config.baseUrl}/chat/completions`, headers, body)
  // Some models refuse optional settings (a fixed temperature, JSON mode). Retry once without them.
  if (response.status === 400 && (body.temperature !== undefined || body.response_format)) {
    delete body.temperature
    delete body.response_format
    response = await post(config, `${config.baseUrl}/chat/completions`, headers, body)
  }
  if (!response.ok) return fail(config, response)
  const json = (await response.json()) as {
    model?: string
    choices?: { message?: { content?: string | null } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = json.choices?.[0]?.message?.content ?? ''
  if (!text) throw new ServiceError(`${config.label} returned an empty answer.`)
  return { text, model: json.model ?? config.model, usage: { inputTokens: json.usage?.prompt_tokens ?? null, outputTokens: json.usage?.completion_tokens ?? null } }
}

async function anthropicChat(config: AiProviderConfig, key: string, p: ChatParams): Promise<AiChatResult> {
  const system = p.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const messages = p.messages.filter((m) => m.role !== 'system')
  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: p.maxTokens,
    messages,
    ...(system && { system: p.json ? `${system}\n\nAnswer with a single JSON object and nothing else.` : system })
  }
  if (p.temperature !== undefined) body.temperature = Math.min(1, p.temperature)
  const response = await post(config, `${config.baseUrl}/v1/messages`, { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body)
  if (!response.ok) return fail(config, response)
  const json = (await response.json()) as { model?: string; content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }
  const text = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
  if (!text) throw new ServiceError(`${config.label} returned an empty answer.`)
  return { text, model: json.model ?? config.model, usage: { inputTokens: json.usage?.input_tokens ?? null, outputTokens: json.usage?.output_tokens ?? null } }
}

async function geminiChat(config: AiProviderConfig, key: string, p: ChatParams): Promise<AiChatResult> {
  const system = p.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
  const contents = p.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const model = config.model.replace(/^models\//, '')
  const body = {
    contents,
    ...(system && { systemInstruction: { parts: [{ text: system }] } }),
    generationConfig: {
      maxOutputTokens: p.maxTokens,
      ...(p.temperature !== undefined && { temperature: p.temperature }),
      ...(p.json && { responseMimeType: 'application/json' })
    }
  }
  const response = await post(config, `${config.baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': key }, body)
  if (!response.ok) return fail(config, response)
  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    modelVersion?: string
  }
  const text = (json.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('')
  if (!text) throw new ServiceError(`${config.label} returned no text${json.candidates?.[0]?.finishReason ? ` (${json.candidates[0].finishReason})` : ''}.`)
  return {
    text,
    model: json.modelVersion ?? model,
    usage: { inputTokens: json.usageMetadata?.promptTokenCount ?? null, outputTokens: json.usageMetadata?.candidatesTokenCount ?? null }
  }
}

// ---------------------------------------------------------------- Models and testing

export async function listModels(id: string, givenKey?: string): Promise<string[]> {
  const { config, key } = await resolve(id, givenKey)
  let response: Response
  if (config.protocol === 'anthropic') {
    response = await request(`${config.baseUrl}/v1/models?limit=100`, { headers: { 'x-api-key': key!, 'anthropic-version': '2023-06-01' } }, config.label)
  } else if (config.protocol === 'gemini') {
    response = await request(`${config.baseUrl}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': key! } }, config.label)
  } else {
    response = await request(`${config.baseUrl}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {} }, config.label)
  }
  if (!response.ok) return fail(config, response)
  const json = (await response.json()) as {
    data?: { id?: string }[]
    models?: { name?: string; supportedGenerationMethods?: string[] }[]
  }
  const ids =
    config.protocol === 'gemini'
      ? (json.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => (m.name ?? '').replace(/^models\//, ''))
      : (json.data ?? []).map((m) => m.id ?? '')
  return [...new Set(ids.filter(Boolean))].sort()
}

export async function testProvider(id: string, givenKey?: string): Promise<AiChatResult> {
  return chat(
    { providerId: id, feature: 'Connection test', messages: [{ role: 'user', content: 'Reply with the single word: ready' }], maxTokens: 20 },
    { givenKey, skipConsent: true }
  )
}

// ---------------------------------------------------------------- Images

export async function generateImage(req: AiImageRequest): Promise<{ bytes: Uint8Array; mime: string }> {
  const { config, key } = await resolve(req.providerId)
  if (config.protocol !== 'openai' || !config.imageModel) {
    throw new ServiceError(`${config.label} is not set up for text-to-image. Choose an image model in AI settings (for OpenAI: gpt-image-1).`)
  }
  if (!config.local && !(await serviceState(secretName(config.id))).consent) throw new ServiceError(`Please agree to send this request to ${config.label} first.`)
  const prompt = String(req.prompt ?? '').trim().slice(0, 4000)
  if (!prompt) throw new ServiceError('Describe the image you want.')
  const size = ['1024x1024', '1536x1024', '1024x1536'].includes(req.size) ? req.size : '1024x1024'
  const body: Record<string, unknown> = { model: config.imageModel, prompt, size, n: 1 }
  if (config.imageModel.startsWith('dall-e')) body.response_format = 'b64_json'
  const started = Date.now()
  try {
    const response = await post(config, `${config.baseUrl}/images/generations`, key ? { Authorization: `Bearer ${key}` } : {}, body)
    if (!response.ok) return await fail(config, response)
    const json = (await response.json()) as { data?: { b64_json?: string }[] }
    const b64 = json.data?.[0]?.b64_json
    if (!b64) throw new ServiceError(`${config.label} did not return an image.`)
    const bytes = new Uint8Array(Buffer.from(b64, 'base64'))
    addLog({ time: new Date().toISOString(), provider: config.label, model: config.imageModel, feature: 'Image generation', ok: true, ms: Date.now() - started, inputTokens: null, outputTokens: null })
    return { bytes, mime: bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/webp' }
  } catch (error) {
    addLog({ time: new Date().toISOString(), provider: config.label, model: config.imageModel, feature: 'Image generation', ok: false, ms: Date.now() - started, inputTokens: null, outputTokens: null, error: (error as Error).message })
    throw error
  }
}
