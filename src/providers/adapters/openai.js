import { BaseAdapter } from './base.js';

export class OpenAIAdapter extends BaseAdapter {
  async chatCompletion(messages, options = {}, apiKey) {
    const body = this.buildRequestBody(messages, options);
    const res = await this.executeRequest(`${this.baseUrl}/chat/completions`, body, apiKey);

    if (options.stream) return res;

    const data = await res.json();
    return this.normalizeResponse(data, options.model);
  }

  async embeddings(input, model, apiKey) {
    const res = await this.executeRequest(`${this.baseUrl}/embeddings`, {
      model,
      input: Array.isArray(input) ? input : [input]
    }, apiKey);
    return res.json();
  }
}
