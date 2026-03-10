// :ctx
// :arch Fastify app with per-app policies, sanitization, degradation scoring, admin APIs
// :why centralizes routing, auth, account/app/policy management and usage tracking in one HTTP layer
// :deps RateLimiter, selectRoute, sanitizeRequest, appKeys, appPolicies, configManager, degradationScorer
// :rules detectCapabilities auto-fills gates; sanitization runs before routing; request_id per request
// :edge no rateLimiter → skip; no budgetEnforcer → skip; ?debug=routing for local introspection
//
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { authenticateApiKey } from './auth.js';
import { RateLimiter } from './rate-limiter.js';
//
const __dirname = path.dirname(fileURLToPath(import.meta.url));
//
export function createApp(context) {
  const fastify = context.logger
    ? Fastify({ loggerInstance: context.logger })
    : Fastify({ logger: false });
  fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });
  // Serve pre-built dashboard static files at root
  const dashboardDist = path.resolve(__dirname, '..', 'dashboard', 'dist');
  if (existsSync(dashboardDist)) {
    fastify.register(fastifyStatic, { root: dashboardDist, prefix: '/' });
    // SPA fallback — serve index.html for unmatched non-API GET requests
    fastify.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/v1/') && !request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      reply.status(404).send({ error: { message: 'Not found', type: 'not_found', code: 404 } });
    });
  }
  fastify.addHook('onRequest', authenticateApiKey(context.apps, context.appKeys));
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({ error: { message: error.message || 'Internal server error', type: error.name || 'error', code: statusCode } });
  });
  fastify.decorate('ctx', context);
  return fastify;
}

export async function registerRoutes(app, context) {
  // Initialize rate limiter and load model limits
  if (!context.rateLimiter) context.rateLimiter = new RateLimiter();
  const allModels = context.models?.getAll({ enabled: true }) || [];
  context.rateLimiter.loadLimits(allModels);

  // Health check (no auth)
  app.get('/v1/health', async () => ({ status: 'ok', version: '2.0', uptime: process.uptime() }));

  // Models list
  app.get('/v1/models', async (request) => {
    const models = context.models.getAll({ enabled: true });
    return {
      object: 'list',
      data: models.map(m => ({
        id: m.id, object: 'model', created: m.created_at, owned_by: m.provider_id,
        context_window: m.context_window, pricing: { input: m.pricing_input, output: m.pricing_output }, free_tier: !!m.free_tier
      }))
    };
  });

  // Chat completions
  app.post('/v1/chat/completions', async (request, reply) => {
    const requestId = crypto.randomUUID();
    let { messages, model, stream, temperature, max_tokens, top_p, tools, tool_choice, response_format } = request.body;
    let appData = request.app;
    //
    // Phase 2: support ?app_id= or ?service_id= for request identification
    if (!appData && (request.query?.app_id || request.query?.service_id)) {
      const lookupId = request.query.app_id || request.query.service_id;
      appData = context.apps.get(lookupId);
    }
    //
    // Phase 3: Sanitization
    let sanitizationResult = null;
    const profile = appData?.sanitization_profile || context.config?.sanitization?.defaultProfile || 'off';
    if (profile !== 'off') {
      const { sanitizeRequest } = await import('./sanitizer.js');
      const sanitized = await sanitizeRequest(messages, profile, appData?.id, context.sanitizationRepo);
      if (sanitized.blocked) {
        reply.status(400).send({ error: { message: 'Request blocked by content policy', type: 'content_policy', request_id: requestId } });
        return;
      }
      messages = sanitized.messages;
      sanitizationResult = sanitized.result;
    }
    //
    // Budget check
    if (context.budgetEnforcer && appData) context.budgetEnforcer.checkBudget(appData.id, request.body.project_id || 'default', appData);
    // Auto-detect capabilities
    const { detectCapabilities } = await import('./quality-gates.js');
    const caps = detectCapabilities({ messages, tools });
    let candidates = context.models.getAll({ enabled: true });
    const gates = { ...(context.config?.routing?.qualityGates || {}), ...caps };
    if (appData?.trust_tier) gates.trustTier = appData.trust_tier;
    const { applyQualityGates } = await import('./quality-gates.js');
    candidates = applyQualityGates(candidates, gates);
    if (model) {
      const exact = candidates.find(m => m.id === model || m.name === model);
      if (exact) candidates = [exact];
    }
    //
    // Phase 4: Load app policy
    const appPolicy = appData && context.appPolicies ? context.appPolicies.get(appData.id) : null;
    //
    // Select route with all context
    const { selectRoute } = await import('./scorer.js');
    candidates = await selectRoute(candidates, { messages, tools, requiresTools: caps.requiresTools, requiresVision: caps.requiresVision }, {
      trustTier: appData?.trust_tier, db: context.db, healthMonitor: context.healthMonitor,
      accounts: context.accounts, rateLimiter: context.rateLimiter, budgetEnforcer: context.budgetEnforcer,
      appPolicy, degradationScorer: context.degradationScorer,
      sanitizationContext: sanitizationResult
    });
    //
    // Debug routing metadata (local/admin only)
    const debugRouting = request.query?.debug === 'routing';
    const routingDebug = debugRouting ? {
      request_id: requestId, candidates_count: candidates.length,
      candidates: candidates.slice(0, 5).map(c => ({ id: c.id, provider: c.provider_id, cost: c.pricing_input, degradation: c._degradationScore, latency: c._latency })),
      app_policy: appPolicy ? { allowed_providers: appPolicy.allowed_providers, blocked_providers: appPolicy.blocked_providers } : null,
      sanitization: sanitizationResult ? { profile, blocked: sanitizationResult.blocked, rules_fired: sanitizationResult.rules_fired } : null
    } : null;
    //
    if (candidates.length === 0) {
      const errorResponse = { error: { message: 'No models available', type: 'no_providers', request_id: requestId } };
      if (routingDebug) errorResponse._routing_debug = routingDebug;
      reply.status(503).send(errorResponse);
      return;
    }
    // Execute with fallback
    const { executeWithFallback } = await import('./fallback.js');
    const startTime = Date.now();
    const result = await executeWithFallback(candidates, async (candidate) => {
      const adapter = context.registry.get(candidate.provider_id);
      if (!adapter) throw new Error(`No adapter for ${candidate.provider_id}`);
      if (context.healthMonitor && !context.healthMonitor.isAvailable(candidate.provider_id)) throw new Error(`Circuit breaker open for ${candidate.provider_id}`);
      const accounts = context.accounts.getByProvider(candidate.provider_id);
      const apiKey = accounts[0]?.api_key;
      if (!apiKey && !candidate.is_local) throw new Error(`No API key for ${candidate.provider_id}`);
      const options = { model: candidate.name, stream, temperature, max_tokens, top_p, tools, tool_choice, response_format };
      try {
        const res = await adapter.chatCompletion(messages, options, apiKey || '');
        context.healthMonitor?.recordSuccess(candidate.provider_id);
        context.degradationScorer?.recordObservation(candidate.provider_id, candidate.id, { latencyMs: Date.now() - startTime, success: true, timeout: false });
        if (stream) {
          reply.raw.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              reply.raw.write(decoder.decode(value, { stream: true }));
            }
          } finally { reply.raw.end(); }
          return { streamed: true };
        }
        return res;
      } catch (err) {
        context.healthMonitor?.recordFailure(candidate.provider_id);
        context.degradationScorer?.recordObservation(candidate.provider_id, candidate.id, { latencyMs: Date.now() - startTime, success: false, timeout: err.code === 'ETIMEDOUT' });
        throw err;
      }
    }, context.logger);
    const latencyMs = Date.now() - startTime;
    // Record usage, rate limiter, provider_stats
    if (result && !result.streamed) {
      const tokensUsed = (result.usage?.prompt_tokens || 0) + (result.usage?.completion_tokens || 0);
      const usedModel = candidates[0];
      if (usedModel) context.rateLimiter?.recordRequest(usedModel.id, tokensUsed);
      const cost = ((result.usage?.prompt_tokens || 0) * (usedModel?.pricing_input || 0) / 1000000) +
                   ((result.usage?.completion_tokens || 0) * (usedModel?.pricing_output || 0) / 1000000);
      context.usage?.insert({
        app_id: appData?.id, project_id: request.body.project_id || 'default',
        provider_id: result.routing?.provider, model_id: result.routing?.model_id,
        tokens_in: result.usage?.prompt_tokens || 0, tokens_out: result.usage?.completion_tokens || 0,
        latency_ms: latencyMs, cost_usd: cost, trust_tier: appData?.trust_tier,
        request_id: requestId, app_key_id: request.appKey?.id || null,
        sanitization_action: sanitizationResult?.action_taken || null,
        routing_metadata: debugRouting ? routingDebug : null
      });
      if (context.budgetEnforcer && appData) context.budgetEnforcer.recordUsage(appData.id, request.body.project_id || 'default', cost);
      _recordProviderStats(context.db, usedModel, latencyMs, result.usage || {});
      // Attach debug routing to response
      if (routingDebug) result._routing_debug = routingDebug;
    }
    return result;
  });

  // Embeddings
  app.post('/v1/embeddings', async (request) => {
    const { input, model } = request.body;
    const modelData = context.models.get(model);
    if (!modelData) throw { statusCode: 404, message: `Model ${model} not found` };
    const adapter = context.registry.get(modelData.provider_id);
    const accounts = context.accounts.getByProvider(modelData.provider_id);
    const apiKey = accounts[0]?.api_key || '';
    return adapter.embeddings(input, model, apiKey);
  });

  // Dashboard overview
  app.get('/api/overview', async () => ({
    stats: { today: context.usage?.getStats(null, 'day') || {}, month: context.usage?.getStats(null, 'month') || {} },
    providers: context.providers?.getAll({ enabled: true }) || [],
    recentRequests: context.usage?.getRecent(20) || []
  }));

  app.get('/api/providers', async () => {
    const providers = context.providers?.getAll() || [];
    const degradationScores = context.degradationScorer?.getAllScores() || {};
    return providers.map(p => ({
      ...p, models: context.models?.getByProvider(p.id) || [],
      health: context.healthMonitor?.getCircuit(p.id) || null,
      degradation: degradationScores[p.id] || null
    }));
  });

  app.get('/api/apps', async () => context.apps?.getAll() || []);
  app.post('/api/apps', async (request) => context.apps?.create(request.body));
  app.delete('/api/apps/:id', async (request) => { context.apps?.delete(request.params.id); return { ok: true }; });
  app.put('/api/apps/:id', async (request) => context.apps?.update(request.params.id, request.body));
  //
  // Phase 1: App key management
  app.get('/api/apps/:id/keys', async (request) => context.appKeys?.getByApp(request.params.id) || []);
  //
  app.post('/api/apps/:id/keys', async (request, reply) => {
    const { generateAppApiKey } = await import('../utils/crypto.js');
    const { key, hash, prefix } = generateAppApiKey();
    const keyRecord = context.appKeys?.create({
      appId: request.params.id, keyHash: hash, keyPrefix: prefix,
      permissions: request.body.permissions, rateLimitRps: request.body.rate_limit_rps,
      rateLimitRpm: request.body.rate_limit_rpm, tokenQuotaDaily: request.body.token_quota_daily,
      tokenQuotaMonthly: request.body.token_quota_monthly, costQuotaDaily: request.body.cost_quota_daily,
      costQuotaMonthly: request.body.cost_quota_monthly
    });
    return { ...keyRecord, key }; // Return raw key only once
  });
  //
  app.delete('/api/apps/:id/keys/:keyId', async (request) => {
    const revoked = context.appKeys?.revoke(parseInt(request.params.keyId));
    return { ok: revoked };
  });
  //
  app.post('/api/apps/:id/keys/:keyId/rotate', async (request) => {
    const { generateAppApiKey } = await import('../utils/crypto.js');
    const { key, hash, prefix } = generateAppApiKey();
    const newKey = context.appKeys?.rotate(parseInt(request.params.keyId), hash, prefix);
    if (!newKey) return { ok: false, error: 'Key not found' };
    return { ...newKey, key }; // Return raw key only once
  });
  //
  // Phase 2: Per-app stats and detail
  app.get('/api/apps/:id/stats', async (request) => {
    const appId = request.params.id;
    const app = context.apps?.get(appId);
    if (!app) return { error: 'App not found' };
    const dayAgo = Math.floor(Date.now() / 1000) - 86400;
    return {
      app, keys: context.appKeys?.getByApp(appId) || [],
      stats: { today: context.usage?.getStats(appId, 'day'), month: context.usage?.getStats(appId, 'month') },
      costByProvider: context.usage?.getCostByProviderForApp(appId, dayAgo) || []
    };
  });
  //
  app.get('/api/apps/:id/usage', async (request) => {
    const days = parseInt(request.query?.days) || 30;
    return context.usage?.getTimeseriesByApp(request.params.id, days) || [];
  });
  //
  // Phase 4: App policy CRUD
  app.get('/api/apps/:id/policy', async (request) => context.appPolicies?.get(request.params.id) || {});
  //
  app.put('/api/apps/:id/policy', async (request) => {
    return context.appPolicies?.upsert(request.params.id, request.body) || {};
  });
  //
  app.delete('/api/apps/:id/policy', async (request) => {
    const deleted = context.appPolicies?.delete(request.params.id);
    return { ok: deleted };
  });

  app.get('/api/usage', async (request) => {
    const limit = parseInt(request.query.limit) || 50;
    return context.usage?.getRecent(limit, request.query) || [];
  });

  app.get('/api/settings', async () => ({ config: context.config, health: context.healthMonitor?.getStatus() || {} }));
  //
  // Phase 6: Config management API
  app.get('/api/config', async () => context.configManager?.getCurrent() || context.config);
  //
  app.put('/api/config', async (request) => {
    const updated = context.configManager?.update(request.body, request.dashboardUser?.name || 'api', request.body._description || '');
    if (updated) context.config = updated; // Update live config
    return updated || context.config;
  });
  //
  app.get('/api/config/versions', async (request) => {
    const limit = parseInt(request.query?.limit) || 20;
    return context.configManager?.listVersions(limit) || [];
  });
  //
  app.post('/api/config/rollback/:id', async (request) => {
    const version = parseInt(request.params.id);
    const rolled = context.configManager?.rollback(version, request.dashboardUser?.name || 'api');
    if (rolled) context.config = rolled;
    return rolled || { error: 'Rollback failed' };
  });
  //
  // Phase 2: Top apps analytics
  app.get('/api/usage/top-apps', async (request) => {
    const since = Math.floor(Date.now() / 1000) - (parseInt(request.query?.days) || 30) * 86400;
    return context.usage?.getTopApps(since, parseInt(request.query?.limit) || 10) || [];
  });

  // Account CRUD API
  app.get('/api/accounts', async () => {
    const accounts = context.accounts?.getAll() || [];
    return accounts.map(a => {
      const provider = context.providers?.get(a.provider_id) || null;
      return { ...a, api_key: undefined, provider };
    });
  });

  app.post('/api/accounts', async (request, reply) => {
    const { provider_id, api_key } = request.body;
    if (!provider_id || !api_key) { reply.status(400).send({ error: { message: 'provider_id and api_key required' } }); return; }
    return context.accounts?.insert({ provider_id, api_key });
  });

  app.put('/api/accounts/:id/key', async (request, reply) => {
    const { api_key } = request.body;
    if (!api_key) { reply.status(400).send({ error: { message: 'api_key required' } }); return; }
    const existing = context.accounts?.get(parseInt(request.params.id));
    if (!existing) { reply.status(404).send({ error: { message: 'Account not found' } }); return; }
    context.accounts?.delete(existing.id);
    return context.accounts?.insert({ provider_id: existing.provider_id, api_key });
  });

  app.delete('/api/accounts/:id', async (request, reply) => {
    const deleted = context.accounts?.delete(parseInt(request.params.id));
    if (!deleted) { reply.status(404).send({ error: { message: 'Account not found' } }); return; }
    return { ok: true };
  });

  app.post('/api/accounts/:id/test', async (request, reply) => {
    const account = context.accounts?.get(parseInt(request.params.id));
    if (!account) { reply.status(404).send({ error: { message: 'Account not found' } }); return; }
    const adapter = context.registry?.get(account.provider_id);
    if (!adapter) { reply.status(400).send({ error: { message: `No adapter for ${account.provider_id}` } }); return; }
    try {
      await adapter.healthCheck?.(account.api_key);
      context.accounts?.updateStatus(account.id, 'active');
      return { ok: true, status: 'active' };
    } catch (err) {
      context.accounts?.updateStatus(account.id, 'invalid');
      return { ok: false, status: 'invalid', error: err.message };
    }
  });

  // Usage analytics endpoints
  app.get('/api/usage/timeseries', async (request) => context.usage?.getTimeseries(parseInt(request.query.days) || 30) || []);

  app.get('/api/usage/by-provider', async () => {
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    return context.usage?.getByProviderAggregated(since) || [];
  });

  app.post('/api/accounts/backup', async (request, reply) => {
    if (!context.mailer?.isConfigured()) { reply.status(503).send({ error: { message: 'Email not configured' } }); return; }
    const { encryptApiKey } = await import('../utils/crypto.js');
    const accounts = context.accounts?.getAll() || [];
    const bundle = JSON.stringify(accounts.map(a => ({ id: a.id, provider_id: a.provider_id, api_key: a.api_key })));
    const encrypted = encryptApiKey(bundle);
    const to = context.config?.email?.reportTo || context.config?.email?.smtp?.user;
    if (!to) { reply.status(503).send({ error: { message: 'No recipient email configured' } }); return; }
    await context.mailer.send(to, 'xswarm-freeloader: API Key Backup', '<p>Encrypted backup attached.</p>', [{ filename: 'backup.json', content: JSON.stringify(encrypted) }]);
    return { ok: true, sent_to: to };
  });

  // Rate limit usage per model
  app.get('/api/rate-limits', async () => {
    const models = context.models?.getAll({ enabled: true }) || [];
    return models.reduce((acc, m) => { acc[m.id] = context.rateLimiter?.getUsage(m.id) || null; return acc; }, {});
  });
  //
  // Local reports — generated on this machine, saved to ~/.xswarm/reports/
  app.get('/api/reports', async () => {
    if (!context.reportStore) return [];
    return context.reportStore.list().map(f => ({ filename: f, date: f.replace('xswarm-report-', '').replace('.pdf', '') }));
  });
  //
  app.get('/api/reports/latest', async (request, reply) => {
    if (!context.reportStore) { reply.status(503).send({ error: { message: 'Report store not configured' } }); return; }
    const report = context.reportStore.getLatest();
    if (!report) { reply.status(404).send({ error: { message: 'No reports generated yet' } }); return; }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${report.name}"`);
    return reply.send(report.buffer);
  });
  //
  app.get('/api/reports/:date', async (request, reply) => {
    if (!context.reportStore) { reply.status(503).send({ error: { message: 'Report store not configured' } }); return; }
    const report = context.reportStore.getByDate(request.params.date);
    if (!report) { reply.status(404).send({ error: { message: 'Report not found' } }); return; }
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${report.name}"`);
    return reply.send(report.buffer);
  });
  //
  app.post('/api/reports/generate', async (request, reply) => {
    if (!context.digestBuilder) { reply.status(503).send({ error: { message: 'Report generator not configured' } }); return; }
    const digest = await context.digestBuilder.buildDaily();
    const result = { ok: true, savedPath: digest.savedPath };
    // Optionally email if mailer available and recipient configured
    const to = context.config?.email?.to || context.config?.email?.reportTo;
    if (to && context.mailer?.isConfigured()) {
      await context.mailer.send(to, digest.subject, digest.html, digest.attachments);
      result.emailed = to;
    }
    return result;
  });
  //
  // Test report — generates multi-range report and sends via configured email
  app.post('/api/reports/test', async (request, reply) => {
    if (!context.digestBuilder) { reply.status(503).send({ error: { message: 'Report generator not configured' } }); return; }
    const digest = await context.digestBuilder.buildReport();
    const result = { ok: true, savedPath: digest.savedPath };
    const to = context.config?.email?.to;
    if (to && context.mailer?.isConfigured()) {
      await context.mailer.send(to, digest.subject, digest.html, digest.attachments);
      result.emailed = to;
    }
    return result;
  });

  // Dashboard auth
  app.post('/api/auth/login', async (request) => {
    const { password } = request.body;
    const { verifyPassword } = await import('../utils/crypto.js');
    const { createDashboardToken } = await import('./auth.js');
    const stored = context.config?.dashboardPassword;
    if (!stored) throw { statusCode: 500, message: 'No password configured. Re-run: npx xswarm-freeloader' };
    if (!verifyPassword(password, stored)) throw { statusCode: 401, message: 'Invalid password' };
    return { token: createDashboardToken() };
  });
}

// Record provider_stats (upsert with running avg_latency_ms)
function _recordProviderStats(db, model, latencyMs, usage) {
  if (!db || !model) return;
  const now = Math.floor(Date.now() / 1000);
  const hourStart = now - (now % 3600);
  const dayStart = now - (now % 86400);
  const tokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  try {
    const upsert = db.prepare(`
      INSERT INTO provider_stats (provider_id, model_id, period, window_start, request_count, token_count, avg_latency_ms)
      VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(provider_id, model_id, period, window_start) DO UPDATE SET
        request_count = request_count + 1,
        token_count = token_count + excluded.token_count,
        avg_latency_ms = ((avg_latency_ms * request_count) + excluded.avg_latency_ms) / (request_count + 1)
    `);
    upsert.run(model.provider_id, model.id, 'hour', hourStart, tokens, latencyMs);
    upsert.run(model.provider_id, model.id, 'day', dayStart, tokens, latencyMs);
  } catch (_) { /* provider_stats might not exist in old dbs */ }
}
