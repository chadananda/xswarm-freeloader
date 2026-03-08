import { NoProvidersAvailableError } from '../utils/errors.js';

export async function executeWithFallback(candidates, executeFn, logger) {
  const errors = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    try {
      logger?.info?.(`Attempting ${candidate.provider_id}/${candidate.name} (${i + 1}/${candidates.length})`);
      const result = await executeFn(candidate);
      logger?.info?.(`Success with ${candidate.provider_id}/${candidate.name}`);

      return {
        ...result,
        routing: {
          provider: candidate.provider_id,
          model: candidate.name,
          model_id: candidate.id,
          rank: i + 1,
          total_candidates: candidates.length,
          attempts: i + 1
        }
      };
    } catch (error) {
      logger?.warn?.(`Failed ${candidate.provider_id}/${candidate.name}: ${error.message}`);
      errors.push({ provider: candidate.provider_id, model: candidate.name, error: error.message });
      continue;
    }
  }

  throw new NoProvidersAvailableError(
    `All ${candidates.length} provider(s) failed: ${JSON.stringify(errors)}`
  );
}
