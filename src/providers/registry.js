import { OpenAIAdapter } from './adapters/openai.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { GroqAdapter } from './adapters/groq.js';
import { OpenRouterAdapter } from './adapters/openrouter.js';
import { TogetherAdapter } from './adapters/together.js';
import { MistralAdapter } from './adapters/mistral.js';
import { LocalAdapter } from './adapters/local.js';

const ADAPTER_MAP = {
  openai: OpenAIAdapter,
  anthropic: AnthropicAdapter,
  gemini: GeminiAdapter,
  groq: GroqAdapter,
  openrouter: OpenRouterAdapter,
  together: TogetherAdapter,
  mistral: MistralAdapter,
  local: LocalAdapter
};

export class ProviderRegistry {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
    this.adapters = new Map();
  }

  loadFromDb(providerRepo) {
    const providers = providerRepo.getAll({ enabled: true });
    for (const provider of providers) {
      this.register(provider);
    }
    this.logger?.info?.(`Loaded ${this.adapters.size} provider adapters`);
  }

  register(provider) {
    const AdapterClass = ADAPTER_MAP[provider.adapter];
    if (!AdapterClass) {
      this.logger?.warn?.(`Unknown adapter type: ${provider.adapter}`);
      return;
    }
    this.adapters.set(provider.id, new AdapterClass(provider));
  }

  get(providerId) {
    return this.adapters.get(providerId);
  }

  getAll() {
    return [...this.adapters.entries()].map(([id, adapter]) => ({
      id,
      adapter
    }));
  }

  has(providerId) {
    return this.adapters.has(providerId);
  }
}
