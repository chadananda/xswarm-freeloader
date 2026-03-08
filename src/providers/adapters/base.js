export class BaseAdapter {
  constructor(provider) {
    this.provider = provider;
    this.baseUrl = provider.base_url;
  }

  getHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
  }

  async chatCompletion(messages, options = {}, apiKey) {
    throw new Error(`chatCompletion not implemented for ${this.provider.id}`);
  }

  async embeddings(input, model, apiKey) {
    throw new Error(`embeddings not implemented for ${this.provider.id}`);
  }

  async healthCheck(apiKey) {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.getHeaders(apiKey),
        signal: AbortSignal.timeout(5000)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  normalizeResponse(raw, model) {
    return {
      id: raw.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: raw.created || Math.floor(Date.now() / 1000),
      model: model,
      choices: raw.choices || [],
      usage: {
        prompt_tokens: raw.usage?.prompt_tokens || 0,
        completion_tokens: raw.usage?.completion_tokens || 0,
        total_tokens: raw.usage?.total_tokens || 0
      }
    };
  }

  normalizeStreamChunk(raw, model) {
    return {
      id: raw.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: raw.created || Math.floor(Date.now() / 1000),
      model: model,
      choices: raw.choices || []
    };
  }

  buildRequestBody(messages, options) {
    const body = {
      model: options.model,
      messages,
      ...(options.temperature !== undefined && { temperature: options.temperature }),
      ...(options.max_tokens && { max_tokens: options.max_tokens }),
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.stream && { stream: true }),
      ...(options.tools && { tools: options.tools }),
      ...(options.tool_choice && { tool_choice: options.tool_choice }),
      ...(options.response_format && { response_format: options.response_format })
    };
    return body;
  }

  async executeRequest(url, body, apiKey) {
    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`${this.provider.id} API error (${res.status}): ${err}`);
    }

    return res;
  }
}
