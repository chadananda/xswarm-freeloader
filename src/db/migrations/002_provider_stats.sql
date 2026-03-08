CREATE TABLE IF NOT EXISTS provider_stats (
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  period TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER DEFAULT 0,
  token_count INTEGER DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  PRIMARY KEY (provider_id, model_id, period, window_start)
);
CREATE INDEX idx_stats_model ON provider_stats(model_id, period);
