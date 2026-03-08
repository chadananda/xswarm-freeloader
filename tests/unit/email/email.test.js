import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderDigest } from '../../../src/email/templates/digest.js';
import { renderAlert } from '../../../src/email/templates/alert.js';
import { buildNewProviderAlert, buildFreeTierExpiringAlert, buildBudgetWarningAlert } from '../../../src/email/alerts.js';
import { DigestBuilder } from '../../../src/email/digest.js';
import { createTestDb, seedTestProvider, seedTestModel } from '../../helpers/testDb.js';

describe('Email Templates', () => {
  it('should render digest HTML', () => {
    const html = renderDigest({
      date: '2026-03-06',
      stats: { requests: 150, total_cost: 0.45, avg_latency: 320 },
      savings: 12.50,
      topModels: [{ model: 'openai', requests: 100, cost: 0.30 }],
      opportunities: ['Try enabling Groq for faster responses']
    });
    expect(html).toContain('$12.50');
    expect(html).toContain('150');
    expect(html).toContain('openai');
  });

  it('should render alert HTML', () => {
    const html = renderAlert({
      type: 'warning',
      title: 'Test Alert',
      message: 'Something happened',
      details: 'Extra info'
    });
    expect(html).toContain('Test Alert');
    expect(html).toContain('Something happened');
  });
});

describe('Alert builders', () => {
  it('should build new provider alert', () => {
    const alert = buildNewProviderAlert({ name: 'Groq', modelCount: 5, free_tier: true });
    expect(alert.subject).toContain('Groq');
    expect(alert.html).toContain('Free tier available');
  });

  it('should build free tier expiring alert', () => {
    const alert = buildFreeTierExpiringAlert({ name: 'Mistral' }, 5);
    expect(alert.subject).toContain('5 days');
    expect(alert.html).toContain('Mistral');
  });

  it('should build budget warning alert', () => {
    const alert = buildBudgetWarningAlert('my-app', 'Daily', 8.50, 10.00);
    expect(alert.subject).toContain('85%');
    expect(alert.html).toContain('$8.50');
  });
});

describe('DigestBuilder', () => {
  let testDb;
  beforeEach(() => {
    testDb = createTestDb();
    seedTestProvider(testDb);
    seedTestModel(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('should build daily digest', async () => {
    testDb.usage.insert({
      provider_id: 'openai', model_id: 'openai/gpt-4o',
      tokens_in: 1000, tokens_out: 500, cost_usd: 0.01
    });

    const builder = new DigestBuilder(testDb.db);
    const digest = await builder.buildDaily();
    expect(digest.subject).toContain('xswarm daily');
    expect(digest.html).toContain('saved');
  });
});
