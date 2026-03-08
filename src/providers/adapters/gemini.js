import { BaseAdapter } from './base.js';

export class GeminiAdapter extends BaseAdapter {
  getHeaders(apiKey) {
    return { 'Content-Type': 'application/json' };
  }

  async chatCompletion(messages, options = {}, apiKey) {
    const { system, contents } = this.convertMessages(messages);

    const body = {
      contents,
      ...(system && { systemInstruction: { parts: [{ text: system }] } }),
      generationConfig: {
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.max_tokens && { maxOutputTokens: options.max_tokens }),
        ...(options.top_p !== undefined && { topP: options.top_p })
      }
    };

    if (options.stream) {
      const url = `${this.baseUrl}/v1beta/models/${options.model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const res = await fetch(url, { method: 'POST', headers: this.getHeaders(apiKey), body: JSON.stringify(body) });
      if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
      return res;
    }

    const url = `${this.baseUrl}/v1beta/models/${options.model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: 'POST', headers: this.getHeaders(apiKey), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);

    const data = await res.json();
    return this.normalizeGeminiResponse(data, options.model);
  }

  convertMessages(messages) {
    let system = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    return { system, contents };
  }

  normalizeGeminiResponse(data, model) {
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
    const usage = data.usageMetadata || {};

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      usage: {
        prompt_tokens: usage.promptTokenCount || 0,
        completion_tokens: usage.candidatesTokenCount || 0,
        total_tokens: usage.totalTokenCount || 0
      }
    };
  }

  async healthCheck(apiKey) {
    try {
      const res = await fetch(`${this.baseUrl}/v1beta/models?key=${apiKey}`, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch { return false; }
  }
}
