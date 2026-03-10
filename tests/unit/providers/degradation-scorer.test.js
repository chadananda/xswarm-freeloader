import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DegradationScorer } from '../../../src/providers/degradation-scorer.js';
import { createTestDb } from '../../helpers/testDb.js';
// EWMA constants (mirrors source)
const EWMA_ALPHA = 0.3;
const RING_SIZE = 100;
//
describe('DegradationScorer — EWMA Scoring', () => {
  let scorer;
  beforeEach(() => { scorer = new DegradationScorer(null); });
  //
  it('new provider starts with score 1.0', () => {
    expect(scorer.getScore('openai')).toBe(1.0);
  });
  //
  it('single success keeps score at 1.0', () => {
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    // EWMA: 0.3*1.0 + 0.7*1.0 = 1.0
    expect(scorer.getScore('openai')).toBeCloseTo(1.0, 10);
  });
  //
  it('single failure drops score to 0.76', () => {
    scorer.recordObservation('openai', null, { latencyMs: 100, success: false, timeout: false });
    // EWMA: 0.3*0.2 + 0.7*1.0 = 0.06 + 0.70 = 0.76
    expect(scorer.getScore('openai')).toBeCloseTo(0.76, 5);
  });
  //
  it('single timeout drops score to 0.70', () => {
    scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: true });
    // EWMA: 0.3*0.0 + 0.7*1.0 = 0.70
    expect(scorer.getScore('openai')).toBeCloseTo(0.70, 5);
  });
  //
  it('multiple consecutive failures converge toward 0.2', () => {
    for (let i = 0; i < 30; i++) {
      scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    }
    // After many failures converges to EWMA fixed point of 0.2
    expect(scorer.getScore('openai')).toBeCloseTo(0.2, 1);
  });
  //
  it('multiple consecutive successes after failure recover toward 1.0', () => {
    // Drive score down
    for (let i = 0; i < 10; i++) {
      scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    }
    const depressed = scorer.getScore('openai');
    expect(depressed).toBeLessThan(0.5);
    // Recover with successes
    for (let i = 0; i < 15; i++) {
      scorer.recordObservation('openai', null, { latencyMs: 50, success: true, timeout: false });
    }
    expect(scorer.getScore('openai')).toBeGreaterThan(depressed);
    expect(scorer.getScore('openai')).toBeGreaterThan(0.9);
  });
  //
  it('recovery after 5 failures then 10 successes approaches ~0.9+', () => {
    for (let i = 0; i < 5; i++) {
      scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    }
    for (let i = 0; i < 10; i++) {
      scorer.recordObservation('openai', null, { latencyMs: 50, success: true, timeout: false });
    }
    expect(scorer.getScore('openai')).toBeGreaterThanOrEqual(0.9);
  });
  //
  it('alternating success/failure stabilizes around midpoint', () => {
    for (let i = 0; i < 40; i++) {
      if (i % 2 === 0) {
        scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
      } else {
        scorer.recordObservation('openai', null, { latencyMs: 100, success: false, timeout: false });
      }
    }
    const score = scorer.getScore('openai');
    // EWMA fixed point for alternating 1.0 and 0.2 is approximately 0.6
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(0.9);
  });
  //
  it('different providers tracked independently', () => {
    scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: false });
    scorer.recordObservation('anthropic', null, { latencyMs: 100, success: true, timeout: false });
    expect(scorer.getScore('openai')).toBeLessThan(0.8);
    expect(scorer.getScore('anthropic')).toBe(1.0);
  });
});
//
describe('DegradationScorer — Ring Buffer & Percentiles', () => {
  let scorer;
  beforeEach(() => { scorer = new DegradationScorer(null); });
  //
  it('no observations → p50/p95/p99 are null', () => {
    scorer.getScore('openai'); // creates entry but no latency
    scorer.recordObservation('openai', null, { latencyMs: null, success: true, timeout: false });
    const scores = scorer.getAllScores();
    expect(scores['openai'].p50).toBeNull();
    expect(scores['openai'].p95).toBeNull();
    expect(scores['openai'].p99).toBeNull();
  });
  //
  it('single observation → p50 equals that value', () => {
    scorer.recordObservation('openai', null, { latencyMs: 250, success: true, timeout: false });
    const scores = scorer.getAllScores();
    expect(scores['openai'].p50).toBe(250);
  });
  //
  it('10 observations → correct p50 (median)', () => {
    // Insert 10 values: 10, 20, 30, ..., 100
    for (let i = 1; i <= 10; i++) {
      scorer.recordObservation('openai', null, { latencyMs: i * 10, success: true, timeout: false });
    }
    const scores = scorer.getAllScores();
    // sorted: [10,20,30,40,50,60,70,80,90,100], floor(10*0.5)=5 → index 5 = 60
    expect(scores['openai'].p50).toBe(60);
    expect(scores['openai'].observations).toBe(10);
  });
  //
  it('100 observations → correct p50, p95, p99', () => {
    for (let i = 1; i <= 100; i++) {
      scorer.recordObservation('openai', null, { latencyMs: i, success: true, timeout: false });
    }
    const scores = scorer.getAllScores();
    // sorted [1..100], p50=floor(100*0.5)=50 → value 51
    expect(scores['openai'].p50).toBe(51);
    // p95=floor(100*0.95)=95 → value 96
    expect(scores['openai'].p95).toBe(96);
    // p99=floor(100*0.99)=99 → value 100
    expect(scores['openai'].p99).toBe(100);
    expect(scores['openai'].observations).toBe(100);
  });
  //
  it('ring buffer wraps after 100 entries (RING_SIZE)', () => {
    // Fill exactly RING_SIZE
    for (let i = 0; i < RING_SIZE; i++) {
      scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    }
    expect(scorer.getAllScores()['openai'].observations).toBe(RING_SIZE);
    // Add one more — should overwrite, not grow
    scorer.recordObservation('openai', null, { latencyMs: 999, success: true, timeout: false });
    expect(scorer.getAllScores()['openai'].observations).toBe(RING_SIZE);
  });
  //
  it('after 200 observations, only last 100 are in buffer (ring wraps)', () => {
    // First 100 obs: all 1ms
    for (let i = 0; i < 100; i++) {
      scorer.recordObservation('openai', null, { latencyMs: 1, success: true, timeout: false });
    }
    // Next 100 obs: all 9999ms — these overwrite the 1ms entries
    for (let i = 0; i < 100; i++) {
      scorer.recordObservation('openai', null, { latencyMs: 9999, success: true, timeout: false });
    }
    const scores = scorer.getAllScores();
    expect(scores['openai'].observations).toBe(RING_SIZE);
    // All values in buffer should be 9999
    expect(scores['openai'].p50).toBe(9999);
    expect(scores['openai'].p95).toBe(9999);
  });
});
//
describe('DegradationScorer — getAllScores', () => {
  let scorer;
  beforeEach(() => { scorer = new DegradationScorer(null); });
  //
  it('returns empty object when no providers recorded', () => {
    expect(scorer.getAllScores()).toEqual({});
  });
  //
  it('returns scores for all recorded providers', () => {
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    scorer.recordObservation('anthropic', null, { latencyMs: 200, success: true, timeout: false });
    scorer.recordObservation('groq', null, { latencyMs: 50, success: false, timeout: false });
    const scores = scorer.getAllScores();
    expect(Object.keys(scores)).toHaveLength(3);
    expect(scores['openai']).toBeDefined();
    expect(scores['anthropic']).toBeDefined();
    expect(scores['groq']).toBeDefined();
  });
  //
  it('each entry has score, p50, p95, p99, observations count', () => {
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    const scores = scorer.getAllScores();
    const entry = scores['openai'];
    expect(entry).toHaveProperty('score');
    expect(entry).toHaveProperty('p50');
    expect(entry).toHaveProperty('p95');
    expect(entry).toHaveProperty('p99');
    expect(entry).toHaveProperty('observations');
    expect(typeof entry.score).toBe('number');
    expect(typeof entry.observations).toBe('number');
  });
});
//
describe('DegradationScorer — getScore', () => {
  let scorer;
  beforeEach(() => { scorer = new DegradationScorer(null); });
  //
  it('returns 1.0 for unknown provider (creates default entry)', () => {
    expect(scorer.getScore('unknown-provider')).toBe(1.0);
    // Side effect: entry is now tracked in getAllScores
    expect(scorer.getAllScores()['unknown-provider']).toBeDefined();
  });
  //
  it('returns calculated score for known provider', () => {
    scorer.recordObservation('openai', null, { latencyMs: null, success: false, timeout: true });
    // 0.3*0.0 + 0.7*1.0 = 0.70
    expect(scorer.getScore('openai')).toBeCloseTo(0.70, 5);
  });
});
//
describe('DegradationScorer — Persistence', () => {
  let scorer;
  let testDb;
  afterEach(() => {
    scorer?.stopPersistence();
    testDb?.close();
    vi.useRealTimers();
  });
  //
  it('_persist writes to provider_health table', () => {
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    scorer.recordObservation('openai', null, { latencyMs: 150, success: true, timeout: false });
    scorer._persist();
    const row = testDb.db.prepare('SELECT * FROM provider_health WHERE provider_id = ?').get('openai');
    expect(row).toBeDefined();
    expect(row.provider_id).toBe('openai');
  });
  //
  it('persisted data has correct provider_id, window_start, degradation_score', () => {
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    scorer.recordObservation('anthropic', null, { latencyMs: 200, success: true, timeout: false });
    const beforePersist = Date.now();
    scorer._persist();
    const row = testDb.db.prepare('SELECT * FROM provider_health WHERE provider_id = ?').get('anthropic');
    expect(row.provider_id).toBe('anthropic');
    expect(row.degradation_score).toBeCloseTo(1.0, 5);
    // window_start should be the start of the current hour (unix seconds)
    const now = Math.floor(beforePersist / 1000);
    const hourStart = now - (now % 3600);
    expect(row.window_start).toBe(hourStart);
  });
  //
  it('persisted percentiles match in-memory calculation', () => {
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    for (let i = 1; i <= 10; i++) {
      scorer.recordObservation('groq', null, { latencyMs: i * 10, success: true, timeout: false });
    }
    scorer._persist();
    const row = testDb.db.prepare('SELECT * FROM provider_health WHERE provider_id = ?').get('groq');
    const scores = scorer.getAllScores();
    expect(row.latency_p50).toBe(scores['groq'].p50);
    expect(row.latency_p95).toBe(scores['groq'].p95);
    expect(row.latency_p99).toBe(scores['groq'].p99);
  });
  //
  it('startPersistence sets up interval (fake timers)', () => {
    vi.useFakeTimers();
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    scorer.startPersistence();
    expect(scorer.persistTimer).not.toBeNull();
    // Advance past PERSIST_INTERVAL (60000ms) — should trigger _persist
    vi.advanceTimersByTime(60000);
    const row = testDb.db.prepare('SELECT * FROM provider_health WHERE provider_id = ?').get('openai');
    expect(row).toBeDefined();
    scorer.stopPersistence();
    vi.useRealTimers();
  });
  //
  it('stopPersistence clears interval', () => {
    vi.useFakeTimers();
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    scorer.startPersistence();
    expect(scorer.persistTimer).not.toBeNull();
    scorer.stopPersistence();
    expect(scorer.persistTimer).toBeNull();
    vi.useRealTimers();
  });
  //
  it('persistence with null db does not crash', () => {
    scorer = new DegradationScorer(null);
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    expect(() => scorer._persist()).not.toThrow();
  });
  //
  it('multiple providers all persisted in single _persist call', () => {
    testDb = createTestDb();
    scorer = new DegradationScorer(testDb.db);
    scorer.recordObservation('openai', null, { latencyMs: 100, success: true, timeout: false });
    scorer.recordObservation('anthropic', null, { latencyMs: 200, success: false, timeout: false });
    scorer._persist();
    const rows = testDb.db.prepare('SELECT provider_id FROM provider_health').all();
    const ids = rows.map(r => r.provider_id);
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
  });
});
