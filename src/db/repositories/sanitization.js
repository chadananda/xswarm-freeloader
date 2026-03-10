// :arch: sanitization_log repository — insert/query sanitization telemetry
// :deps: better-sqlite3 via this.db | consumed by sanitizer.js, app-detail dashboard
export class SanitizationRepository {
  constructor(db) { this.db = db; }
  //
  insert(record) {
    return this.db.prepare(`
      INSERT INTO sanitization_log (app_id, profile, rules_fired, secrets_found, pii_detected, content_length_before, content_length_after, blocked, action_taken)
      VALUES (@app_id, @profile, @rules_fired, @secrets_found, @pii_detected, @content_length_before, @content_length_after, @blocked, @action_taken)
    `).run({
      app_id: record.app_id || null,
      profile: record.profile,
      rules_fired: record.rules_fired || 0,
      secrets_found: record.secrets_found || 0,
      pii_detected: record.pii_detected || 0,
      content_length_before: record.content_length_before || null,
      content_length_after: record.content_length_after || null,
      blocked: record.blocked ? 1 : 0,
      action_taken: record.action_taken || null
    }).lastInsertRowid;
  }
  //
  getByApp(appId, since) {
    const query = since
      ? 'SELECT * FROM sanitization_log WHERE app_id = ? AND ts >= ? ORDER BY ts DESC'
      : 'SELECT * FROM sanitization_log WHERE app_id = ? ORDER BY ts DESC LIMIT 100';
    return since ? this.db.prepare(query).all(appId, since) : this.db.prepare(query).all(appId);
  }
  //
  getStats(appId, period = 'day') {
    const since = period === 'day'
      ? Math.floor(Date.now() / 1000) - 86400
      : Math.floor(Date.now() / 1000) - 86400 * 30;
    const query = appId
      ? 'SELECT COUNT(*) as total, SUM(rules_fired) as total_rules, SUM(secrets_found) as total_secrets, SUM(pii_detected) as total_pii, SUM(blocked) as total_blocked FROM sanitization_log WHERE app_id = ? AND ts >= ?'
      : 'SELECT COUNT(*) as total, SUM(rules_fired) as total_rules, SUM(secrets_found) as total_secrets, SUM(pii_detected) as total_pii, SUM(blocked) as total_blocked FROM sanitization_log WHERE ts >= ?';
    return appId ? this.db.prepare(query).get(appId, since) : this.db.prepare(query).get(since);
  }
}
