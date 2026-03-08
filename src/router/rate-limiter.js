// :ctx
// :arch sliding window rate limiter per model_id using circular second-buckets (60) and minute-buckets (1440)
// :why O(1) check and record, avoids bursty free-tier violations that cause provider errors
// :deps none (pure in-memory)
// :rules no limit defined → always allowed; token windows sum tokens not requests
// :edge limits loaded from DB model records; missing fields skip that window

// SlidingWindow: circular buffer of N buckets of duration bucketMs
class SlidingWindow {
  constructor(buckets, bucketMs) {
    this.buckets = buckets;
    this.bucketMs = bucketMs;
    this.windowMs = buckets * bucketMs;
    this.counts = new Array(buckets).fill(0);
    this.bucketTs = new Array(buckets).fill(0);
  }
  _idx(nowMs) { return Math.floor(nowMs / this.bucketMs) % this.buckets; }
  _evict(nowMs) {
    const currentBucket = Math.floor(nowMs / this.bucketMs);
    for (let i = 0; i < this.buckets; i++) {
      const age = currentBucket - this.bucketTs[i];
      if (age >= this.buckets) { this.counts[i] = 0; this.bucketTs[i] = 0; }
    }
  }
  sum(nowMs) {
    this._evict(nowMs);
    return this.counts.reduce((a, b) => a + b, 0);
  }
  add(nowMs, n = 1) {
    this._evict(nowMs);
    const idx = this._idx(nowMs);
    const bucket = Math.floor(nowMs / this.bucketMs);
    if (this.bucketTs[idx] !== bucket) { this.counts[idx] = 0; this.bucketTs[idx] = bucket; }
    this.counts[idx] += n;
  }
}

// Per-model state: 4 windows (rpm, rpd, tpm, tpd)
function makeWindows() {
  return {
    rpm: new SlidingWindow(60, 1000),      // 60 second-buckets
    rpd: new SlidingWindow(1440, 60000),   // 1440 minute-buckets
    tpm: new SlidingWindow(60, 1000),
    tpd: new SlidingWindow(1440, 60000)
  };
}

export class RateLimiter {
  constructor() {
    this._windows = new Map(); // modelId → { rpm, rpd, tpm, tpd }
    this._limits = new Map();  // modelId → { rpm, rpd, tpm, tpd }
  }
  _get(modelId) {
    if (!this._windows.has(modelId)) this._windows.set(modelId, makeWindows());
    return this._windows.get(modelId);
  }
  loadLimits(models) {
    for (const m of models) {
      const lim = {};
      if (m.free_tier_rpm != null) lim.rpm = m.free_tier_rpm;
      if (m.free_tier_rpd != null) lim.rpd = m.free_tier_rpd;
      if (m.free_tier_tpm != null) lim.tpm = m.free_tier_tpm;
      if (m.free_tier_tpd != null) lim.tpd = m.free_tier_tpd;
      if (Object.keys(lim).length > 0) this._limits.set(m.id, lim);
    }
  }
  canRequest(modelId, estimatedTokens = 0) {
    const lim = this._limits.get(modelId);
    if (!lim) return { allowed: true };
    const now = Date.now();
    const w = this._get(modelId);
    if (lim.rpm != null && w.rpm.sum(now) >= lim.rpm) return { allowed: false, reason: 'rpm', retryAfter: 60 };
    if (lim.rpd != null && w.rpd.sum(now) >= lim.rpd) return { allowed: false, reason: 'rpd', retryAfter: 86400 };
    if (lim.tpm != null && w.tpm.sum(now) + estimatedTokens > lim.tpm) return { allowed: false, reason: 'tpm', retryAfter: 60 };
    if (lim.tpd != null && w.tpd.sum(now) + estimatedTokens > lim.tpd) return { allowed: false, reason: 'tpd', retryAfter: 86400 };
    return { allowed: true };
  }
  recordRequest(modelId, tokensUsed = 0) {
    const now = Date.now();
    const w = this._get(modelId);
    w.rpm.add(now, 1);
    w.rpd.add(now, 1);
    w.tpm.add(now, tokensUsed);
    w.tpd.add(now, tokensUsed);
  }
  getUsage(modelId) {
    const now = Date.now();
    const w = this._get(modelId);
    const lim = this._limits.get(modelId) || {};
    return {
      rpm: { current: w.rpm.sum(now), max: lim.rpm ?? null },
      rpd: { current: w.rpd.sum(now), max: lim.rpd ?? null },
      tpm: { current: w.tpm.sum(now), max: lim.tpm ?? null },
      tpd: { current: w.tpd.sum(now), max: lim.tpd ?? null }
    };
  }
}
