import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigLoader } from '../../../src/config/loader.js';

describe('ConfigLoader', () => {
  let tmpDir;
  let configPath;
  let loader;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xswarm-test-'));
    configPath = path.join(tmpDir, 'config.json');
    loader = new ConfigLoader(configPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load defaults when no config file exists', () => {
    const config = loader.load();
    expect(config.version).toBe('2.0');
    expect(config.routing.strategy).toBe('balanced');
    expect(config.routing.weights.cost).toBe(0.4);
  });

  it('should save and load config', () => {
    const config = loader.load();
    loader.save(config);
    expect(fs.existsSync(configPath)).toBe(true);
    const loaded = loader.load();
    expect(loaded.version).toBe('2.0');
  });

  it('should merge user config with defaults', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      version: '2.0',
      routing: { strategy: 'cost-first', weights: { cost: 0.7, speed: 0.2, quality: 0.1 } }
    }));
    const config = loader.load();
    expect(config.routing.strategy).toBe('cost-first');
    expect(config.routing.weights.cost).toBe(0.7);
    expect(config.budget.hard.daily).toBe(10.00);
  });

  it('should get value by path', () => {
    loader.save(loader.load());
    expect(loader.get('routing.strategy')).toBe('balanced');
    expect(loader.get('budget.hard.daily')).toBe(10.00);
  });

  it('should set value by path', () => {
    loader.save(loader.load());
    loader.set('routing.strategy', 'quality-first');
    expect(loader.get('routing.strategy')).toBe('quality-first');
  });

  it('should report existence', () => {
    expect(loader.exists()).toBe(false);
    loader.save(loader.load());
    expect(loader.exists()).toBe(true);
  });

  it('should reject invalid config', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      version: '2.0',
      routing: { strategy: 'invalid-strategy' }
    }));
    expect(() => loader.load()).toThrow();
  });
});
