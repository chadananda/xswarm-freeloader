import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authenticateApiKey } from './auth.js';

export function createApp(context) {
  const fastify = Fastify({
    logger: context.logger || false
  });

  fastify.register(cors, {
    origin: [`http://localhost:${context.config?.server?.dashboardPort || 4010}`, 'http://127.0.0.1:4010'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Auth hook
  fastify.addHook('onRequest', authenticateApiKey(context.apps));

  // Error handler
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: {
        message: error.message || 'Internal server error',
        type: error.name || 'error',
        code: statusCode
      }
    });
  });

  // Decorate with context
  fastify.decorate('ctx', context);

  return fastify;
}

export async function registerRoutes(app, context) {
  // Health check (no auth)
  app.get('/v1/health', async () => ({
    status: 'ok',
    version: '2.0',
    uptime: process.uptime()
  }));

  // Models list
  app.get('/v1/models', async (request) => {
    const models = context.models.getAll({ enabled: true });
    return {
      object: 'list',
      data: models.map(m => ({
        id: m.id,
        object: 'model',
        created: m.created_at,
        owned_by: m.provider_id,
        context_window: m.context_window,
        pricing: { input: m.pricing_input, output: m.pricing_output },
        free_tier: !!m.free_tier
      }))
    };
  });

  // Chat completions
  app.post('/v1/chat/completions', async (request, reply) => {
    const { messages, model, stream, temperature, max_tokens, top_p, tools, tool_choice, response_format } = request.body;
    const appData = request.app;

    // Budget check
    if (context.budgetEnforcer && appData) {
      context.budgetEnforcer.checkBudget(appData.id, request.body.project_id || 'default', appData);
    }

    // Get available models
    let candidates = context.models.getAll({ enabled: true });

    // Apply quality gates
    const gates = context.config?.routing?.qualityGates || {};
    if (appData?.trust_tier) gates.trustTier = appData.trust_tier;
    candidates = (await import('./quality-gates.js')).applyQualityGates(candidates, gates);

    // If specific model requested, filter to it
    if (model) {
      const exact = candidates.find(m => m.id === model || m.name === model);
      if (exact) candidates = [exact];
    }

    // Score and sort
    const weights = context.config?.routing?.weights || { cost: 0.4, speed: 0.4, quality: 0.2 };
    const { scoreModels } = await import('./scorer.js');
    candidates = scoreModels(candidates, weights, { requiredTrust: appData?.trust_tier });

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

      // Check circuit breaker
      if (context.healthMonitor && !context.healthMonitor.isAvailable(candidate.provider_id)) {
        throw new Error(`Circuit breaker open for ${candidate.provider_id}`);
      }

      // Get API key
      const accounts = context.accounts.getByProvider(candidate.provider_id);
      const apiKey = accounts[0]?.api_key;
      if (!apiKey && !candidate.is_local) throw new Error(`No API key for ${candidate.provider_id}`);

      const options = {
        model: candidate.name,
        stream, temperature, max_tokens, top_p, tools, tool_choice, response_format
      };

      try {
        const result = await adapter.chatCompletion(messages, options, apiKey || '');
        context.healthMonitor?.recordSuccess(candidate.provider_id);

        if (stream) {
          reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          const reader = result.body.getReader();
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              reply.raw.write(decoder.decode(value, { stream: true }));
            }
          } finally {
            reply.raw.end();
          }
          return { streamed: true };
        }

        return result;
      } catch (err) {
        context.healthMonitor?.recordFailure(candidate.provider_id);
        throw err;
      }
    }, context.logger);

    const latencyMs = Date.now() - startTime;

    // Record usage
    if (result && !result.streamed) {
      const cost = ((result.usage?.prompt_tokens || 0) * (candidates[0]?.pricing_input || 0) / 1000000) +
                   ((result.usage?.completion_tokens || 0) * (candidates[0]?.pricing_output || 0) / 1000000);

      context.usage?.insert({
        app_id: appData?.id,
        project_id: request.body.project_id || 'default',
        provider_id: result.routing?.provider,
        model_id: result.routing?.model_id,
        tokens_in: result.usage?.prompt_tokens || 0,
        tokens_out: result.usage?.completion_tokens || 0,
        latency_ms: latencyMs,
        cost_usd: cost,
        trust_tier: appData?.trust_tier
      });

      if (context.budgetEnforcer && appData) {
        context.budgetEnforcer.recordUsage(appData.id, request.body.project_id || 'default', cost);
      }
    }

    return result;
  });

  // Embeddings
  app.post('/v1/embeddings', async (request) => {
    const { input, model } = request.body;
    const modelData = context.models.get(model);
    if (!modelData) {
      throw { statusCode: 404, message: `Model ${model} not found` };
    }

    const adapter = context.registry.get(modelData.provider_id);
    const accounts = context.accounts.getByProvider(modelData.provider_id);
    const apiKey = accounts[0]?.api_key || '';

    return adapter.embeddings(input, model, apiKey);
  });

  // Dashboard API routes
  app.get('/api/overview', async () => {
    const dayAgo = Math.floor(Date.now() / 1000) - 86400;
    const monthAgo = Math.floor(Date.now() / 1000) - 86400 * 30;
    return {
      stats: {
        today: context.usage?.getStats(null, 'day') || {},
        month: context.usage?.getStats(null, 'month') || {}
      },
      providers: context.providers?.getAll({ enabled: true }) || [],
      recentRequests: context.usage?.getRecent(20) || []
    };
  });

  app.get('/api/providers', async () => {
    const providers = context.providers?.getAll() || [];
    return providers.map(p => ({
      ...p,
      models: context.models?.getByProvider(p.id) || [],
      health: context.healthMonitor?.getCircuit(p.id) || null
    }));
  });

  app.get('/api/apps', async () => context.apps?.getAll() || []);

  app.post('/api/apps', async (request) => {
    return context.apps?.create(request.body);
  });

  app.delete('/api/apps/:id', async (request) => {
    context.apps?.delete(request.params.id);
    return { ok: true };
  });

  app.get('/api/usage', async (request) => {
    const limit = parseInt(request.query.limit) || 50;
    return context.usage?.getRecent(limit, request.query) || [];
  });

  app.get('/api/settings', async () => ({
    config: context.config,
    health: context.healthMonitor?.getStatus() || {}
  }));

  // Dashboard auth
  app.post('/api/auth/login', async (request) => {
    const { password } = request.body;
    const { verifyPassword } = await import('../utils/crypto.js');
    const { createDashboardToken } = await import('./auth.js');

    const stored = context.config?.dashboardPassword;
    if (!stored) {
      // First login — no password set, accept anything and set it
      const { hashPassword } = await import('../utils/crypto.js');
      context.config.dashboardPassword = hashPassword(password);
      return { token: createDashboardToken(), firstLogin: true };
    }

    if (!verifyPassword(password, stored)) {
      throw { statusCode: 401, message: 'Invalid password' };
    }

    return { token: createDashboardToken() };
  });
}
