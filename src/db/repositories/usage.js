// :arch: usage repository — request logging and analytics queries with per-app drill-down + multi-range reporting
// :deps: better-sqlite3 via this.db | consumed by app.js, digest.js, seed script
// :rules: insert uses named params; new columns (request_id, routing_metadata, app_key_id, sanitization_action) nullable for backward compat
export class UsageRepository {
  constructor(db) { this.db = db; }
  //
  insert(record) {
    // Try extended insert first, fall back to original schema
    try {
      return this.db.prepare(`
        INSERT INTO usage (app_id, project_id, user_id, task_id, provider_id, model_id, tokens_in, tokens_out, latency_ms, cost_usd, trust_tier, sanitized, success, error_message, request_id, routing_metadata, app_key_id, sanitization_action)
        VALUES (@app_id, @project_id, @user_id, @task_id, @provider_id, @model_id, @tokens_in, @tokens_out, @latency_ms, @cost_usd, @trust_tier, @sanitized, @success, @error_message, @request_id, @routing_metadata, @app_key_id, @sanitization_action)
      `).run({
        app_id: record.app_id || null, project_id: record.project_id || 'default',
        user_id: record.user_id || null, task_id: record.task_id || null,
        provider_id: record.provider_id, model_id: record.model_id,
        tokens_in: record.tokens_in || 0, tokens_out: record.tokens_out || 0,
        latency_ms: record.latency_ms || 0, cost_usd: record.cost_usd || 0,
        trust_tier: record.trust_tier || null, sanitized: record.sanitized ? 1 : 0,
        success: record.success !== false ? 1 : 0, error_message: record.error_message || null,
        request_id: record.request_id || null, routing_metadata: record.routing_metadata ? JSON.stringify(record.routing_metadata) : null,
        app_key_id: record.app_key_id || null, sanitization_action: record.sanitization_action || null
      }).lastInsertRowid;
    } catch {
      // Fallback for DBs without migration 008
      return this.db.prepare(`
        INSERT INTO usage (app_id, project_id, user_id, task_id, provider_id, model_id, tokens_in, tokens_out, latency_ms, cost_usd, trust_tier, sanitized, success, error_message)
        VALUES (@app_id, @project_id, @user_id, @task_id, @provider_id, @model_id, @tokens_in, @tokens_out, @latency_ms, @cost_usd, @trust_tier, @sanitized, @success, @error_message)
      `).run({
        app_id: record.app_id || null, project_id: record.project_id || 'default',
        user_id: record.user_id || null, task_id: record.task_id || null,
        provider_id: record.provider_id, model_id: record.model_id,
        tokens_in: record.tokens_in || 0, tokens_out: record.tokens_out || 0,
        latency_ms: record.latency_ms || 0, cost_usd: record.cost_usd || 0,
        trust_tier: record.trust_tier || null, sanitized: record.sanitized ? 1 : 0,
        success: record.success !== false ? 1 : 0, error_message: record.error_message || null
      }).lastInsertRowid;
    }
  }
  //
  // Bulk insert with explicit timestamp — used by seed script
  insertWithTimestamp(record) {
    return this.db.prepare(`
      INSERT INTO usage (ts, app_id, project_id, provider_id, model_id, tokens_in, tokens_out, latency_ms, cost_usd, trust_tier, sanitized, success, error_message, sanitization_action)
      VALUES (@ts, @app_id, @project_id, @provider_id, @model_id, @tokens_in, @tokens_out, @latency_ms, @cost_usd, @trust_tier, @sanitized, @success, @error_message, @sanitization_action)
    `).run({
      ts: record.ts, app_id: record.app_id || null, project_id: record.project_id || 'default',
      provider_id: record.provider_id, model_id: record.model_id,
      tokens_in: record.tokens_in || 0, tokens_out: record.tokens_out || 0,
      latency_ms: record.latency_ms || 0, cost_usd: record.cost_usd || 0,
      trust_tier: record.trust_tier || null, sanitized: record.sanitized ? 1 : 0,
      success: record.success !== false ? 1 : 0, error_message: record.error_message || null,
      sanitization_action: record.sanitization_action || null
    }).lastInsertRowid;
  }
  //
  getRecent(limit = 50, filters = {}) {
    let query = 'SELECT u.*, m.name as model_name, p.name as provider_name FROM usage u LEFT JOIN models m ON u.model_id = m.id LEFT JOIN providers p ON u.provider_id = p.id';
    const conditions = [];
    const params = [];
    if (filters.app_id) { conditions.push('u.app_id = ?'); params.push(filters.app_id); }
    if (filters.since) { conditions.push('u.ts >= ?'); params.push(filters.since); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.ts DESC LIMIT ?';
    params.push(limit);
    return this.db.prepare(query).all(...params);
  }
  //
  getStats(appId, period = 'day') {
    const since = period === 'day' ? Math.floor(Date.now() / 1000) - 86400 : Math.floor(Date.now() / 1000) - 86400 * 30;
    const query = appId
      ? 'SELECT COUNT(*) as requests, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency FROM usage WHERE app_id = ? AND ts >= ?'
      : 'SELECT COUNT(*) as requests, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency FROM usage WHERE ts >= ?';
    return appId ? this.db.prepare(query).get(appId, since) : this.db.prepare(query).get(since);
  }
  //
  // Multi-range queries for reporting
  getStatsForRange(since, until) {
    const params = [since];
    let where = 'ts >= ?';
    if (until) { where += ' AND ts <= ?'; params.push(until); }
    return this.db.prepare(`
      SELECT COUNT(*) as requests, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out,
        SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN sanitized = 1 THEN 1 ELSE 0 END) as sanitized_count,
        SUM(CASE WHEN sanitization_action = 'blocked' THEN 1 ELSE 0 END) as blocked_count
      FROM usage WHERE ${where}
    `).get(...params);
  }
  //
  getCostByProviderForRange(since, until) {
    const params = [since];
    let where = 'u.ts >= ?';
    if (until) { where += ' AND u.ts <= ?'; params.push(until); }
    return this.db.prepare(`
      SELECT u.provider_id, p.name as provider_name, SUM(u.cost_usd) as total_cost,
        COUNT(*) as requests, SUM(u.tokens_in + u.tokens_out) as total_tokens,
        AVG(u.latency_ms) as avg_latency
      FROM usage u LEFT JOIN providers p ON u.provider_id = p.id
      WHERE ${where} GROUP BY u.provider_id ORDER BY total_cost DESC
    `).all(...params);
  }
  //
  getTopAppsForRange(since, limit = 10, until) {
    const params = [since];
    let where = 'u.app_id IS NOT NULL AND u.ts >= ?';
    if (until) { where += ' AND u.ts <= ?'; params.push(until); }
    params.push(limit);
    return this.db.prepare(`
      SELECT u.app_id, a.name as app_name, SUM(u.cost_usd) as total_cost,
        COUNT(*) as requests, SUM(u.tokens_in + u.tokens_out) as total_tokens,
        AVG(u.latency_ms) as avg_latency
      FROM usage u LEFT JOIN apps a ON u.app_id = a.id
      WHERE ${where} GROUP BY u.app_id ORDER BY requests DESC LIMIT ?
    `).all(...params);
  }
  //
  getErrorRateForRange(since, until) {
    const params = [since];
    let where = 'ts >= ?';
    if (until) { where += ' AND ts <= ?'; params.push(until); }
    return this.db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
        CASE WHEN COUNT(*) > 0 THEN CAST(SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100 ELSE 0 END as error_rate
      FROM usage WHERE ${where}
    `).get(...params);
  }
  //
  getHourlyBreakdown(since) {
    return this.db.prepare(`
      SELECT strftime('%H', ts, 'unixepoch') as hour, COUNT(*) as requests,
        SUM(cost_usd) as cost, AVG(latency_ms) as avg_latency,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
      FROM usage WHERE ts >= ? GROUP BY strftime('%H', ts, 'unixepoch') ORDER BY hour
    `).all(since);
  }
  //
  getCostByProvider(since) {
    return this.db.prepare(`
      SELECT provider_id, SUM(cost_usd) as total_cost, COUNT(*) as requests
      FROM usage WHERE ts >= ? GROUP BY provider_id ORDER BY total_cost DESC
    `).all(since);
  }
  //
  getTimeseries(days = 30) {
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    return this.db.prepare(`
      SELECT date(ts, 'unixepoch') as date, SUM(cost_usd) as cost, COUNT(*) as requests
      FROM usage WHERE ts >= ? GROUP BY date(ts, 'unixepoch') ORDER BY date ASC
    `).all(since);
  }
  //
  getByProviderAggregated(since) {
    return this.db.prepare(`
      SELECT u.provider_id, p.name, SUM(u.cost_usd) as total_cost, COUNT(*) as requests,
        SUM(u.tokens_in + u.tokens_out) as total_tokens
      FROM usage u LEFT JOIN providers p ON u.provider_id = p.id
      WHERE u.ts >= ? GROUP BY u.provider_id ORDER BY total_cost DESC
    `).all(since);
  }
  //
  // Phase 2: Per-app analytics
  getTimeseriesByApp(appId, days = 30) {
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    return this.db.prepare(`
      SELECT date(ts, 'unixepoch') as date, SUM(cost_usd) as cost, COUNT(*) as requests,
        AVG(latency_ms) as avg_latency, SUM(tokens_in + tokens_out) as total_tokens
      FROM usage WHERE app_id = ? AND ts >= ?
      GROUP BY date(ts, 'unixepoch') ORDER BY date ASC
    `).all(appId, since);
  }
  //
  getCostByProviderForApp(appId, since) {
    return this.db.prepare(`
      SELECT u.provider_id, p.name as provider_name, SUM(u.cost_usd) as total_cost,
        COUNT(*) as requests, SUM(u.tokens_in + u.tokens_out) as total_tokens
      FROM usage u LEFT JOIN providers p ON u.provider_id = p.id
      WHERE u.app_id = ? AND u.ts >= ?
      GROUP BY u.provider_id ORDER BY total_cost DESC
    `).all(appId, since);
  }
  //
  getTopApps(since, limit = 10) {
    return this.db.prepare(`
      SELECT u.app_id, a.name as app_name, SUM(u.cost_usd) as total_cost,
        COUNT(*) as requests, SUM(u.tokens_in + u.tokens_out) as total_tokens
      FROM usage u LEFT JOIN apps a ON u.app_id = a.id
      WHERE u.app_id IS NOT NULL AND u.ts >= ?
      GROUP BY u.app_id ORDER BY total_cost DESC LIMIT ?
    `).all(since, limit);
  }
  //
  // Phase 7: Per-app and per-backend reporting
  getAppReport(appId, since) {
    const stats = this.db.prepare(`
      SELECT COUNT(*) as requests, SUM(tokens_in) as tokens_in, SUM(tokens_out) as tokens_out,
        SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency,
        MIN(latency_ms) as min_latency, MAX(latency_ms) as max_latency,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
      FROM usage WHERE app_id = ? AND ts >= ?
    `).get(appId, since);
    const backendMix = this.getCostByProviderForApp(appId, since);
    return { ...stats, backendMix };
  }
  //
  getBackendImpact(providerId, since) {
    return this.db.prepare(`
      SELECT u.app_id, a.name as app_name, COUNT(*) as requests,
        SUM(u.cost_usd) as total_cost, AVG(u.latency_ms) as avg_latency
      FROM usage u LEFT JOIN apps a ON u.app_id = a.id
      WHERE u.provider_id = ? AND u.ts >= ?
      GROUP BY u.app_id ORDER BY requests DESC
    `).all(providerId, since);
  }
}
