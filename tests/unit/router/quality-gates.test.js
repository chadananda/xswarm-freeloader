import { describe, it, expect } from 'vitest';
import { applyQualityGates } from '../../../src/router/quality-gates.js';

const models = [
  { id: 'a', provider_id: 'openai', trust_tier: 'standard', is_local: false, intelligence: 8 },
  { id: 'b', provider_id: 'local', trust_tier: 'private', is_local: true, intelligence: 6 },
  { id: 'c', provider_id: 'groq', trust_tier: 'open', is_local: false, intelligence: 7 }
];

describe('applyQualityGates', () => {
  it('should pass all with no gates', () => {
    expect(applyQualityGates(models).length).toBe(3);
  });

  it('should block local models', () => {
    const result = applyQualityGates(models, { blockLocal: true });
    expect(result.length).toBe(2);
    expect(result.find(m => m.is_local)).toBeUndefined();
  });

  it('should block specific providers', () => {
    const result = applyQualityGates(models, { blockedProviders: ['groq'] });
    expect(result.length).toBe(2);
  });

  it('should filter by trust tier', () => {
    const result = applyQualityGates(models, { trustTier: 'standard' });
    expect(result.every(m => ['standard', 'private'].includes(m.trust_tier))).toBe(true);
  });

  it('should filter by min intelligence', () => {
    const result = applyQualityGates(models, { minIntelligence: 7 });
    expect(result.length).toBe(2);
  });
});
