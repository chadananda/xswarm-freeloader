import { describe, it, expect } from 'vitest';
import { BaseAdapter } from '../../../src/providers/adapters/base.js';
import { OpenAIAdapter } from '../../../src/providers/adapters/openai.js';
import { AnthropicAdapter } from '../../../src/providers/adapters/anthropic.js';
import { GeminiAdapter } from '../../../src/providers/adapters/gemini.js';
import { LocalAdapter } from '../../../src/providers/adapters/local.js';

const makeProvider = (id, adapter, base_url) => ({ id, name: id, adapter, base_url });

describe('BaseAdapter', () => {
  it('should set provider and base URL', () => {
    const adapter = new BaseAdapter(makeProvider('test', 'openai', 'https://api.test.com'));
    expect(adapter.baseUrl).toBe('https://api.test.com');
  });

  it('should generate auth headers', () => {
    const adapter = new BaseAdapter(makeProvider('test', 'openai', 'https://api.test.com'));
    const headers = adapter.getHeaders('sk-test');
    expect(headers['Authorization']).toBe('Bearer sk-test');
  });

  it('should build request body', () => {
    const adapter = new BaseAdapter(makeProvider('test', 'openai', 'https://api.test.com'));
    const body = adapter.buildRequestBody([{ role: 'user', content: 'hi' }], {
      model: 'gpt-4o', temperature: 0.7, max_tokens: 100
    });
    expect(body.model).toBe('gpt-4o');
    expect(body.temperature).toBe(0.7);
    expect(body.messages.length).toBe(1);
  });

  it('should normalize response', () => {
    const adapter = new BaseAdapter(makeProvider('test', 'openai', 'https://api.test.com'));
    const normalized = adapter.normalizeResponse({
      id: 'test-id',
      choices: [{ message: { content: 'hello' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    }, 'gpt-4o');
    expect(normalized.object).toBe('chat.completion');
    expect(normalized.model).toBe('gpt-4o');
    expect(normalized.usage.total_tokens).toBe(15);
  });
});

describe('AnthropicAdapter', () => {
  it('should use x-api-key header', () => {
    const adapter = new AnthropicAdapter(makeProvider('anthropic', 'anthropic', 'https://api.anthropic.com'));
    const headers = adapter.getHeaders('sk-ant-test');
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('should convert messages extracting system', () => {
    const adapter = new AnthropicAdapter(makeProvider('anthropic', 'anthropic', 'https://api.anthropic.com'));
    const { system, converted } = adapter.convertMessages([
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hi' }
    ]);
    expect(system).toBe('You are helpful');
    expect(converted.length).toBe(1);
    expect(converted[0].role).toBe('user');
  });

  it('should convert tools to Anthropic format', () => {
    const adapter = new AnthropicAdapter(makeProvider('anthropic', 'anthropic', 'https://api.anthropic.com'));
    const tools = adapter.convertTools([
      { type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: { type: 'object' } } }
    ]);
    expect(tools[0].name).toBe('get_weather');
    expect(tools[0].input_schema).toEqual({ type: 'object' });
  });

  it('should normalize Anthropic response to OpenAI format', () => {
    const adapter = new AnthropicAdapter(makeProvider('anthropic', 'anthropic', 'https://api.anthropic.com'));
    const normalized = adapter.normalizeAnthropicResponse({
      id: 'msg_test',
      content: [{ type: 'text', text: 'Hello!' }],
      usage: { input_tokens: 10, output_tokens: 5 },
      stop_reason: 'end_turn'
    }, 'claude-sonnet-4-6');
    expect(normalized.choices[0].message.content).toBe('Hello!');
    expect(normalized.choices[0].finish_reason).toBe('stop');
    expect(normalized.usage.prompt_tokens).toBe(10);
  });
});

describe('GeminiAdapter', () => {
  it('should not use Authorization header', () => {
    const adapter = new GeminiAdapter(makeProvider('gemini', 'gemini', 'https://generativelanguage.googleapis.com'));
    const headers = adapter.getHeaders('key');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should convert messages to Gemini format', () => {
    const adapter = new GeminiAdapter(makeProvider('gemini', 'gemini', 'https://generativelanguage.googleapis.com'));
    const { system, contents } = adapter.convertMessages([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' }
    ]);
    expect(system).toBe('Be helpful');
    expect(contents.length).toBe(2);
    expect(contents[1].role).toBe('model');
  });

  it('should normalize Gemini response', () => {
    const adapter = new GeminiAdapter(makeProvider('gemini', 'gemini', 'https://generativelanguage.googleapis.com'));
    const normalized = adapter.normalizeGeminiResponse({
      candidates: [{ content: { parts: [{ text: 'Hello!' }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3, totalTokenCount: 8 }
    }, 'gemini-2.0-flash');
    expect(normalized.choices[0].message.content).toBe('Hello!');
    expect(normalized.usage.total_tokens).toBe(8);
  });
});

describe('LocalAdapter', () => {
  it('should not include auth header', () => {
    const adapter = new LocalAdapter(makeProvider('local', 'local', 'http://localhost:11434'));
    const headers = adapter.getHeaders('');
    expect(headers['Authorization']).toBeUndefined();
  });
});
