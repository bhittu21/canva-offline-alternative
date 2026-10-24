import type { AiProtocol } from './ipc'

/**
 * AI services the app knows how to talk to. Model names change often, so the
 * app never hard-codes one: after adding a key, "Load models" asks the
 * service which models this key can use. Prices and free allowances also
 * change, so each entry links to the provider's own page instead of quoting
 * numbers that may be out of date.
 */
export interface AiPreset {
  id: string
  label: string
  protocol: AiProtocol
  baseUrl: string
  local: boolean
  needsKey: boolean
  /** Default model for text-to-image, when the service has an OpenAI-style images endpoint. */
  imageModel: string
  keyUrl: string
  pricingUrl: string
  note: string
}

export const aiPresets: AiPreset[] = [
  {
    id: 'ollama',
    label: 'Ollama (on this PC)',
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    local: true,
    needsKey: false,
    imageModel: '',
    keyUrl: 'https://ollama.com/download',
    pricingUrl: 'https://ollama.com/library',
    note: 'Free and private: models run on your own computer and nothing is uploaded. Install Ollama, then run for example "ollama pull llama3.2" (about 2 GB). Small models need about 8 GB of RAM; quality is lower than large online models.'
  },
  {
    id: 'lmstudio',
    label: 'LM Studio (on this PC)',
    protocol: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    local: true,
    needsKey: false,
    imageModel: '',
    keyUrl: 'https://lmstudio.ai',
    pricingUrl: 'https://lmstudio.ai',
    note: 'Free and private: download a model in LM Studio and start its local server. Nothing is uploaded.'
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    local: false,
    needsKey: true,
    imageModel: '',
    keyUrl: 'https://aistudio.google.com/apikey',
    pricingUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    note: 'Has a free tier with small daily limits for some Flash models. On the free tier Google may use your prompts to improve its products, and it is not available to apps serving users in the EU, UK or Switzerland. Check current limits in Google AI Studio.'
  },
  {
    id: 'groq',
    label: 'Groq',
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    local: false,
    needsKey: true,
    imageModel: '',
    keyUrl: 'https://console.groq.com/keys',
    pricingUrl: 'https://groq.com/pricing',
    note: 'Fast hosted open models. Offers a rate-limited free plan; limits differ by model and are shown in the Groq console.'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    local: false,
    needsKey: true,
    imageModel: '',
    keyUrl: 'https://openrouter.ai/keys',
    pricingUrl: 'https://openrouter.ai/models',
    note: 'One key for many models from different companies. Some models marked ":free" cost nothing but have low daily limits.'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    local: false,
    needsKey: true,
    imageModel: 'gpt-image-1',
    keyUrl: 'https://platform.openai.com/api-keys',
    pricingUrl: 'https://openai.com/api/pricing',
    note: 'Paid, billed per use to your OpenAI account. Also supports text-to-image.'
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    local: false,
    needsKey: true,
    imageModel: '',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    pricingUrl: 'https://www.anthropic.com/pricing#api',
    note: 'Paid, billed per use to your Anthropic account.'
  },
  {
    id: 'custom',
    label: 'Other OpenAI-compatible service',
    protocol: 'openai',
    baseUrl: '',
    local: false,
    needsKey: true,
    imageModel: '',
    keyUrl: '',
    pricingUrl: '',
    note: 'Any service with an OpenAI-compatible /chat/completions endpoint. Enter its address, for example https://example.com/v1.'
  }
]

export function presetFor(id: string): AiPreset | undefined {
  return aiPresets.find((p) => id === p.id || id.startsWith(`${p.id}-`))
}
