import { describe, it, expect } from 'vitest';
import { executeWithFallback } from '../../../src/router/fallback.js';

describe('executeWithFallback', () => {
  it('should return first successful result', async () => {
    const candidates = [
      { provider_id: 'openai', name: 'gpt-4o', id: 'openai/gpt-4o' },
      { provider_id: 'anthropic', name: 'claude', id: 'anthropic/claude' }
    ];

    const result = await executeWithFallback(candidates, async (c) => {
      return { content: 'hello', usage: { prompt_tokens: 10 } };
    });

    expect(result.content).toBe('hello');
    expect(result.routing.provider).toBe('openai');
    expect(result.routing.attempts).toBe(1);
  });

  it('should fall back to second candidate', async () => {
    const candidates = [
      { provider_id: 'openai', name: 'gpt-4o', id: 'openai/gpt-4o' },
      { provider_id: 'anthropic', name: 'claude', id: 'anthropic/claude' }
    ];

    let attempt = 0;
    const result = await executeWithFallback(candidates, async (c) => {
      attempt++;
      if (attempt === 1) throw new Error('rate limited');
      return { content: 'fallback', usage: {} };
    });

    expect(result.content).toBe('fallback');
    expect(result.routing.provider).toBe('anthropic');
    expect(result.routing.attempts).toBe(2);
  });

  it('should throw when all candidates fail', async () => {
    const candidates = [
      { provider_id: 'openai', name: 'gpt-4o', id: 'openai/gpt-4o' }
    ];

    await expect(
      executeWithFallback(candidates, async () => { throw new Error('fail'); })
    ).rejects.toThrow('All 1 provider(s) failed');
  });
});
