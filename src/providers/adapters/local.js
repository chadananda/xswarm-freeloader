import { OpenAIAdapter } from './openai.js';

export class LocalAdapter extends OpenAIAdapter {
  getHeaders(_apiKey) {
    return { 'Content-Type': 'application/json' };
  }

  async healthCheck() {
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(3000)
      });
      return res.ok;
    } catch { return false; }
  }
}
