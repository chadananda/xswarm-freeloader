# Article Outline: Freeloader for Claude Code Users

**Target audience:** Developers using Claude Code (Anthropic's agentic coding assistant) who want to reduce their AI spend without changing their workflow.

**Estimated length:** 1,400–1,800 words

**SEO keywords:** Claude Code free models, Claude Code cost reduction, OPENAI_BASE_URL Claude Code, Claude Code LLM proxy, free tier Claude Code alternative, Freeloader Claude Code setup

---

## H2: The Problem — Claude Code Bills Add Up Fast

- Claude Code makes hundreds of API calls per session (file reads, diffs, explanations, completions)
- Most of these are routine tasks that don't need Claude Opus or Sonnet
- Example cost breakdown: 10 sessions/day × 200 calls × avg 0.5K tokens = significant monthly spend
- The insight: only complex reasoning tasks need premium models

---

## H2: Set OPENAI_BASE_URL to Freeloader

- Claude Code respects `OPENAI_BASE_URL` for OpenAI-compatible endpoints
- Point it to `http://localhost:4011` — Freeloader handles all routing from there
- Any API key string works (Freeloader ignores it for routing, uses provider keys internally)

**Code example to include:**
```bash
# In your shell profile or Claude Code settings
export OPENAI_BASE_URL=http://localhost:4011
export OPENAI_API_KEY=free

# Or in .env at project root
OPENAI_BASE_URL=http://localhost:4011
OPENAI_API_KEY=free
```

**Code example — Claude Code config (if applicable):**
```json
{
  "apiBaseUrl": "http://localhost:4011",
  "apiKey": "free"
}
```

---

## H2: Use Free Models for Routine Tasks, Premium for Complex

- Freeloader's routing strategy: free tier first, cheapest paid next, premium last
- Routine Claude Code tasks that work great on free models:
  - File summarization (Gemini Flash)
  - Docstring generation (Groq/Llama)
  - Simple refactors (Cerebras)
  - Git commit message generation (any free model)
- Tasks worth paying for:
  - Multi-file architecture decisions
  - Complex debugging across large codebases
  - Security review of critical code

**Code example — explicit model selection when needed:**
```python
# Force premium for complex reasoning
client = OpenAI(base_url="http://localhost:4011", api_key="free")
response = client.chat.completions.create(
    model="claude-opus-4-6",  # bypasses free routing for this call
    messages=[{"role": "user", "content": "Redesign this auth system..."}]
)
```

---

## H2: Trust Tiers for Code vs. Documentation

- Freeloader's three trust tiers map naturally to Claude Code use cases:
  - `OPEN` — documentation, README generation, comment writing → any provider
  - `STANDARD` — code review, refactors, test generation → SOC 2 compliant providers only
  - `PRIVATE` — code containing secrets, credentials, internal APIs → local models (Ollama) only
- How to tag requests by trust tier: pass `X-Trust-Tier` header or configure per-app in dashboard

**Code example to include:**
```js
// Route documentation tasks to any free provider
const docClient = new OpenAI({ baseURL: 'http://localhost:4011', apiKey: 'free',
  defaultHeaders: { 'X-Trust-Tier': 'open' }
});

// Route code with internal APIs to local model only
const codeClient = new OpenAI({ baseURL: 'http://localhost:4011', apiKey: 'free',
  defaultHeaders: { 'X-Trust-Tier': 'private' }
});
```

---

## H2: Practical Setup in 5 Minutes

1. `npx xswarm-freeloader` — installs, starts router on :4011 and dashboard on :4010
2. Open `http://localhost:4010` — add free-tier API keys (Gemini, Groq, Cerebras)
3. Set `OPENAI_BASE_URL=http://localhost:4011` in shell profile
4. Restart Claude Code — it now routes through Freeloader automatically
5. Check dashboard live feed — watch requests route to free providers in real time

---

## H2: How Much Can You Save?

- Placeholder for a concrete calculation: show estimated monthly bill with vs. without Freeloader
- Key stat from website: "Gemini Flash does the same thing for free. So does Groq. So does Cerebras."
- Suggested callout: "For most Claude Code sessions, 80–90% of calls can be served by free models"

---

## Notes for Writer

- Tone: practical developer tutorial, step-by-step, assumes familiarity with Claude Code
- Lead with the pain point (bills), not with the product
- Keep code examples copy-pasteable
- Add a "common mistakes" section: forgetting to restart shell after setting env var, not adding API keys for free providers
