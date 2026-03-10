// :arch: app_policies repository — per-app routing policy CRUD
// :deps: better-sqlite3 via this.db | consumed by scorer.js, app.js
// :rules: JSON parse/stringify for array fields (allowed_providers, blocked_providers, allowed_models)
export class AppPolicyRepository {
  constructor(db) { this.db = db; }
  //
  get(appId) {
    const row = this.db.prepare('SELECT * FROM app_policies WHERE app_id = ?').get(appId);
    if (!row) return null;
    return this._parseArrayFields(row);
  }
  //
  upsert(appId, policy) {
    const existing = this.db.prepare('SELECT app_id FROM app_policies WHERE app_id = ?').get(appId);
    const now = Math.floor(Date.now() / 1000);
    if (existing) {
      const fields = [];
      const params = [];
      for (const [key, value] of Object.entries(policy)) {
        if (['allowed_providers', 'blocked_providers', 'allowed_models'].includes(key)) {
          fields.push(`${key} = ?`);
          params.push(JSON.stringify(value));
        } else if (['data_residency', 'force_local_on_pii', 'max_cost_per_request', 'rate_limit_rpm', 'rate_limit_rpd', 'token_limit_daily', 'token_limit_monthly'].includes(key)) {
          fields.push(`${key} = ?`);
          params.push(value);
        }
      }
      fields.push('updated_at = ?');
      params.push(now, appId);
      if (fields.length > 1) this.db.prepare(`UPDATE app_policies SET ${fields.join(', ')} WHERE app_id = ?`).run(...params);
    } else {
      this.db.prepare(`
        INSERT INTO app_policies (app_id, allowed_providers, blocked_providers, allowed_models, data_residency, force_local_on_pii, max_cost_per_request, rate_limit_rpm, rate_limit_rpd, token_limit_daily, token_limit_monthly, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        appId,
        JSON.stringify(policy.allowed_providers || null),
        JSON.stringify(policy.blocked_providers || null),
        JSON.stringify(policy.allowed_models || null),
        policy.data_residency || 'any',
        policy.force_local_on_pii ? 1 : 0,
        policy.max_cost_per_request || null,
        policy.rate_limit_rpm || null,
        policy.rate_limit_rpd || null,
        policy.token_limit_daily || null,
        policy.token_limit_monthly || null,
        now
      );
    }
    return this.get(appId);
  }
  //
  delete(appId) {
    return this.db.prepare('DELETE FROM app_policies WHERE app_id = ?').run(appId).changes > 0;
  }
  //
  _parseArrayFields(row) {
    const parsed = { ...row };
    for (const field of ['allowed_providers', 'blocked_providers', 'allowed_models']) {
      if (parsed[field]) {
        try { parsed[field] = JSON.parse(parsed[field]); }
        catch { parsed[field] = null; }
      }
    }
    return parsed;
  }
}
