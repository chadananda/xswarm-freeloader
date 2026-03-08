export class UsageRepository {
  constructor(db) { this.db = db; }

  insert(record) {
    const result = this.db.prepare(`
      INSERT INTO usage (app_id, project_id, user_id, task_id, provider_id, model_id, tokens_in, tokens_out, latency_ms, cost_usd, trust_tier, sanitized, success, error_message)
      VALUES (@app_id, @project_id, @user_id, @task_id, @provider_id, @model_id, @tokens_in, @tokens_out, @latency_ms, @cost_usd, @trust_tier, @sanitized, @success, @error_message)
    `).run({
      app_id: record.app_id || null,
      project_id: record.project_id || 'default',
      user_id: record.user_id || null,
      task_id: record.task_id || null,
      provider_id: record.provider_id,
      model_id: record.model_id,
      tokens_in: record.tokens_in || 0,
      tokens_out: record.tokens_out || 0,
      latency_ms: record.latency_ms || 0,
      cost_usd: record.cost_usd || 0,
      trust_tier: record.trust_tier || null,
      sanitized: record.sanitized ? 1 : 0,
      success: record.success !== false ? 1 : 0,
      error_message: record.error_message || null
    });
    return result.lastInsertRowid;
  }

  getRecent(limit = 50, filters = {}) {
    let query = 'SELECT u.*, m.name as model_name, p.name as provider_name FROM usage u LEFT JOIN models m ON u.model_id = m.id LEFT JOIN providers p ON u.provider_id = p.id';
    const conditions = [];
    const params = [];

    if (filters.app_id) {
      conditions.push('u.app_id = ?');
      params.push(filters.app_id);
    }
    if (filters.since) {
      conditions.push('u.ts >= ?');
      params.push(filters.since);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.ts DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  getStats(appId, period = 'day') {
    const since = period === 'day'
      ? Math.floor(Date.now() / 1000) - 86400
      : Math.floor(Date.now() / 1000) - 86400 * 30;

    const query = appId
      ? 'SELECT COUNT(*) as requests, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency FROM usage WHERE app_id = ? AND ts >= ?'
      : 'SELECT COUNT(*) as requests, SUM(tokens_in) as total_tokens_in, SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost, AVG(latency_ms) as avg_latency FROM usage WHERE ts >= ?';

    const params = appId ? [appId, since] : [since];
    return this.db.prepare(query).get(...params);
  }

  getCostByProvider(since) {
    return this.db.prepare(`
      SELECT provider_id, SUM(cost_usd) as total_cost, COUNT(*) as requests
      FROM usage WHERE ts >= ? GROUP BY provider_id ORDER BY total_cost DESC
    `).all(since);
  }
}
