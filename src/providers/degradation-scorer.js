// :arch: EWMA degradation scorer — tracks per-provider health with exponential weighted moving average
// :deps: in-memory ring buffer for percentiles, periodic DB persistence | consumed by health-monitor.js, scorer.js
// :rules: score 1.0 = perfect, 0.0 = dead; alpha=0.3 for EWMA; ring buffer of 100 observations per provider
//
const EWMA_ALPHA = 0.3;
const RING_SIZE = 100;
const PERSIST_INTERVAL = 60000; // 1 minute
//
export class DegradationScorer {
  constructor(db) {
    this.db = db;
    this.scores = new Map(); // providerId → { score, observations: [], idx }
    this.persistTimer = null;
  }
  //
  _getEntry(providerId) {
    if (!this.scores.has(providerId)) {
      this.scores.set(providerId, { score: 1.0, observations: [], idx: 0 });
    }
    return this.scores.get(providerId);
  }
  //
  recordObservation(providerId, modelId, { latencyMs, success, timeout }) {
    const entry = this._getEntry(providerId);
    // EWMA update: success=1.0, timeout=0.0, failure=0.2
    const value = success ? 1.0 : (timeout ? 0.0 : 0.2);
    entry.score = EWMA_ALPHA * value + (1 - EWMA_ALPHA) * entry.score;
    // Ring buffer for latency percentiles
    if (latencyMs != null) {
      if (entry.observations.length < RING_SIZE) {
        entry.observations.push(latencyMs);
      } else {
        entry.observations[entry.idx % RING_SIZE] = latencyMs;
      }
      entry.idx++;
    }
  }
  //
  getScore(providerId) {
    return this._getEntry(providerId).score;
  }
  //
  getAllScores() {
    const result = {};
    for (const [id, entry] of this.scores) {
      const percentiles = this._calcPercentiles(entry.observations);
      result[id] = { score: entry.score, ...percentiles, observations: entry.observations.length };
    }
    return result;
  }
  //
  _calcPercentiles(observations) {
    if (observations.length === 0) return { p50: null, p95: null, p99: null };
    const sorted = [...observations].sort((a, b) => a - b);
    const p = (pct) => sorted[Math.min(Math.floor(sorted.length * pct), sorted.length - 1)];
    return { p50: p(0.5), p95: p(0.95), p99: p(0.99) };
  }
  //
  startPersistence() {
    this.persistTimer = setInterval(() => this._persist(), PERSIST_INTERVAL);
  }
  //
  stopPersistence() {
    if (this.persistTimer) { clearInterval(this.persistTimer); this.persistTimer = null; }
  }
  //
  _persist() {
    if (!this.db) return;
    const now = Math.floor(Date.now() / 1000);
    const hourStart = now - (now % 3600);
    try {
      const upsert = this.db.prepare(`
        INSERT INTO provider_health (provider_id, model_id, window_start, request_count, success_count, error_count, timeout_count, latency_p50, latency_p95, latency_p99, degradation_score)
        VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider_id, model_id, window_start) DO UPDATE SET
          request_count = excluded.request_count, success_count = excluded.success_count,
          error_count = excluded.error_count, timeout_count = excluded.timeout_count,
          latency_p50 = excluded.latency_p50, latency_p95 = excluded.latency_p95,
          latency_p99 = excluded.latency_p99, degradation_score = excluded.degradation_score
      `);
      for (const [id, entry] of this.scores) {
        const pct = this._calcPercentiles(entry.observations);
        const successCount = Math.round(entry.observations.length * entry.score);
        const errorCount = entry.observations.length - successCount;
        upsert.run(id, hourStart, entry.observations.length, successCount, errorCount, 0, pct.p50, pct.p95, pct.p99, entry.score);
      }
    } catch { /* persistence failure is non-fatal */ }
  }
}
