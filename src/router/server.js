// :arch: server bootstrap — orchestrates all services, repos, and startup sequence
// :deps: all repositories, registry, health monitor, degradation scorer, config manager, budget, email
// :rules: migration order 001→008; hash existing plaintext keys on startup; save initial config version
import { initDatabase } from '../db/db.js';
import { runMigrations } from '../db/migrator.js';
import { ConfigLoader } from '../config/loader.js';
import { ProviderRepository, ModelRepository, AccountRepository, AppRepository, AppKeyRepository, AppPolicyRepository, UsageRepository, BudgetRepository, SanitizationRepository } from '../db/repositories/index.js';
import { ProviderRegistry } from '../providers/registry.js';
import { HealthMonitor } from '../providers/health-monitor.js';
import { DegradationScorer } from '../providers/degradation-scorer.js';
import { CatalogSync } from '../providers/catalog-sync.js';
import { BudgetTracker } from '../budget/tracker.js';
import { BudgetEnforcer } from '../budget/enforcer.js';
import { ConfigManager } from '../config/manager.js';
import { createLogger } from '../utils/logger.js';
import { hashApiKey } from '../utils/crypto.js';
import { RateLimiter } from './rate-limiter.js';
import { createApp, registerRoutes } from './app.js';
//
function migrateExistingKeys(db, apps, appKeys, logger) {
  try {
    const allApps = apps.getAll();
    for (const app of allApps) {
      if (!app.api_key) continue;
      const keyHash = hashApiKey(app.api_key);
      const existing = appKeys.getByHash(keyHash);
      if (existing) continue;
      const keyPrefix = app.api_key.substring(0, 8);
      appKeys.create({ appId: app.id, keyHash, keyPrefix, permissions: ['chat'] });
      logger?.info?.(`Migrated key for app ${app.name} (${keyPrefix}...)`);
    }
  } catch (err) { logger?.warn?.(`Key migration skipped: ${err.message}`); }
}
//
export async function startServer(options = {}) {
  const configLoader = new ConfigLoader(options.configPath);
  const config = configLoader.load();
  const logger = createLogger({ level: config.logging?.level || 'info' });
  // Database
  const dbPath = options.dbPath || (await import('../db/db.js')).getDefaultDbPath();
  const db = initDatabase(dbPath);
  runMigrations(db);
  // Repositories
  const providers = new ProviderRepository(db);
  const models = new ModelRepository(db);
  const accounts = new AccountRepository(db);
  const apps = new AppRepository(db);
  const appKeys = new AppKeyRepository(db);
  const appPolicies = new AppPolicyRepository(db);
  const usage = new UsageRepository(db);
  const sanitizationRepo = new SanitizationRepository(db);
  // Migrate existing plaintext keys → app_keys table
  migrateExistingKeys(db, apps, appKeys, logger);
  // Catalog sync
  const catalogSync = new CatalogSync(providers, models, config, logger);
  await catalogSync.sync();
  // Provider registry
  const registry = new ProviderRegistry(db, logger);
  registry.loadFromDb(providers);
  // Health monitor + degradation scorer
  const degradationScorer = new DegradationScorer(db);
  const healthMonitor = new HealthMonitor(registry, providers, logger, degradationScorer);
  healthMonitor.startPolling();
  degradationScorer.startPersistence();
  // Config manager
  const configManager = new ConfigManager(db, configLoader, logger);
  configManager.saveInitialVersion(config);
  // Budget
  const budgetTracker = new BudgetTracker(db, logger);
  const budgetEnforcer = new BudgetEnforcer(budgetTracker, logger);
  const rateLimiter = new RateLimiter();
  // Email & reports
  const { Mailer } = await import('../email/mailer.js');
  const { DigestBuilder } = await import('../email/digest.js');
  const { ReportStore } = await import('../email/report-store.js');
  const { EmailScheduler } = await import('../email/scheduler.js');
  const mailer = new Mailer(config, logger);
  const reportStore = new ReportStore();
  const digestBuilder = new DigestBuilder(db, logger);
  const emailScheduler = new EmailScheduler(config, db, logger);
  emailScheduler.start();
  // Context
  const context = {
    config, configLoader, logger, db, providers, models, accounts, apps, appKeys, appPolicies,
    usage, sanitizationRepo, registry, healthMonitor, degradationScorer, configManager,
    budgetTracker, budgetEnforcer, rateLimiter, mailer, reportStore, digestBuilder
  };
  // Fastify
  const app = createApp(context);
  await registerRoutes(app, context);
  const port = config.server?.routerPort || 4011;
  const host = config.server?.host || '127.0.0.1';
  await app.listen({ port, host });
  logger.info(`xswarm-freeloader router listening on ${host}:${port}`);
  // Graceful shutdown
  const shutdown = async () => {
    emailScheduler.stop();
    healthMonitor.stopPolling();
    degradationScorer.stopPersistence();
    await app.close();
    db.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return { app, context };
}

// Auto-start when run as entry point (node directly or pm2)
startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
