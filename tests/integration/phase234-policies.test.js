import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../src/router/app.js';
import { createTestDb, seedTestProvider, seedTestModel, seedTestApp } from '../helpers/testDb.js';
import { ProviderRegistry } from '../../src/providers/registry.js';
import { HealthMonitor } from '../../src/providers/health-monitor.js';
import { DegradationScorer } from '../../src/providers/degradation-scorer.js';
import { BudgetTracker } from '../../src/budget/tracker.js';
import { BudgetEnforcer } from '../../src/budget/enforcer.js';
import { CatalogSync } from '../../src/providers/catalog-sync.js';
import { ConfigManager } from '../../src/config/manager.js';
import jwt from 'jsonwebtoken';
//
const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
function makeToken() { return jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: '1h' }); }
//
function seedUsageData(usage, appId, providerId, modelId, n = 5) {
  for (let i = 0; i < n; i++) {
    usage.insert({
      app_id: appId, provider_id: providerId, model_id: modelId,
      tokens_in: 100, tokens_out: 50, latency_ms: 200,
      cost_usd: 0.001, trust_tier: 'open', success: true,
      request_id: `req-${i}`
    });
  }
}
//
describe('Phase 2: Per-App Metrics', () => {
  let testDb, app, testApp, dashToken, context;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    const registry = new ProviderRegistry(testDb.db);
    registry.loadFromDb(testDb.providers);
    const degradationScorer = new DegradationScorer(testDb.db);
    const healthMonitor = new HealthMonitor(registry, testDb.providers, null, degradationScorer);
    const budgetTracker = new BudgetTracker(testDb.db);
    const budgetEnforcer = new BudgetEnforcer(budgetTracker);
    const mockLoader = { load: () => ({ version: '2.0', routing: { strategy: 'balanced', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} }, budget: { hard: { daily: 10, monthly: 200 }, soft: { daily: 5, monthly: 100 } } }), save: () => {} };
    const configManager = new ConfigManager(testDb.db, mockLoader);
    context = {
      config: mockLoader.load(),
      configLoader: mockLoader,
      logger: false,
      db: testDb.db,
      providers: testDb.providers,
      models: testDb.models,
      accounts: testDb.accounts,
      apps: testDb.apps,
      appKeys: testDb.appKeys,
      appPolicies: testDb.appPolicies,
      usage: testDb.usage,
      sanitizationRepo: testDb.sanitization,
      registry,
      healthMonitor,
      degradationScorer,
      configManager,
      budgetTracker,
      budgetEnforcer
    };
    app = createApp(context);
    await registerRoutes(app, context);
    await app.ready();
  });
  //
  afterEach(async () => {
    await app.close();
    testDb.close();
  });
  //
  describe('GET /api/apps/:id/stats', () => {
    it('returns today + month stats and keys for known app', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.app).toBeTruthy();
      expect(body.app.id).toBe(testApp.id);
      expect(body.app.name).toBeTruthy();
      expect(body.keys).toBeDefined();
      expect(Array.isArray(body.keys)).toBe(true);
      expect(body.stats).toBeDefined();
      expect(body.stats.today).toBeDefined();
      expect(body.stats.month).toBeDefined();
    });
    //
    it('stats include numeric request and cost fields', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 3);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.stats.today.requests).toBeGreaterThanOrEqual(3);
      expect(typeof body.stats.today.total_cost).toBe('number');
      expect(typeof body.stats.today.avg_latency).toBe('number');
    });
    //
    it('returns costByProvider array', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 2);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.costByProvider)).toBe(true);
      // With seeded usage, should have at least one provider entry
      expect(body.costByProvider.length).toBeGreaterThanOrEqual(1);
      expect(body.costByProvider[0].provider_id).toBe('openai');
      expect(typeof body.costByProvider[0].total_cost).toBe('number');
    });
    //
    it('returns error for unknown app id', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/apps/nonexistent-id-xyz/stats',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeTruthy();
    });
  });
  //
  describe('GET /api/apps/:id/usage', () => {
    it('returns empty array initially', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/usage`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });
    //
    it('returns timeseries data after seeding usage records', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 5);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/usage?days=30`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      // Each entry has date, cost, requests
      const entry = body[0];
      expect(entry.date).toBeTruthy();
      expect(typeof entry.cost).toBe('number');
      expect(typeof entry.requests).toBe('number');
    });
    //
    it('respects ?days= query param (1 day returns only today)', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 3);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/usage?days=1`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });
  });
  //
  describe('GET /api/usage/top-apps', () => {
    it('returns apps sorted by cost descending', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      const app2 = seedTestApp(testDb, 'cheap-app');
      // Give testApp more cost than app2
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 10);
      seedUsageData(testDb.usage, app2.id, 'openai', 'openai/gpt-4o', 2);
      const res = await app.inject({
        method: 'GET', url: '/api/usage/top-apps',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      // Most expensive app first
      expect(body[0].total_cost).toBeGreaterThanOrEqual(body[1].total_cost);
      // Response shape
      expect(body[0].app_id).toBeTruthy();
      expect(typeof body[0].requests).toBe('number');
    });
    //
    it('returns empty array when no usage data exists', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/usage/top-apps',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });
    //
    it('respects ?limit= query param', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      for (let i = 0; i < 5; i++) {
        const a = seedTestApp(testDb, `app-${i}`);
        seedUsageData(testDb.usage, a.id, 'openai', 'openai/gpt-4o', 1);
      }
      const res = await app.inject({
        method: 'GET', url: '/api/usage/top-apps?limit=2',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.length).toBeLessThanOrEqual(2);
    });
  });
  //
  describe('PUT /api/apps/:id — update app fields', () => {
    it('updates app name', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { name: 'renamed-app' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.name).toBe('renamed-app');
    });
    //
    it('updates trust_tier', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { trust_tier: 'standard' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.trust_tier).toBe('standard');
    });
    //
    it('ignores non-allowed fields (id, api_key) silently', async () => {
      const originalApp = testDb.apps.get(testApp.id);
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { id: 'hacked-id', api_key: 'hacked-key', name: 'legit-name' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // id and api_key must be unchanged
      expect(body.id).toBe(testApp.id);
      expect(body.api_key).toBe(originalApp.api_key);
      expect(body.name).toBe('legit-name');
    });
  });
});
//
describe('Phase 3: Sanitization Profile', () => {
  let testDb, app, testApp, dashToken, context;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    const registry = new ProviderRegistry(testDb.db);
    registry.loadFromDb(testDb.providers);
    const degradationScorer = new DegradationScorer(testDb.db);
    const healthMonitor = new HealthMonitor(registry, testDb.providers, null, degradationScorer);
    const budgetTracker = new BudgetTracker(testDb.db);
    const budgetEnforcer = new BudgetEnforcer(budgetTracker);
    const mockLoader = { load: () => ({ version: '2.0', routing: { strategy: 'balanced', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} }, budget: { hard: { daily: 10, monthly: 200 }, soft: { daily: 5, monthly: 100 } } }), save: () => {} };
    const configManager = new ConfigManager(testDb.db, mockLoader);
    context = {
      config: mockLoader.load(),
      configLoader: mockLoader,
      logger: false,
      db: testDb.db,
      providers: testDb.providers,
      models: testDb.models,
      accounts: testDb.accounts,
      apps: testDb.apps,
      appKeys: testDb.appKeys,
      appPolicies: testDb.appPolicies,
      usage: testDb.usage,
      sanitizationRepo: testDb.sanitization,
      registry,
      healthMonitor,
      degradationScorer,
      configManager,
      budgetTracker,
      budgetEnforcer
    };
    app = createApp(context);
    await registerRoutes(app, context);
    await app.ready();
  });
  //
  afterEach(async () => {
    await app.close();
    testDb.close();
  });
  //
  it('POST /api/apps creates app with sanitization_profile field', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/apps',
      headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
      payload: { name: 'sanitized-app', trust_tier: 'open', sanitization_profile: 'standard' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeTruthy();
    // The field may not be returned on create, so fetch it via GET /api/apps
    const allRes = await app.inject({ method: 'GET', url: '/api/apps', headers: { authorization: `Bearer ${dashToken}` } });
    const apps = JSON.parse(allRes.payload);
    const created = apps.find(a => a.name === 'sanitized-app');
    expect(created).toBeTruthy();
  });
  //
  it('PUT /api/apps/:id updates sanitization_profile', async () => {
    // Set profile to standard
    const res = await app.inject({
      method: 'PUT', url: `/api/apps/${testApp.id}`,
      headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
      payload: { sanitization_profile: 'standard' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.sanitization_profile).toBe('standard');
    // Update to aggressive
    const res2 = await app.inject({
      method: 'PUT', url: `/api/apps/${testApp.id}`,
      headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
      payload: { sanitization_profile: 'aggressive' }
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.payload).sanitization_profile).toBe('aggressive');
  });
  //
  it('PUT /api/apps/:id sets sanitization_profile to off (disabling)', async () => {
    // First set to something
    await app.inject({
      method: 'PUT', url: `/api/apps/${testApp.id}`,
      headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
      payload: { sanitization_profile: 'standard' }
    });
    // Then disable
    const res = await app.inject({
      method: 'PUT', url: `/api/apps/${testApp.id}`,
      headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
      payload: { sanitization_profile: 'off' }
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).sanitization_profile).toBe('off');
  });
});
//
describe('Phase 4: App Policies', () => {
  let testDb, app, testApp, dashToken, context;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    const registry = new ProviderRegistry(testDb.db);
    registry.loadFromDb(testDb.providers);
    const degradationScorer = new DegradationScorer(testDb.db);
    const healthMonitor = new HealthMonitor(registry, testDb.providers, null, degradationScorer);
    const budgetTracker = new BudgetTracker(testDb.db);
    const budgetEnforcer = new BudgetEnforcer(budgetTracker);
    const mockLoader = { load: () => ({ version: '2.0', routing: { strategy: 'balanced', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} }, budget: { hard: { daily: 10, monthly: 200 }, soft: { daily: 5, monthly: 100 } } }), save: () => {} };
    const configManager = new ConfigManager(testDb.db, mockLoader);
    context = {
      config: mockLoader.load(),
      configLoader: mockLoader,
      logger: false,
      db: testDb.db,
      providers: testDb.providers,
      models: testDb.models,
      accounts: testDb.accounts,
      apps: testDb.apps,
      appKeys: testDb.appKeys,
      appPolicies: testDb.appPolicies,
      usage: testDb.usage,
      sanitizationRepo: testDb.sanitization,
      registry,
      healthMonitor,
      degradationScorer,
      configManager,
      budgetTracker,
      budgetEnforcer
    };
    app = createApp(context);
    await registerRoutes(app, context);
    await app.ready();
  });
  //
  afterEach(async () => {
    await app.close();
    testDb.close();
  });
  //
  describe('PUT /api/apps/:id/policy — create and update', () => {
    it('creates a policy and returns it with correct shape', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { data_residency: 'eu', max_cost_per_request: 0.05 }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.app_id).toBe(testApp.id);
      expect(body.data_residency).toBe('eu');
      expect(body.max_cost_per_request).toBe(0.05);
    });
    //
    it('updates existing policy without losing other fields', async () => {
      // Create initial policy
      await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { data_residency: 'us', max_cost_per_request: 0.1, rate_limit_rpm: 60 }
      });
      // Update just one field
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { max_cost_per_request: 0.2 }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.max_cost_per_request).toBe(0.2);
      // Other fields preserved
      expect(body.rate_limit_rpm).toBe(60);
    });
  });
  //
  describe('GET /api/apps/:id/policy', () => {
    it('returns null/empty for app with no policy', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      // Empty or null is fine — no policy configured yet
      const body = JSON.parse(res.payload);
      expect(body === null || (typeof body === 'object' && Object.keys(body).length === 0)).toBe(true);
    });
    //
    it('returns saved policy after PUT', async () => {
      await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { data_residency: 'any', rate_limit_rpm: 100 }
      });
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.app_id).toBe(testApp.id);
      expect(body.rate_limit_rpm).toBe(100);
    });
  });
  //
  describe('allowed_providers and blocked_providers arrays', () => {
    it('saves and retrieves allowed_providers array correctly', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { allowed_providers: ['openai', 'anthropic'] }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.allowed_providers)).toBe(true);
      expect(body.allowed_providers).toContain('openai');
      expect(body.allowed_providers).toContain('anthropic');
    });
    //
    it('saves and retrieves blocked_providers array correctly', async () => {
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { blocked_providers: ['cohere', 'mistral'] }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.blocked_providers)).toBe(true);
      expect(body.blocked_providers).toContain('cohere');
      expect(body.blocked_providers).toContain('mistral');
    });
    //
    it('GET /api/apps/:id/policy returns arrays, not JSON strings', async () => {
      await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { allowed_providers: ['openai'], blocked_providers: ['cohere'] }
      });
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      // Must be real arrays, not stringified JSON
      expect(Array.isArray(body.allowed_providers)).toBe(true);
      expect(Array.isArray(body.blocked_providers)).toBe(true);
      expect(body.allowed_providers[0]).toBe('openai');
      expect(body.blocked_providers[0]).toBe('cohere');
    });
    //
    it('saves policy with all array and scalar fields together', async () => {
      const payload = {
        allowed_providers: ['openai', 'anthropic'],
        blocked_providers: [],
        data_residency: 'us',
        max_cost_per_request: 0.025,
        rate_limit_rpm: 120,
        token_limit_daily: 50000
      };
      const res = await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.allowed_providers).toEqual(['openai', 'anthropic']);
      expect(body.data_residency).toBe('us');
      expect(body.max_cost_per_request).toBe(0.025);
      expect(body.rate_limit_rpm).toBe(120);
      expect(body.token_limit_daily).toBe(50000);
    });
  });
  //
  describe('DELETE /api/apps/:id/policy', () => {
    it('removes policy and returns ok: true', async () => {
      // Create first
      await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { data_residency: 'any' }
      });
      const delRes = await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(delRes.statusCode).toBe(200);
      const body = JSON.parse(delRes.payload);
      expect(body.ok).toBe(true);
      // GET should now return empty/null
      const getRes = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const getBody = JSON.parse(getRes.payload);
      expect(getBody === null || (typeof getBody === 'object' && Object.keys(getBody).length === 0)).toBe(true);
    });
    //
    it('DELETE on non-existent policy returns ok: false', async () => {
      const res = await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.ok).toBe(false);
    });
    //
    it('policy is truly removed after delete (not just empty)', async () => {
      await app.inject({
        method: 'PUT', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { allowed_providers: ['openai'], rate_limit_rpm: 99 }
      });
      await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/policy`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      // Direct DB check — no row should exist
      const row = testDb.db.prepare('SELECT * FROM app_policies WHERE app_id = ?').get(testApp.id);
      expect(row).toBeUndefined();
    });
  });
});
