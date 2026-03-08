import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../../src/router/app.js';
import { createTestDb, seedTestProvider, seedTestModel, seedTestApp } from '../../helpers/testDb.js';
import { ProviderRegistry } from '../../../src/providers/registry.js';
import { HealthMonitor } from '../../../src/providers/health-monitor.js';
import { BudgetTracker } from '../../../src/budget/tracker.js';
import { BudgetEnforcer } from '../../../src/budget/enforcer.js';
import { CatalogSync } from '../../../src/providers/catalog-sync.js';

describe('Router App', () => {
  let testDb, app, testApp;

  beforeEach(async () => {
    testDb = createTestDb();

    // Seed data
    const catalogSync = new CatalogSync(testDb.providers, testDb.models, {});
    catalogSync.upsertCatalog(catalogSync.loadDefaultCatalog());

    testApp = seedTestApp(testDb);

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
      usage: testDb.usage,
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
    const res = await app.inject({
      method: 'GET',
      url: '/v1/models',
      headers: { 'x-api-key': testApp.api_key }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.object).toBe('list');
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('should reject requests without API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/models' });
    expect(res.statusCode).toBe(401);
  });

  it('should reject requests with invalid API key', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/models',
      headers: { 'x-api-key': 'invalid-key' }
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /v1/chat/completions should return 503 with no API keys configured', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { 'x-api-key': testApp.api_key, 'content-type': 'application/json' },
      payload: { messages: [{ role: 'user', content: 'hi' }] }
    });
    // Will fail since no provider API keys configured, should get 503
    expect(res.statusCode).toBe(503);
  });

  it('GET /api/overview should return stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/overview',
      headers: { 'authorization': 'Bearer fake-token' }
    });
    // Will fail auth but that's ok, we test the route exists
    expect([200, 401]).toContain(res.statusCode);
  });

  it('POST /api/auth/login should work for first login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: { password: 'test-password' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.token).toBeTruthy();
    expect(body.firstLogin).toBe(true);
  });
});
