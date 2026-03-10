// :arch: circuit breaker health monitor with QUARANTINE state and degradation scorer integration
// :deps: registry, providerRepo, degradationScorer | consumed by scorer.js, app.js
// :rules: CLOSED→OPEN at 3 failures; OPEN→HALF_OPEN after backoff; QUARANTINE after 3 failed half-open probes
const CIRCUIT_STATES = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half-open', QUARANTINE: 'quarantine' };
const BACKOFF_SCHEDULE = [30000, 60000, 120000, 300000]; // 30s, 60s, 2m, 5m
const FAILURE_THRESHOLD = 3;
const QUARANTINE_THRESHOLD = 3; // failed half-open probes before quarantine
//
export class HealthMonitor {
  constructor(registry, providerRepo, logger, degradationScorer) {
    this.registry = registry;
    this.providerRepo = providerRepo;
    this.logger = logger;
    this.degradationScorer = degradationScorer;
    this.circuits = new Map();
    this.pollInterval = null;
  }
  //
  getCircuit(providerId) {
    if (!this.circuits.has(providerId)) {
      this.circuits.set(providerId, { state: CIRCUIT_STATES.CLOSED, failures: 0, lastFailure: 0, backoffIndex: 0, halfOpenFailures: 0 });
    }
    return this.circuits.get(providerId);
  }
  //
  isAvailable(providerId) {
    const circuit = this.getCircuit(providerId);
    if (circuit.state === CIRCUIT_STATES.CLOSED) return true;
    if (circuit.state === CIRCUIT_STATES.QUARANTINE) return false; // Only active probes can recover
    if (circuit.state === CIRCUIT_STATES.OPEN) {
      const backoff = BACKOFF_SCHEDULE[Math.min(circuit.backoffIndex, BACKOFF_SCHEDULE.length - 1)];
      if (Date.now() - circuit.lastFailure > backoff) {
        circuit.state = CIRCUIT_STATES.HALF_OPEN;
        return true;
      }
      return false;
    }
    return true; // HALF_OPEN allows one attempt
  }
  //
  recordSuccess(providerId) {
    const circuit = this.getCircuit(providerId);
    circuit.state = CIRCUIT_STATES.CLOSED;
    circuit.failures = 0;
    circuit.backoffIndex = 0;
    circuit.halfOpenFailures = 0;
    this.providerRepo.updateHealth(providerId, 'healthy', 0);
    this.degradationScorer?.recordObservation(providerId, null, { success: true, timeout: false });
  }
  //
  recordFailure(providerId) {
    const circuit = this.getCircuit(providerId);
    circuit.failures++;
    circuit.lastFailure = Date.now();
    this.degradationScorer?.recordObservation(providerId, null, { success: false, timeout: false });
    //
    if (circuit.state === CIRCUIT_STATES.HALF_OPEN) {
      circuit.halfOpenFailures++;
      if (circuit.halfOpenFailures >= QUARANTINE_THRESHOLD) {
        circuit.state = CIRCUIT_STATES.QUARANTINE;
        this.providerRepo.updateHealth(providerId, 'quarantine', circuit.failures);
        this.logger?.warn?.(`Provider ${providerId} QUARANTINED after ${circuit.halfOpenFailures} failed probes`);
        return;
      }
      circuit.state = CIRCUIT_STATES.OPEN;
      return;
    }
    //
    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = CIRCUIT_STATES.OPEN;
      circuit.backoffIndex = Math.min(circuit.backoffIndex + 1, BACKOFF_SCHEDULE.length - 1);
      this.providerRepo.updateHealth(providerId, 'down', circuit.failures);
      this.logger?.warn?.(`Circuit breaker OPEN for ${providerId} after ${circuit.failures} failures`);
    } else {
      this.providerRepo.updateHealth(providerId, 'degraded', circuit.failures);
    }
  }
  //
  startPolling(intervalMs = 60000) {
    this.pollInterval = setInterval(() => this.pollProviders(), intervalMs);
  }
  //
  stopPolling() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }
  //
  async pollProviders() {
    // Poll all enabled providers, not just local
    const allProviders = this.providerRepo.getAll({ enabled: true });
    for (const provider of allProviders) {
      const adapter = this.registry.get(provider.id);
      if (!adapter?.healthCheck) continue;
      const circuit = this.getCircuit(provider.id);
      // Quarantined providers still get probed — only way to recover
      try {
        const accounts = [];
        const healthy = await adapter.healthCheck();
        if (healthy) {
          this.recordSuccess(provider.id);
        } else {
          this.recordFailure(provider.id);
        }
      } catch {
        this.recordFailure(provider.id);
      }
    }
  }
  //
  getStatus() {
    const status = {};
    for (const [id, circuit] of this.circuits) {
      status[id] = { state: circuit.state, failures: circuit.failures, halfOpenFailures: circuit.halfOpenFailures || 0, available: this.isAvailable(id) };
    }
    return status;
  }
}
