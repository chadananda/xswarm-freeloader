import crypto from 'crypto';
import { generateApiKey } from '../../utils/crypto.js';

export class AppRepository {
  constructor(db) { this.db = db; }

  getAll() {
    return this.db.prepare('SELECT * FROM apps ORDER BY created_at DESC').all();
  }

  get(id) {
    return this.db.prepare('SELECT * FROM apps WHERE id = ?').get(id);
  }

  getByApiKey(apiKey) {
    return this.db.prepare('SELECT * FROM apps WHERE api_key = ?').get(apiKey);
  }

  create(app) {
    const id = app.id || crypto.randomUUID();
    const apiKey = app.api_key || generateApiKey();

    this.db.prepare(`
      INSERT INTO apps (id, name, api_key, trust_tier, budget_daily_hard, budget_daily_soft, budget_monthly_hard, budget_monthly_soft)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      app.name,
      apiKey,
      app.trust_tier || 'open',
      app.budget_daily_hard ?? 10.00,
      app.budget_daily_soft ?? 5.00,
      app.budget_monthly_hard ?? 200.00,
      app.budget_monthly_soft ?? 100.00
    );

    return this.get(id);
  }

  update(id, updates) {
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['name', 'trust_tier', 'budget_daily_hard', 'budget_daily_soft', 'budget_monthly_hard', 'budget_monthly_soft'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (!fields.length) return this.get(id);

    params.push(id);
    this.db.prepare(`UPDATE apps SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return this.get(id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM apps WHERE id = ?').run(id).changes > 0;
  }
}
