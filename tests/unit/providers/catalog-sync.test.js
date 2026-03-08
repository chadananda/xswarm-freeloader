import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CatalogSync } from '../../../src/providers/catalog-sync.js';
import { createTestDb } from '../../helpers/testDb.js';

describe('CatalogSync', () => {
  let testDb, sync;

  beforeEach(() => {
    testDb = createTestDb();
    sync = new CatalogSync(testDb.providers, testDb.models, {});
  });
  afterEach(() => { testDb.close(); });

  it('should load default catalog', () => {
    const catalog = sync.loadDefaultCatalog();
    expect(catalog).toBeTruthy();
    expect(catalog.providers.length).toBeGreaterThan(0);
  });

  it('should upsert catalog data into database', () => {
    const catalog = sync.loadDefaultCatalog();
    sync.upsertCatalog(catalog);

    const providers = testDb.providers.getAll();
    expect(providers.length).toBeGreaterThan(5);

    const models = testDb.models.getAll();
    expect(models.length).toBeGreaterThan(10);
  });

  it('should handle re-sync idempotently', () => {
    const catalog = sync.loadDefaultCatalog();
    sync.upsertCatalog(catalog);
    const count1 = testDb.providers.getAll().length;

    sync.upsertCatalog(catalog);
    const count2 = testDb.providers.getAll().length;
    expect(count1).toBe(count2);
  });
});
