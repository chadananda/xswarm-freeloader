import { renderDigest } from './templates/digest.js';

export class DigestBuilder {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger;
  }

  async buildDaily() {
    const { UsageRepository } = await import('../db/repositories/index.js');
    const usage = new UsageRepository(this.db);

    const dayAgo = Math.floor(Date.now() / 1000) - 86400;
    const stats = usage.getStats(null, 'day');
    const costByProvider = usage.getCostByProvider(dayAgo);

    // Calculate savings (cost of using most expensive model vs actual cost)
    const totalCost = stats?.total_cost || 0;
    const totalTokens = (stats?.total_tokens_in || 0) + (stats?.total_tokens_out || 0);
    const expensiveRate = 10.0 / 1000000; // $10/1M tokens as baseline
    const wouldHaveCost = totalTokens * expensiveRate;
    const savings = Math.max(0, wouldHaveCost - totalCost);

    const topModels = costByProvider.slice(0, 5).map(p => ({
      model: p.provider_id,
      requests: p.requests,
      cost: p.total_cost
    }));

    const opportunities = [];
    if (stats?.requests === 0) {
      opportunities.push('No requests yesterday — is everything connected?');
    }
    if (totalCost > 5) {
      opportunities.push('Spending over $5/day — consider enabling more free tier providers');
    }

    const date = new Date().toISOString().split('T')[0];

    return {
      subject: `⚡ xswarm daily: saved $${savings.toFixed(2)} | ${stats?.requests || 0} requests`,
      html: renderDigest({ date, stats, topModels, savings, opportunities })
    };
  }
}
