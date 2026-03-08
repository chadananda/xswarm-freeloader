export class BudgetRepository {
  constructor(db) { this.db = db; }

  get(appId, projectId, period) {
    return this.db.prepare(
      'SELECT * FROM budgets WHERE app_id = ? AND project_id = ? AND period = ?'
    ).get(appId, projectId, period);
  }

  getSpent(appId, projectId, period) {
    const record = this.get(appId, projectId, period);
    return record ? record.spent_usd : 0;
  }

  increment(appId, projectId, period, costUsd) {
    this.db.prepare(`
      INSERT INTO budgets (app_id, project_id, period, spent_usd, request_count, updated_at)
      VALUES (?, ?, ?, ?, 1, strftime('%s', 'now'))
      ON CONFLICT(app_id, project_id, period) DO UPDATE SET
        spent_usd = spent_usd + excluded.spent_usd,
        request_count = request_count + 1,
        updated_at = strftime('%s', 'now')
    `).run(appId, projectId, period, costUsd);
  }

  getByApp(appId, options = {}) {
    let query = 'SELECT * FROM budgets WHERE app_id = ?';
    const params = [appId];

    if (options.periodType === 'daily') {
      query += " AND length(period) = 10";
    } else if (options.periodType === 'monthly') {
      query += " AND length(period) = 7";
    }

    query += ' ORDER BY period DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  static getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  static getMonthString() {
    return new Date().toISOString().slice(0, 7);
  }
}
