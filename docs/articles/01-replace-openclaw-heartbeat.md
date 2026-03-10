# Article Outline: Replace OpenClaw Heartbeat with Freeloader

**Target audience:** Developers currently using OpenClaw who rely on its heartbeat/health monitoring feature and want to migrate to a zero-cost alternative.

**Estimated length:** 1,800–2,200 words

**SEO keywords:** OpenClaw heartbeat alternative, replace OpenClaw health monitor, OpenClaw migration, LLM proxy health checks, circuit breaker LLM, Freeloader proxy migration

---

## H2: What OpenClaw Heartbeat Does

- Polls provider endpoints on a schedule to detect outages
- Emits status events when a provider goes down or recovers
- Blocks requests to unhealthy providers during outage windows
- Surfaces provider status in a dashboard or log stream
- Common configuration: interval, timeout, retry count, alert webhook

**Code example to include:**
```yaml
# openclaw heartbeat config (before)
heartbeat:
  interval: 30s
  timeout: 5s
  retries: 3
  providers:
    - openai
    - anthropic
```

---

## H2: How Freeloader Replaces It — Health Monitor + Circuit Breaker

- `healthMonitor.isAvailable(providerId)` — boolean check before every request (`src/router/app.js:91`)
- `healthMonitor.recordSuccess(providerId)` — updates state after each successful call
- Circuit breaker pattern: after N consecutive failures, provider is marked unavailable
- Exponential backoff before re-attempting a tripped circuit breaker
- No polling needed — health state is derived from live request outcomes
- Dashboard view: "provider health" screen at `http://localhost:4010`

**Code example to include:**
```js
// Freeloader checks health inline — no separate heartbeat process
if (!context.healthMonitor.isAvailable(candidate.provider_id)) {
  throw new Error(`Circuit breaker open for ${candidate.provider_id}`);
}
```

**Why this is better than a heartbeat:**
- Zero additional network calls — health signals come from real traffic
- No false positives from synthetic pings timing out
- Fallback happens in milliseconds via `executeWithFallback`

---

## H2: Step-by-Step Migration Guide

1. **Stop OpenClaw heartbeat service** — identify and disable the heartbeat daemon/cron
2. **Install Freeloader** — `npx xswarm-freeloader`
3. **Add API keys** — dashboard at `http://localhost:4010`, add same providers OpenClaw was monitoring
4. **Update `OPENAI_BASE_URL`** — point existing app to `http://localhost:4011`
5. **Remove heartbeat config** — delete or comment out OpenClaw heartbeat YAML/JSON
6. **Verify provider health** — dashboard > Provider Health tab shows live circuit breaker states
7. **Test fallback** — temporarily remove one provider's API key, confirm requests route elsewhere

**Code example to include:**
```bash
# Before (OpenClaw)
OPENCLAW_ENDPOINT=http://localhost:8080
OPENCLAW_HEARTBEAT_INTERVAL=30

# After (Freeloader)
OPENAI_BASE_URL=http://localhost:4011
OPENAI_API_KEY=free   # any string
```

---

## H2: Config Comparison Table

| Feature | OpenClaw Heartbeat | Freeloader |
|---|---|---|
| Health detection method | Polling (synthetic pings) | Live request outcomes |
| Circuit breaker | Optional plugin | Built-in |
| Fallback on failure | Manual config | Automatic via `executeWithFallback` |
| Dashboard | Separate service | Bundled at :4010 |
| Free tier rotation | No | Yes (Gemini, Groq, Cerebras, etc.) |
| Setup | Heartbeat daemon + config | `npx xswarm-freeloader` |
| Cost | License fee | $0, MIT |

---

## H2: Edge Cases and Gotchas

- If OpenClaw was routing to providers Freeloader doesn't support, add them via custom adapter
- Streaming requests: Freeloader's fallback cannot retry mid-stream — ensure circuit breaker fires before stream begins
- If your app depends on OpenClaw's webhook alerts on provider failure, replicate with a custom health-check script polling Freeloader's `/v1/health` endpoint

---

## Notes for Writer

- Tone: practical, migration-focused, no fluff
- Avoid disparaging OpenClaw — just show the feature parity
- Include a "before/after" code block for the most critical config change
- Link to Freeloader GitHub for circuit breaker implementation reference
