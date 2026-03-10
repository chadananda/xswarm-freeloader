import { describe, it, expect, vi } from 'vitest';
import { scoreModel, scoreModels, calculateBenchmarks, selectRoute, estimateTokens, meetsAppPolicy } from '../../../src/router/scorer.js';

const weights = { cost: 0.4, speed: 0.4, quality: 0.2 };

describe('scoreModel', () => {
  it('should score free models higher on cost', () => {
    const free = scoreModel({ pricing_input: 0, pricing_output: 0, free_tier: true, trust_tier: 'open' }, weights);
    const paid = scoreModel({ pricing_input: 5.0, pricing_output: 15.0, free_tier: false, trust_tier: 'open' }, weights, { maxCost: 10 });
    expect(free).toBeGreaterThan(paid);
  });

  it('should filter by trust tier', () => {
    const score = scoreModel({ pricing_input: 1, trust_tier: 'open' }, weights, { requiredTrust: 'standard' });
    expect(score).toBe(-1);
  });

  it('should allow matching trust tier', () => {
    const score = scoreModel({ pricing_input: 1, pricing_output: 3, trust_tier: 'standard' }, weights, { requiredTrust: 'standard' });
    expect(score).toBeGreaterThan(0);
  });
});

describe('scoreModels', () => {
  it('should sort by score descending', () => {
    const models = [
      { id: 'paid', pricing_input: 10, pricing_output: 30, free_tier: false, trust_tier: 'open' },
      { id: 'free', pricing_input: 0, pricing_output: 0, free_tier: true, trust_tier: 'open' }
    ];
    const scored = scoreModels(models, weights);
    expect(scored[0].id).toBe('free');
  });

  it('should filter out trust-tier mismatches', () => {
    const models = [
      { id: 'open', pricing_input: 0, trust_tier: 'open', free_tier: true },
      { id: 'standard', pricing_input: 1, trust_tier: 'standard', free_tier: false }
    ];
    const scored = scoreModels(models, weights, { requiredTrust: 'standard' });
    expect(scored.every(m => m.trust_tier !== 'open' || m.score >= 0)).toBe(true);
  });
});

describe('calculateBenchmarks', () => {
  it('should calculate max cost', () => {
    const b = calculateBenchmarks([{ pricing_input: 5 }, { pricing_input: 10 }]);
    expect(b.maxCost).toBe(10);
  });

  it('should handle empty array', () => {
    const b = calculateBenchmarks([]);
    expect(b.maxCost).toBe(100);
  });
});

describe('estimateTokens', () => {
  it('estimates from string content', () => {
    const req = { messages: [{ role: 'user', content: 'hello world' }] };
    expect(estimateTokens(req)).toBeGreaterThan(0);
  });
  it('estimates from array content parts', () => {
    const req = { messages: [{ role: 'user', content: [{ text: 'hello' }, { text: ' world' }] }] };
    expect(estimateTokens(req)).toBeGreaterThan(0);
  });
  it('returns 0 for empty messages', () => {
    expect(estimateTokens({ messages: [] })).toBe(0);
  });
});

describe('selectRoute', () => {
  const base = { id: 'p/m', provider_id: 'openai', trust_tier: 'open', pricing_input: 5, pricing_output: 15, free_tier: false, supports_tools: false, supports_vision: false, context_window: 128000 };
  const free = { ...base, id: 'p/free', pricing_input: 0, free_tier: true };
  const tools = { ...base, id: 'p/tools', supports_tools: true, pricing_input: 3 };

  it('returns cheapest-first when all pass', async () => {
    const result = await selectRoute([base, free], { messages: [{ role: 'user', content: 'hi' }] });
    expect(result[0].id).toBe('p/free');
  });

  it('filters out models lacking tools support', async () => {
    const result = await selectRoute([base, tools], { messages: [], requiresTools: true });
    expect(result.every(m => m.supports_tools)).toBe(true);
  });

  it('filters by trust tier', async () => {
    const priv = { ...base, id: 'p/priv', trust_tier: 'private' };
    const result = await selectRoute([base, priv], { messages: [] }, { trustTier: 'standard' });
    expect(result.find(m => m.trust_tier === 'open')).toBeUndefined();
  });

  it('filters out unavailable providers via healthMonitor', async () => {
    const healthMonitor = { isAvailable: (id) => id !== 'openai' };
    const result = await selectRoute([base, free], { messages: [] }, { healthMonitor });
    expect(result.find(m => m.provider_id === 'openai')).toBeUndefined();
  });

  it('filters out rate-limited models', async () => {
    const rateLimiter = { canRequest: (id) => id === 'p/free' ? { allowed: true } : { allowed: false } };
    const result = await selectRoute([base, free], { messages: [] }, { rateLimiter });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('p/free');
  });

  it('filters out models missing API key', async () => {
    const accounts = { getByProvider: (id) => id === 'groq' ? [{ api_key: 'key' }] : [] };
    const groq = { ...base, id: 'g/m', provider_id: 'groq' };
    const result = await selectRoute([base, groq], { messages: [] }, { accounts });
    expect(result.every(m => m.provider_id === 'groq')).toBe(true);
  });

  it('sorts by latency as tiebreaker for same cost', async () => {
    const local = { ...free, id: 'local/m', provider_id: 'local', is_local: true };
    const result = await selectRoute([free, local], { messages: [] });
    expect(result[0].is_local).toBe(true); // local = 50ms latency wins
  });

  it('returns empty array when all filtered', async () => {
    const healthMonitor = { isAvailable: () => false };
    const result = await selectRoute([base], { messages: [] }, { healthMonitor });
    expect(result).toHaveLength(0);
  });
});

describe('meetsAppPolicy', () => {
  const model = { id: 'openai/gpt-4o', name: 'GPT-4o', provider_id: 'openai', is_local: false, pricing_input: 2.5 };
  const localModel = { ...model, id: 'local/llama', name: 'Llama', provider_id: 'local', is_local: true, pricing_input: 0 };
  // Null/undefined policy
  it('returns true when policy is null', () => {
    expect(meetsAppPolicy(model, null)).toBe(true);
  });
  it('returns true when policy is undefined', () => {
    expect(meetsAppPolicy(model, undefined)).toBe(true);
  });
  // allowed_providers
  it('passes model whose provider_id is in allowed_providers', () => {
    expect(meetsAppPolicy(model, { allowed_providers: ['openai', 'anthropic'] })).toBe(true);
  });
  it('fails model whose provider_id is not in allowed_providers', () => {
    expect(meetsAppPolicy(model, { allowed_providers: ['anthropic'] })).toBe(false);
  });
  it('empty allowed_providers array passes all models', () => {
    expect(meetsAppPolicy(model, { allowed_providers: [] })).toBe(true);
  });
  // blocked_providers
  it('fails model whose provider_id is in blocked_providers', () => {
    expect(meetsAppPolicy(model, { blocked_providers: ['openai'] })).toBe(false);
  });
  it('passes model whose provider_id is not in blocked_providers', () => {
    expect(meetsAppPolicy(model, { blocked_providers: ['anthropic'] })).toBe(true);
  });
  // allowed_models
  it('passes model with matching id in allowed_models', () => {
    expect(meetsAppPolicy(model, { allowed_models: ['openai/gpt-4o'] })).toBe(true);
  });
  it('passes model with matching name in allowed_models', () => {
    expect(meetsAppPolicy(model, { allowed_models: ['GPT-4o'] })).toBe(true);
  });
  it('fails model with non-matching id/name in allowed_models', () => {
    expect(meetsAppPolicy(model, { allowed_models: ['claude-3-opus'] })).toBe(false);
  });
  // data_residency
  it("data_residency 'local': non-local model fails", () => {
    expect(meetsAppPolicy(model, { data_residency: 'local' })).toBe(false);
  });
  it("data_residency 'local': local model passes", () => {
    expect(meetsAppPolicy(localModel, { data_residency: 'local' })).toBe(true);
  });
  it("data_residency 'any': all models pass", () => {
    expect(meetsAppPolicy(model, { data_residency: 'any' })).toBe(true);
    expect(meetsAppPolicy(localModel, { data_residency: 'any' })).toBe(true);
  });
  // max_cost_per_request — pricing_input is per 1M tokens; policy is per-request
  it('passes model within max_cost_per_request budget', () => {
    // pricing_input=2.5 per 1M, max_cost_per_request=0.01 → threshold = 0.01 * 1M = 10000 > 2.5
    expect(meetsAppPolicy(model, { max_cost_per_request: 0.01 })).toBe(true);
  });
  it('fails model exceeding max_cost_per_request budget', () => {
    // pricing_input=2.5 per 1M, max_cost_per_request=0.000001 → threshold = 0.000001 * 1M = 1 < 2.5
    expect(meetsAppPolicy(model, { max_cost_per_request: 0.000001 })).toBe(false);
  });
  // Combination
  it('combination: allowed providers + data residency + max cost all must pass', () => {
    const policy = { allowed_providers: ['openai'], data_residency: 'any', max_cost_per_request: 0.01 };
    expect(meetsAppPolicy(model, policy)).toBe(true);
  });
  it('combination: fails if any condition fails', () => {
    const policy = { allowed_providers: ['openai'], data_residency: 'local' };
    expect(meetsAppPolicy(model, policy)).toBe(false); // openai ok, but not local
  });
});

describe('selectRoute — appPolicy and sanitizationContext', () => {
  const openaiModel = { id: 'openai/gpt-4o', provider_id: 'openai', trust_tier: 'open', pricing_input: 2.5, pricing_output: 10, free_tier: false, supports_tools: false, supports_vision: false, context_window: 128000, is_local: false };
  const anthropicModel = { id: 'anthropic/claude', provider_id: 'anthropic', trust_tier: 'open', pricing_input: 3, pricing_output: 15, free_tier: false, supports_tools: false, supports_vision: false, context_window: 200000, is_local: false };
  const localModel = { id: 'local/llama', provider_id: 'local', trust_tier: 'open', pricing_input: 0, pricing_output: 0, free_tier: true, supports_tools: false, supports_vision: false, context_window: 8000, is_local: true };
  it('appPolicy filter excludes blocked provider', async () => {
    const appPolicy = { blocked_providers: ['anthropic'] };
    const result = await selectRoute([openaiModel, anthropicModel], { messages: [] }, { appPolicy });
    expect(result.find(m => m.provider_id === 'anthropic')).toBeUndefined();
    expect(result.find(m => m.provider_id === 'openai')).toBeDefined();
  });
  it('sanitizationContext with PII + force_local_on_pii → only local models', async () => {
    const appPolicy = { force_local_on_pii: true };
    const sanitizationContext = { pii_detected: 1 };
    const result = await selectRoute([openaiModel, localModel], { messages: [] }, { appPolicy, sanitizationContext });
    expect(result.every(m => m.is_local)).toBe(true);
    expect(result.find(m => m.provider_id === 'openai')).toBeUndefined();
  });
  it('sanitizationContext without PII → all models remain available', async () => {
    const appPolicy = { force_local_on_pii: true };
    const sanitizationContext = { pii_detected: 0 };
    const result = await selectRoute([openaiModel, localModel], { messages: [] }, { appPolicy, sanitizationContext });
    expect(result.length).toBe(2);
  });
  it('sanitizationContext with PII but no force_local_on_pii → all models available', async () => {
    const appPolicy = {};
    const sanitizationContext = { pii_detected: 1 };
    const result = await selectRoute([openaiModel, localModel], { messages: [] }, { appPolicy, sanitizationContext });
    expect(result.length).toBe(2);
  });
});

describe('selectRoute — degradation score tiebreaks', () => {
  const goodProvider = { id: 'good/m', provider_id: 'good-provider', trust_tier: 'open', pricing_input: 0, pricing_output: 0, free_tier: true, supports_tools: false, supports_vision: false, context_window: 128000, is_local: false };
  const badProvider = { ...goodProvider, id: 'bad/m', provider_id: 'bad-provider' };
  const mockDegradationScorer = { getScore: vi.fn((id) => id === 'good-provider' ? 0.95 : 0.3) };
  it('higher degradation score wins when diff > 0.1 (same cost)', async () => {
    const result = await selectRoute([badProvider, goodProvider], { messages: [] }, { degradationScorer: mockDegradationScorer });
    expect(result[0].provider_id).toBe('good-provider');
  });
  it('falls through to latency when degradation diff < 0.1', async () => {
    // Both scorers return similar scores (diff = 0.05, < 0.1 threshold)
    const closeScorer = { getScore: vi.fn((id) => id === 'good-provider' ? 0.90 : 0.85) };
    const localGood = { ...goodProvider, is_local: true, provider_id: 'good-provider' };
    const remoteGood = { ...badProvider, is_local: false, provider_id: 'bad-provider' };
    const result = await selectRoute([remoteGood, localGood], { messages: [] }, { degradationScorer: closeScorer });
    // diff = 0.05 < 0.1 → falls through to latency → local wins (50ms vs 500ms)
    expect(result[0].is_local).toBe(true);
  });
  it('without degradationScorer: default score 1.0, no errors', async () => {
    const result = await selectRoute([goodProvider, badProvider], { messages: [] });
    // No degradationScorer → both get 1.0 → latency tiebreak
    expect(result).toHaveLength(2);
    expect(result[0]._degradationScore).toBe(1.0);
    expect(result[1]._degradationScore).toBe(1.0);
  });
});
