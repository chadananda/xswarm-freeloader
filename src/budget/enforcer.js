import { BudgetExceededError } from '../utils/errors.js';

export class BudgetEnforcer {
  constructor(tracker, logger) {
    this.tracker = tracker;
    this.logger = logger;
  }

  checkBudget(appId, projectId = 'default', limits = {}, estimatedCost = 0) {
    const status = this.tracker.getStatus(appId, projectId, limits);

    if (status.daily.spent + estimatedCost >= status.daily.limit) {
      throw new BudgetExceededError(
        `Daily budget exceeded for app ${appId}`,
        'daily', status.daily.spent, status.daily.limit
      );
    }

    if (status.monthly.spent + estimatedCost >= status.monthly.limit) {
      throw new BudgetExceededError(
        `Monthly budget exceeded for app ${appId}`,
        'monthly', status.monthly.spent, status.monthly.limit
      );
    }

    if (status.daily.soft_limit_exceeded) {
      this.logger?.warn?.(`Soft daily limit exceeded for app ${appId}: $${status.daily.spent.toFixed(2)}`);
    }
    if (status.monthly.soft_limit_exceeded) {
      this.logger?.warn?.(`Soft monthly limit exceeded for app ${appId}: $${status.monthly.spent.toFixed(2)}`);
    }
  }

  recordUsage(appId, projectId = 'default', costUsd) {
    this.tracker.recordUsage(appId, projectId, costUsd);
  }
}
