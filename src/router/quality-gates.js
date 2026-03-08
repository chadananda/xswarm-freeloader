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

    return true;
  });
}
