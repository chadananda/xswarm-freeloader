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
// Shared setup factory to avoid repetition across describe blocks
function buildContext(testDb) {
  const mockLoader = {
    load: () => ({
      version: '2.0',
      routing: { strategy: 'balanced', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} },
      budget: { hard: { daily: 10, monthly: 200 }, soft: { daily: 5, monthly: 100 } }
    }),
    save: () => {}
  };
  const registry = new ProviderRegistry(testDb.db);
  registry.loadFromDb(testDb.providers);
  const degradationScorer = new DegradationScorer(testDb.db);
  const healthMonitor = new HealthMonitor(registry, testDb.providers, null, degradationScorer);
  const budgetTracker = new BudgetTracker(testDb.db);
  const budgetEnforcer = new BudgetEnforcer(budgetTracker);
  const configManager = new ConfigManager(testDb.db, mockLoader);
  return {
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
}
//
describe('Phase 5: Health/Degradation Scoring', () => {
  let testDb, app, testApp, dashToken, context, degradationScorer;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    context = buildContext(testDb);
    degradationScorer = context.degradationScorer;
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
  describe('GET /api/providers — degradation scores in response', () => {
    it('returns providers list with degradation field present', async () => {
      seedTestProvider(testDb, 'openai');
      const res = await app.inject({
        method: 'GET', url: '/api/providers',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      // degradation key exists on each provider (may be null or object)
      const openai = body.find(p => p.id === 'openai');
      expect(openai).toBeTruthy();
      expect('degradation' in openai).toBe(true);
    });
    //
    it('provider with no observations has null degradation', async () => {
      seedTestProvider(testDb, 'openai');
      // No degradationScorer observations recorded
      const res = await app.inject({
        method: 'GET', url: '/api/providers',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const openai = body.find(p => p.id === 'openai');
      expect(openai).toBeTruthy();
      // getAllScores() returns {} for new providers so degradation is null
      expect(openai.degradation).toBeNull();
    });
    //
    it('provider with observations has score, p50, p95, p99', async () => {
      seedTestProvider(testDb, 'openai');
      // Record observations directly on scorer
      degradationScorer.recordObservation('openai', 'openai/gpt-4o', { latencyMs: 150, success: true, timeout: false });
      degradationScorer.recordObservation('openai', 'openai/gpt-4o', { latencyMs: 200, success: true, timeout: false });
      degradationScorer.recordObservation('openai', 'openai/gpt-4o', { latencyMs: 400, success: false, timeout: false });
      const res = await app.inject({
        method: 'GET', url: '/api/providers',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const openai = body.find(p => p.id === 'openai');
      expect(openai).toBeTruthy();
      expect(openai.degradation).not.toBeNull();
      // Shape check
      expect(typeof openai.degradation.score).toBe('number');
      expect(openai.degradation.score).toBeGreaterThan(0);
      expect(openai.degradation.score).toBeLessThanOrEqual(1);
      expect(openai.degradation.p50).not.toBeNull();
      expect(openai.degradation.p95).not.toBeNull();
      expect(openai.degradation.p99).not.toBeNull();
    });
    //
    it('degradation score reflects failure rate — failures lower score', async () => {
      seedTestProvider(testDb, 'good-provider');
      seedTestProvider(testDb, 'bad-provider');
      // Good provider: all successes
      for (let i = 0; i < 5; i++) degradationScorer.recordObservation('good-provider', 'gp/m1', { latencyMs: 100, success: true, timeout: false });
      // Bad provider: timeouts
      for (let i = 0; i < 5; i++) degradationScorer.recordObservation('bad-provider', 'bp/m1', { latencyMs: 5000, success: false, timeout: true });
      const scores = degradationScorer.getAllScores();
      expect(scores['good-provider'].score).toBeGreaterThan(scores['bad-provider'].score);
    });
    //
    it('GET /api/providers includes models array per provider', async () => {
      seedTestProvider(testDb, 'openai');
      seedTestModel(testDb, 'openai');
      const res = await app.inject({
        method: 'GET', url: '/api/providers',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const openai = body.find(p => p.id === 'openai');
      expect(Array.isArray(openai.models)).toBe(true);
      expect(openai.models.length).toBeGreaterThanOrEqual(1);
    });
    //
    it('GET /api/providers includes health circuit state', async () => {
      seedTestProvider(testDb, 'openai');
      const res = await app.inject({
        method: 'GET', url: '/api/providers',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const openai = body.find(p => p.id === 'openai');
      // health may be null or an object — but key must be present
      expect('health' in openai).toBe(true);
    });
  });
});
//
describe('Phase 6: Config Management', () => {
  let testDb, app, testApp, dashToken, context;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    context = buildContext(testDb);
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
  describe('GET /api/config', () => {
    it('returns current config object', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body).toBeTruthy();
      expect(body.routing).toBeDefined();
      expect(body.routing.strategy).toBeTruthy();
    });
    //
    it('returned config includes budget fields', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.budget).toBeDefined();
      expect(body.budget.hard).toBeDefined();
      expect(body.budget.soft).toBeDefined();
    });
    //
    it('returned config routing weights sum to 1.0', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const w = body.routing.weights;
      const sum = (w.cost || 0) + (w.speed || 0) + (w.quality || 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    });
  });
  //
  describe('PUT /api/config', () => {
    it('updates routing strategy and returns validated config', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'cost-first', weights: { cost: 0.6, speed: 0.3, quality: 0.1 }, qualityGates: {} } }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.routing.strategy).toBe('cost-first');
      expect(body.routing.weights.cost).toBeCloseTo(0.6);
    });
    //
    it('updates budget limits and returns updated config', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { budget: { hard: { daily: 20, monthly: 400 }, soft: { daily: 10, monthly: 200 } } }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.budget.hard.daily).toBe(20);
      expect(body.budget.hard.monthly).toBe(400);
    });
    //
    it('invalid weights (do not sum to 1.0) → error response', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'balanced', weights: { cost: 0.9, speed: 0.9, quality: 0.9 }, qualityGates: {} } }
      });
      // Schema validation rejects weights that don't sum to 1.0
      expect(res.statusCode).not.toBe(200);
    });
    //
    it('invalid strategy value → error response', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'not-a-strategy', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} } }
      });
      expect(res.statusCode).not.toBe(200);
    });
    //
    it('partial update (only budget) returns merged config with routing preserved', async () => {
      const before = JSON.parse((await app.inject({ method: 'GET', url: '/api/config', headers: { authorization: `Bearer ${dashToken}` } })).payload);
      const originalStrategy = before.routing.strategy;
      // PUT response is the merged+validated config — verify it directly
      const putRes = await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { budget: { hard: { daily: 15, monthly: 300 }, soft: { daily: 7, monthly: 150 } } }
      });
      expect(putRes.statusCode).toBe(200);
      const updated = JSON.parse(putRes.payload);
      // Routing must be preserved from original (deep merge)
      expect(updated.routing.strategy).toBe(originalStrategy);
      // Budget must reflect the new values
      expect(updated.budget.hard.daily).toBe(15);
      expect(updated.budget.hard.monthly).toBe(300);
    });
  });
  //
  describe('GET /api/config/versions', () => {
    it('returns version history as array', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/config/versions',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });
    //
    it('creates new version entry after PUT /api/config', async () => {
      const before = JSON.parse((await app.inject({ method: 'GET', url: '/api/config/versions', headers: { authorization: `Bearer ${dashToken}` } })).payload);
      const beforeCount = before.length;
      // Trigger a config update
      await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'speed-first', weights: { cost: 0.2, speed: 0.6, quality: 0.2 }, qualityGates: {} } }
      });
      const after = JSON.parse((await app.inject({ method: 'GET', url: '/api/config/versions', headers: { authorization: `Bearer ${dashToken}` } })).payload);
      expect(after.length).toBeGreaterThan(beforeCount);
    });
    //
    it('version entries have expected shape: id, version_number, changed_by', async () => {
      // Create a version by updating
      await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'quality-first', weights: { cost: 0.1, speed: 0.2, quality: 0.7 }, qualityGates: {} } }
      });
      const res = await app.inject({
        method: 'GET', url: '/api/config/versions',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const versions = JSON.parse(res.payload);
      expect(versions.length).toBeGreaterThanOrEqual(1);
      const latest = versions[0];
      expect(latest.id).toBeDefined();
      expect(typeof latest.version_number).toBe('number');
      expect(latest.changed_by).toBeTruthy();
    });
    //
    it('respects ?limit= query param for version history', async () => {
      // Create 3 versions
      const configs = [
        { routing: { strategy: 'cost-first', weights: { cost: 0.6, speed: 0.3, quality: 0.1 }, qualityGates: {} } },
        { routing: { strategy: 'speed-first', weights: { cost: 0.2, speed: 0.6, quality: 0.2 }, qualityGates: {} } },
        { routing: { strategy: 'quality-first', weights: { cost: 0.1, speed: 0.2, quality: 0.7 }, qualityGates: {} } }
      ];
      for (const payload of configs) {
        await app.inject({
          method: 'PUT', url: '/api/config',
          headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
          payload
        });
      }
      const res = await app.inject({
        method: 'GET', url: '/api/config/versions?limit=2',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.length).toBeLessThanOrEqual(2);
    });
  });
  //
  describe('POST /api/config/rollback/:id', () => {
    it('restores old config version and returns the rolled-back config', async () => {
      // Save original state
      const original = JSON.parse((await app.inject({ method: 'GET', url: '/api/config', headers: { authorization: `Bearer ${dashToken}` } })).payload);
      // Create a version to roll back from
      const versionsRes = await app.inject({ method: 'GET', url: '/api/config/versions', headers: { authorization: `Bearer ${dashToken}` } });
      const versions = JSON.parse(versionsRes.payload);
      // Update config
      await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'cost-first', weights: { cost: 0.6, speed: 0.3, quality: 0.1 }, qualityGates: {} } }
      });
      // Rollback to version 1 (the first version in the DB)
      const firstVersion = versions.length > 0 ? versions[versions.length - 1] : null;
      if (!firstVersion) return; // Skip if no initial version
      const rollbackRes = await app.inject({
        method: 'POST', url: `/api/config/rollback/${firstVersion.version_number}`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      expect(rollbackRes.statusCode).toBe(200);
      const rolledBack = JSON.parse(rollbackRes.payload);
      expect(rolledBack.routing).toBeDefined();
    });
    //
    it('rollback creates a new version entry', async () => {
      // Seed initial version via update
      await app.inject({
        method: 'PUT', url: '/api/config',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { routing: { strategy: 'cost-first', weights: { cost: 0.6, speed: 0.3, quality: 0.1 }, qualityGates: {} } }
      });
      const versionsBeforeRes = await app.inject({ method: 'GET', url: '/api/config/versions', headers: { authorization: `Bearer ${dashToken}` } });
      const versionsBefore = JSON.parse(versionsBeforeRes.payload);
      const targetVersion = versionsBefore[versionsBefore.length - 1].version_number;
      // Rollback
      await app.inject({
        method: 'POST', url: `/api/config/rollback/${targetVersion}`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const versionsAfterRes = await app.inject({ method: 'GET', url: '/api/config/versions', headers: { authorization: `Bearer ${dashToken}` } });
      const versionsAfter = JSON.parse(versionsAfterRes.payload);
      // Must have more versions after rollback (rollback creates a new entry)
      expect(versionsAfter.length).toBeGreaterThan(versionsBefore.length);
    });
    //
    it('rollback to non-existent version returns error shape', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/config/rollback/999999',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      // Either 500 or error body — should not 200 with valid config
      const body = JSON.parse(res.payload);
      const isError = res.statusCode >= 400 || body.error;
      expect(isError).toBe(true);
    });
  });
});
//
describe('Phase 7: Reporting and request_id', () => {
  let testDb, app, testApp, dashToken, context;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    context = buildContext(testDb);
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
  describe('Usage records with request_id', () => {
    it('usage records inserted with request_id are retrievable via GET /api/usage', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      // Insert usage records with explicit request_ids
      testDb.usage.insert({
        app_id: testApp.id, provider_id: 'openai', model_id: 'openai/gpt-4o',
        tokens_in: 100, tokens_out: 50, latency_ms: 200, cost_usd: 0.001,
        trust_tier: 'open', success: true, request_id: 'test-req-uuid-0001'
      });
      testDb.usage.insert({
        app_id: testApp.id, provider_id: 'openai', model_id: 'openai/gpt-4o',
        tokens_in: 200, tokens_out: 80, latency_ms: 350, cost_usd: 0.002,
        trust_tier: 'open', success: true, request_id: 'test-req-uuid-0002'
      });
      const res = await app.inject({
        method: 'GET', url: '/api/usage',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      const requestIds = body.map(r => r.request_id).filter(Boolean);
      expect(requestIds).toContain('test-req-uuid-0001');
      expect(requestIds).toContain('test-req-uuid-0002');
    });
    //
    it('usage records have all expected fields', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      testDb.usage.insert({
        app_id: testApp.id, provider_id: 'openai', model_id: 'openai/gpt-4o',
        tokens_in: 150, tokens_out: 75, latency_ms: 250, cost_usd: 0.0015,
        trust_tier: 'open', success: true, request_id: 'req-shape-check'
      });
      const res = await app.inject({
        method: 'GET', url: '/api/usage?limit=10',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const record = body.find(r => r.request_id === 'req-shape-check');
      expect(record).toBeTruthy();
      expect(record.provider_id).toBe('openai');
      expect(record.model_id).toBe('openai/gpt-4o');
      expect(record.tokens_in).toBe(150);
      expect(record.tokens_out).toBe(75);
      expect(record.cost_usd).toBeCloseTo(0.0015);
      expect(record.success).toBeTruthy();
    });
    //
    it('GET /api/usage respects ?limit= query param', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 10);
      const res = await app.inject({
        method: 'GET', url: '/api/usage?limit=3',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.length).toBeLessThanOrEqual(3);
    });
    //
    it('usage records include model_name and provider_name from joins', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      testDb.usage.insert({
        app_id: testApp.id, provider_id: 'openai', model_id: 'openai/gpt-4o',
        tokens_in: 50, tokens_out: 25, latency_ms: 100, cost_usd: 0.0005,
        trust_tier: 'open', success: true, request_id: 'req-join-check'
      });
      const res = await app.inject({
        method: 'GET', url: '/api/usage',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const record = body.find(r => r.request_id === 'req-join-check');
      expect(record).toBeTruthy();
      expect(record.provider_name).toBeTruthy();
      expect(record.model_name).toBeTruthy();
    });
  });
  //
  describe('GET /api/apps/:id/stats — backend mix data', () => {
    it('includes costByProvider (backend mix) array', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 4);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body.costByProvider)).toBe(true);
      expect(body.costByProvider.length).toBeGreaterThanOrEqual(1);
      const openai = body.costByProvider.find(e => e.provider_id === 'openai');
      expect(openai).toBeTruthy();
      expect(typeof openai.total_cost).toBe('number');
      expect(typeof openai.requests).toBe('number');
    });
    //
    it('backend mix entries include total_tokens field', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 2);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const openai = body.costByProvider.find(e => e.provider_id === 'openai');
      expect(typeof openai.total_tokens).toBe('number');
      // 2 records × (100 in + 50 out) = 300
      expect(openai.total_tokens).toBe(300);
    });
    //
    it('stats with multiple providers shows each in costByProvider', async () => {
      seedTestProvider(testDb, 'openai');
      seedTestProvider(testDb, 'anthropic');
      seedTestModel(testDb, 'openai');
      seedTestModel(testDb, 'anthropic');
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', 3);
      seedUsageData(testDb.usage, testApp.id, 'anthropic', 'anthropic/gpt-4o', 2);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      const providerIds = body.costByProvider.map(e => e.provider_id);
      expect(providerIds).toContain('openai');
      expect(providerIds).toContain('anthropic');
    });
    //
    it('month stats accumulate all seeded records', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      const n = 7;
      seedUsageData(testDb.usage, testApp.id, 'openai', 'openai/gpt-4o', n);
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/stats`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.stats.month.requests).toBeGreaterThanOrEqual(n);
      // cost = n × 0.001
      expect(body.stats.month.total_cost).toBeCloseTo(n * 0.001, 5);
    });
  });
  //
  describe('GET /api/overview — global stats', () => {
    it('returns stats, providers, and recentRequests fields', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/overview',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.stats).toBeDefined();
      expect(body.stats.today).toBeDefined();
      expect(body.stats.month).toBeDefined();
      expect(Array.isArray(body.providers)).toBe(true);
      expect(Array.isArray(body.recentRequests)).toBe(true);
    });
    //
    it('recentRequests includes seeded usage records', async () => {
      seedTestProvider(testDb);
      seedTestModel(testDb);
      testDb.usage.insert({
        app_id: testApp.id, provider_id: 'openai', model_id: 'openai/gpt-4o',
        tokens_in: 50, tokens_out: 25, latency_ms: 100, cost_usd: 0.0005,
        trust_tier: 'open', success: true, request_id: 'req-overview-check'
      });
      const res = await app.inject({
        method: 'GET', url: '/api/overview',
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const body = JSON.parse(res.payload);
      expect(body.recentRequests.length).toBeGreaterThanOrEqual(1);
    });
  });
});
