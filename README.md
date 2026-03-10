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
│  3. Sanitize sensitive content (optional)     │
│  4. Pick the best free model that fits        │
│  5. Fall back to paid if free is exhausted    │
│  6. Enforce your budget (hard stop at $0)     │
│  7. Return standard OpenAI response shape     │
└──────────────────────────────────────────────┘
  │
  ▼
Gemini · Groq · Mistral · OpenRouter · xAI · Ollama · ...
```

Freeloader scores every available model on three axes — **cost, speed, and quality** — filtered by your trust requirements. Free tiers are always preferred. When they're exhausted, it falls back to your cheapest paid option. When your budget says stop, it stops.

<br>

## Features

### Intelligent routing
- **Cost/speed/quality scoring** with configurable weights
- **Automatic free tier rotation** — exhausts every free tier before spending a cent
- **Circuit breaker** health monitoring with automatic provider failover
- **Degradation scoring** — tracks provider reliability over time and routes away from flaky backends
- **Capability-aware** — automatically detects tool use, vision, and long context requirements

### Security & isolation
- **Per-app API keys** with hash-based authentication (raw keys never stored)
- **Per-app policies** — allowed/blocked providers, budget overrides, sanitization profiles per consumer
- **Trust tiers** — control exactly which providers see which data
- **Request sanitization** — optional PII redaction and secret detection before requests leave your machine
- **Content policy enforcement** — block requests containing secrets or sensitive patterns

### Observability
- **Multi-range reporting** — 24h, 7d, 30d, 90d views with trend comparisons
- **Professional PDF reports** — 4-page executive summaries generated locally, emailed on schedule
- **HTML email digests** — savings highlights, provider breakdowns, error rates, opportunities
- **Per-app analytics** — drill down into any app's usage, cost, and provider mix
- **Hourly breakdown** — see traffic patterns across the day
- **Config versioning** — every settings change is versioned with rollback support

### Email reports (optional)
- **Resend integration** — free tier (100 emails/day), just add your API key in the dashboard
- **Custom SMTP** — use any email provider you already have
- **Test reports** — send a test report from the dashboard to verify your setup
- Reports include PDF attachment with executive summary, hourly breakdowns, provider distribution, and growth metrics

### Dashboard
A local web UI at `http://localhost:4010` — dark paper theme, 8 views:

| View | What it does |
|------|-------------|
| **Overview** | Live request feed, spend tracking, provider health, cost/request charts |
| **Providers** | Full catalog — health, models, capabilities, free tier status, degradation scores |
| **Apps** | Create API consumers with per-app budgets, trust tiers, and sanitization profiles |
| **App Detail** | Deep dive into a single app — keys, policies, usage timeseries, provider mix |
| **Routing** | Tune cost/speed/quality weights with live sliders, set quality gates |
| **Usage** | Filterable request log, cost breakdowns by provider, app, and day |
| **Opportunities** | Suggestions for saving more — unused free tiers, missing API keys |
| **Settings** | Password, email reports (Resend/SMTP), port config, config versioning |

<br>

## Security: your data never leaves your machine

**Freeloader is architecturally local-only.** There is no Freeloader cloud service, no hosted backend, no telemetry server. Everything runs on your machine:

- **Your API keys** are encrypted with AES-256-CBC and stored in a local SQLite database at `~/.xswarm/freeloader.db`. They never leave your machine except to authenticate with the provider you chose.
- **Your request content** passes from your app → Freeloader → the AI provider you configured. Freeloader never copies, logs, or transmits your prompt content to any Freeloader infrastructure (there is none).
- **Your usage data** (token counts, costs, latency) is stored locally for your dashboard and reports. It is never sent anywhere.
- **Your reports** are generated locally as PDF files saved to `~/.xswarm/reports/`. Email delivery is strictly opt-in — you must configure it yourself.
- **Dashboard auth** uses bcrypt-hashed passwords and JWT tokens, all local.

The only network calls Freeloader makes:
1. **Catalog sync** — fetches the public model catalog from `catalog.freeloader.xswarm.ai` (a static JSON file listing available providers/models, no user data sent)
2. **AI provider requests** — your prompts go to the providers you configured, exactly as they would if you called them directly
3. **Email delivery** — only if you explicitly enable it and configure an email provider

**If your hard budget is $0 and you only use free tiers, the cost to you is literally nothing.** No subscription, no usage fees, no data monetization. MIT licensed.

<br>

## Free tier coverage

These are real, production-quality models with generous free tiers:

| Provider | Free Models | Daily Limit | Highlights |
|----------|-------------|-------------|------------|
| **Google Gemini** | Gemini 2.5 Pro, 2.0 Flash, Flash Lite | 25-1,500 req/day | 1M context, vision, tools |
| **Groq** | Llama 3.3 70B, Gemma 2 9B | 14,400 req/day | Fastest inference anywhere |
| **Cerebras** | Llama 3.3 70B | 1,000 req/day | Ultra-fast inference |
| **Mistral** | Mistral Small | 500 req/day | 128K context, EU-hosted |
| **xAI** | Grok Beta | 60 req/hour | 131K context |
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

## Per-app policies

Create isolated API consumers with granular controls:

```js
// Each app gets its own API key, budget, trust tier, and routing rules
const app = {
  name: 'customer-chatbot',
  trust_tier: 'standard',
  budget_daily_hard: 5.00,
  sanitization_profile: 'standard',  // auto-redact PII
  allowed_providers: ['openai', 'anthropic', 'gemini'],
  blocked_providers: ['openrouter'],
};
```

App keys use hash-based authentication — the raw API key is shown once at creation and never stored. Keys can be rotated and revoked from the dashboard without downtime.

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
  },
  "email": {
    "enabled": false,
    "provider": "resend",
    "apiKey": "re_...",
    "to": "you@example.com",
    "digestFrequency": "daily"
  }
}
```

Or just use the dashboard. Most people never touch this file. Every config change is versioned and can be rolled back from the dashboard.

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

Query parameters for routing introspection:
- `?debug=routing` — returns candidate list, scores, policy info in the response
- `?app_id=my-app` — identify the calling app (alternative to API key auth)

<br>

## Provider adapters

9 native JavaScript adapters. No Python. No LiteLLM. No subprocess. Just `fetch()`.

| Provider | Protocol | Free Tier |
|----------|----------|-----------|
| OpenAI | Native | No |
| Anthropic | Messages API → OpenAI format | No |
| Google Gemini | Generative AI API → OpenAI format | Yes |
| Groq | OpenAI-compatible | Yes |
| Cerebras | OpenAI-compatible | Yes |
| Mistral | OpenAI-compatible | Yes |
| xAI (Grok) | OpenAI-compatible | Yes |
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
       │    ├─ /api/* — dashboard data + admin API
       │    ├─ scorer → cost/speed/quality ranking
       │    ├─ quality gates → trust tier & capability filtering
       │    ├─ sanitizer → PII redaction & secret detection
       │    ├─ fallback engine → provider rotation with circuit breakers
       │    ├─ degradation scorer → provider reliability tracking
       │    ├─ budget enforcer → per-app hard/soft limits
       │    ├─ config manager → versioned config with rollback
       │    └─ report generator → multi-range PDF & email digests
       └─ xswarm-dashboard (port 4010) — Svelte 5 SPA
            └─ 8 views, 7 components, dark paper theme
```

**Stack:** Fastify, better-sqlite3, Svelte 5, Tailwind CSS, Vite, pdfkit, nodemailer, pm2. No Python, no Docker, no YAML. Just Node.

<br>

## Development

```bash
git clone https://github.com/chadananda/xswarm-freeloader.git
cd xswarm-freeloader
npm install
npm test              # 481 tests
npm run dev           # Watch mode (router)
npm run dashboard:dev # Dashboard dev server
```

```
src/
  bin/            CLI entry point
  install/        Setup, remove, status, client detection
  db/             SQLite schema, 8 migrations, 9 repositories
  config/         Loader, defaults, manager, Zod schemas
  router/         Fastify server, auth, scorer, sanitizer, fallback, quality gates
  providers/      9 native adapters, registry, health monitor, degradation scorer
  budget/         Tracker and enforcer
  email/          Multi-range digest, PDF reports, alerts, Resend/SMTP mailer
  dashboard/      Svelte 5 SPA — 8 views, 7 components
  utils/          Crypto (AES-256, bcrypt, HMAC), logger, error classes
scripts/
  seed-mock-data.js     90-day mock data seeder (~74K rows)
  send-mock-reports.js  Seed + generate + email test
tests/                  481 tests (unit, integration, BDD, load)
catalog/                Cloudflare Worker (model catalog API)
website/                Astro 5 marketing site
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
| **Request sanitization** | Built-in PII/secret detection | No | No |
| **Per-app policies** | Keys, budgets, provider rules | No | No |
| **Health monitoring** | Circuit breakers + degradation | Basic | Managed |
| **Reporting** | Multi-range PDF + email | No | Basic |
| **Self-hosted** | Always | Yes | No |
| **Data privacy** | Your machine only | Your machine | Their servers |
| **Price** | $0 forever | $0 (OSS) | Usage-based |

Freeloader is purpose-built for one thing: **getting your AI bill to $0.** Everything else is a side effect of doing that well.

<br>

## Privacy statement

**Freeloader is local-only software.** It runs entirely on your machine.

- **No telemetry.** We do not collect usage data, analytics, error reports, or crash dumps.
- **No phone home.** The only network request to our infrastructure is an anonymous catalog fetch (a static JSON file of available models). No user data is sent.
- **No account required.** There is no sign-up, no login, no email collection.
- **No data monetization.** We do not sell, share, or analyze your data because we do not have your data.
- **Your API keys** are AES-256-CBC encrypted in a local SQLite database. They authenticate with providers you chose, and nowhere else.
- **Your prompts** pass directly from your app to the AI provider through Freeloader's local proxy. They are never logged, stored, or transmitted to any Freeloader service.
- **Your usage metrics** exist only in `~/.xswarm/freeloader.db` on your machine. Reports are generated locally. Email delivery is opt-in.

Full privacy policy: [freeloader.xswarm.ai/privacy](https://freeloader.xswarm.ai/privacy)

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
