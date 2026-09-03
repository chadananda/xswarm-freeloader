import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { discoverLocal } from '../../../src/providers/local-discovery.js';

describe('Local Discovery', () => {
  let originalFetch;
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  //
  it('should return available: false when no local services running', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const results = await discoverLocal();
    expect(results).toHaveLength(2); // Ollama + LM Studio
    expect(results[0].available).toBe(false);
    expect(results[1].available).toBe(false);
  });
  //
  it('should detect Ollama when running', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('11434')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ models: [{ name: 'llama3', size: 4000000000 }] }) });
      }
      return Promise.reject(new Error('Connection refused'));
    });
    const results = await discoverLocal();
    const ollama = results.find(r => r.name === 'Ollama');
    expect(ollama.available).toBe(true);
    expect(ollama.models).toHaveLength(1);
    expect(ollama.models[0].name).toBe('llama3');
  });
  //
  it('should detect LM Studio when running', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('1234')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [{ id: 'mistral-7b' }] }) });
      }
      return Promise.reject(new Error('Connection refused'));
    });
    const results = await discoverLocal();
    const lmStudio = results.find(r => r.name === 'LM Studio');
    expect(lmStudio.available).toBe(true);
    expect(lmStudio.models).toHaveLength(1);
    expect(lmStudio.models[0].id).toBe('mistral-7b');
  });
  //
  it('should probe custom endpoints', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url === 'http://192.168.1.10:11434/api/tags') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ models: [{ name: 'codellama' }] }) });
      }
      return Promise.reject(new Error('Connection refused'));
    });
    const results = await discoverLocal(['http://192.168.1.10:11434']);
    const custom = results.find(r => r.url === 'http://192.168.1.10:11434');
    expect(custom.available).toBe(true);
    expect(custom.models[0].name).toBe('codellama');
  });
  //
  it('should detect Boss Router custom endpoint', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      // Known endpoints fail
      if (url.includes('11434') || url.includes('1234')) {
        return Promise.reject(new Error('Connection refused'));
      }
      // Custom endpoint: Ollama and OpenAI probes fail
      if (url === 'https://boss.example.com/api/tags' || url === 'https://boss.example.com/v1/models') {
        return Promise.reject(new Error('Not found'));
      }
      // Boss Router root returns models_online/models_offline
      if (url === 'https://boss.example.com/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            models_online: [
              { alias: 'fast', model: 'qwen2.5', port: 8001, description: 'Fast model', status: 'online' }
            ],
            models_offline: [
              { alias: 'heavy', model: 'llama3-70b', port: 8002, description: 'Heavy model', status: 'offline' }
            ]
          })
        });
      }
      return Promise.reject(new Error('Connection refused'));
    });
    const results = await discoverLocal(['https://boss.example.com']);
    const boss = results.find(r => r.url === 'https://boss.example.com');
    expect(boss.available).toBe(true);
    expect(boss.name).toBe('Custom (Boss Router)');
    expect(boss.models).toHaveLength(2);
    expect(boss.models[0].id).toBe('fast');
    expect(boss.models[0].name).toBe('qwen2.5');
    expect(boss.models[0].status).toBe('online');
    expect(boss.models[1].status).toBe('offline');
  });
  //
  it('should handle custom endpoint with no compatible API', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
    const results = await discoverLocal(['http://192.168.1.10:5555']);
    const custom = results.find(r => r.url === 'http://192.168.1.10:5555');
    expect(custom.available).toBe(false);
    expect(custom.error).toBe('No compatible API found');
  });
});
