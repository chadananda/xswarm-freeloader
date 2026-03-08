<p align="center">
  <img src="https://freeloader.xswarm.ai/og-image.png" alt="Freeloader" width="600" />
</p>

<h1 align="center">Freeloader</h1>

<p align="center">
  <strong>Your AI provider's worst nightmare.</strong><br>
  <em>OpenAI-compatible proxy that routes to 127 free tier models before spending a cent.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/xswarm-freeloader"><img src="https://img.shields.io/npm/v/xswarm-freeloader?color=22c55e&label=npm&style=flat-square" alt="npm" /></a>
  <a href="https://github.com/chadananda/xswarm-freeloader/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://freeloader.xswarm.ai"><img src="https://img.shields.io/badge/docs-freeloader.xswarm.ai-22c55e?style=flat-square" alt="Docs" /></a>
</p>

<br>

```
$ npx xswarm-freeloader

  ╔═╗╦═╗╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗╔═╗╦═╗
  ╠╣ ╠╦╝║╣ ║╣ ║  ║ ║╠═╣ ║║║╣ ╠╦╝
  ╚  ╩╚═╚═╝╚═╝╩═╝╚═╝╩ ╩═╩╝╚═╝╩╚═

  ✓ Created ~/.xswarm/
  ✓ Config + database initialized
  ✓ Synced provider catalog (8 providers, 127 models)
  ✓ Default app created
  ✓ Started xswarm-router    → :4011
  ✓ Started xswarm-dashboard → :4010

  🔑 API Key: xsw_a1b2c3d4e5f6...

  Your AI provider just felt a disturbance in the force.
```

<br>

## The problem

You're paying OpenAI $200/month. Meanwhile:

- **Gemini 2.0 Flash** gives you 1,500 free requests/day with 1M context
- **Groq** gives you 14,400 free requests/day on Llama 3.3 70B
- **Mistral** gives you 500 free requests/day
- **OpenRouter** has a dozen models at literally $0.00

That's millions of free tokens per month across providers. But juggling API keys, rate limits, failovers, and response formats across all of them? Nobody has time for that.

**Freeloader does it for you.** One command. One endpoint. Zero config.

<br>

## Install

```bash
npx xswarm-freeloader
```

That's the whole install. It creates `~/.xswarm/`, starts the router and dashboard via pm2, and opens the dashboard in your browser. Survives reboots.

<br>

## Use it

Change one line. Your code stays the same:

```js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'http://localhost:4011/v1',  // ← this line
  apiKey: 'free',
});

// Freeloader intercepts this and routes to the best free model
const res = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

Works with **any** OpenAI-compatible SDK, framework, or tool — LangChain, LlamaIndex, Vercel AI SDK, Continue, Cursor, you name it. If it takes an `OPENAI_BASE_URL`, it works.

```bash
# or just curl it
curl http://localhost:4011/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}'
```

<br>

## How it works

```
Your app (unchanged)
  │
  ▼
┌──────────────────────────────────────────────┐
│  Freeloader Router (localhost:4011)           │
│                                               │
│  1. Score all available models                │
│  2. Filter by trust tier & capabilities       │
│  3. Pick the best free model that fits        │
│  4. Fall back to paid if free is exhausted    │
│  5. Enforce your budget (hard stop at $0)     │
│  6. Return standard OpenAI response shape     │
└──────────────────────────────────────────────┘
  │
  ▼
Gemini · Groq · Mistral · OpenRouter · Ollama · ...
```

Freeloader scores every available model on three axes — **cost, speed, and quality** — filtered by your trust requirements. Free tiers are always preferred. When they're exhausted, it falls back to your cheapest paid option. When your budget says stop, it stops.

<br>

## Free tier coverage

These are real, production-quality models with generous free tiers:

| Provider | Free Models | Daily Limit | Highlights |
|----------|-------------|-------------|------------|
| **Google Gemini** | Gemini 2.5 Pro, 2.0 Flash, Flash Lite | 25-1,500 req/day | 1M context, vision, tools |
| **Groq** | Llama 3.3 70B, Gemma 2 9B | 14,400 req/day | Fastest inference anywhere |
| **Mistral** | Mistral Small | 500 req/day | 128K context, EU-hosted |
| **OpenRouter** | Llama 3.3 70B, Gemini Flash | Varies | Aggregated free models |
| **Local** | Anything via Ollama/LM Studio | Unlimited | Private, zero-cost, zero-latency |

Combined: **millions of free tokens per month.** Freeloader automatically rotates through providers as rate limits are hit, so you get the maximum possible free usage before any paid fallback.

<br>

## Trust tiers

Not all data should go everywhere. Tag your requests:

| Tier | Where data goes | Use case |
|------|----------------|----------|
| `open` | Any provider globally | Public content, non-sensitive tasks |
| `standard` | US/EU providers only | Business data, PII with DPA coverage |
| `private` | Local models only | Medical, legal, secrets — never leaves your machine |

```js
// private data stays on your machine
await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: patientRecord }],
  metadata: { trust_tier: 'private' },  // routes to Ollama only
});
```

<br>

## Dashboard

A local web UI at `http://localhost:4010` with everything you need and nothing you don't.

**7 views:**

| View | What it does |
|------|-------------|
| **Overview** | Live request feed, spend tracking, provider health at a glance |
| **Providers** | Full catalog — health, models, capabilities, free tier status |
| **Apps** | Create API consumers with per-app budgets and trust tiers |
| **Routing** | Tune cost/speed/quality weights with live sliders |
| **Usage** | Filterable request log, cost breakdowns by provider, app, and day |
| **Opportunities** | Suggestions for saving more — unused free tiers, missing API keys |
| **Settings** | Password, email digests, port config |

<br>

## Budget enforcement

Set a hard budget and Freeloader enforces it. No surprises.

```json
{
  "budget": {
    "hard": { "daily": 0.00, "monthly": 0.00 },
    "soft": { "daily": 0.00, "monthly": 0.00 }
  }
}
```

Yes, you can set your hard budget to **$0.00** and Freeloader will only use free tiers. Soft limits trigger alerts. Hard limits kill the request. Per-app budgets let you give different consumers different limits.

<br>

## Configuration

Everything lives in `~/.xswarm/config.json`:

```json
{
  "version": "2.0",
  "routing": {
    "strategy": "balanced",
    "weights": { "cost": 0.4, "speed": 0.4, "quality": 0.2 }
  },
  "budget": {
    "hard": { "daily": 10.00, "monthly": 200.00 },
    "soft": { "daily": 5.00, "monthly": 100.00 }
  },
  "server": {
    "routerPort": 4011,
    "dashboardPort": 4010
  }
}
```

Or just use the dashboard. Most people never touch this file.

<br>

## CLI

```bash
npx xswarm-freeloader            # Install / ensure running
npx xswarm-freeloader --status   # Provider health, spend, stats
npx xswarm-freeloader --restart  # Restart router and dashboard
npx xswarm-freeloader --remove   # Stop everything, optionally delete data
```

<br>

## API reference

Standard OpenAI-compatible endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/chat/completions` | Chat completions (streaming supported) |
| `POST` | `/v1/embeddings` | Text embeddings |
| `GET` | `/v1/models` | List all available models |
| `GET` | `/v1/health` | Health check |
| `*` | `/api/*` | Dashboard data API (JWT auth) |

<br>

## Provider adapters

8 native JavaScript adapters. No Python. No LiteLLM. No subprocess. Just `fetch()`.

| Provider | Protocol | Free Tier |
|----------|----------|-----------|
| OpenAI | Native | No |
| Anthropic | Messages API → OpenAI format | No |
| Google Gemini | Generative AI API → OpenAI format | Yes |
| Groq | OpenAI-compatible | Yes |
| Mistral | OpenAI-compatible | Yes |
| Together AI | OpenAI-compatible | No |
| OpenRouter | OpenAI-compatible | Yes (some models) |
| Local (Ollama / LM Studio) | OpenAI-compatible | Always free |

Adding a provider is ~80 lines. If it speaks OpenAI, it's a 20-line subclass.

<br>

## Architecture

```
npx xswarm-freeloader
  └─ setup.js → creates ~/.xswarm/, starts pm2 processes
       ├─ xswarm-router (port 4011) — Fastify gateway
       │    ├─ /v1/* — OpenAI-compatible API
       │    ├─ /api/* — dashboard data
       │    ├─ scorer → cost/speed/quality ranking
       │    ├─ quality gates → trust tier filtering
       │    ├─ fallback engine → provider rotation
       │    └─ budget enforcer → hard/soft limits
       └─ xswarm-dashboard (port 4010) — Svelte SPA
```

**Stack:** Fastify, better-sqlite3, Svelte 5, Tailwind CSS, Vite, pm2. No Python, no Docker, no YAML. Just Node.

<br>

## Development

```bash
git clone https://github.com/chadananda/xswarm-freeloader.git
cd xswarm-freeloader
npm install
npm test              # 95 tests
npm run dev           # Watch mode (router)
npm run dashboard:dev # Dashboard dev server
```

```
src/
  bin/            CLI entry point
  install/        Setup, remove, status, client detection
  db/             SQLite schema, migrator, 6 repositories
  config/         Loader, defaults, Zod schemas
  router/         Fastify server, auth, scorer, fallback
  providers/      8 native adapters, registry, health monitor
  budget/         Tracker and enforcer
  email/          Digest, alerts, scheduler
  dashboard/      Svelte SPA — 7 views, 3 components
  utils/          Crypto, logger, error classes
tests/            95 unit tests
catalog/          Cloudflare Worker (model catalog API)
website/          Astro 5 marketing site
```

<br>

## Why not just use LiteLLM / OpenRouter / etc?

| | Freeloader | LiteLLM | OpenRouter |
|--|-----------|---------|------------|
| **Install** | `npx xswarm-freeloader` | Python + Docker + config | Sign up + API key |
| **Runtime** | Node.js only | Python subprocess | Cloud service |
| **Free tier optimization** | Built-in, automatic | Manual config | No |
| **Budget enforcement** | Per-app hard limits | Basic | No |
| **Trust tiers** | open / standard / private | No | No |
| **Self-hosted** | Always | Yes | No |
| **Data privacy** | Your machine only | Your machine | Their servers |
| **Price** | $0 forever | $0 (OSS) | Usage-based |

Freeloader is purpose-built for one thing: **getting your AI bill to $0.** Everything else is a side effect of doing that well.

<br>

## Part of the xswarm ecosystem

Freeloader is the open-source foundation of [xswarm](https://xswarm.ai) — a suite of tools for developers building with AI agents.

| Tool | What it does |
|------|-------------|
| **Freeloader** | Free tier router (you are here) |
| **[xswarm-ai-sanitize](https://github.com/chadananda/xswarm-ai-sanitize)** | Detect and redact secrets before they reach your agents |
| **[xswarm-buzz](https://buzz.xswarm.ai)** | Promotion orchestration — give your AI agent a marketing brain |

<br>

## License

MIT. Use it, fork it, ship it. We don't care — your AI provider cares enough for all of us.

<br>

---

<p align="center">
  <sub>Built by <a href="https://github.com/chadananda">@chadananda</a> · <a href="https://freeloader.xswarm.ai">freeloader.xswarm.ai</a> · <a href="https://xswarm.ai">xswarm.ai</a></sub>
</p>
