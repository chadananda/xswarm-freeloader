import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/config/manager.js';
import { createTestDb } from '../../helpers/testDb.js';
//
// Base valid config used throughout tests
const BASE_CONFIG = {
  version: '2.0',
  routing: {
    strategy: 'balanced',
    weights: { cost: 0.4, speed: 0.4, quality: 0.2 },
    qualityGates: { minIntelligence: 6, maxLatency: 10000, blockLocal: false }
  },
  budget: {
    hard: { daily: 10, monthly: 200 },
    soft: { daily: 5, monthly: 100 }
  }
};
//
const createMockLoader = (initialConfig = null) => {
  let stored = initialConfig ? { ...initialConfig } : { ...BASE_CONFIG };
  return {
    load: vi.fn(() => ({ ...stored })),
    save: vi.fn((config) => { stored = { ...config }; })
  };
};
//
describe('ConfigManager — getCurrent', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('returns current config from loader', () => {
    const config = manager.getCurrent();
    expect(config.version).toBe('2.0');
    expect(config.routing.strategy).toBe('balanced');
  });
  //
  it('calls loader.load()', () => {
    manager.getCurrent();
    expect(mockLoader.load).toHaveBeenCalledTimes(1);
  });
  //
  it('each call to getCurrent calls loader.load() again', () => {
    manager.getCurrent();
    manager.getCurrent();
    expect(mockLoader.load).toHaveBeenCalledTimes(2);
  });
});
//
describe('ConfigManager — update', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('merges partial changes into current config', () => {
    const result = manager.update({ routing: { strategy: 'cost-first' } });
    expect(result.routing.strategy).toBe('cost-first');
    // Other routing fields preserved
    expect(result.routing.weights.cost).toBe(0.4);
  });
  //
  it('validates merged config', () => {
    // Invalid strategy should throw
    expect(() => manager.update({ routing: { strategy: 'invalid-strategy' } })).toThrow();
  });
  //
  it('saves to file via loader.save()', () => {
    manager.update({ routing: { strategy: 'speed-first' } });
    expect(mockLoader.save).toHaveBeenCalledTimes(1);
    const savedConfig = mockLoader.save.mock.calls[0][0];
    expect(savedConfig.routing.strategy).toBe('speed-first');
  });
  //
  it('creates a new version in DB', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    const versions = manager.listVersions();
    expect(versions.length).toBe(1);
  });
  //
  it('returns validated config', () => {
    const result = manager.update({ routing: { strategy: 'quality-first' } });
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('routing');
    expect(result).toHaveProperty('budget');
    expect(result.routing.strategy).toBe('quality-first');
  });
  //
  it('deep merge: nested object updates do not clobber siblings', () => {
    const result = manager.update({ budget: { hard: { daily: 25 } } });
    // hard.monthly should be preserved
    expect(result.budget.hard.daily).toBe(25);
    expect(result.budget.hard.monthly).toBe(200);
    // soft should be preserved entirely
    expect(result.budget.soft.daily).toBe(5);
    expect(result.budget.soft.monthly).toBe(100);
  });
  //
  it('invalid config changes throw validation error', () => {
    // weights must sum to 1.0
    expect(() => manager.update({
      routing: { weights: { cost: 0.9, speed: 0.9, quality: 0.9 } }
    })).toThrow();
  });
  //
  it('update with empty changes object returns current config', () => {
    const result = manager.update({});
    expect(result.routing.strategy).toBe('balanced');
    expect(result.budget.hard.daily).toBe(10);
  });
});
//
describe('ConfigManager — Version History', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('saveInitialVersion creates version 1', () => {
    manager.saveInitialVersion(BASE_CONFIG);
    const versions = manager.listVersions();
    expect(versions.length).toBe(1);
    expect(versions[0].version_number).toBe(1);
  });
  //
  it('saveInitialVersion only runs once (idempotent)', () => {
    manager.saveInitialVersion(BASE_CONFIG);
    manager.saveInitialVersion(BASE_CONFIG);
    manager.saveInitialVersion(BASE_CONFIG);
    const versions = manager.listVersions();
    expect(versions.length).toBe(1);
  });
  //
  it('update creates incrementing version numbers', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    manager.update({ routing: { strategy: 'quality-first' } });
    const versions = manager.listVersions();
    expect(versions.length).toBe(3);
    // DESC order: version 3 first
    expect(versions[0].version_number).toBe(3);
    expect(versions[1].version_number).toBe(2);
    expect(versions[2].version_number).toBe(1);
  });
  //
  it('listVersions returns versions in DESC order', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    const versions = manager.listVersions();
    expect(versions[0].version_number).toBeGreaterThan(versions[1].version_number);
  });
  //
  it('listVersions respects limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      manager.update({ routing: { strategy: 'cost-first' } });
    }
    const versions = manager.listVersions(2);
    expect(versions.length).toBe(2);
    // Should be the 2 most recent
    expect(versions[0].version_number).toBe(5);
    expect(versions[1].version_number).toBe(4);
  });
  //
  it('getVersion returns specific version with parsed config', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    const version = manager.getVersion(1);
    expect(version).not.toBeNull();
    expect(version.version_number).toBe(1);
    expect(version.config).toHaveProperty('routing');
    expect(version.config.routing.strategy).toBe('cost-first');
  });
  //
  it('getVersion returns null for non-existent version', () => {
    const version = manager.getVersion(999);
    expect(version).toBeNull();
  });
  //
  it('listVersions returns empty array when no versions exist', () => {
    expect(manager.listVersions()).toEqual([]);
  });
  //
  it('listVersions includes changed_by and change_description fields', () => {
    manager.update({ routing: { strategy: 'cost-first' } }, 'test-user', 'test change');
    const versions = manager.listVersions();
    expect(versions[0].changed_by).toBe('test-user');
    expect(versions[0].change_description).toBe('test change');
  });
});
//
describe('ConfigManager — Rollback', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('rollback loads old version and saves as new version', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    // Rollback to version 1 (cost-first)
    manager.rollback(1);
    // A new version should be created
    const versions = manager.listVersions();
    expect(versions.length).toBe(3);
  });
  //
  it('rollback validates the old config before saving', () => {
    // Manually insert a corrupted version
    testDb.db.prepare(
      'INSERT INTO config_versions (version_number, config_json, changed_by, change_description) VALUES (?, ?, ?, ?)'
    ).run(1, JSON.stringify({ version: '2.0', routing: { strategy: 'invalid-bad' } }), 'system', 'corrupted');
    expect(() => manager.rollback(1)).toThrow();
  });
  //
  it('rollback throws for non-existent version', () => {
    expect(() => manager.rollback(999)).toThrow('Version 999 not found');
  });
  //
  it('after rollback, getCurrent returns old config', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    manager.rollback(1);
    const current = manager.getCurrent();
    expect(current.routing.strategy).toBe('cost-first');
  });
  //
  it('rollback creates a new version entry (not destructive)', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    manager.rollback(1);
    const versions = manager.listVersions();
    // All original versions still exist
    expect(versions.find(v => v.version_number === 1)).toBeDefined();
    expect(versions.find(v => v.version_number === 2)).toBeDefined();
    // New version 3 created for rollback
    const newest = versions.find(v => v.version_number === 3);
    expect(newest).toBeDefined();
    expect(newest.change_description).toContain('Rollback to version 1');
  });
});
//
describe('ConfigManager — Diff', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('diff returns empty array for identical configs', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'cost-first' } });
    const changes = manager.diff(1, 2);
    expect(changes).toEqual([]);
  });
  //
  it('diff detects top-level changes', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    const changes = manager.diff(1, 2);
    const strategyChange = changes.find(c => c.path === 'routing.strategy');
    expect(strategyChange).toBeDefined();
  });
  //
  it('diff detects nested changes with dotted paths', () => {
    manager.update({ budget: { hard: { daily: 10, monthly: 200 } } });
    manager.update({ budget: { hard: { daily: 20, monthly: 200 } } });
    const changes = manager.diff(1, 2);
    const dailyChange = changes.find(c => c.path === 'budget.hard.daily');
    expect(dailyChange).toBeDefined();
    expect(dailyChange.path).toBe('budget.hard.daily');
  });
  //
  it('diff shows from/to values', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    const changes = manager.diff(1, 2);
    const strategyChange = changes.find(c => c.path === 'routing.strategy');
    expect(strategyChange.from).toBe('cost-first');
    expect(strategyChange.to).toBe('speed-first');
  });
  //
  it('diff throws for non-existent from version', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    expect(() => manager.diff(999, 1)).toThrow('Version not found');
  });
  //
  it('diff throws for non-existent to version', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    expect(() => manager.diff(1, 999)).toThrow('Version not found');
  });
  //
  it('diff with same version number returns no changes', () => {
    manager.update({ routing: { strategy: 'cost-first' } });
    const changes = manager.diff(1, 1);
    expect(changes).toEqual([]);
  });
});
//
describe('ConfigManager — Deep Merge', () => {
  let testDb;
  let manager;
  let mockLoader;
  beforeEach(() => {
    testDb = createTestDb();
    mockLoader = createMockLoader();
    manager = new ConfigManager(testDb.db, mockLoader, null);
  });
  afterEach(() => { testDb.close(); });
  //
  it('merges nested objects', () => {
    const target = { a: { b: 1, c: 2 }, d: 3 };
    const source = { a: { b: 99 } };
    const result = manager._deepMerge(target, source);
    expect(result.a.b).toBe(99);
    expect(result.a.c).toBe(2); // preserved
    expect(result.d).toBe(3); // preserved
  });
  //
  it('arrays are replaced, not merged', () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };
    const result = manager._deepMerge(target, source);
    expect(result.arr).toEqual([4, 5]);
  });
  //
  it('null values override existing', () => {
    const target = { a: 'hello', b: { c: 1 } };
    const source = { a: null };
    const result = manager._deepMerge(target, source);
    expect(result.a).toBeNull();
    expect(result.b.c).toBe(1); // b preserved
  });
  //
  it('new keys added from source', () => {
    const target = { a: 1 };
    const source = { b: 2, c: { d: 3 } };
    const result = manager._deepMerge(target, source);
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
    expect(result.c.d).toBe(3);
  });
  //
  it('existing keys preserved when not in source', () => {
    const target = { a: 1, b: 2, c: 3 };
    const source = { a: 99 };
    const result = manager._deepMerge(target, source);
    expect(result.b).toBe(2);
    expect(result.c).toBe(3);
  });
  //
  it('deeply nested merge preserves all sibling branches', () => {
    const target = { x: { y: { z: 1, w: 2 }, q: 3 }, r: 4 };
    const source = { x: { y: { z: 99 } } };
    const result = manager._deepMerge(target, source);
    expect(result.x.y.z).toBe(99);
    expect(result.x.y.w).toBe(2);
    expect(result.x.q).toBe(3);
    expect(result.r).toBe(4);
  });
});
//
describe('ConfigManager — Edge Cases', () => {
  it('operations work when config_versions table does not exist (graceful catch)', async () => {
    // Use a bare db without migrations
    const Database = (await import('better-sqlite3')).default;
    const bareDb = new Database(':memory:');
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(bareDb, mockLoader, null);
    // These should not throw even without the table
    expect(() => manager.saveInitialVersion(BASE_CONFIG)).not.toThrow();
    expect(() => manager.listVersions()).not.toThrow();
    expect(() => manager.getVersion(1)).not.toThrow();
    const versions = manager.listVersions();
    expect(versions).toEqual([]);
    bareDb.close();
  });
  //
  it('update with empty changes returns current config unchanged', () => {
    const testDb = createTestDb();
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(testDb.db, mockLoader, null);
    const result = manager.update({});
    expect(result.routing.strategy).toBe('balanced');
    expect(result.budget.hard.daily).toBe(10);
    testDb.close();
  });
  //
  it('multiple rapid updates create sequential versions', () => {
    const testDb = createTestDb();
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(testDb.db, mockLoader, null);
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.update({ routing: { strategy: 'speed-first' } });
    manager.update({ routing: { strategy: 'quality-first' } });
    manager.update({ routing: { strategy: 'balanced' } });
    const versions = manager.listVersions();
    expect(versions.length).toBe(4);
    // Numbers should be sequential 4,3,2,1 (DESC)
    const numbers = versions.map(v => v.version_number);
    expect(numbers).toEqual([4, 3, 2, 1]);
    testDb.close();
  });
  //
  it('saveInitialVersion sets changed_by to system', () => {
    const testDb = createTestDb();
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(testDb.db, mockLoader, null);
    manager.saveInitialVersion(BASE_CONFIG);
    const versions = manager.listVersions();
    expect(versions[0].changed_by).toBe('system');
    expect(versions[0].change_description).toBe('Initial configuration');
    testDb.close();
  });
  //
  it('update default changedBy is api', () => {
    const testDb = createTestDb();
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(testDb.db, mockLoader, null);
    manager.update({ routing: { strategy: 'cost-first' } });
    const versions = manager.listVersions();
    expect(versions[0].changed_by).toBe('api');
    testDb.close();
  });
  //
  it('rollback default changedBy is api', () => {
    const testDb = createTestDb();
    const mockLoader = createMockLoader();
    const manager = new ConfigManager(testDb.db, mockLoader, null);
    manager.update({ routing: { strategy: 'cost-first' } });
    manager.rollback(1);
    const versions = manager.listVersions();
    expect(versions[0].changed_by).toBe('api');
    testDb.close();
  });
});
