import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp, registerRoutes } from '../../src/router/app.js';
import { createTestDb, seedTestProvider } from '../helpers/testDb.js';
import { ProviderRegistry } from '../../src/providers/registry.js';
import { HealthMonitor } from '../../src/providers/health-monitor.js';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.XSWARM_JWT_SECRET || 'xswarm-dev-secret-change-in-production';
function makeToken() { return jwt.sign({ dashboard: true }, JWT_SECRET, { expiresIn: '1h' }); }
//
describe('BDD: Account Setup Flow', () => {
  let testDb, app, token, headers;
  //
  beforeEach(async () => {
    testDb = createTestDb();
    testDb.providers.upsert({ id: 'gemini', name: 'Gemini', adapter: 'gemini', base_url: 'https://generativelanguage.googleapis.com', trust_tier: 'standard' });
    testDb.providers.upsert({ id: 'openai', name: 'OpenAI', adapter: 'openai', base_url: 'https://api.openai.com/v1', trust_tier: 'standard' });
    const testApp = testDb.apps.create({ name: 'bdd-app', trust_tier: 'open' });
    token = makeToken();
    headers = { authorization: `Bearer ${token}` };
    const registry = new ProviderRegistry(testDb.db);
    registry.loadFromDb(testDb.providers);
    const healthMonitor = new HealthMonitor(registry, testDb.providers);
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
      healthMonitor
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
  describe('Scenario: First-time account setup', () => {
    it('Given no accounts, When POST /api/accounts with Gemini key, Then GET returns 1 account', async () => {
      // Given — no accounts initially
      const before = await app.inject({ method: 'GET', url: '/api/accounts', headers });
      expect(JSON.parse(before.payload)).toHaveLength(0);
      // When — create account
      const create = await app.inject({
        method: 'POST', url: '/api/accounts',
        headers: { ...headers, 'content-type': 'application/json' },
        payload: { provider_id: 'gemini', api_key: 'AIza-test-key-123' }
      });
      expect(create.statusCode).toBe(200);
      // Then — one account exists
      const after = await app.inject({ method: 'GET', url: '/api/accounts', headers });
      const accounts = JSON.parse(after.payload);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].provider_id).toBe('gemini');
    });
  });
  //
  describe('Scenario: Test key validity', () => {
    it('Given account exists, When POST /api/accounts/:id/test with no adapter healthCheck, Then returns result', async () => {
      // Given — account exists
      const acct = testDb.accounts.insert({ provider_id: 'gemini', api_key: 'AIza-test-key' });
      // When — test the key (adapter may not have healthCheck, but endpoint handles it)
      const res = await app.inject({
        method: 'POST', url: `/api/accounts/${acct.id}/test`,
        headers: { ...headers, 'content-type': 'application/json' },
        payload: {}
      });
      const body = JSON.parse(res.payload);
      // Then — returns result (active if healthCheck passes or is absent, or invalid/error)
      expect(res.statusCode).toBe(200);
      expect(['active', 'invalid']).toContain(body.status);
    });
  });
  //
  describe('Scenario: Rotate key', () => {
    it('Given account with old key, When PUT /api/accounts/:id/key, Then old deleted and new created', async () => {
      // Given — account with old key
      const acct = testDb.accounts.insert({ provider_id: 'gemini', api_key: 'old-key-123' });
      const oldId = acct.id;
      // When — rotate key
      const res = await app.inject({
        method: 'PUT', url: `/api/accounts/${oldId}/key`,
        headers: { ...headers, 'content-type': 'application/json' },
        payload: { api_key: 'new-key-456' }
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      // Then — new account created (old one deleted, new has different id)
      expect(body.provider_id).toBe('gemini');
      expect(body.id).not.toBe(oldId);
      // Old id should be gone
      const allAccounts = testDb.accounts.getAll();
      expect(allAccounts.find(a => a.id === oldId)).toBeUndefined();
      expect(allAccounts).toHaveLength(1);
    });
  });
  //
  describe('Scenario: Delete account', () => {
    it('Given 2 accounts, When DELETE /api/accounts/:id, Then only 1 remains', async () => {
      // Given — 2 accounts
      const a1 = testDb.accounts.insert({ provider_id: 'gemini', api_key: 'key-1' });
      testDb.accounts.insert({ provider_id: 'openai', api_key: 'key-2' });
      expect(testDb.accounts.getAll()).toHaveLength(2);
      // When — delete first
      const res = await app.inject({
        method: 'DELETE', url: `/api/accounts/${a1.id}`, headers
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).ok).toBe(true);
      // Then — only 1 remains
      expect(testDb.accounts.getAll()).toHaveLength(1);
    });
  });
  //
  describe('Scenario: Key security', () => {
    it('Given account created with key, When GET /api/accounts, Then api_key is undefined (stripped)', async () => {
      // Given — account with known key
      testDb.accounts.insert({ provider_id: 'gemini', api_key: 'sk-abc123-super-secret' });
      // When — list accounts via API
      const res = await app.inject({ method: 'GET', url: '/api/accounts', headers });
      const accounts = JSON.parse(res.payload);
      // Then — api_key is stripped
      expect(accounts).toHaveLength(1);
      expect(accounts[0].api_key).toBeUndefined();
      expect(accounts[0].provider_id).toBe('gemini');
    });
  });
  //
  describe('Scenario: Key backup email', () => {
    it('Given email not configured, When POST /api/accounts/backup, Then returns 503', async () => {
      // Given — no mailer configured (default test setup)
      // When — attempt backup
      const res = await app.inject({
        method: 'POST', url: '/api/accounts/backup', headers
      });
      // Then — 503 since email not configured
      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.payload);
      expect(body.error.message).toMatch(/[Ee]mail/);
    });
  });
  //
  describe('Scenario: Validation', () => {
    it('Given no provider_id, When POST /api/accounts, Then returns 400', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/accounts',
        headers: { ...headers, 'content-type': 'application/json' },
        payload: { api_key: 'some-key' }
      });
      expect(res.statusCode).toBe(400);
    });
    //
    it('Given no api_key, When POST /api/accounts, Then returns 400', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/accounts',
        headers: { ...headers, 'content-type': 'application/json' },
        payload: { provider_id: 'gemini' }
      });
      expect(res.statusCode).toBe(400);
    });
    //
    it('Given non-existent account, When DELETE, Then returns 404', async () => {
      const res = await app.inject({
        method: 'DELETE', url: '/api/accounts/99999', headers
      });
      expect(res.statusCode).toBe(404);
    });
    //
    it('Given non-existent account, When PUT key, Then returns 404', async () => {
      const res = await app.inject({
        method: 'PUT', url: '/api/accounts/99999/key',
        headers: { ...headers, 'content-type': 'application/json' },
        payload: { api_key: 'new-key' }
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
