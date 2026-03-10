// :arch: versioned config manager — CRUD with diff/rollback via config_versions table
// :deps: ConfigLoader, config_versions table | consumed by app.js admin API
// :rules: every update creates a new version; rollback is just loading old version + creating new version entry
import { validateConfig, validatePartialConfig } from './schema.js';
import { ConfigLoader } from './loader.js';
//
export class ConfigManager {
  constructor(db, configLoader, logger) {
    this.db = db;
    this.configLoader = configLoader;
    this.logger = logger;
  }
  //
  getCurrent() {
    return this.configLoader.load();
  }
  //
  update(changes, changedBy = 'api', description = '') {
    const current = this.getCurrent();
    const merged = this._deepMerge(current, changes);
    const validated = validateConfig(merged);
    // Save to file
    this.configLoader.save(validated);
    // Version in DB
    this._saveVersion(validated, changedBy, description);
    return validated;
  }
  //
  listVersions(limit = 20) {
    try {
      return this.db.prepare(
        'SELECT id, version_number, changed_by, change_description, created_at FROM config_versions ORDER BY version_number DESC LIMIT ?'
      ).all(limit);
    } catch { return []; }
  }
  //
  getVersion(versionNumber) {
    try {
      const row = this.db.prepare('SELECT * FROM config_versions WHERE version_number = ?').get(versionNumber);
      if (!row) return null;
      return { ...row, config: JSON.parse(row.config_json) };
    } catch { return null; }
  }
  //
  rollback(versionNumber, changedBy = 'api') {
    const version = this.getVersion(versionNumber);
    if (!version) throw new Error(`Version ${versionNumber} not found`);
    const validated = validateConfig(version.config);
    this.configLoader.save(validated);
    this._saveVersion(validated, changedBy, `Rollback to version ${versionNumber}`);
    return validated;
  }
  //
  diff(fromVersion, toVersion) {
    const from = this.getVersion(fromVersion);
    const to = this.getVersion(toVersion);
    if (!from || !to) throw new Error('Version not found');
    return this._computeDiff(from.config, to.config);
  }
  //
  saveInitialVersion(config) {
    try {
      const count = this.db.prepare('SELECT COUNT(*) as c FROM config_versions').get();
      if (count.c === 0) this._saveVersion(config, 'system', 'Initial configuration');
    } catch { /* config_versions table might not exist yet */ }
  }
  //
  _saveVersion(config, changedBy, description) {
    try {
      const maxRow = this.db.prepare('SELECT MAX(version_number) as max_v FROM config_versions').get();
      const nextVersion = (maxRow?.max_v || 0) + 1;
      this.db.prepare(
        'INSERT INTO config_versions (version_number, config_json, changed_by, change_description) VALUES (?, ?, ?, ?)'
      ).run(nextVersion, JSON.stringify(config), changedBy, description);
    } catch { /* non-fatal */ }
  }
  //
  _deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && target[key] && typeof target[key] === 'object') {
        result[key] = this._deepMerge(target[key], value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  //
  _computeDiff(from, to, prefix = '') {
    const changes = [];
    const allKeys = new Set([...Object.keys(from || {}), ...Object.keys(to || {})]);
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const a = from?.[key], b = to?.[key];
      if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) {
        changes.push(...this._computeDiff(a, b, path));
      } else if (JSON.stringify(a) !== JSON.stringify(b)) {
        changes.push({ path, from: a, to: b });
      }
    }
    return changes;
  }
}
