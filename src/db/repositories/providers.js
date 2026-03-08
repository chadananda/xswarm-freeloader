export class ProviderRepository {
  constructor(db) { this.db = db; }

  getAll(filters = {}) {
    let query = 'SELECT * FROM providers';
    const conditions = [];
    const params = [];

    if (filters.trust_tier) {
      conditions.push('trust_tier = ?');
      params.push(filters.trust_tier);
    }
    if (filters.enabled !== undefined) {
      conditions.push('enabled = ?');
      params.push(filters.enabled ? 1 : 0);
    }
    if (filters.is_local !== undefined) {
      conditions.push('is_local = ?');
      params.push(filters.is_local ? 1 : 0);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY name';

    return this.db.prepare(query).all(...params);
  }

  get(id) {
    return this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id);
  }

  upsert(provider) {
    this.db.prepare(`
      INSERT INTO providers (id, name, adapter, base_url, trust_tier, is_local, enabled)
      VALUES (@id, @name, @adapter, @base_url, @trust_tier, @is_local, @enabled)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        adapter = excluded.adapter,
        base_url = excluded.base_url,
        trust_tier = excluded.trust_tier,
        is_local = excluded.is_local,
        enabled = excluded.enabled
    `).run({
      id: provider.id,
      name: provider.name,
      adapter: provider.adapter,
      base_url: provider.base_url || null,
      trust_tier: provider.trust_tier || 'open',
      is_local: provider.is_local ? 1 : 0,
      enabled: provider.enabled !== false ? 1 : 0
    });
    return this.get(provider.id);
  }

  updateHealth(id, status, errorCount = 0) {
    this.db.prepare(`
      UPDATE providers SET health_status = ?, error_count = ?, health_checked_at = strftime('%s', 'now')
      WHERE id = ?
    `).run(status, errorCount, id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM providers WHERE id = ?').run(id).changes > 0;
  }
}
