# Article Outline: Freeloader for Cursor/Continue/Copilot Alternatives

**Target audience:** Developers using AI-powered IDE assistants who want to slash the cost of in-editor AI completions and chat without switching tools.

**Estimated length:** 1,500–2,000 words

**SEO keywords:** Cursor free LLM backend, Continue.dev Freeloader, AI IDE proxy free, Cursor OPENAI_BASE_URL, free Copilot alternative, Continue OpenAI compatible, Aider free models, IDE AI cost reduction

---

## H2: Why IDE AI Tools Are Expensive

- High-frequency requests: code completion fires on every keystroke delay
- Chat sidebar: multi-turn conversations with large context windows
- Most IDE tools default to GPT-4o or Claude Opus — highest cost models
- A single active developer can generate 500–2,000 API calls/day
- Estimate: $30–80/month per developer at default settings

---

## H2: Freeloader as Universal IDE Backend

- Any tool that accepts an OpenAI-compatible endpoint works with Freeloader
- One setup, all tools: Cursor, Continue, Aider, Cody (OSS), Zed AI, etc.
- Start Freeloader once: `npx xswarm-freeloader` → router on :4011

---

## H2: IDE Integration Setup

### Cursor
**Code example:**
```json
// Cursor Settings → Models → Add Custom Model
{
  "baseUrl": "http://localhost:4011",
  "apiKey": "free",
  "model": "gpt-4o"
}
```
- Navigate: Cursor Settings → Features → Models → Add new model
- Set base URL to `http://localhost:4011`
- Model name: any (Freeloader maps it to best available free model)

### Continue.dev
**Code example:**
```json
// ~/.continue/config.json
{
  "models": [
    {
      "title": "Freeloader (Free Tier)",
      "provider": "openai",
      "model": "gpt-4o",
      "apiBase": "http://localhost:4011",
      "apiKey": "free"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Freeloader Fast",
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "apiBase": "http://localhost:4011",
    "apiKey": "free"
  }
}
```

### Aider
**Code example:**
```bash
# Aider respects standard OpenAI env vars
export OPENAI_API_BASE=http://localhost:4011
export OPENAI_API_KEY=free

aider --model gpt-4o myfile.py
```

### Zed AI
```json
// Zed settings.json
{
  "language_models": {
    "openai": {
      "api_url": "http://localhost:4011",
      "available_models": [{"name": "gpt-4o", "max_tokens": 128000}]
    }
  }
}
```

---

## H2: Which Models Work Best for Code Completion

- **Tab completion / inline suggestions** (low latency critical):
  - Cerebras (fastest, ~500ms, free tier)
  - Groq/Llama (fast, free tier)
  - SambaNova (fast inference, free tier)
  - Avoid: Gemini (higher latency), any paid model (cost adds up fast)

- **Chat sidebar / code explanation** (quality matters more):
  - Gemini Flash (high quality, generous free tier)
  - Mistral (good code quality, free tier available)
  - DeepSeek (excellent code quality, very cheap when free tier exhausted)

- **Complex refactoring / architecture review** (quality critical):
  - Let Freeloader escalate to DeepSeek or OpenAI as needed
  - Set a budget cap in dashboard to prevent runaway costs

**Table to include:**
| Task | Recommended Model | Cost |
|---|---|---|
| Tab completion | Cerebras / Groq | Free |
| Code explanation | Gemini Flash | Free |
| Test generation | Mistral / DeepSeek | Free / ~$0.001 |
| Architecture review | GPT-4o / Claude | $0.01–0.05 |

---

## H2: Free Tier Optimization for High-Frequency Requests

- Freeloader rotates across providers automatically — no single provider hits rate limits
- For tab completion: configure a dedicated "fast" model in Continue's `tabAutocompleteModel`
- Rate limit awareness: Freeloader's `RateLimiter` tracks usage per provider per minute/day
- Dashboard → Usage Analytics: see which providers are being used for completion vs. chat

**Code example — rate limit config in Freeloader dashboard:**
```
Provider: Cerebras
Daily limit: 100K tokens (free tier)
Current usage: 42K tokens
Remaining: 58K tokens
Next reset: 4h 12m
```

- Set up provider priority in dashboard: fast free providers first for completions
- Enable "Exhausted provider skip" — when daily limit hit, automatically routes to next provider

---

## H2: Trust Tiers for Code Privacy

- IDE tools often send code containing:
  - Internal API keys accidentally committed
  - Proprietary business logic
  - Customer data in test fixtures
- Freeloader's `PRIVATE` trust tier routes to local Ollama only
- Configure Continue or Cursor to send a trust tier header for sensitive files

**Code example — Continue with trust tier:**
```json
{
  "models": [
    {
      "title": "Private (Local Only)",
      "provider": "openai",
      "model": "gpt-4o",
      "apiBase": "http://localhost:4011",
      "apiKey": "free",
      "requestOptions": {
        "headers": {"X-Trust-Tier": "private"}
      }
    }
  ]
}
```

- Bonus: Freeloader scans every request for 600+ API key patterns (xswarm-ai-sanitize) regardless of trust tier

---

## H2: Measuring the Savings

- Dashboard at `http://localhost:4010` → Cost Comparison view
- Shows: actual spend vs. estimated spend if using OpenAI directly
- Export as PDF for monthly reporting
- Typical savings profile for an active developer: 85–95% cost reduction on routine tasks

---

## Notes for Writer

- Include screenshots description: Cursor settings panel, Continue config file, Freeloader dashboard
- Add "common issues" section: CORS errors, SSL, localhost trust issues in some IDEs
- Mention that some IDEs (JetBrains AI) may require additional proxy configuration
- Keep per-tool setup sections scannable — developers will jump to their tool
