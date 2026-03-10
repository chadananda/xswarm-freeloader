// :arch: multi-range report builder — generates HTML email + PDF attachment + saves PDF locally
// :why: report always persisted to disk for dashboard download; email is optional delivery
// :deps: renderDigest, PdfReportGenerator, ReportStore, UsageRepository
// :rules: always save PDF locally even if email disabled; savings = (gpt-4o rate * tokens) - actual cost
import { renderDigest } from './templates/digest.js';
import { PdfReportGenerator } from './pdf-report.js';
import { ReportStore } from './report-store.js';
//
const RANGES = [
  { key: '24h', label: 'Last 24 Hours', seconds: 86400 },
  { key: '7d', label: 'Last 7 Days', seconds: 7 * 86400 },
  { key: '30d', label: 'Last 30 Days', seconds: 30 * 86400 },
  { key: '90d', label: 'Last 90 Days', seconds: 90 * 86400 }
];
const EXPENSIVE_RATE = 10.0 / 1000000; // $10/1M tokens baseline (GPT-4o equivalent)
//
function calcSavings(stats) {
  const totalTokens = (stats?.total_tokens_in || 0) + (stats?.total_tokens_out || 0);
  const wouldHaveCost = totalTokens * EXPENSIVE_RATE;
  return Math.max(0, wouldHaveCost - (stats?.total_cost || 0));
}
//
export class DigestBuilder {
  constructor(db, logger, reportDir) {
    this.db = db;
    this.logger = logger;
    this.pdfGenerator = new PdfReportGenerator();
    this.reportStore = new ReportStore(reportDir);
  }
  //
  async buildReport() {
    const { UsageRepository } = await import('../db/repositories/index.js');
    const usage = new UsageRepository(this.db);
    const now = Math.floor(Date.now() / 1000);
    //
    const ranges = {};
    for (const range of RANGES) {
      const since = now - range.seconds;
      const prevSince = since - range.seconds;
      const prevUntil = since;
      //
      const stats = usage.getStatsForRange(since);
      const prevStats = usage.getStatsForRange(prevSince, prevUntil);
      const providerBreakdown = usage.getCostByProviderForRange(since);
      const topApps = usage.getTopAppsForRange(since, 5);
      const errorRate = usage.getErrorRateForRange(since);
      const savings = calcSavings(stats);
      const prevSavings = calcSavings(prevStats);
      //
      // Trend: % change from previous period
      const trend = {
        requests: prevStats?.requests ? ((stats?.requests || 0) - prevStats.requests) / prevStats.requests * 100 : 0,
        cost: prevStats?.total_cost ? ((stats?.total_cost || 0) - prevStats.total_cost) / prevStats.total_cost * 100 : 0,
        savings: prevSavings ? (savings - prevSavings) / prevSavings * 100 : 0,
        latency: prevStats?.avg_latency ? ((stats?.avg_latency || 0) - prevStats.avg_latency) / prevStats.avg_latency * 100 : 0,
        errorRate: prevStats?.errors ? ((errorRate?.errors || 0) - prevStats.errors) / prevStats.errors * 100 : 0
      };
      //
      ranges[range.key] = { label: range.label, stats, prevStats, providerBreakdown, topApps, errorRate, savings, prevSavings, trend };
    }
    //
    // Hourly breakdown for 24h range
    const hourly = usage.getHourlyBreakdown(now - 86400);
    //
    // Sanitization summary
    let sanitizationSummary = null;
    try {
      const { SanitizationRepository } = await import('../db/repositories/index.js');
      const sanitization = new SanitizationRepository(this.db);
      sanitizationSummary = sanitization.getStats(null, 'day');
    } catch { /* table might not exist */ }
    //
    // Opportunities
    const opportunities = [];
    const day = ranges['24h'];
    if (day.stats?.requests === 0) opportunities.push('No requests in 24h — is everything connected?');
    if ((day.stats?.total_cost || 0) > 5) opportunities.push('Spending over $5/day — consider enabling more free tier providers');
    if ((day.errorRate?.error_rate || 0) > 5) opportunities.push(`Error rate at ${day.errorRate.error_rate.toFixed(1)}% — check provider health`);
    const month = ranges['30d'];
    if (month.providerBreakdown?.length === 1) opportunities.push('Traffic routing to single provider — add more for resilience');
    const freeRatio = month.providerBreakdown?.filter(p => (p.total_cost || 0) === 0).length || 0;
    if (freeRatio === 0 && (month.stats?.requests || 0) > 0) opportunities.push('No free tier usage detected — enable free providers to save costs');
    //
    const date = new Date().toISOString().split('T')[0];
    const reportData = { date, ranges, hourly, opportunities, sanitizationSummary };
    const pdfBuffer = await this.pdfGenerator.generate(reportData);
    //
    // Always save locally
    let savedPath = null;
    if (pdfBuffer) {
      savedPath = this.reportStore.save(date, pdfBuffer);
      this.logger?.info?.(`Report saved locally: ${savedPath}`);
    }
    //
    const attachments = pdfBuffer
      ? [{ filename: `xswarm-report-${date}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [];
    //
    const headlineSavings = ranges['30d'].savings;
    return {
      subject: `xswarm report: saved $${headlineSavings.toFixed(2)} (30d) | ${ranges['24h'].stats?.requests || 0} reqs today`,
      html: renderDigest(reportData),
      attachments,
      savedPath
    };
  }
  //
  // Backward-compat wrapper
  async buildDaily() {
    return this.buildReport();
  }
}
