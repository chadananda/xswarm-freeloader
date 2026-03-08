import { OpenAIAdapter } from './openai.js';

export class OpenRouterAdapter extends OpenAIAdapter {
  getHeaders(apiKey) {
    return {
      ...super.getHeaders(apiKey),
      'HTTP-Referer': 'https://freeloader.xswarm.ai',
      'X-Title': 'xswarm-freeloader'
    };
  }
}
