import { encryptApiKey, decryptApiKey } from '../../utils/crypto.js';

export class AccountRepository {
  constructor(db) { this.db = db; }

  getAll(filters = {}) {
    let query = 'SELECT * FROM accounts';
    const conditions = [];
    const params = [];

    if (filters.provider_id) {
      conditions.push('provider_id = ?');
      params.push(filters.provider_id);
    }
    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY provider_id, id';

    return this.db.prepare(query).all(...params).map(acc => ({
      ...acc,
      api_key: decryptApiKey(acc.api_key_encrypted, acc.iv)
    }));
  }

  get(id) {
    const acc = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!acc) return undefined;
    return { ...acc, api_key: decryptApiKey(acc.api_key_encrypted, acc.iv) };
  }

  getByProvider(providerId) {
    return this.db.prepare(
      'SELECT * FROM accounts WHERE provider_id = ? AND status = ? ORDER BY id'
    ).all(providerId, 'active').map(acc => ({
      ...acc,
      api_key: decryptApiKey(acc.api_key_encrypted, acc.iv)
    }));
  }

  insert(account) {
    const { encrypted, iv } = encryptApiKey(account.api_key);
    const result = this.db.prepare(`
      INSERT INTO accounts (provider_id, api_key_encrypted, iv, status)
      VALUES (?, ?, ?, ?)
    `).run(account.provider_id, encrypted, iv, account.status || 'active');
    return this.get(result.lastInsertRowid);
  }

  updateStatus(id, status) {
    this.db.prepare('UPDATE accounts SET status = ? WHERE id = ?').run(status, id);
  }

  incrementFreeUsage(id, field = 'free_used_today') {
    this.db.prepare(`UPDATE accounts SET ${field} = ${field} + 1 WHERE id = ?`).run(id);
  }

  resetDailyFreeUsage() {
    this.db.prepare('UPDATE accounts SET free_used_today = 0').run();
  }

  resetMonthlyFreeUsage() {
    this.db.prepare('UPDATE accounts SET free_used_month = 0').run();
  }

  delete(id) {
    return this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes > 0;
  }
}
