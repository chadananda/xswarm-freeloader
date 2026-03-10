// :arch: app repository — CRUD for apps table with dual insert into app_keys for hashed key storage
// :deps: crypto, generateApiKey, hashApiKey, generateAppApiKey | consumed by auth.js, app.js
// :rules: create() inserts into both apps and app_keys; getByApiKey kept for backward compat
import crypto from 'crypto';
import { generateApiKey, hashApiKey, generateAppApiKey } from '../../utils/crypto.js';
//
export class AppRepository {
  constructor(db) { this.db = db; }
  //
  getAll() {
    return this.db.prepare('SELECT * FROM apps ORDER BY created_at DESC').all();
  }
  //
  get(id) {
    return this.db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
  }
  //
  getByApiKey(apiKey) {
    return this.db.prepare('SELECT * FROM apps WHERE api_key = ?').get(apiKey);
  }
  //
  create(app) {
    const id = app.id || crypto.randomUUID();
    const { key, hash, prefix } = generateAppApiKey();
    const apiKey = app.api_key || key;
    const keyHash = app.api_key ? hashApiKey(app.api_key) : hash;
    const keyPrefix = app.api_key ? app.api_key.substring(0, 8) : prefix;
    //
    this.db.prepare(`
      INSERT INTO apps (id, name, api_key, trust_tier, budget_daily_hard, budget_daily_soft, budget_monthly_hard, budget_monthly_soft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, app.name, apiKey, app.trust_tier || 'open', app.budget_daily_hard ?? 10.00, app.budget_daily_soft ?? 5.00, app.budget_monthly_hard ?? 200.00, app.budget_monthly_soft ?? 100.00);
    //
    // Also insert into app_keys table for hash-based lookup
    try {
      this.db.prepare(`
        INSERT INTO app_keys (app_id, key_hash, key_prefix, permissions, rate_limit_rps, rate_limit_rpm, token_quota_daily, token_quota_monthly, cost_quota_daily, cost_quota_monthly)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, keyHash, keyPrefix, JSON.stringify(['chat']), app.rate_limit_rps || null, app.rate_limit_rpm || null, app.token_quota_daily || null, app.token_quota_monthly || null, app.cost_quota_daily || null, app.cost_quota_monthly || null);
    } catch { /* app_keys table might not exist during migration transition */ }
    //
    return { ...this.get(id), _rawKey: apiKey };
  }
  //
  update(id, updates) {
    const fields = [];
    const params = [];
    const allowed = ['name', 'trust_tier', 'budget_daily_hard', 'budget_daily_soft', 'budget_monthly_hard', 'budget_monthly_soft', 'sanitization_profile'];
    for (const [key, value] of Object.entries(updates)) {
      if (allowed.includes(key)) { fields.push(`${key} = ?`); params.push(value); }
    }
    if (!fields.length) return this.get(id);
    params.push(id);
    this.db.prepare(`UPDATE apps SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.get(id);
  }
  //
  delete(id) {
    return this.db.prepare('DELETE FROM apps WHERE id = ?').run(id).changes > 0;
  }
}
