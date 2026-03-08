export class ModelRepository {
  constructor(db) { this.db = db; }

  getAll(filters = {}) {
    let query = 'SELECT m.*, p.name as provider_name, p.adapter, p.trust_tier, p.is_local, p.health_status FROM models m JOIN providers p ON m.provider_id = p.id';
    const conditions = [];
    const params = [];

    if (filters.provider_id) {
      conditions.push('m.provider_id = ?');
      params.push(filters.provider_id);
    }
    if (filters.supports_tools) {
      conditions.push('m.supports_tools = 1');
    }
    if (filters.supports_vision) {
      conditions.push('m.supports_vision = 1');
    }
    if (filters.free_tier) {
      conditions.push('m.free_tier = 1');
    }
    if (filters.enabled !== undefined) {
      conditions.push('m.enabled = ?');
      params.push(filters.enabled ? 1 : 0);
    }
    if (filters.trust_tier) {
      conditions.push('p.trust_tier = ?');
      params.push(filters.trust_tier);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY m.provider_id, m.name';

    return this.db.prepare(query).all(...params);
  }

  get(id) {
    return this.db.prepare(
      'SELECT m.*, p.name as provider_name, p.adapter, p.trust_tier, p.is_local, p.health_status FROM models m JOIN providers p ON m.provider_id = p.id WHERE m.id = ?'
    ).get(id);
  }

  getByProvider(providerId) {
    return this.db.prepare(
      'SELECT * FROM models WHERE provider_id = ? ORDER BY name'
    ).all(providerId);
  }

  upsert(model) {
    this.db.prepare(`
      INSERT INTO models (id, provider_id, name, context_window, supports_tools, supports_vision, domains, pricing_input, pricing_output, free_tier, free_tier_rpm, free_tier_rpd, free_tier_tpm, free_tier_tpd, enabled)
      VALUES (@id, @provider_id, @name, @context_window, @supports_tools, @supports_vision, @domains, @pricing_input, @pricing_output, @free_tier, @free_tier_rpm, @free_tier_rpd, @free_tier_tpm, @free_tier_tpd, @enabled)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        context_window = excluded.context_window,
        supports_tools = excluded.supports_tools,
        supports_vision = excluded.supports_vision,
        domains = excluded.domains,
        pricing_input = excluded.pricing_input,
        pricing_output = excluded.pricing_output,
        free_tier = excluded.free_tier,
        free_tier_rpm = excluded.free_tier_rpm,
        free_tier_rpd = excluded.free_tier_rpd,
        free_tier_tpm = excluded.free_tier_tpm,
        free_tier_tpd = excluded.free_tier_tpd,
        enabled = excluded.enabled
    `).run({
      id: model.id,
      provider_id: model.provider_id,
      name: model.name,
      context_window: model.context_window || 4096,
      supports_tools: model.supports_tools ? 1 : 0,
      supports_vision: model.supports_vision ? 1 : 0,
      domains: model.domains ? JSON.stringify(model.domains) : null,
      pricing_input: model.pricing_input || 0,
      pricing_output: model.pricing_output || 0,
      free_tier: model.free_tier ? 1 : 0,
      free_tier_rpm: model.free_tier_rpm || null,
      free_tier_rpd: model.free_tier_rpd || null,
      free_tier_tpm: model.free_tier_tpm || null,
      free_tier_tpd: model.free_tier_tpd || null,
      enabled: model.enabled !== false ? 1 : 0
    });
    return this.get(model.id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM models WHERE id = ?').run(id).changes > 0;
  }
}
