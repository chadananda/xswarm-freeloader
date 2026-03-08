import { BaseAdapter } from './base.js';

export class AnthropicAdapter extends BaseAdapter {
  getHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  async chatCompletion(messages, options = {}, apiKey) {
    const { system, converted } = this.convertMessages(messages);

    const body = {
      model: options.model,
      messages: converted,
      max_tokens: options.max_tokens || 4096,
      ...(system && { system }),
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.stream && { stream: true }),
      ...(options.tools && { tools: this.convertTools(options.tools) })
    };

    const res = await this.executeRequest(`${this.baseUrl}/v1/messages`, body, apiKey);

    if (options.stream) return res;

    const data = await res.json();
    return this.normalizeAnthropicResponse(data, options.model);
  }

  convertMessages(messages) {
    let system = null;
    const converted = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else {
        converted.push({ role: msg.role, content: msg.content });
      }
    }

    return { system, converted };
  }

  convertTools(tools) {
    return tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters
    }));
  }

  normalizeAnthropicResponse(data, model) {
    const content = data.content || [];
    const textContent = content.filter(c => c.type === 'text').map(c => c.text).join('');
    const toolUse = content.filter(c => c.type === 'tool_use');

    const message = { role: 'assistant', content: textContent };
    if (toolUse.length > 0) {
      message.tool_calls = toolUse.map(t => ({
        id: t.id,
        type: 'function',
        function: { name: t.name, arguments: JSON.stringify(t.input) }
      }));
    }

    return {
      id: data.id || `msg-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{ index: 0, message, finish_reason: data.stop_reason === 'end_turn' ? 'stop' : data.stop_reason }],
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  async healthCheck(apiKey) {
    try {
      const res = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: this.getHeaders(apiKey),
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        signal: AbortSignal.timeout(10000)
      });
      return res.status !== 500;
    } catch { return false; }
  }
}
