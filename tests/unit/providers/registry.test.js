import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry } from '../../../src/providers/registry.js';
import { createTestDb } from '../../helpers/testDb.js';
import { OpenAIAdapter } from '../../../src/providers/adapters/openai.js';
import { AnthropicAdapter } from '../../../src/providers/adapters/anthropic.js';

describe('ProviderRegistry', () => {
  let testDb, registry;

  beforeEach(() => {
    testDb = createTestDb();
    registry = new ProviderRegistry(testDb.db);
  });
  afterEach(() => { testDb.close(); });

  it('should register a provider', () => {
    registry.register({ id: 'openai', adapter: 'openai', base_url: 'https://api.openai.com/v1' });
    expect(registry.has('openai')).toBe(true);
    expect(registry.get('openai')).toBeInstanceOf(OpenAIAdapter);
  });

  it('should load providers from database', () => {
    testDb.providers.upsert({ id: 'openai', name: 'OpenAI', adapter: 'openai', base_url: 'https://api.openai.com/v1', trust_tier: 'standard' });
    testDb.providers.upsert({ id: 'anthropic', name: 'Anthropic', adapter: 'anthropic', base_url: 'https://api.anthropic.com', trust_tier: 'standard' });
    registry.loadFromDb(testDb.providers);
    expect(registry.has('openai')).toBe(true);
    expect(registry.has('anthropic')).toBe(true);
    expect(registry.get('anthropic')).toBeInstanceOf(AnthropicAdapter);
  });

  it('should skip unknown adapter types', () => {
    registry.register({ id: 'unknown', adapter: 'some-unknown-type', base_url: 'http://example.com' });
    expect(registry.has('unknown')).toBe(false);
  });

  it('should list all registered adapters', () => {
    registry.register({ id: 'openai', adapter: 'openai', base_url: 'https://api.openai.com/v1' });
    registry.register({ id: 'groq', adapter: 'groq', base_url: 'https://api.groq.com/openai/v1' });
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });
});
