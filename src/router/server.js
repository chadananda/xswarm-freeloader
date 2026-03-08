import { initDatabase } from '../db/db.js';
import { runMigrations } from '../db/migrator.js';
import { ConfigLoader } from '../config/loader.js';
import { ProviderRepository, ModelRepository, AccountRepository, AppRepository, UsageRepository, BudgetRepository } from '../db/repositories/index.js';
import { ProviderRegistry } from '../providers/registry.js';
import { HealthMonitor } from '../providers/health-monitor.js';
import { CatalogSync } from '../providers/catalog-sync.js';
import { BudgetTracker } from '../budget/tracker.js';
import { BudgetEnforcer } from '../budget/enforcer.js';
import { createLogger } from '../utils/logger.js';
import { createApp, registerRoutes } from './app.js';

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
  const usage = new UsageRepository(db);

  // Catalog sync
  const catalogSync = new CatalogSync(providers, models, config, logger);
  await catalogSync.sync();

  // Provider registry
  const registry = new ProviderRegistry(db, logger);
  registry.loadFromDb(providers);

  // Health monitor
  const healthMonitor = new HealthMonitor(registry, providers, logger);
  healthMonitor.startPolling();

  // Budget
  const budgetTracker = new BudgetTracker(db, logger);
  const budgetEnforcer = new BudgetEnforcer(budgetTracker, logger);

  // Context
  const context = {
    config, logger, db, providers, models, accounts, apps, usage,
    registry, healthMonitor, budgetTracker, budgetEnforcer
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
    healthMonitor.stopPolling();
    await app.close();
    db.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { app, context };
}

// Auto-start when run directly
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
