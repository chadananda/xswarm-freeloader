import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderDigest } from '../../../src/email/templates/digest.js';
import { renderAlert } from '../../../src/email/templates/alert.js';
import { buildNewProviderAlert, buildFreeTierExpiringAlert, buildBudgetWarningAlert } from '../../../src/email/alerts.js';
import { DigestBuilder } from '../../../src/email/digest.js';
import { createTestDb, seedTestProvider, seedTestModel } from '../../helpers/testDb.js';

describe('Email Templates', () => {
  it('should render multi-range digest HTML', () => {
    const html = renderDigest({
      date: '2026-03-06',
      ranges: {
        '24h': {
          label: 'Last 24 Hours',
          stats: { requests: 150, total_cost: 0.45, avg_latency: 320, total_tokens_in: 50000, total_tokens_out: 20000 },
          savings: 12.50,
          providerBreakdown: [{ provider_id: 'openai', provider_name: 'OpenAI', requests: 100, total_cost: 0.30, avg_latency: 320 }],
          topApps: [],
          errorRate: { total: 150, errors: 2, error_rate: 1.3 },
          trend: { requests: 5, cost: -10 }
        },
        '7d': { label: 'Last 7 Days', stats: { requests: 1000 }, savings: 80, providerBreakdown: [], topApps: [], errorRate: { total: 1000, errors: 15, error_rate: 1.5 }, trend: {} },
        '30d': { label: 'Last 30 Days', stats: { requests: 4000 }, savings: 350, providerBreakdown: [], topApps: [], errorRate: { total: 4000, errors: 60, error_rate: 1.5 }, trend: {} },
        '90d': { label: 'Last 90 Days', stats: { requests: 12000 }, savings: 1000, providerBreakdown: [], topApps: [], errorRate: { total: 12000, errors: 200, error_rate: 1.7 }, trend: {} }
      },
      opportunities: ['Try enabling Groq for faster responses']
    });
    expect(html).toContain('$12.50');
    expect(html).toContain('150');
    expect(html).toContain('OpenAI');
    expect(html).toContain('xswarm-freeloader');
    expect(html).toContain('Last 24 Hours');
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

  it('should build multi-range report via buildDaily()', async () => {
    testDb.usage.insert({
      provider_id: 'openai', model_id: 'openai/gpt-4o',
      tokens_in: 1000, tokens_out: 500, cost_usd: 0.01
    });

    const builder = new DigestBuilder(testDb.db);
    const digest = await builder.buildDaily();
    expect(digest.subject).toContain('xswarm report');
    expect(digest.html).toContain('xswarm-freeloader');
    expect(digest.html).toContain('Last 24 Hours');
  });

  it('should build multi-range report via buildReport()', async () => {
    testDb.usage.insert({
      provider_id: 'openai', model_id: 'openai/gpt-4o',
      tokens_in: 1000, tokens_out: 500, cost_usd: 0.01
    });

    const builder = new DigestBuilder(testDb.db);
    const digest = await builder.buildReport();
    expect(digest.subject).toContain('xswarm report');
    expect(digest.html).toContain('Last 7 Days');
    expect(digest.html).toContain('Last 30 Days');
    expect(digest.html).toContain('Last 90 Days');
  });
});
