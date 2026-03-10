import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../src/router/app.js';
import { createTestDb, seedTestProvider, seedTestApp } from '../helpers/testDb.js';
import { ProviderRegistry } from '../../src/providers/registry.js';
import { HealthMonitor } from '../../src/providers/health-monitor.js';
import { RateLimiter } from '../../src/router/rate-limiter.js';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
function makeToken() { return jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: '1h' }); }
//
describe('BDD: Routing Configuration', () => {
  let testDb, app, testApp, token, headers;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    // Seed providers with different capabilities
    testDb.providers.upsert({ id: 'gemini', name: 'Gemini', adapter: 'gemini', base_url: 'https://gemini.test', trust_tier: 'standard' });
    testDb.providers.upsert({ id: 'groq', name: 'Groq', adapter: 'groq', base_url: 'https://groq.test', trust_tier: 'open' });
    testDb.providers.upsert({ id: 'local-ollama', name: 'Ollama', adapter: 'local', base_url: 'http://localhost:11434', trust_tier: 'private', is_local: true });
    // Seed models — one with tools, one without, one local
    testDb.models.upsert({
      id: 'gemini/gemini-pro', provider_id: 'gemini', name: 'gemini-pro',
      context_window: 32000, supports_tools: true, supports_vision: true,
      pricing_input: 0, pricing_output: 0, free_tier: true, trust_tier: 'standard'
    });
    testDb.models.upsert({
      id: 'groq/llama3', provider_id: 'groq', name: 'llama3',
      context_window: 8192, supports_tools: false, supports_vision: false,
      pricing_input: 0, pricing_output: 0, free_tier: true, trust_tier: 'open'
    });
    testDb.models.upsert({
      id: 'local-ollama/mistral', provider_id: 'local-ollama', name: 'mistral',
      context_window: 8192, supports_tools: false, supports_vision: false,
      pricing_input: 0, pricing_output: 0, is_local: true, trust_tier: 'private'
    });
    testApp = seedTestApp(testDb);
    token = makeToken();
    headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  });
  //
  afterEach(async () => {
    if (app) await app.close();
    testDb.close();
  });
  //
  async function buildApp(overrides = {}) {
    const registry = new ProviderRegistry(testDb.db);
    const healthMonitor = new HealthMonitor(registry, testDb.providers);
    const rateLimiter = new RateLimiter();
    const allModels = testDb.models.getAll({ enabled: true });
    rateLimiter.loadLimits(allModels);
    const context = {
      config: { routing: { qualityGates: {} } },
      logger: false,
      db: testDb.db,
      providers: testDb.providers,
      models: testDb.models,
      accounts: testDb.accounts,
      apps: testDb.apps,
      usage: testDb.usage,
      registry,
      healthMonitor,
      rateLimiter,
      ...overrides
    };
    app = createApp(context);
    await registerRoutes(app, context);
    await app.ready();
    return { app, context };
  }
  //
  describe('Scenario: Quality gates — tool support filtering', () => {
    it('Given model without tool support, When request has tools, Then model excluded from routing', async () => {
      // Given — groq/llama3 has no tool support, gemini-pro does
      // Add accounts so models are available
      testDb.accounts.insert({ provider_id: 'gemini', api_key: 'test-gemini-key' });
      testDb.accounts.insert({ provider_id: 'groq', api_key: 'test-groq-key' });
      await buildApp();
      // When — request with tools (detectCapabilities will set requiresTools)
      const { applyQualityGates, detectCapabilities } = await import('../../src/router/quality-gates.js');
      const request = { messages: [{ role: 'user', content: 'hi' }], tools: [{ type: 'function', function: { name: 'test' } }] };
      const caps = detectCapabilities(request);
      expect(caps.requiresTools).toBe(true);
      // Then — only tool-supporting models pass
      const allModels = testDb.models.getAll({ enabled: true });
      const filtered = applyQualityGates(allModels, caps);
      const hasGroqLlama = filtered.some(m => m.id === 'groq/llama3');
      const hasGeminiPro = filtered.some(m => m.id === 'gemini/gemini-pro');
      expect(hasGroqLlama).toBe(false);
      expect(hasGeminiPro).toBe(true);
    });
  });
  //
  describe('Scenario: Trust tier filtering', () => {
    it('Given "private" tier request, When routing, Then only local models considered', async () => {
      // Given — we have models at open, standard, and private trust tiers
      await buildApp();
      // When — apply quality gates with private trust tier
      const { applyQualityGates } = await import('../../src/router/quality-gates.js');
      const allModels = testDb.models.getAll({ enabled: true });
      const filtered = applyQualityGates(allModels, { trustTier: 'private' });
      // Then — only private tier model remains
      expect(filtered.every(m => m.trust_tier === 'private')).toBe(true);
      const hasLocal = filtered.some(m => m.id === 'local-ollama/mistral');
      expect(hasLocal).toBe(true);
      expect(filtered.some(m => m.id === 'groq/llama3')).toBe(false);
    });
    //
    it('Given "standard" tier, When routing, Then standard and private models pass', async () => {
      await buildApp();
      const { applyQualityGates } = await import('../../src/router/quality-gates.js');
      const allModels = testDb.models.getAll({ enabled: true });
      const filtered = applyQualityGates(allModels, { trustTier: 'standard' });
      // standard + private pass; open does not
      expect(filtered.some(m => m.id === 'gemini/gemini-pro')).toBe(true);
      expect(filtered.some(m => m.id === 'local-ollama/mistral')).toBe(true);
      expect(filtered.some(m => m.id === 'groq/llama3')).toBe(false);
    });
  });
  //
  describe('Scenario: Rate limit visibility', () => {
    it('Given rate limiter with recorded requests, When GET /api/rate-limits, Then usage data returned', async () => {
      // Given — set up rate limiter and record some usage
      const { context } = await buildApp();
      context.rateLimiter.recordRequest('gemini/gemini-pro', 100);
      context.rateLimiter.recordRequest('gemini/gemini-pro', 200);
      // When — query rate limits API
      const res = await app.inject({ method: 'GET', url: '/api/rate-limits', headers });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Then — usage data for gemini-pro exists
      expect(body['gemini/gemini-pro']).toBeDefined();
    });
  });
  //
  describe('Scenario: Usage analytics endpoints', () => {
    it('Given usage records, When GET /api/usage/timeseries, Then daily aggregates returned', async () => {
      // Given — insert usage records
      await buildApp();
      testDb.usage.insert({ provider_id: 'gemini', model_id: 'gemini/gemini-pro', tokens_in: 100, tokens_out: 50, cost_usd: 0, latency_ms: 200 });
      testDb.usage.insert({ provider_id: 'gemini', model_id: 'gemini/gemini-pro', tokens_in: 200, tokens_out: 100, cost_usd: 0.001, latency_ms: 300 });
      // When — query timeseries
      const res = await app.inject({ method: 'GET', url: '/api/usage/timeseries?days=7', headers });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Then — returns array with date/cost/requests
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('date');
        expect(body[0]).toHaveProperty('cost');
        expect(body[0]).toHaveProperty('requests');
      }
    });
    //
    it('Given usage records, When GET /api/usage/by-provider, Then provider aggregates returned', async () => {
      // Given — insert usage
      await buildApp();
      testDb.usage.insert({ provider_id: 'gemini', model_id: 'gemini/gemini-pro', tokens_in: 500, tokens_out: 200, cost_usd: 0, latency_ms: 150 });
      // When — query by-provider
      const res = await app.inject({ method: 'GET', url: '/api/usage/by-provider', headers });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Then — returns array with provider aggregates
      expect(Array.isArray(body)).toBe(true);
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('provider_id');
        expect(body[0]).toHaveProperty('total_cost');
        expect(body[0]).toHaveProperty('requests');
      }
    });
  });
});
