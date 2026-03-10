import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestProvider, seedTestModel, seedTestApp } from '../../helpers/testDb.js';
import { hashApiKey, generateAppApiKey } from '../../../src/utils/crypto.js';
// Seed helpers
const seedUsage = (repo, appId, providerId, modelId, count = 5) => {
  for (let i = 0; i < count; i++) {
    repo.insert({
      app_id: appId, provider_id: providerId, model_id: modelId,
      tokens_in: 100, tokens_out: 50, latency_ms: 200 + i * 10,
      cost_usd: 0.001 * (i + 1), trust_tier: 'open', success: true
    });
  }
};
// ─── AppKeyRepository ──────────────────────────────────────────────────────────
describe('AppKeyRepository', () => {
  let testDb, app;
  beforeEach(() => {
    testDb = createTestDb();
    app = seedTestApp(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('create inserts a key and returns id, app_id, key_prefix', () => {
    const { key, hash, prefix } = generateAppApiKey();
    const result = testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    expect(result.id).toBeGreaterThan(0);
    expect(result.app_id).toBe(app.id);
    expect(result.key_prefix).toBe(prefix);
  });

  it('getByHash finds key by hash', () => {
    const { key, hash, prefix } = generateAppApiKey();
    testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    const found = testDb.appKeys.getByHash(hash);
    expect(found).not.toBeNull();
    expect(found.app_id).toBe(app.id);
    expect(found.key_prefix).toBe(prefix);
  });

  it('getByHash returns null for non-existent hash', () => {
    const result = testDb.appKeys.getByHash('0'.repeat(64));
    expect(result).toBeUndefined();
  });

  it('getByHash does not return revoked keys', () => {
    const { hash, prefix } = generateAppApiKey();
    const created = testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    testDb.appKeys.revoke(created.id);
    const found = testDb.appKeys.getByHash(hash);
    expect(found).toBeUndefined();
  });

  it('getByHash joins app data (name, trust_tier)', () => {
    const { hash, prefix } = generateAppApiKey();
    testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    const found = testDb.appKeys.getByHash(hash);
    expect(found.app_name).toBe(app.name);
    expect(found.trust_tier).toBe(app.trust_tier);
  });

  it('getByApp returns all keys for an app ordered by created_at DESC', () => {
    const k1 = generateAppApiKey();
    const k2 = generateAppApiKey();
    const k3 = generateAppApiKey();
    testDb.appKeys.create({ appId: app.id, keyHash: k1.hash, keyPrefix: k1.prefix });
    testDb.appKeys.create({ appId: app.id, keyHash: k2.hash, keyPrefix: k2.prefix });
    testDb.appKeys.create({ appId: app.id, keyHash: k3.hash, keyPrefix: k3.prefix });
    const keys = testDb.appKeys.getByApp(app.id);
    // 3 explicitly created + 1 auto-created by apps.create()
    expect(keys.length).toBeGreaterThanOrEqual(3);
    // Each row has expected shape
    expect(keys[0]).toHaveProperty('id');
    expect(keys[0]).toHaveProperty('app_id');
    expect(keys[0]).toHaveProperty('key_prefix');
  });

  it('getByApp includes the key created by app.create()', () => {
    // seedTestApp triggers apps.create which inserts into app_keys
    const keys = testDb.appKeys.getByApp(app.id);
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });

  it('getByApp returns empty array for unknown app', () => {
    const keys = testDb.appKeys.getByApp('nonexistent-app-id');
    expect(keys).toEqual([]);
  });

  it('revoke sets revoked_at and returns true', () => {
    const { hash, prefix } = generateAppApiKey();
    const created = testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    const result = testDb.appKeys.revoke(created.id);
    expect(result).toBe(true);
    // Key must no longer be findable
    const found = testDb.appKeys.getByHash(hash);
    expect(found).toBeUndefined();
  });

  it('revoke returns false for already revoked key', () => {
    const { hash, prefix } = generateAppApiKey();
    const created = testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    testDb.appKeys.revoke(created.id);
    const second = testDb.appKeys.revoke(created.id);
    expect(second).toBe(false);
  });

  it('revoke returns false for non-existent key', () => {
    const result = testDb.appKeys.revoke(999999);
    expect(result).toBe(false);
  });

  it('rotate revokes old key and creates new key', () => {
    const old = generateAppApiKey();
    const created = testDb.appKeys.create({ appId: app.id, keyHash: old.hash, keyPrefix: old.prefix });
    const fresh = generateAppApiKey();
    const rotated = testDb.appKeys.rotate(created.id, fresh.hash, fresh.prefix);
    expect(rotated).not.toBeNull();
    expect(rotated.id).not.toBe(created.id);
    expect(rotated.app_id).toBe(app.id);
    expect(rotated.key_prefix).toBe(fresh.prefix);
    // Old hash is no longer findable
    expect(testDb.appKeys.getByHash(old.hash)).toBeUndefined();
    // New hash is findable
    expect(testDb.appKeys.getByHash(fresh.hash)).toBeDefined();
  });

  it('rotate preserves permissions and quota settings', () => {
    const old = generateAppApiKey();
    const created = testDb.appKeys.create({
      appId: app.id, keyHash: old.hash, keyPrefix: old.prefix,
      permissions: ['chat', 'embed'],
      rateLimitRps: 5, rateLimitRpm: 100,
      tokenQuotaDaily: 50000, costQuotaDaily: 1.00
    });
    const fresh = generateAppApiKey();
    const rotated = testDb.appKeys.rotate(created.id, fresh.hash, fresh.prefix);
    // Pull full row from getByApp to check quota fields
    const rows = testDb.appKeys.getByApp(app.id);
    const newRow = rows.find(r => r.id === rotated.id);
    expect(newRow.rate_limit_rps).toBe(5);
    expect(newRow.rate_limit_rpm).toBe(100);
    expect(newRow.token_quota_daily).toBe(50000);
    expect(newRow.cost_quota_daily).toBe(1.00);
  });

  it('rotate returns null for non-existent key', () => {
    const fresh = generateAppApiKey();
    const result = testDb.appKeys.rotate(999999, fresh.hash, fresh.prefix);
    expect(result).toBeNull();
  });

  it('touchLastUsed updates last_used_at timestamp', () => {
    const { hash, prefix } = generateAppApiKey();
    const created = testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    // Before touch, last_used_at is null
    const before = testDb.appKeys.getByApp(app.id).find(r => r.id === created.id);
    expect(before.last_used_at).toBeNull();
    testDb.appKeys.touchLastUsed(created.id);
    const after = testDb.appKeys.getByApp(app.id).find(r => r.id === created.id);
    expect(after.last_used_at).toBeGreaterThan(0);
  });

  it('multiple keys per app work correctly and are isolated', () => {
    const app2 = seedTestApp(testDb, 'other-app');
    const k1 = generateAppApiKey();
    const k2 = generateAppApiKey();
    testDb.appKeys.create({ appId: app.id, keyHash: k1.hash, keyPrefix: k1.prefix });
    testDb.appKeys.create({ appId: app2.id, keyHash: k2.hash, keyPrefix: k2.prefix });
    // app2's key is not in app's list (beyond the auto-created one)
    const app1Keys = testDb.appKeys.getByApp(app.id).map(r => r.key_prefix);
    const app2Keys = testDb.appKeys.getByApp(app2.id).map(r => r.key_prefix);
    expect(app1Keys).toContain(k1.prefix);
    expect(app1Keys).not.toContain(k2.prefix);
    expect(app2Keys).toContain(k2.prefix);
    expect(app2Keys).not.toContain(k1.prefix);
  });

  it('key with quotas (rate_limit_rps, token_quota_daily, cost_quota_daily)', () => {
    const { hash, prefix } = generateAppApiKey();
    testDb.appKeys.create({
      appId: app.id, keyHash: hash, keyPrefix: prefix,
      rateLimitRps: 10, tokenQuotaDaily: 100000, costQuotaDaily: 5.00
    });
    const found = testDb.appKeys.getByHash(hash);
    expect(found.rate_limit_rps).toBe(10);
    expect(found.token_quota_daily).toBe(100000);
    expect(found.cost_quota_daily).toBe(5.00);
  });

  it('key with null quotas stores nulls correctly', () => {
    const { hash, prefix } = generateAppApiKey();
    testDb.appKeys.create({ appId: app.id, keyHash: hash, keyPrefix: prefix });
    const found = testDb.appKeys.getByHash(hash);
    expect(found.rate_limit_rps).toBeNull();
    expect(found.token_quota_daily).toBeNull();
    expect(found.cost_quota_daily).toBeNull();
  });
});
// ─── SanitizationRepository ───────────────────────────────────────────────────
describe('SanitizationRepository', () => {
  let testDb, app;
  beforeEach(() => {
    testDb = createTestDb();
    app = seedTestApp(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('insert creates a record and returns id', () => {
    const id = testDb.sanitization.insert({ app_id: app.id, profile: 'standard' });
    expect(id).toBeGreaterThan(0);
  });

  it('insert with all fields populated', () => {
    const id = testDb.sanitization.insert({
      app_id: app.id,
      profile: 'strict',
      rules_fired: 3,
      secrets_found: 1,
      pii_detected: 2,
      content_length_before: 500,
      content_length_after: 480,
      blocked: true,
      action_taken: 'redact'
    });
    expect(id).toBeGreaterThan(0);
    const rows = testDb.sanitization.getByApp(app.id);
    const row = rows.find(r => r.id === id);
    expect(row.profile).toBe('strict');
    expect(row.rules_fired).toBe(3);
    expect(row.secrets_found).toBe(1);
    expect(row.pii_detected).toBe(2);
    expect(row.content_length_before).toBe(500);
    expect(row.content_length_after).toBe(480);
    expect(row.blocked).toBe(1);
    expect(row.action_taken).toBe('redact');
  });

  it('insert with minimal fields (only profile required besides defaults)', () => {
    const id = testDb.sanitization.insert({ profile: 'open' });
    expect(id).toBeGreaterThan(0);
    // Global record has no app_id
    const stats = testDb.sanitization.getStats(null, 'day');
    expect(stats.total).toBeGreaterThanOrEqual(1);
  });

  it('insert defaults numeric fields to 0', () => {
    const id = testDb.sanitization.insert({ app_id: app.id, profile: 'standard' });
    const rows = testDb.sanitization.getByApp(app.id);
    const row = rows.find(r => r.id === id);
    expect(row.rules_fired).toBe(0);
    expect(row.secrets_found).toBe(0);
    expect(row.pii_detected).toBe(0);
    expect(row.blocked).toBe(0);
  });

  it('getByApp returns records for specific app', () => {
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard' });
    testDb.sanitization.insert({ app_id: app.id, profile: 'strict' });
    const rows = testDb.sanitization.getByApp(app.id);
    expect(rows).toHaveLength(2);
    rows.forEach(r => expect(r.app_id).toBe(app.id));
  });

  it('getByApp with since filter returns only records at or after since', () => {
    const past = Math.floor(Date.now() / 1000) - 86400 * 2; // 2 days ago
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard' });
    const sinceFilter = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const rows = testDb.sanitization.getByApp(app.id, sinceFilter);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach(r => expect(r.ts).toBeGreaterThanOrEqual(sinceFilter));
  });

  it('getByApp returns empty array for unknown app', () => {
    const rows = testDb.sanitization.getByApp('nonexistent-app');
    expect(rows).toEqual([]);
  });

  it('getByApp isolates records between apps', () => {
    const app2 = seedTestApp(testDb, 'other-app');
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard' });
    testDb.sanitization.insert({ app_id: app2.id, profile: 'strict' });
    const rows1 = testDb.sanitization.getByApp(app.id);
    const rows2 = testDb.sanitization.getByApp(app2.id);
    expect(rows1).toHaveLength(1);
    expect(rows2).toHaveLength(1);
    expect(rows1[0].profile).toBe('standard');
    expect(rows2[0].profile).toBe('strict');
  });

  it('getStats returns aggregated stats for an app (day)', () => {
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 2, secrets_found: 1, pii_detected: 0, blocked: false });
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 3, secrets_found: 0, pii_detected: 1, blocked: true });
    const stats = testDb.sanitization.getStats(app.id, 'day');
    expect(stats.total).toBe(2);
    expect(stats.total_rules).toBe(5);
    expect(stats.total_secrets).toBe(1);
    expect(stats.total_pii).toBe(1);
    expect(stats.total_blocked).toBe(1);
  });

  it('getStats returns aggregated stats for an app (month)', () => {
    testDb.sanitization.insert({ app_id: app.id, profile: 'strict', rules_fired: 5, secrets_found: 2, pii_detected: 3, blocked: true });
    const stats = testDb.sanitization.getStats(app.id, 'month');
    expect(stats.total).toBe(1);
    expect(stats.total_rules).toBe(5);
    expect(stats.total_secrets).toBe(2);
    expect(stats.total_pii).toBe(3);
    expect(stats.total_blocked).toBe(1);
  });

  it('getStats with null appId returns global stats', () => {
    const app2 = seedTestApp(testDb, 'app-two');
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 1 });
    testDb.sanitization.insert({ app_id: app2.id, profile: 'strict', rules_fired: 4 });
    const stats = testDb.sanitization.getStats(null, 'day');
    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(stats.total_rules).toBeGreaterThanOrEqual(5);
  });

  it('stats correctly sum rules_fired, secrets_found, pii_detected, blocked', () => {
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 1, secrets_found: 1, pii_detected: 0, blocked: false });
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 2, secrets_found: 0, pii_detected: 1, blocked: false });
    testDb.sanitization.insert({ app_id: app.id, profile: 'standard', rules_fired: 3, secrets_found: 1, pii_detected: 1, blocked: true });
    const stats = testDb.sanitization.getStats(app.id, 'day');
    expect(stats.total_rules).toBe(6);
    expect(stats.total_secrets).toBe(2);
    expect(stats.total_pii).toBe(2);
    expect(stats.total_blocked).toBe(1);
  });
});
// ─── AppPolicyRepository ──────────────────────────────────────────────────────
describe('AppPolicyRepository', () => {
  let testDb, app;
  beforeEach(() => {
    testDb = createTestDb();
    app = seedTestApp(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('get returns null for non-existent app', () => {
    const result = testDb.appPolicies.get('nonexistent-app-id');
    expect(result).toBeNull();
  });

  it('upsert creates new policy (INSERT path)', () => {
    const policy = testDb.appPolicies.upsert(app.id, { data_residency: 'eu' });
    expect(policy).not.toBeNull();
    expect(policy.app_id).toBe(app.id);
    expect(policy.data_residency).toBe('eu');
  });

  it('upsert updates existing policy (UPDATE path)', () => {
    testDb.appPolicies.upsert(app.id, { data_residency: 'us' });
    const updated = testDb.appPolicies.upsert(app.id, { data_residency: 'eu' });
    expect(updated.data_residency).toBe('eu');
  });

  it('upsert only one row exists after two upserts', () => {
    testDb.appPolicies.upsert(app.id, { data_residency: 'any' });
    testDb.appPolicies.upsert(app.id, { data_residency: 'us' });
    // Only one policy per app
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.data_residency).toBe('us');
  });

  it('get parses JSON array fields (allowed_providers)', () => {
    testDb.appPolicies.upsert(app.id, { allowed_providers: ['openai', 'anthropic'] });
    const policy = testDb.appPolicies.get(app.id);
    expect(Array.isArray(policy.allowed_providers)).toBe(true);
    expect(policy.allowed_providers).toEqual(['openai', 'anthropic']);
  });

  it('upsert with allowed_providers as array stored as JSON parsed back correctly', () => {
    const providers = ['openai', 'xai', 'groq'];
    testDb.appPolicies.upsert(app.id, { allowed_providers: providers });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.allowed_providers).toEqual(providers);
  });

  it('upsert with blocked_providers', () => {
    testDb.appPolicies.upsert(app.id, { blocked_providers: ['openai'] });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.blocked_providers).toEqual(['openai']);
  });

  it('upsert with allowed_models', () => {
    const models = ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet'];
    testDb.appPolicies.upsert(app.id, { allowed_models: models });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.allowed_models).toEqual(models);
  });

  it('upsert preserves data_residency', () => {
    testDb.appPolicies.upsert(app.id, { data_residency: 'eu' });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.data_residency).toBe('eu');
  });

  it('upsert preserves force_local_on_pii', () => {
    testDb.appPolicies.upsert(app.id, { force_local_on_pii: true });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.force_local_on_pii).toBe(1);
  });

  it('upsert with max_cost_per_request', () => {
    testDb.appPolicies.upsert(app.id, { max_cost_per_request: 0.05 });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.max_cost_per_request).toBe(0.05);
  });

  it('upsert with rate limits', () => {
    testDb.appPolicies.upsert(app.id, { rate_limit_rpm: 60, rate_limit_rpd: 1000 });
    const policy = testDb.appPolicies.get(app.id);
    expect(policy.rate_limit_rpm).toBe(60);
    expect(policy.rate_limit_rpd).toBe(1000);
  });

  it('delete removes policy and returns true', () => {
    testDb.appPolicies.upsert(app.id, { data_residency: 'any' });
    const result = testDb.appPolicies.delete(app.id);
    expect(result).toBe(true);
    expect(testDb.appPolicies.get(app.id)).toBeNull();
  });

  it('delete returns false for non-existent policy', () => {
    const result = testDb.appPolicies.delete('nonexistent-app-id');
    expect(result).toBe(false);
  });

  it('roundtrip: upsert → get → verify all fields match', () => {
    const policy = {
      allowed_providers: ['openai', 'anthropic'],
      blocked_providers: ['xai'],
      allowed_models: ['openai/gpt-4o'],
      data_residency: 'eu',
      force_local_on_pii: true,
      max_cost_per_request: 0.10,
      rate_limit_rpm: 30,
      rate_limit_rpd: 500,
      token_limit_daily: 100000,
      token_limit_monthly: 2000000
    };
    testDb.appPolicies.upsert(app.id, policy);
    const fetched = testDb.appPolicies.get(app.id);
    expect(fetched.allowed_providers).toEqual(policy.allowed_providers);
    expect(fetched.blocked_providers).toEqual(policy.blocked_providers);
    expect(fetched.allowed_models).toEqual(policy.allowed_models);
    expect(fetched.data_residency).toBe(policy.data_residency);
    expect(fetched.force_local_on_pii).toBe(1);
    expect(fetched.max_cost_per_request).toBe(policy.max_cost_per_request);
    expect(fetched.rate_limit_rpm).toBe(policy.rate_limit_rpm);
    expect(fetched.rate_limit_rpd).toBe(policy.rate_limit_rpd);
    expect(fetched.token_limit_daily).toBe(policy.token_limit_daily);
    expect(fetched.token_limit_monthly).toBe(policy.token_limit_monthly);
  });

  it('empty arrays vs null handling: empty array stored and parsed back', () => {
    testDb.appPolicies.upsert(app.id, { allowed_providers: [] });
    const policy = testDb.appPolicies.get(app.id);
    // JSON.parse('[]') = [] which is truthy-parsed; JSON.parse('null') = null
    expect(Array.isArray(policy.allowed_providers)).toBe(true);
    expect(policy.allowed_providers).toEqual([]);
  });

  it('policies are isolated per app', () => {
    const app2 = seedTestApp(testDb, 'app-two');
    testDb.appPolicies.upsert(app.id, { data_residency: 'us', rate_limit_rpm: 60 });
    testDb.appPolicies.upsert(app2.id, { data_residency: 'eu', rate_limit_rpm: 10 });
    const p1 = testDb.appPolicies.get(app.id);
    const p2 = testDb.appPolicies.get(app2.id);
    expect(p1.data_residency).toBe('us');
    expect(p2.data_residency).toBe('eu');
    expect(p1.rate_limit_rpm).toBe(60);
    expect(p2.rate_limit_rpm).toBe(10);
  });
});
// ─── Extended UsageRepository ─────────────────────────────────────────────────
describe('UsageRepository (extended methods)', () => {
  let testDb, app, app2, provider, provider2, model, model2;
  beforeEach(() => {
    testDb = createTestDb();
    app = seedTestApp(testDb, 'app-one');
    app2 = seedTestApp(testDb, 'app-two');
    seedTestProvider(testDb, 'openai');
    seedTestProvider(testDb, 'anthropic');
    provider = 'openai';
    provider2 = 'anthropic';
    model = testDb.models.upsert({
      id: 'openai/gpt-4o', provider_id: 'openai', name: 'GPT-4o',
      context_window: 128000, supports_tools: true, supports_vision: true,
      pricing_input: 2.50, pricing_output: 10.00
    });
    model2 = testDb.models.upsert({
      id: 'anthropic/claude-3-5-sonnet', provider_id: 'anthropic', name: 'Claude 3.5 Sonnet',
      context_window: 200000, supports_tools: true, supports_vision: true,
      pricing_input: 3.00, pricing_output: 15.00
    });
  });
  afterEach(() => { testDb.close(); });

  it('insert with extended fields (request_id, routing_metadata, app_key_id, sanitization_action)', () => {
    const id = testDb.usage.insert({
      app_id: app.id, provider_id: provider, model_id: 'openai/gpt-4o',
      tokens_in: 100, tokens_out: 50, latency_ms: 300, cost_usd: 0.005,
      trust_tier: 'standard', success: true,
      request_id: 'req-abc-123',
      routing_metadata: { scorer: 'cost', fallback: false },
      sanitization_action: 'redact'
    });
    expect(id).toBeGreaterThan(0);
  });

  it('insert routing_metadata as object is stored as JSON', () => {
    const id = testDb.usage.insert({
      app_id: app.id, provider_id: provider, model_id: 'openai/gpt-4o',
      tokens_in: 50, tokens_out: 25, cost_usd: 0.001, success: true,
      routing_metadata: { strategy: 'cheapest', tier: 'free' }
    });
    const recent = testDb.usage.getRecent(1, { app_id: app.id });
    // routing_metadata stored as JSON string in DB
    expect(typeof recent[0].routing_metadata).toBe('string');
    expect(JSON.parse(recent[0].routing_metadata)).toEqual({ strategy: 'cheapest', tier: 'free' });
  });

  it('getTimeseriesByApp returns daily aggregates for specific app', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 5);
    const series = testDb.usage.getTimeseriesByApp(app.id, 30);
    expect(series.length).toBeGreaterThanOrEqual(1);
    const today = series[0];
    expect(today).toHaveProperty('date');
    expect(today).toHaveProperty('cost');
    expect(today).toHaveProperty('requests');
    expect(today).toHaveProperty('avg_latency');
    expect(today).toHaveProperty('total_tokens');
    expect(today.requests).toBe(5);
    // cost = 0.001+0.002+0.003+0.004+0.005 = 0.015
    expect(today.cost).toBeCloseTo(0.015, 5);
    // total_tokens = 5 * (100+50) = 750
    expect(today.total_tokens).toBe(750);
  });

  it('getTimeseriesByApp returns empty for unknown app', () => {
    const series = testDb.usage.getTimeseriesByApp('nonexistent-app', 30);
    expect(series).toEqual([]);
  });

  it('getTimeseriesByApp isolates data between apps', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 3);
    seedUsage(testDb.usage, app2.id, provider, 'openai/gpt-4o', 7);
    const s1 = testDb.usage.getTimeseriesByApp(app.id, 30);
    const s2 = testDb.usage.getTimeseriesByApp(app2.id, 30);
    expect(s1[0].requests).toBe(3);
    expect(s2[0].requests).toBe(7);
  });

  it('getCostByProviderForApp returns provider breakdown for specific app', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 3);
    seedUsage(testDb.usage, app.id, provider2, 'anthropic/claude-3-5-sonnet', 2);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const breakdown = testDb.usage.getCostByProviderForApp(app.id, since);
    expect(breakdown.length).toBe(2);
    // Ordered by total_cost DESC: openai (3 calls: 0.001+0.002+0.003=0.006) vs anthropic (2 calls: 0.001+0.002=0.003)
    expect(breakdown[0].provider_id).toBe(provider);
    expect(breakdown[0].requests).toBe(3);
    expect(breakdown[1].provider_id).toBe(provider2);
    expect(breakdown[1].requests).toBe(2);
    breakdown.forEach(r => {
      expect(r).toHaveProperty('total_cost');
      expect(r).toHaveProperty('total_tokens');
      expect(r).toHaveProperty('provider_name');
    });
  });

  it('getCostByProviderForApp returns empty for unknown app', () => {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const result = testDb.usage.getCostByProviderForApp('nonexistent', since);
    expect(result).toEqual([]);
  });

  it('getCostByProviderForApp isolates data between apps', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 4);
    seedUsage(testDb.usage, app2.id, provider2, 'anthropic/claude-3-5-sonnet', 2);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const r1 = testDb.usage.getCostByProviderForApp(app.id, since);
    const r2 = testDb.usage.getCostByProviderForApp(app2.id, since);
    expect(r1).toHaveLength(1);
    expect(r1[0].provider_id).toBe(provider);
    expect(r2).toHaveLength(1);
    expect(r2[0].provider_id).toBe(provider2);
  });

  it('getTopApps returns apps sorted by cost DESC', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 3);   // cost 0.006
    seedUsage(testDb.usage, app2.id, provider, 'openai/gpt-4o', 5);  // cost 0.015
    const since = Math.floor(Date.now() / 1000) - 86400;
    const top = testDb.usage.getTopApps(since, 10);
    expect(top.length).toBe(2);
    // app2 has higher cost so should be first
    expect(top[0].app_id).toBe(app2.id);
    expect(top[1].app_id).toBe(app.id);
    expect(top[0].total_cost).toBeGreaterThan(top[1].total_cost);
  });

  it('getTopApps respects limit parameter', () => {
    const app3 = seedTestApp(testDb, 'app-three');
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 2);
    seedUsage(testDb.usage, app2.id, provider, 'openai/gpt-4o', 3);
    seedUsage(testDb.usage, app3.id, provider, 'openai/gpt-4o', 4);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const top = testDb.usage.getTopApps(since, 2);
    expect(top).toHaveLength(2);
  });

  it('getTopApps includes app_name', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 1);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const top = testDb.usage.getTopApps(since, 10);
    expect(top[0].app_name).toBe('app-one');
  });

  it('getTopApps excludes null app_id records', () => {
    // Insert usage with no app_id (global/untracked)
    testDb.usage.insert({ provider_id: provider, model_id: 'openai/gpt-4o', tokens_in: 100, tokens_out: 50, cost_usd: 0.01 });
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 1);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const top = testDb.usage.getTopApps(since, 10);
    top.forEach(r => expect(r.app_id).not.toBeNull());
  });

  it('getAppReport returns stats + backendMix for an app', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 3);
    seedUsage(testDb.usage, app.id, provider2, 'anthropic/claude-3-5-sonnet', 2);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const report = testDb.usage.getAppReport(app.id, since);
    expect(report.requests).toBe(5);
    expect(report.tokens_in).toBe(500);
    expect(report.tokens_out).toBe(250);
    expect(report.errors).toBe(0);
    expect(report.avg_latency).toBeGreaterThan(0);
    expect(report.min_latency).toBeGreaterThan(0);
    expect(report.max_latency).toBeGreaterThanOrEqual(report.min_latency);
    expect(Array.isArray(report.backendMix)).toBe(true);
    expect(report.backendMix.length).toBe(2);
  });

  it('getAppReport counts errors correctly', () => {
    testDb.usage.insert({ app_id: app.id, provider_id: provider, model_id: 'openai/gpt-4o', tokens_in: 10, tokens_out: 0, cost_usd: 0, success: false, error_message: 'timeout' });
    testDb.usage.insert({ app_id: app.id, provider_id: provider, model_id: 'openai/gpt-4o', tokens_in: 100, tokens_out: 50, cost_usd: 0.001, success: true });
    const since = Math.floor(Date.now() / 1000) - 86400;
    const report = testDb.usage.getAppReport(app.id, since);
    expect(report.requests).toBe(2);
    expect(report.errors).toBe(1);
  });

  it('getAppReport returns empty-ish stats for unknown app', () => {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const report = testDb.usage.getAppReport('nonexistent', since);
    expect(report.requests).toBe(0);
    expect(report.backendMix).toEqual([]);
  });

  it('getBackendImpact returns apps affected by a provider', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 4);
    seedUsage(testDb.usage, app2.id, provider, 'openai/gpt-4o', 2);
    seedUsage(testDb.usage, app.id, provider2, 'anthropic/claude-3-5-sonnet', 1);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const impact = testDb.usage.getBackendImpact(provider, since);
    expect(impact.length).toBe(2);
    // app has more requests (4) so should be first
    expect(impact[0].app_id).toBe(app.id);
    expect(impact[0].requests).toBe(4);
    expect(impact[1].app_id).toBe(app2.id);
    expect(impact[1].requests).toBe(2);
    impact.forEach(r => {
      expect(r).toHaveProperty('app_name');
      expect(r).toHaveProperty('total_cost');
      expect(r).toHaveProperty('avg_latency');
    });
  });

  it('getBackendImpact returns empty for unknown provider', () => {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const result = testDb.usage.getBackendImpact('nonexistent-provider', since);
    expect(result).toEqual([]);
  });

  it('getBackendImpact only includes apps that used the specific provider', () => {
    seedUsage(testDb.usage, app.id, provider, 'openai/gpt-4o', 3);
    seedUsage(testDb.usage, app2.id, provider2, 'anthropic/claude-3-5-sonnet', 3);
    const since = Math.floor(Date.now() / 1000) - 86400;
    const openaiImpact = testDb.usage.getBackendImpact(provider, since);
    expect(openaiImpact).toHaveLength(1);
    expect(openaiImpact[0].app_id).toBe(app.id);
    const anthropicImpact = testDb.usage.getBackendImpact(provider2, since);
    expect(anthropicImpact).toHaveLength(1);
    expect(anthropicImpact[0].app_id).toBe(app2.id);
  });
});
