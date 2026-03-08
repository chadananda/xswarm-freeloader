import { describe, it, expect } from 'vitest';
import { scoreModel, scoreModels, calculateBenchmarks } from '../../../src/router/scorer.js';

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
