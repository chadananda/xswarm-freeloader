// :ctx
// :arch cheapest-first router scorer with cascading capability/trust/availability filters
// :why replaces weighted scoring; free-tier models at $0 cost route first; latency as tiebreaker
// :deps rate-limiter (canRequest), context.db (provider_stats), context.healthMonitor, context.accounts
// :rules all 7 filters applied in order; effectiveCost=0 for free-tier; old exports kept as thin wrappers
// :edge no db → use heuristic latency; no rateLimiter in context → skip rate filter

const TRUST_RANK = { private: 3, standard: 2, open: 1 };
const LATENCY_HEURISTIC = { local: 50, groq: 200, cerebras: 200 };

// estimateTokens: sum char counts / 4 across all messages
export function estimateTokens(request) {
  const msgs = request.messages || [];
  return Math.ceil(msgs.reduce((sum, m) => {
    const c = m.content;
    if (typeof c === 'string') return sum + c.length;
    if (Array.isArray(c)) return sum + c.reduce((s, p) => s + (p.text?.length || 0), 0);
    return sum;
  }, 0) / 4);
}

// meetsCapabilities: tools, vision, context window
function meetsCapabilities(m, req) {
  if (req.requiresTools && !m.supports_tools) return false;
  if (req.requiresVision && !m.supports_vision) return false;
  const tokens = estimateTokens(req);
  if (tokens > 0 && m.context_window < tokens) return false;
  return true;
}

// meetsTrustTier: model trust rank >= required
function meetsTrustTier(m, trustTier) {
  if (!trustTier) return true;
  return (TRUST_RANK[m.trust_tier] || 1) >= (TRUST_RANK[trustTier] || 1);
}

// hasApiKey: check accounts for active key for this provider
function hasApiKey(providerId, accounts) {
  if (!accounts) return true;
  const accts = accounts.getByProvider ? accounts.getByProvider(providerId) : (accounts[providerId] || []);
  return accts.length > 0;
}

// effectiveCost: $0 for free-tier models, else pricing_input per 1M tokens
function effectiveCost(m) {
  return m.free_tier ? 0 : (m.pricing_input || 0);
}

// latencyScore: query provider_stats or use heuristic
async function latencyScore(m, db) {
  if (db) {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - 86400;
      const row = db.prepare(
        'SELECT avg_latency_ms FROM provider_stats WHERE model_id=? AND period=? AND window_start>=? ORDER BY window_start DESC LIMIT 1'
      ).get(m.id, 'hour', cutoff);
      if (row?.avg_latency_ms > 0) return row.avg_latency_ms;
    } catch (_) { /* no stats table yet */ }
  }
  if (m.is_local) return LATENCY_HEURISTIC.local;
  return LATENCY_HEURISTIC[m.provider_id] || 500;
}

// selectRoute: main entry point, returns sorted filtered candidates
export async function selectRoute(candidates, request, context = {}) {
  const { trustTier, db, healthMonitor, accounts, rateLimiter, budgetEnforcer } = context;
  const estimatedTokens = estimateTokens(request);
  // Apply filters in cascade order
  let filtered = candidates
    .filter(m => meetsCapabilities(m, request))
    .filter(m => meetsTrustTier(m, trustTier))
    .filter(m => !healthMonitor || healthMonitor.isAvailable(m.provider_id))
    .filter(m => hasApiKey(m.provider_id, accounts))
    .filter(m => !rateLimiter || rateLimiter.canRequest(m.id, estimatedTokens).allowed)
    .filter(m => !budgetEnforcer || budgetEnforcer.canAfford?.(m, estimatedTokens) !== false);
  // Attach latency scores async then sort cheapest-first, tiebreak by latency
  const withLatency = await Promise.all(filtered.map(async m => ({ ...m, _latency: await latencyScore(m, db) })));
  return withLatency.sort((a, b) => {
    const costDiff = effectiveCost(a) - effectiveCost(b);
    if (costDiff !== 0) return costDiff;
    return a._latency - b._latency;
  });
}

// --- Backwards-compat thin wrappers ---
export function scoreModel(model, weights, options = {}) {
  const maxCost = options.maxCost || 100;
  const costScore = model.pricing_input === 0 ? 1.0 : 1.0 - Math.min(model.pricing_input / maxCost, 1);
  const speedScore = model.is_local ? 0.8 : (model.free_tier ? 0.7 : 0.5);
  const qualityScore = Math.min((model.pricing_input + model.pricing_output) / 20, 1);
  let trustBonus = 0;
  if (options.requiredTrust) {
    const modelRank = TRUST_RANK[model.trust_tier] || 1;
    const requiredRank = TRUST_RANK[options.requiredTrust] || 1;
    if (modelRank < requiredRank) return -1;
    if (modelRank === requiredRank) trustBonus = 0.1;
  }
  const freeBonus = model.free_tier ? 0.15 : 0;
  const score = (costScore * weights.cost) + (speedScore * weights.speed) + (qualityScore * weights.quality) + trustBonus + freeBonus;
  return Math.max(0, Math.min(1.5, score));
}

export function calculateBenchmarks(models) {
  const costs = models.map(m => m.pricing_input).filter(c => c > 0);
  return { maxCost: costs.length > 0 ? Math.max(...costs) : 100 };
}

export function scoreModels(models, weights, options = {}) {
  const benchmarks = calculateBenchmarks(models);
  return models
    .map(model => ({ ...model, score: scoreModel(model, weights, { ...options, maxCost: benchmarks.maxCost }) }))
    .filter(m => m.score >= 0)
    .sort((a, b) => b.score - a.score);
}
