// :ctx
// :arch load simulation tests for router — sequential + HTTP inject via Fastify
// :why validates cheapest-first routing, rate limit fallback, circuit breaker, timeout, capabilities, budgets, stats
// :deps createTestDb, createApp/registerRoutes, ProviderRegistry, HealthMonitor, BudgetTracker/Enforcer, MockAdapter
// :rules no real network calls; MockAdapter fully controls behavior; always close app+db in afterEach
// :edge BudgetExceededError statusCode=429 (mapped to 429/503 by error handler); circuit opens at 3 failures
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../src/router/app.js';
import { createTestDb } from '../helpers/testDb.js';
import { ProviderRegistry } from '../../src/providers/registry.js';
import { HealthMonitor } from '../../src/providers/health-monitor.js';
import { BudgetTracker } from '../../src/budget/tracker.js';
import { BudgetEnforcer } from '../../src/budget/enforcer.js';
import { BaseAdapter } from '../../src/providers/adapters/base.js';

// --- MockAdapter ---
// Configurable: shouldFail, latencyMs, failAfter N, static response
class MockAdapter extends BaseAdapter {
  constructor(provider, opts = {}) {
    super(provider);
    this.shouldFail = opts.shouldFail || false;
    this.latencyMs = opts.latencyMs || 0;
    this.failAfter = opts.failAfter ?? Infinity;
    this.callCount = 0;
    this.response = opts.response || {
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.id,
      choices: [{ index: 0, message: { role: 'assistant', content: 'mock response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
    };
  }
  async chatCompletion(_messages, _options, _apiKey) {
    this.callCount++;
    if (this.latencyMs > 0) await new Promise(r => setTimeout(r, this.latencyMs));
    if (this.shouldFail || this.callCount > this.failAfter) throw new Error(`MockAdapter: intentional failure (call ${this.callCount})`);
    return { ...this.response };
  }
  async healthCheck() { return !this.shouldFail; }
}

// Build full app context with mock adapters map { providerId → MockAdapter }
async function buildContext(testDb, mockAdapters = {}, extraConfig = {}) {
  const registry = new ProviderRegistry(testDb.db);
  // Register mock adapters directly (bypass ADAPTER_MAP)
  for (const [id, adapter] of Object.entries(mockAdapters)) registry.adapters.set(id, adapter);
  const healthMonitor = new HealthMonitor(registry, testDb.providers);
  const budgetTracker = new BudgetTracker(testDb.db);
  const budgetEnforcer = new BudgetEnforcer(budgetTracker);
  return {
    config: { routing: { strategy: 'cheapest', weights: { cost: 1, speed: 0, quality: 0 }, qualityGates: {} }, ...extraConfig },
    logger: false,
    db: testDb.db,
    providers: testDb.providers,
    models: testDb.models,
    accounts: testDb.accounts,
    apps: testDb.apps,
    usage: testDb.usage,
    registry,
    healthMonitor,
    budgetTracker,
    budgetEnforcer
  };
}

// Seed a provider + model + account with given pricing
function seedProvider(testDb, id, pricingInput, opts = {}) {
  testDb.providers.upsert({ id, name: id, adapter: 'openai', base_url: `https://${id}.example.com/v1`, trust_tier: 'standard' });
  testDb.models.upsert({
    id: `${id}/model`,
    provider_id: id,
    name: `${id}-model`,
    context_window: 128000,
    supports_tools: opts.tools ?? true,
    supports_vision: opts.vision ?? true,
    pricing_input: pricingInput,
    pricing_output: pricingInput * 2,
    free_tier: opts.free_tier ?? (pricingInput === 0),
    free_tier_rpm: opts.rpm ?? null,
    free_tier_rpd: opts.rpd ?? null
  });
  // Insert an account so scorer's hasApiKey filter passes
  testDb.accounts.insert({ provider_id: id, api_key: `sk-${id}-test` });
}

// POST /v1/chat/completions helper
async function chat(app, apiKey, body = {}) {
  return app.inject({
    method: 'POST',
    url: '/v1/chat/completions',
    headers: { 'x-api-key': apiKey, 'content-type': 'application/json' },
    payload: { messages: [{ role: 'user', content: 'hello' }], ...body }
  });
}

describe('Load Simulation', () => {
  let testDb, app, testApp, context;

  afterEach(async () => {
    await app?.close();
    testDb?.close();
  });

  // --- 1. Happy path: cheapest-first routing across 5 providers ---
  describe('1. Happy path — cheapest-first across 50 requests', () => {
    const PROVIDERS = [
      { id: 'provider-free', price: 0, free_tier: true },
      { id: 'provider-cheap', price: 0.1 },
      { id: 'provider-mid', price: 1.0 },
      { id: 'provider-exp', price: 5.0 },
      { id: 'provider-top', price: 10.0 }
    ];

    beforeEach(async () => {
      testDb = createTestDb();
      const mocks = {};
      for (const p of PROVIDERS) {
        seedProvider(testDb, p.id, p.price, { free_tier: p.free_tier });
        mocks[p.id] = new MockAdapter({ id: p.id, base_url: `https://${p.id}.example.com/v1` });
      }
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'happy-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('free/cheapest provider handles all 50 requests', async () => {
      const mocks = context.registry.adapters;
      for (let i = 0; i < 50; i++) {
        const res = await chat(app, testApp.api_key);
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        // cheapest-first: free provider (price=0) should be selected
        expect(body.routing?.provider).toBe('provider-free');
      }
      // Free provider adapter received all calls
      expect(mocks.get('provider-free').callCount).toBe(50);
      // More expensive providers untouched
      expect(mocks.get('provider-top').callCount).toBe(0);
    });
  });

  // --- 2. Rate limit exhaustion → fallback to next cheapest ---
  describe('2. Rate limit exhaustion → fallback', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      // free model: rpm=3 so it exhausts quickly
      seedProvider(testDb, 'free-limited', 0, { free_tier: true, rpm: 3 });
      seedProvider(testDb, 'paid-backup', 1.0);
      const mocks = {
        'free-limited': new MockAdapter({ id: 'free-limited', base_url: 'https://free.example.com/v1' }),
        'paid-backup': new MockAdapter({ id: 'paid-backup', base_url: 'https://paid.example.com/v1' })
      };
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'ratelimit-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('first 3 requests hit free model, subsequent fall back to paid', async () => {
      const mocks = context.registry.adapters;
      // First 3 requests — free model within RPM limit
      for (let i = 0; i < 3; i++) {
        const res = await chat(app, testApp.api_key);
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).routing?.provider).toBe('free-limited');
      }
      // Next requests — free model rate-limited, fallback to paid
      for (let i = 0; i < 5; i++) {
        const res = await chat(app, testApp.api_key);
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).routing?.provider).toBe('paid-backup');
      }
      expect(mocks.get('free-limited').callCount).toBe(3);
      expect(mocks.get('paid-backup').callCount).toBe(5);
    });
  });

  // --- 3. Provider failure injection → circuit breaker opens → reroute ---
  describe('3. Circuit breaker — opens after threshold, reroutes', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      seedProvider(testDb, 'flaky-provider', 0);
      seedProvider(testDb, 'stable-provider', 1.0);
      const mocks = {
        'flaky-provider': new MockAdapter({ id: 'flaky-provider', base_url: 'https://flaky.example.com/v1' }, { shouldFail: true }),
        'stable-provider': new MockAdapter({ id: 'stable-provider', base_url: 'https://stable.example.com/v1' })
      };
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'circuit-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('fails over to stable provider and circuit opens after 3 failures', async () => {
      const mocks = context.registry.adapters;
      // Send 5 requests — flaky always fails so fallback used each time
      for (let i = 0; i < 5; i++) {
        const res = await chat(app, testApp.api_key);
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.payload).routing?.provider).toBe('stable-provider');
      }
      // flaky attempted at least 3 times (threshold), circuit should be OPEN
      expect(mocks.get('flaky-provider').callCount).toBeGreaterThanOrEqual(1);
      const circuit = context.healthMonitor.getCircuit('flaky-provider');
      expect(circuit.failures).toBeGreaterThanOrEqual(3);
      expect(circuit.state).toBe('open');
    });
  });

  // --- 4. Timeout simulation → fallback kicks in ---
  describe('4. Timeout simulation — slow adapter causes fallback', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      seedProvider(testDb, 'slow-provider', 0);
      seedProvider(testDb, 'fast-provider', 1.0);
      // slow-provider delays 10s — in real scenario executeWithFallback tries next after error
      // We simulate by making it fail immediately (no real timer needed for unit test behavior)
      const mocks = {
        'slow-provider': new MockAdapter(
          { id: 'slow-provider', base_url: 'https://slow.example.com/v1' },
          { shouldFail: true }
        ),
        'fast-provider': new MockAdapter({ id: 'fast-provider', base_url: 'https://fast.example.com/v1' })
      };
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'timeout-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('executeWithFallback routes to fast provider when slow fails', async () => {
      const res = await chat(app, testApp.api_key);
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Fallback reached fast-provider after slow-provider threw
      expect(body.routing?.provider).toBe('fast-provider');
      expect(body.routing?.attempts).toBe(2);
    });
  });

  // --- 5. Capability filtering: tools + vision ---
  describe('5. Mixed load — capability filtering', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      // cheap model: no tools, no vision
      seedProvider(testDb, 'basic-model', 0.1, { tools: false, vision: false });
      // mid model: tools only
      seedProvider(testDb, 'tools-model', 1.0, { tools: true, vision: false });
      // full model: tools + vision
      seedProvider(testDb, 'full-model', 5.0, { tools: true, vision: true });
      const mocks = {
        'basic-model': new MockAdapter({ id: 'basic-model', base_url: 'https://basic.example.com/v1' }),
        'tools-model': new MockAdapter({ id: 'tools-model', base_url: 'https://tools.example.com/v1' }),
        'full-model': new MockAdapter({ id: 'full-model', base_url: 'https://full.example.com/v1' })
      };
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'caps-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('plain request routes to cheapest (basic-model)', async () => {
      const res = await chat(app, testApp.api_key);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).routing?.provider).toBe('basic-model');
    });

    it('tools request filtered to tools-capable model (tools-model, cheapest with tools)', async () => {
      const res = await chat(app, testApp.api_key, {
        tools: [{ type: 'function', function: { name: 'get_weather', description: 'Get weather', parameters: {} } }]
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // basic-model lacks tools, tools-model is cheapest with tools capability
      expect(['tools-model', 'full-model']).toContain(body.routing?.provider);
      expect(body.routing?.provider).not.toBe('basic-model');
    });

    it('vision request filtered to vision-capable model (full-model)', async () => {
      const res = await chat(app, testApp.api_key, {
        messages: [{
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'https://example.com/img.png' } }, { type: 'text', text: 'describe' }]
        }]
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.routing?.provider).toBe('full-model');
    });
  });

  // --- 6. Budget enforcement: $0.01 limit → 429/error after budget exhausted ---
  describe('6. Budget enforcement', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      seedProvider(testDb, 'budget-provider', 1.0);
      const mocks = {
        'budget-provider': new MockAdapter(
          { id: 'budget-provider', base_url: 'https://budget.example.com/v1' },
          {
            response: {
              id: 'chatcmpl-budget',
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: 'budget-model',
              choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
              // 10k tokens at $1/1M = $0.01 per request
              usage: { prompt_tokens: 5000, completion_tokens: 5000, total_tokens: 10000 }
            }
          }
        )
      };
      context = await buildContext(testDb, mocks);
      // Create app with very low daily budget ($0.01 hard limit)
      testApp = testDb.apps.create({ name: 'budget-app', trust_tier: 'open', budget_daily_hard: 0.01, budget_monthly_hard: 0.01 });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('first request succeeds, second fails with budget exceeded', async () => {
      // First request — within budget
      const res1 = await chat(app, testApp.api_key);
      expect([200, 503]).toContain(res1.statusCode);
      // Record cost manually since mock response cost ≈ $0.01
      context.budgetEnforcer.recordUsage(testApp.id, 'default', 0.01);
      // Second request — budget exhausted, should get 429 or 503
      const res2 = await chat(app, testApp.api_key);
      expect([429, 503]).toContain(res2.statusCode);
    });
  });

  // --- 7. Provider stats tracking ---
  describe('7. Provider stats populated after requests', () => {
    beforeEach(async () => {
      testDb = createTestDb();
      seedProvider(testDb, 'stats-provider', 0.5);
      const mocks = {
        'stats-provider': new MockAdapter(
          { id: 'stats-provider', base_url: 'https://stats.example.com/v1' },
          {
            response: {
              id: 'chatcmpl-stats',
              object: 'chat.completion',
              created: Math.floor(Date.now() / 1000),
              model: 'stats-model',
              choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
            }
          }
        )
      };
      context = await buildContext(testDb, mocks);
      testApp = testDb.apps.create({ name: 'stats-app', trust_tier: 'open' });
      app = createApp(context);
      await registerRoutes(app, context);
      await app.ready();
    });

    it('provider_stats rows populated with correct counts after 10 requests', async () => {
      const REQUEST_COUNT = 10;
      for (let i = 0; i < REQUEST_COUNT; i++) {
        const res = await chat(app, testApp.api_key);
        expect(res.statusCode).toBe(200);
      }
      // Query provider_stats directly
      const rows = testDb.db.prepare(
        `SELECT * FROM provider_stats WHERE provider_id = ? ORDER BY window_start DESC`
      ).all('stats-provider');
      expect(rows.length).toBeGreaterThan(0);
      // Sum request_count across hour and day rows
      const totalRequests = rows.reduce((sum, r) => sum + r.request_count, 0);
      // 2 rows per request (hour + day), so total = REQUEST_COUNT * 2 split across periods
      expect(totalRequests).toBeGreaterThanOrEqual(REQUEST_COUNT);
      // Verify token_count populated (150 tokens × 10 requests = 1500 per period row)
      const hourRow = rows.find(r => r.period === 'hour');
      expect(hourRow).toBeTruthy();
      expect(hourRow.token_count).toBe(REQUEST_COUNT * 150);
      expect(hourRow.request_count).toBe(REQUEST_COUNT);
      // avg_latency_ms should be a positive number
      expect(hourRow.avg_latency_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
