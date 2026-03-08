import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestProvider, seedTestModel, seedTestApp } from '../../helpers/testDb.js';

describe('ProviderRepository', () => {
  let testDb;
  beforeEach(() => { testDb = createTestDb(); });
  afterEach(() => { testDb.close(); });

  it('should upsert and retrieve a provider', () => {
    const provider = seedTestProvider(testDb);
    expect(provider.id).toBe('openai');
    expect(provider.name).toBe('OpenAI');
    expect(provider.adapter).toBe('openai');
    expect(provider.trust_tier).toBe('standard');
  });

  it('should get all providers', () => {
    seedTestProvider(testDb, 'openai');
    seedTestProvider(testDb, 'anthropic');
    testDb.providers.upsert({ id: 'anthropic', name: 'Anthropic', adapter: 'anthropic', trust_tier: 'standard' });
    const all = testDb.providers.getAll();
    expect(all.length).toBe(2);
  });

  it('should filter providers by trust_tier', () => {
    seedTestProvider(testDb);
    testDb.providers.upsert({ id: 'local', name: 'Ollama', adapter: 'local', trust_tier: 'private', is_local: true });
    const private_ = testDb.providers.getAll({ trust_tier: 'private' });
    expect(private_.length).toBe(1);
    expect(private_[0].id).toBe('local');
  });

  it('should update health status', () => {
    seedTestProvider(testDb);
    testDb.providers.updateHealth('openai', 'healthy', 0);
    const p = testDb.providers.get('openai');
    expect(p.health_status).toBe('healthy');
  });

  it('should delete a provider', () => {
    seedTestProvider(testDb);
    expect(testDb.providers.delete('openai')).toBe(true);
    expect(testDb.providers.get('openai')).toBeUndefined();
  });
});

describe('ModelRepository', () => {
  let testDb;
  beforeEach(() => { testDb = createTestDb(); seedTestProvider(testDb); });
  afterEach(() => { testDb.close(); });

  it('should upsert and retrieve a model', () => {
    const model = seedTestModel(testDb);
    expect(model.id).toBe('openai/gpt-4o');
    expect(model.context_window).toBe(128000);
    expect(model.supports_tools).toBe(1);
  });

  it('should get models with provider info', () => {
    seedTestModel(testDb);
    const models = testDb.models.getAll();
    expect(models.length).toBe(1);
    expect(models[0].provider_name).toBe('OpenAI');
    expect(models[0].trust_tier).toBe('standard');
  });

  it('should filter by capabilities', () => {
    seedTestModel(testDb);
    testDb.models.upsert({
      id: 'openai/gpt-4o-mini', provider_id: 'openai', name: 'GPT-4o Mini',
      context_window: 128000, supports_tools: true, supports_vision: false,
      pricing_input: 0.15, pricing_output: 0.60
    });
    const vision = testDb.models.getAll({ supports_vision: true });
    expect(vision.length).toBe(1);
  });

  it('should delete a model', () => {
    seedTestModel(testDb);
    expect(testDb.models.delete('openai/gpt-4o')).toBe(true);
    expect(testDb.models.get('openai/gpt-4o')).toBeUndefined();
  });
});

describe('AccountRepository', () => {
  let testDb;
  beforeEach(() => { testDb = createTestDb(); seedTestProvider(testDb); });
  afterEach(() => { testDb.close(); });

  it('should insert and retrieve with decrypted key', () => {
    const acc = testDb.accounts.insert({ provider_id: 'openai', api_key: 'sk-test-12345' });
    expect(acc.api_key).toBe('sk-test-12345');
    expect(acc.status).toBe('active');
  });

  it('should get accounts by provider', () => {
    testDb.accounts.insert({ provider_id: 'openai', api_key: 'sk-key-1' });
    testDb.accounts.insert({ provider_id: 'openai', api_key: 'sk-key-2' });
    const accs = testDb.accounts.getByProvider('openai');
    expect(accs.length).toBe(2);
  });

  it('should update account status', () => {
    const acc = testDb.accounts.insert({ provider_id: 'openai', api_key: 'sk-key' });
    testDb.accounts.updateStatus(acc.id, 'quota_exceeded');
    const updated = testDb.accounts.get(acc.id);
    expect(updated.status).toBe('quota_exceeded');
  });
});

describe('AppRepository', () => {
  let testDb;
  beforeEach(() => { testDb = createTestDb(); });
  afterEach(() => { testDb.close(); });

  it('should create and retrieve an app', () => {
    const app = seedTestApp(testDb);
    expect(app.name).toBe('test-app');
    expect(app.api_key).toMatch(/^xsw_/);
    expect(app.trust_tier).toBe('open');
  });

  it('should find app by API key', () => {
    const app = seedTestApp(testDb);
    const found = testDb.apps.getByApiKey(app.api_key);
    expect(found.id).toBe(app.id);
  });

  it('should update app settings', () => {
    const app = seedTestApp(testDb);
    const updated = testDb.apps.update(app.id, { trust_tier: 'standard', budget_daily_hard: 50 });
    expect(updated.trust_tier).toBe('standard');
    expect(updated.budget_daily_hard).toBe(50);
  });

  it('should delete an app', () => {
    const app = seedTestApp(testDb);
    expect(testDb.apps.delete(app.id)).toBe(true);
    expect(testDb.apps.get(app.id)).toBeUndefined();
  });
});

describe('UsageRepository', () => {
  let testDb;
  beforeEach(() => {
    testDb = createTestDb();
    seedTestProvider(testDb);
    seedTestModel(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('should insert usage record', () => {
    const id = testDb.usage.insert({
      provider_id: 'openai', model_id: 'openai/gpt-4o',
      tokens_in: 100, tokens_out: 50, latency_ms: 500, cost_usd: 0.001
    });
    expect(id).toBeGreaterThan(0);
  });

  it('should get recent usage', () => {
    testDb.usage.insert({ provider_id: 'openai', model_id: 'openai/gpt-4o', tokens_in: 100, tokens_out: 50, cost_usd: 0.001 });
    testDb.usage.insert({ provider_id: 'openai', model_id: 'openai/gpt-4o', tokens_in: 200, tokens_out: 100, cost_usd: 0.002 });
    const recent = testDb.usage.getRecent(10);
    expect(recent.length).toBe(2);
  });

  it('should get stats', () => {
    testDb.usage.insert({ provider_id: 'openai', model_id: 'openai/gpt-4o', tokens_in: 100, tokens_out: 50, cost_usd: 0.001 });
    const stats = testDb.usage.getStats(null, 'day');
    expect(stats.requests).toBe(1);
    expect(stats.total_cost).toBe(0.001);
  });
});

describe('BudgetRepository', () => {
  let testDb;
  beforeEach(() => { testDb = createTestDb(); });
  afterEach(() => { testDb.close(); });

  it('should increment and get spent', () => {
    testDb.budgets.increment('app1', 'default', '2026-03-06', 1.50);
    expect(testDb.budgets.getSpent('app1', 'default', '2026-03-06')).toBe(1.50);
  });

  it('should accumulate spending', () => {
    testDb.budgets.increment('app1', 'default', '2026-03-06', 1.00);
    testDb.budgets.increment('app1', 'default', '2026-03-06', 2.50);
    expect(testDb.budgets.getSpent('app1', 'default', '2026-03-06')).toBe(3.50);
  });

  it('should return 0 for no spending', () => {
    expect(testDb.budgets.getSpent('app1', 'default', '2026-03-06')).toBe(0);
  });
});
