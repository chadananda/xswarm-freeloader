import { BudgetRepository } from '../db/repositories/index.js';

export class BudgetTracker {
  constructor(db, logger) {
    this.budgets = new BudgetRepository(db);
    this.logger = logger;
  }

  getDailySpent(appId, projectId = 'default') {
    return this.budgets.getSpent(appId, projectId, BudgetRepository.getTodayString());
  }

  getMonthlySpent(appId, projectId = 'default') {
    return this.budgets.getSpent(appId, projectId, BudgetRepository.getMonthString());
  }

  getStatus(appId, projectId = 'default', limits = {}) {
    const dailySpent = this.getDailySpent(appId, projectId);
    const monthlySpent = this.getMonthlySpent(appId, projectId);

    const dailyHard = limits.budget_daily_hard ?? 10;
    const monthlyHard = limits.budget_monthly_hard ?? 200;
    const dailySoft = limits.budget_daily_soft ?? 5;
    const monthlySoft = limits.budget_monthly_soft ?? 100;

    return {
      daily: {
        spent: dailySpent,
        limit: dailyHard,
        remaining: Math.max(0, dailyHard - dailySpent),
        percent: dailyHard > 0 ? (dailySpent / dailyHard) * 100 : 0,
        soft_limit_exceeded: dailySpent > dailySoft,
        hard_limit_exceeded: dailySpent >= dailyHard
      },
      monthly: {
        spent: monthlySpent,
        limit: monthlyHard,
        remaining: Math.max(0, monthlyHard - monthlySpent),
        percent: monthlyHard > 0 ? (monthlySpent / monthlyHard) * 100 : 0,
        soft_limit_exceeded: monthlySpent > monthlySoft,
        hard_limit_exceeded: monthlySpent >= monthlyHard
      }
    };
  }

  recordUsage(appId, projectId = 'default', costUsd) {
    this.budgets.increment(appId, projectId, BudgetRepository.getTodayString(), costUsd);
    this.budgets.increment(appId, projectId, BudgetRepository.getMonthString(), costUsd);
    this.logger?.debug?.(`Recorded $${costUsd.toFixed(4)} for app ${appId}/${projectId}`);
  }
}
