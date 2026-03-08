import fs from 'fs';
import path from 'path';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateConfig } from './schema.js';

export class ConfigLoader {
  constructor(configPath = null) {
    this.configPath = configPath || this.getDefaultConfigPath();
  }

  getDefaultConfigPath() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    return path.join(homeDir, '.xswarm', 'config.json');
  }

  load() {
    let config = { ...DEFAULT_CONFIG };

    if (fs.existsSync(this.configPath)) {
      try {
        const userConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        config = this.merge(config, userConfig);
      } catch (error) {
        throw new Error(`Failed to load config from ${this.configPath}: ${error.message}`);
      }
    }

    return validateConfig(config);
  }

  save(config) {
    const validated = validateConfig(config);
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(validated, null, 2), 'utf8');
  }

  update(updates) {
    const current = this.load();
    const updated = this.merge(current, updates);
    this.save(updated);
    return updated;
  }

  merge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.merge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  get(keyPath) {
    const config = this.load();
    return keyPath.split('.').reduce((v, k) => v?.[k], config);
  }

  set(keyPath, value) {
    const config = this.load();
    const keys = keyPath.split('.');
    const lastKey = keys.pop();
    let target = config;
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }
    target[lastKey] = value;
    this.save(config);
    return config;
  }

  exists() {
    return fs.existsSync(this.configPath);
  }
}
