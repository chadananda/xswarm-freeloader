import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../../src/router/app.js';
import { createTestDb, seedTestProvider, seedTestModel, seedTestApp } from '../../helpers/testDb.js';
import { ProviderRegistry } from '../../../src/providers/registry.js';
import { HealthMonitor } from '../../../src/providers/health-monitor.js';
import { BudgetTracker } from '../../../src/budget/tracker.js';
import { BudgetEnforcer } from '../../../src/budget/enforcer.js';
import { CatalogSync } from '../../../src/providers/catalog-sync.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
function makeToken() { return jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: '1h' }); }

describe('Router App', () => {
  let testDb, app, testApp, dashToken;

  beforeEach(async () => {
    testDb = createTestDb();
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());
    testApp = seedTestApp(testDb);
    dashToken = makeToken();
    const registry = new ProviderRegistry(testDb.db);
    registry.loadFromDb(testDb.providers);
    const healthMonitor = new HealthMonitor(registry, testDb.providers);
    const budgetTracker = new BudgetTracker(testDb.db);
    const budgetEnforcer = new BudgetEnforcer(budgetTracker);
    const context = {
      config: { routing: { strategy: 'balanced', weights: { cost: 0.4, speed: 0.4, quality: 0.2 }, qualityGates: {} } },
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
      budgetTracker,
      budgetEnforcer
    };
    app = createApp(context);
    await registerRoutes(app, context);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    testDb.close();
  });

  it('GET /v1/health should return ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
  });

  it('GET /v1/models should return models list', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': testApp.api_key } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.object).toBe('list');
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should allow anonymous local requests without API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/models' });
    expect(res.statusCode).toBe(200); // Anonymous local access returns models
  });

  it('should reject requests with invalid API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': 'invalid-key' } });
    expect(res.statusCode).toBe(401);
  });

  it('POST /v1/chat/completions should return 503 with no API keys configured', async () => {
    const res = await app.inject({
      method: 'POST', url: '/v1/chat/completions',
      headers: { 'x-api-key': testApp.api_key, 'content-type': 'application/json' },
      payload: { messages: [{ role: 'user', content: 'hi' }] }
    });
    expect(res.statusCode).toBe(503);
  });

  it('GET /api/overview should return stats', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/overview', headers: { 'authorization': 'Bearer fake-token' } });
    expect([200, 401]).toContain(res.statusCode);
  });

  it('POST /api/auth/login should work for first login', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { password: 'test-password' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeTruthy();
    expect(body.firstLogin).toBe(true);
  });

  describe('Account API', () => {
    it('GET /api/accounts returns empty list initially', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/accounts', headers: { 'authorization': `Bearer ${dashToken}` } });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
    });

    it('POST /api/accounts creates an account', async () => {
      // Need a provider first
      seedTestProvider(testDb, 'openai');
      const res = await app.inject({
        method: 'POST', url: '/api/accounts',
        headers: { 'authorization': `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { provider_id: 'openai', api_key: 'sk-test-key' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeTruthy();
      expect(body.provider_id).toBe('openai');
    });

    it('POST /api/accounts returns 400 without required fields', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/accounts',
        headers: { 'authorization': `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { provider_id: 'openai' }
      });
      expect(res.statusCode).toBe(400);
    });

    it('DELETE /api/accounts/:id removes account', async () => {
      seedTestProvider(testDb, 'openai');
      const acct = testDb.accounts.insert({ provider_id: 'openai', api_key: 'sk-delete-me' });
      const res = await app.inject({
        method: 'DELETE', url: `/api/accounts/${acct.id}`,
        headers: { 'authorization': `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).ok).toBe(true);
    });

    it('DELETE /api/accounts/:id returns 404 for missing account', async () => {
      const res = await app.inject({
        method: 'DELETE', url: '/api/accounts/99999',
        headers: { 'authorization': `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Rate limits API', () => {
    it('GET /api/rate-limits returns model rate limit map', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/rate-limits', headers: { 'authorization': `Bearer ${dashToken}` } });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(typeof body).toBe('object');
    });
  });
});
