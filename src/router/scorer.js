export function scoreModel(model, weights, options = {}) {
  const maxCost = options.maxCost || 100;

  // Cost score: free = 1.0, expensive = 0.0
  const costScore = model.pricing_input === 0 ? 1.0 : 1.0 - Math.min(model.pricing_input / maxCost, 1);

  // Speed: local/free providers assumed faster for light tasks
  const speedScore = model.is_local ? 0.8 : (model.free_tier ? 0.7 : 0.5);

  // Quality: based on context window and pricing as proxy
  const qualityScore = Math.min((model.pricing_input + model.pricing_output) / 20, 1);

  // Trust tier match bonus
  let trustBonus = 0;
  if (options.requiredTrust) {
    const TRUST_RANK = { private: 3, standard: 2, open: 1 };
    const modelRank = TRUST_RANK[model.trust_tier] || 1;
    const requiredRank = TRUST_RANK[options.requiredTrust] || 1;
    if (modelRank < requiredRank) return -1; // Filtered out
    if (modelRank === requiredRank) trustBonus = 0.1;
  }

  // Free tier availability bonus
  const freeBonus = model.free_tier ? 0.15 : 0;

  const score = (costScore * weights.cost) + (speedScore * weights.speed) + (qualityScore * weights.quality) + trustBonus + freeBonus;

  return Math.max(0, Math.min(1.5, score));
}

export function calculateBenchmarks(models) {
  const costs = models.map(m => m.pricing_input).filter(c => c > 0);
  return {
    maxCost: costs.length > 0 ? Math.max(...costs) : 100
  };
}

export function scoreModels(models, weights, options = {}) {
  const benchmarks = calculateBenchmarks(models);

  return models
    .map(model => ({
      ...model,
      score: scoreModel(model, weights, { ...options, maxCost: benchmarks.maxCost })
    }))
    .filter(m => m.score >= 0)
    .sort((a, b) => b.score - a.score);
}
