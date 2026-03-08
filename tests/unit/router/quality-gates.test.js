import { describe, it, expect } from 'vitest';
import { applyQualityGates, detectCapabilities } from '../../../src/router/quality-gates.js';

const models = [
  { id: 'a', provider_id: 'openai', trust_tier: 'standard', is_local: false, intelligence: 8, supports_tools: true, supports_vision: true, context_window: 128000 },
  { id: 'b', provider_id: 'local', trust_tier: 'private', is_local: true, intelligence: 6, supports_tools: false, supports_vision: false, context_window: 4096 },
  { id: 'c', provider_id: 'groq', trust_tier: 'open', is_local: false, intelligence: 7, supports_tools: true, supports_vision: false, context_window: 32768 }
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

  it('requiresTools gate filters to supports_tools=1', () => {
    const result = applyQualityGates(models, { requiresTools: true });
    expect(result.every(m => m.supports_tools)).toBe(true);
    expect(result.find(m => m.id === 'b')).toBeUndefined();
  });

  it('requiresVision gate filters to supports_vision=1', () => {
    const result = applyQualityGates(models, { requiresVision: true });
    expect(result.every(m => m.supports_vision)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  it('minContextWindow gate filters by context_window', () => {
    const result = applyQualityGates(models, { minContextWindow: 50000 });
    expect(result.every(m => m.context_window >= 50000)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });
});

describe('detectCapabilities', () => {
  it('detects tools from request.tools array', () => {
    const caps = detectCapabilities({ messages: [], tools: [{ type: 'function' }] });
    expect(caps.requiresTools).toBe(true);
    expect(caps.requiresVision).toBe(false);
  });

  it('detects tools from tool_calls in messages', () => {
    const caps = detectCapabilities({ messages: [{ role: 'assistant', tool_calls: [{ id: '1' }], content: '' }] });
    expect(caps.requiresTools).toBe(true);
  });

  it('detects vision from image_url content part', () => {
    const caps = detectCapabilities({
      messages: [{ role: 'user', content: [{ image_url: 'http://img', type: 'image_url' }, { text: 'what is this', type: 'text' }] }]
    });
    expect(caps.requiresVision).toBe(true);
  });

  it('computes minContextWindow from char counts', () => {
    const msg = 'a'.repeat(400); // 400 chars / 4 = 100 tokens
    const caps = detectCapabilities({ messages: [{ role: 'user', content: msg }] });
    expect(caps.minContextWindow).toBe(100);
  });

  it('returns false/0 for empty request', () => {
    const caps = detectCapabilities({ messages: [] });
    expect(caps.requiresTools).toBe(false);
    expect(caps.requiresVision).toBe(false);
    expect(caps.minContextWindow).toBe(0);
  });
});
