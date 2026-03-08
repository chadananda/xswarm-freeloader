// :ctx
// :arch quality gates filter models by capability, trust, provider block lists
// :why keeps routing logic declarative; detectCapabilities auto-extracts from request
// :deps none
// :edge requiresTools/Vision checked against model flags; minContextWindow vs estimated chars/4

export function detectCapabilities(request) {
  const messages = request.messages || [];
  let requiresTools = false;
  let requiresVision = false;
  let charCount = 0;
  // Check for tool_calls or tools array on request
  if (request.tools?.length > 0) requiresTools = true;
  for (const m of messages) {
    if (m.tool_calls?.length > 0) requiresTools = true;
    const c = m.content;
    if (typeof c === 'string') { charCount += c.length; continue; }
    if (Array.isArray(c)) {
      for (const part of c) {
        if (part.image_url) requiresVision = true;
        if (part.text) charCount += part.text.length;
      }
    }
  }
  return {
    requiresTools,
    requiresVision,
    minContextWindow: Math.ceil(charCount / 4)
  };
}

export function applyQualityGates(models, gates = {}) {
  return models.filter(model => {
    if (gates.minIntelligence && model.intelligence < gates.minIntelligence) return false;
    if (gates.blockLocal && model.is_local) return false;
    if (gates.blockedProviders?.includes(model.provider_id)) return false;
    // Trust tier gate
    if (gates.trustTier) {
      const TRUST_RANK = { private: 3, standard: 2, open: 1 };
      const modelRank = TRUST_RANK[model.trust_tier] || 1;
      const requiredRank = TRUST_RANK[gates.trustTier] || 1;
      if (modelRank < requiredRank) return false;
    }
    // Capability gates
    if (gates.requiresTools && !model.supports_tools) return false;
    if (gates.requiresVision && !model.supports_vision) return false;
    if (gates.minContextWindow && model.context_window < gates.minContextWindow) return false;
    return true;
  });
}
