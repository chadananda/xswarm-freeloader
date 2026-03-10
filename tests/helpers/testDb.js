import Database from 'better-sqlite3';
import { runMigrations } from '../../src/db/migrator.js';
import {
  ProviderRepository, ModelRepository, AccountRepository,
  AppRepository, AppKeyRepository, AppPolicyRepository,
  UsageRepository, BudgetRepository, SanitizationRepository
} from '../../src/db/repositories/index.js';

export function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);

  return {
    db,
    providers: new ProviderRepository(db),
    models: new ModelRepository(db),
    accounts: new AccountRepository(db),
    apps: new AppRepository(db),
    appKeys: new AppKeyRepository(db),
    appPolicies: new AppPolicyRepository(db),
    usage: new UsageRepository(db),
    budgets: new BudgetRepository(db),
    sanitization: new SanitizationRepository(db),
    close: () => db.close()
  };
}

export function seedTestProvider(testDb, id = 'openai') {
  return testDb.providers.upsert({
    id,
    name: 'OpenAI',
    adapter: 'openai',
    base_url: 'https://api.openai.com/v1',
    trust_tier: 'standard'
  });
}

export function seedTestModel(testDb, providerId = 'openai') {
  return testDb.models.upsert({
    id: `${providerId}/gpt-4o`,
    provider_id: providerId,
    name: 'GPT-4o',
    context_window: 128000,
    supports_tools: true,
    supports_vision: true,
    pricing_input: 2.50,
    pricing_output: 10.00
  });
}

export function seedTestApp(testDb, name = 'test-app') {
  return testDb.apps.create({ name, trust_tier: 'open' });
}
