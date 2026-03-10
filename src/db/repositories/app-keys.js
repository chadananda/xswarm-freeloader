// :arch: app_keys repository — hashed API key lookup, per-key quotas, rotation
// :deps: better-sqlite3 via this.db | consumed by auth.js, app.js
// :rules: never store or return raw keys; only hash and prefix
import crypto from 'crypto';

export class AppKeyRepository {
  constructor(db) { this.db = db; }
  //
  getByHash(keyHash) {
    return this.db.prepare(
      'SELECT ak.*, a.name as app_name, a.trust_tier FROM app_keys ak JOIN apps a ON ak.app_id = a.id WHERE ak.key_hash = ? AND ak.revoked_at IS NULL'
    ).get(keyHash);
  }
  //
  getByApp(appId) {
    return this.db.prepare(
      'SELECT id, app_id, key_prefix, permissions, rate_limit_rps, rate_limit_rpm, token_quota_daily, token_quota_monthly, cost_quota_daily, cost_quota_monthly, last_used_at, revoked_at, created_at FROM app_keys WHERE app_id = ? ORDER BY created_at DESC'
    ).all(appId);
  }
  //
  create({ appId, keyHash, keyPrefix, permissions, rateLimitRps, rateLimitRpm, tokenQuotaDaily, tokenQuotaMonthly, costQuotaDaily, costQuotaMonthly }) {
    const result = this.db.prepare(`
      INSERT INTO app_keys (app_id, key_hash, key_prefix, permissions, rate_limit_rps, rate_limit_rpm, token_quota_daily, token_quota_monthly, cost_quota_daily, cost_quota_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appId, keyHash, keyPrefix, JSON.stringify(permissions || ['chat']), rateLimitRps || null, rateLimitRpm || null, tokenQuotaDaily || null, tokenQuotaMonthly || null, costQuotaDaily || null, costQuotaMonthly || null);
    return { id: result.lastInsertRowid, app_id: appId, key_prefix: keyPrefix };
  }
  //
  revoke(keyId) {
    const now = Math.floor(Date.now() / 1000);
    return this.db.prepare('UPDATE app_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(now, keyId).changes > 0;
  }
  //
  rotate(keyId, newKeyHash, newKeyPrefix) {
    const now = Math.floor(Date.now() / 1000);
    const existing = this.db.prepare('SELECT * FROM app_keys WHERE id = ?').get(keyId);
    if (!existing) return null;
    // Revoke old key
    this.db.prepare('UPDATE app_keys SET revoked_at = ? WHERE id = ?').run(now, keyId);
    // Create new key with same settings
    const result = this.db.prepare(`
      INSERT INTO app_keys (app_id, key_hash, key_prefix, permissions, rate_limit_rps, rate_limit_rpm, token_quota_daily, token_quota_monthly, cost_quota_daily, cost_quota_monthly)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(existing.app_id, newKeyHash, newKeyPrefix, existing.permissions, existing.rate_limit_rps, existing.rate_limit_rpm, existing.token_quota_daily, existing.token_quota_monthly, existing.cost_quota_daily, existing.cost_quota_monthly);
    return { id: result.lastInsertRowid, app_id: existing.app_id, key_prefix: newKeyPrefix };
  }
  //
  touchLastUsed(keyId) {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE app_keys SET last_used_at = ? WHERE id = ?').run(now, keyId);
  }
}
