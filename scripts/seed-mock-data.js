#!/usr/bin/env node
// :arch: mock data seeder — 90 days of realistic usage for reporting demos
// :deps: better-sqlite3, migrator, repositories, catalog-sync
// :rules: standalone script; uses insertWithTimestamp for backdated rows; idempotent (drops existing usage)
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrator.js';
import { ProviderRepository, ModelRepository, AppRepository, UsageRepository } from '../src/db/repositories/index.js';
import { CatalogSync } from '../src/providers/catalog-sync.js';
//
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DB_PATH = process.argv[2] || path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm', 'freeloader.db');
//
const APPS = [
  { id: 'chatbot-prod', name: 'chatbot-prod', trust_tier: 'standard' },
  { id: 'code-assistant', name: 'code-assistant', trust_tier: 'standard' },
  { id: 'doc-summarizer', name: 'doc-summarizer', trust_tier: 'open' },
  { id: 'internal-tools', name: 'internal-tools', trust_tier: 'open' },
  { id: 'api-gateway', name: 'api-gateway', trust_tier: 'private' }
];
//
// Provider config: latency range (ms), cost per 1M tokens (input), error baseline %
const PROVIDER_PROFILES = {
  groq:      { latencyMin: 50,  latencyMax: 200,  errorBase: 0.01 },
  cerebras:  { latencyMin: 40,  latencyMax: 180,  errorBase: 0.01 },
  openai:    { latencyMin: 200, latencyMax: 800,  errorBase: 0.02 },
  anthropic: { latencyMin: 300, latencyMax: 1200, errorBase: 0.015 },
  gemini:    { latencyMin: 150, latencyMax: 600,  errorBase: 0.02 },
  mistral:   { latencyMin: 100, latencyMax: 400,  errorBase: 0.015 },
  xai:       { latencyMin: 150, latencyMax: 500,  errorBase: 0.02 }
};
//
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return Math.random() * (max - min) + min; }
function isWeekday(date) { const d = date.getDay(); return d !== 0 && d !== 6; }
//
export async function seedMockData(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  //
  const providers = new ProviderRepository(db);
  const models = new ModelRepository(db);
  const apps = new AppRepository(db);
  const usage = new UsageRepository(db);
  //
  // Sync catalog for real providers/models
  console.log('  Syncing catalog...');
  const catalogSync = new CatalogSync(providers, models, {});
  await catalogSync.sync();
  //
  // Create apps (skip if exists)
  console.log('  Creating apps...');
  for (const appDef of APPS) {
    const existing = apps.get(appDef.id);
    if (!existing) apps.create(appDef);
  }
  //
  // Get available models grouped by provider
  const allModels = models.getAll({ enabled: true });
  const modelsByProvider = {};
  for (const m of allModels) {
    if (!PROVIDER_PROFILES[m.provider_id]) continue;
    if (!modelsByProvider[m.provider_id]) modelsByProvider[m.provider_id] = [];
    modelsByProvider[m.provider_id].push(m);
  }
  const activeProviders = Object.keys(modelsByProvider);
  if (!activeProviders.length) {
    console.error('  No providers with models found after catalog sync');
    db.close();
    return;
  }
  console.log(`  Active providers: ${activeProviders.join(', ')} (${allModels.length} models)`);
  //
  // Clear existing usage for clean seed
  db.prepare('DELETE FROM usage').run();
  //
  // Seed 90 days
  const now = Math.floor(Date.now() / 1000);
  const DAYS = 90;
  let totalRows = 0;
  let totalCost = 0;
  let totalErrors = 0;
  //
  const insertStmt = db.prepare(`
    INSERT INTO usage (ts, app_id, project_id, provider_id, model_id, tokens_in, tokens_out, latency_ms, cost_usd, trust_tier, sanitized, success, error_message, sanitization_action)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  //
  const bulkInsert = db.transaction((rows) => {
    for (const r of rows) {
      insertStmt.run(r.ts, r.app_id, r.project_id, r.provider_id, r.model_id, r.tokens_in, r.tokens_out, r.latency_ms, r.cost_usd, r.trust_tier, r.sanitized, r.success, r.error_message, r.sanitization_action);
    }
  });
  //
  console.log('  Generating usage data...');
  for (let dayOffset = DAYS; dayOffset >= 0; dayOffset--) {
    const dayStart = now - dayOffset * 86400;
    const date = new Date(dayStart * 1000);
    const weekday = isWeekday(date);
    // Gradual ramp: day 1 = 30% volume, day 90 = 100%
    const rampFactor = 0.3 + 0.7 * ((DAYS - dayOffset) / DAYS);
    const baseRequests = weekday ? rand(1200, 2000) : rand(400, 700);
    const dayRequests = Math.floor(baseRequests * rampFactor);
    // Occasional error spikes
    const errorSpikeProvider = Math.random() < 0.05 ? activeProviders[rand(0, activeProviders.length - 1)] : null;
    //
    const rows = [];
    for (let i = 0; i < dayRequests; i++) {
      // Pick provider (weighted: free tiers get more traffic)
      const providerId = activeProviders[rand(0, activeProviders.length - 1)];
      const providerModels = modelsByProvider[providerId];
      const model = providerModels[rand(0, providerModels.length - 1)];
      const profile = PROVIDER_PROFILES[providerId];
      // Pick app (weighted toward chatbot-prod)
      const appWeights = [0.35, 0.25, 0.2, 0.12, 0.08];
      const r = Math.random();
      let cumulative = 0;
      let appIdx = 0;
      for (let j = 0; j < appWeights.length; j++) { cumulative += appWeights[j]; if (r < cumulative) { appIdx = j; break; } }
      const app = APPS[appIdx];
      // Tokens
      const tokensIn = rand(50, 2000);
      const tokensOut = rand(20, 1500);
      // Cost: free tier = $0, otherwise use model pricing
      const isFree = model.free_tier;
      const cost = isFree ? 0 : (tokensIn * (model.pricing_input || 0) / 1000000) + (tokensOut * (model.pricing_output || 0) / 1000000);
      // Latency
      const latency = rand(profile.latencyMin, profile.latencyMax);
      // Error rate
      let errorRate = profile.errorBase;
      if (errorSpikeProvider === providerId) errorRate = 0.15;
      const success = Math.random() > errorRate;
      if (!success) totalErrors++;
      // Sanitization: ~5% flagged, 0.5% blocked
      const sanitRoll = Math.random();
      const sanitized = sanitRoll < 0.05;
      const blocked = sanitRoll < 0.005;
      // Timestamp spread across the day (more during business hours)
      const hour = weekday ? (Math.random() < 0.7 ? rand(8, 18) : rand(0, 23)) : rand(0, 23);
      const ts = dayStart + hour * 3600 + rand(0, 3599);
      //
      rows.push({
        ts, app_id: app.id, project_id: 'default', provider_id: providerId, model_id: model.id,
        tokens_in: tokensIn, tokens_out: tokensOut, latency_ms: latency, cost_usd: cost,
        trust_tier: app.trust_tier, sanitized: sanitized ? 1 : 0, success: success ? 1 : 0,
        error_message: success ? null : 'Provider returned error',
        sanitization_action: blocked ? 'blocked' : (sanitized ? 'redacted' : null)
      });
      totalCost += cost;
    }
    bulkInsert(rows);
    totalRows += rows.length;
  }
  //
  // Summary
  const providerBreakdown = db.prepare('SELECT provider_id, COUNT(*) as requests, SUM(cost_usd) as cost FROM usage GROUP BY provider_id ORDER BY requests DESC').all();
  const appBreakdown = db.prepare('SELECT app_id, COUNT(*) as requests FROM usage GROUP BY app_id ORDER BY requests DESC').all();
  //
  console.log(`\n  Seed complete:`);
  console.log(`    Total rows:   ${totalRows.toLocaleString()}`);
  console.log(`    Total cost:   $${totalCost.toFixed(2)}`);
  console.log(`    Total errors: ${totalErrors.toLocaleString()}`);
  console.log(`    Date range:   ${DAYS} days`);
  console.log(`\n  By provider:`);
  for (const p of providerBreakdown) console.log(`    ${p.provider_id.padEnd(12)} ${p.requests.toLocaleString().padStart(8)} reqs  $${(p.cost || 0).toFixed(4)}`);
  console.log(`\n  By app:`);
  for (const a of appBreakdown) console.log(`    ${(a.app_id || 'unknown').padEnd(18)} ${a.requests.toLocaleString().padStart(8)} reqs`);
  //
  db.close();
  return { totalRows, totalCost, totalErrors };
}
//
// Run directly
if (process.argv[1] && process.argv[1].includes('seed-mock-data')) {
  console.log('\n  xswarm-freeloader mock data seeder\n');
  seedMockData(SEED_DB_PATH).catch(err => { console.error('Seed failed:', err); process.exit(1); });
}
