// :ctx
// :arch Fastify app with rate limiter, new cheapest-first scorer, account CRUD APIs, provider_stats recording
// :why centralizes routing, auth, account management and usage tracking in one HTTP layer
// :deps RateLimiter, selectRoute, detectCapabilities, applyQualityGates, executeWithFallback, accounts repo
// :rules detectCapabilities auto-fills tools/vision gates; rateLimiter.recordRequest after success; provider_stats upserted per request
// :edge no rateLimiter in context → skip; no budgetEnforcer.canAfford → skip that filter

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authenticateApiKey } from './auth.js';
import { RateLimiter } from './rate-limiter.js';

export function createApp(context) {
  const fastify = Fastify({ logger: context.logger || false });
  fastify.register(cors, {
    origin: [`http://localhost:${context.config?.server?.dashboardPort || 4010}`, 'http://127.0.0.1:4010'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });
  fastify.addHook('onRequest', authenticateApiKey(context.apps));
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
    const { messages, model, stream, temperature, max_tokens, top_p, tools, tool_choice, response_format } = request.body;
    const appData = request.app;
    // Budget check
    if (context.budgetEnforcer && appData) context.budgetEnforcer.checkBudget(appData.id, request.body.project_id || 'default', appData);
    // Auto-detect capabilities
    const { detectCapabilities } = await import('./quality-gates.js');
    const caps = detectCapabilities({ messages, tools });
    // Get available models
    let candidates = context.models.getAll({ enabled: true });
    // Apply quality gates
    const gates = { ...(context.config?.routing?.qualityGates || {}), ...caps };
    if (appData?.trust_tier) gates.trustTier = appData.trust_tier;
    const { applyQualityGates } = await import('./quality-gates.js');
    candidates = applyQualityGates(candidates, gates);
    // If specific model requested, filter to it
    if (model) {
      const exact = candidates.find(m => m.id === model || m.name === model);
      if (exact) candidates = [exact];
    }
    // Select route with cheapest-first (includes rate limiter, health, accounts filters)
    const { selectRoute } = await import('./scorer.js');
    candidates = await selectRoute(candidates, { messages, tools, requiresTools: caps.requiresTools, requiresVision: caps.requiresVision }, {
      trustTier: appData?.trust_tier,
      db: context.db,
      healthMonitor: context.healthMonitor,
      accounts: context.accounts,
      rateLimiter: context.rateLimiter,
      budgetEnforcer: context.budgetEnforcer
    });
    if (candidates.length === 0) {
      reply.status(503).send({ error: { message: 'No models available', type: 'no_providers' } });
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
        latency_ms: latencyMs, cost_usd: cost, trust_tier: appData?.trust_tier
      });
      if (context.budgetEnforcer && appData) context.budgetEnforcer.recordUsage(appData.id, request.body.project_id || 'default', cost);
      // Upsert provider_stats
      _recordProviderStats(context.db, usedModel, latencyMs, result.usage || {});
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
    return providers.map(p => ({ ...p, models: context.models?.getByProvider(p.id) || [], health: context.healthMonitor?.getCircuit(p.id) || null }));
  });

  app.get('/api/apps', async () => context.apps?.getAll() || []);
  app.post('/api/apps', async (request) => context.apps?.create(request.body));
  app.delete('/api/apps/:id', async (request) => { context.apps?.delete(request.params.id); return { ok: true }; });

  app.get('/api/usage', async (request) => {
    const limit = parseInt(request.query.limit) || 50;
    return context.usage?.getRecent(limit, request.query) || [];
  });

  app.get('/api/settings', async () => ({ config: context.config, health: context.healthMonitor?.getStatus() || {} }));

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

  // Rate limit usage per model
  app.get('/api/rate-limits', async () => {
    const models = context.models?.getAll({ enabled: true }) || [];
    return models.reduce((acc, m) => { acc[m.id] = context.rateLimiter?.getUsage(m.id) || null; return acc; }, {});
  });

  // Dashboard auth
  app.post('/api/auth/login', async (request) => {
    const { password } = request.body;
    const { verifyPassword } = await import('../utils/crypto.js');
    const { createDashboardToken } = await import('./auth.js');
    const stored = context.config?.dashboardPassword;
    if (!stored) {
      const { hashPassword } = await import('../utils/crypto.js');
      context.config.dashboardPassword = hashPassword(password);
      return { token: createDashboardToken(), firstLogin: true };
    }
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
