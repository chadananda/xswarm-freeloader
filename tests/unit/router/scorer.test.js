import { describe, it, expect } from 'vitest';
import { scoreModel, scoreModels, calculateBenchmarks, selectRoute, estimateTokens } from '../../../src/router/scorer.js';

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
