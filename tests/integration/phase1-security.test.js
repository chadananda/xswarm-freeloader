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
import { hashApiKey } from '../../src/utils/crypto.js';
import jwt from 'jsonwebtoken';
//
const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
function makeToken() { return jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: '1h' }); }
//
describe('Phase 1: API Key Security', () => {
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
  describe('App creation returns raw key once', () => {
    it('POST /api/apps returns app with _rawKey field', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/apps',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { name: 'my-service', trust_tier: 'open' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeTruthy();
      expect(body.name).toBe('my-service');
      expect(body._rawKey).toBeTruthy();
      expect(typeof body._rawKey).toBe('string');
      expect(body._rawKey.length).toBeGreaterThan(10);
    });
    //
    it('POST /api/apps creates corresponding app_keys entry', async () => {
      const createRes = await app.inject({
        method: 'POST', url: '/api/apps',
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { name: 'key-test-app', trust_tier: 'standard' }
      });
      expect(createRes.statusCode).toBe(200);
      const created = JSON.parse(createRes.payload);
      // Verify via GET /api/apps/:id/keys
      const keysRes = await app.inject({
        method: 'GET', url: `/api/apps/${created.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(keysRes.statusCode).toBe(200);
      const keys = JSON.parse(keysRes.payload);
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(1);
      // Key should have prefix but no full raw key
      expect(keys[0].key_prefix).toBeTruthy();
      expect(keys[0].key_hash).toBeUndefined();
    });
  });
  //
  describe('POST /api/apps/:id/keys — key creation', () => {
    it('creates new key with key visible once in response', async () => {
      const res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.key).toBeTruthy();
      expect(typeof body.key).toBe('string');
      expect(body.key_prefix).toBeTruthy();
      expect(body.id).toBeTruthy();
    });
    //
    it('creates key with rate_limit_rps and token_quota_daily quotas', async () => {
      const res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: { rate_limit_rps: 5, token_quota_daily: 10000 }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.key).toBeTruthy();
      // Verify quotas stored — fetch via GET keys
      const keysRes = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const keys = JSON.parse(keysRes.payload);
      // Find the newest key (last created)
      const match = keys.find(k => k.rate_limit_rps === 5);
      expect(match).toBeTruthy();
      expect(match.rate_limit_rps).toBe(5);
      expect(match.token_quota_daily).toBe(10000);
    });
    //
    it('created key does not expose raw key_hash in GET /api/apps/:id/keys', async () => {
      await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const keys = JSON.parse(res.payload);
      for (const k of keys) {
        // key_hash must never appear in API response
        expect(k.key_hash).toBeUndefined();
        // key_prefix is safe to show
        expect(k.key_prefix).toBeTruthy();
      }
    });
  });
  //
  describe('DELETE /api/apps/:id/keys/:keyId — revocation', () => {
    it('revokes a key and returns ok: true', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { id: keyId } = JSON.parse(createRes.payload);
      const revokeRes = await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/keys/${keyId}`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(revokeRes.statusCode).toBe(200);
      const body = JSON.parse(revokeRes.payload);
      expect(body.ok).toBe(true);
    });
    //
    it('revoked key no longer authenticates against /v1/models', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { id: keyId, key: rawKey } = JSON.parse(createRes.payload);
      // Verify it works before revocation
      const beforeRes = await app.inject({
        method: 'GET', url: '/v1/models',
        headers: { 'x-api-key': rawKey }
      });
      expect(beforeRes.statusCode).toBe(200);
      // Revoke
      await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/keys/${keyId}`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      // Should now fail authentication
      const afterRes = await app.inject({
        method: 'GET', url: '/v1/models',
        headers: { 'x-api-key': rawKey }
      });
      expect(afterRes.statusCode).toBe(401);
    });
  });
  //
  describe('POST /api/apps/:id/keys/:keyId/rotate', () => {
    it('creates a new key and revokes the old one', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { id: keyId, key: oldKey } = JSON.parse(createRes.payload);
      const rotateRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys/${keyId}/rotate`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      expect(rotateRes.statusCode).toBe(200);
      const rotated = JSON.parse(rotateRes.payload);
      expect(rotated.key).toBeTruthy();
      expect(rotated.key).not.toBe(oldKey);
      expect(rotated.id).not.toBe(keyId);
    });
    //
    it('old rotated key no longer works; new key authenticates', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { id: keyId, key: oldKey } = JSON.parse(createRes.payload);
      const rotateRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys/${keyId}/rotate`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { key: newKey } = JSON.parse(rotateRes.payload);
      // Old key should be rejected
      const oldKeyRes = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': oldKey } });
      expect(oldKeyRes.statusCode).toBe(401);
      // New key should work
      const newKeyRes = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': newKey } });
      expect(newKeyRes.statusCode).toBe(200);
    });
    //
    it('rotate on non-existent key returns ok: false', async () => {
      const res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys/999999/rotate`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.ok).toBe(false);
    });
  });
  //
  describe('Multiple keys per app', () => {
    it('two active keys on same app both authenticate independently', async () => {
      const k1Res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const k2Res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { key: key1 } = JSON.parse(k1Res.payload);
      const { key: key2 } = JSON.parse(k2Res.payload);
      expect(key1).not.toBe(key2);
      const r1 = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': key1 } });
      const r2 = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': key2 } });
      expect(r1.statusCode).toBe(200);
      expect(r2.statusCode).toBe(200);
    });
    //
    it('revoking one key does not affect the other', async () => {
      const k1Res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const k2Res = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { id: id1, key: key1 } = JSON.parse(k1Res.payload);
      const { key: key2 } = JSON.parse(k2Res.payload);
      // Revoke key1
      await app.inject({
        method: 'DELETE', url: `/api/apps/${testApp.id}/keys/${id1}`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      const r1 = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': key1 } });
      const r2 = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': key2 } });
      expect(r1.statusCode).toBe(401);
      expect(r2.statusCode).toBe(200);
    });
  });
  //
  describe('Auth flow', () => {
    it('valid hashed key via x-api-key header → 200 on /v1/models', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { key } = JSON.parse(createRes.payload);
      const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': key } });
      expect(res.statusCode).toBe(200);
    });
    //
    it('valid key via Authorization: Bearer header → 200 on /v1/models', async () => {
      const createRes = await app.inject({
        method: 'POST', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}`, 'content-type': 'application/json' },
        payload: {}
      });
      const { key } = JSON.parse(createRes.payload);
      const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { authorization: `Bearer ${key}` } });
      expect(res.statusCode).toBe(200);
    });
    //
    it('invalid key returns 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': 'xsw_totally_invalid_key_00000000000000000000000000' } });
      expect(res.statusCode).toBe(401);
    });
    //
    it('local request without any key → 200 anonymous access', async () => {
      // Fastify inject uses loopback by default
      const res = await app.inject({ method: 'GET', url: '/v1/models' });
      expect(res.statusCode).toBe(200);
    });
    //
    it('response shape from /v1/models is OpenAI-compatible list', async () => {
      const res = await app.inject({ method: 'GET', url: '/v1/models' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.object).toBe('list');
      expect(Array.isArray(body.data)).toBe(true);
      // Each model has id, object, owned_by
      if (body.data.length > 0) {
        expect(body.data[0].id).toBeTruthy();
        expect(body.data[0].object).toBe('model');
        expect(body.data[0].owned_by).toBeTruthy();
      }
    });
    //
    it('app.test app api_key (plaintext fallback) → 200 on /v1/models', async () => {
      // testApp has api_key set on the app record — auth.js falls back to plaintext lookup
      const res = await app.inject({ method: 'GET', url: '/v1/models', headers: { 'x-api-key': testApp.api_key } });
      expect(res.statusCode).toBe(200);
    });
    //
    it('GET /api/apps/:id/keys — list keys returns prefix, not full key', async () => {
      const res = await app.inject({
        method: 'GET', url: `/api/apps/${testApp.id}/keys`,
        headers: { authorization: `Bearer ${dashToken}` }
      });
      expect(res.statusCode).toBe(200);
      const keys = JSON.parse(res.payload);
      expect(Array.isArray(keys)).toBe(true);
      for (const k of keys) {
        expect(k.key_prefix).toBeTruthy();
        // Full key must never be returned from list
        expect(k.key).toBeUndefined();
        expect(k.key_hash).toBeUndefined();
      }
    });
  });
});
