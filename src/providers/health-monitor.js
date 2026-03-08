const CIRCUIT_STATES = { CLOSED: 'closed', OPEN: 'open', HALF_OPEN: 'half-open' };
const BACKOFF_SCHEDULE = [30000, 60000, 120000, 300000]; // 30s, 60s, 2m, 5m
const FAILURE_THRESHOLD = 3;

export class HealthMonitor {
  constructor(registry, providerRepo, logger) {
    this.registry = registry;
    this.providerRepo = providerRepo;
    this.logger = logger;
    this.circuits = new Map();
    this.pollInterval = null;
  }

  getCircuit(providerId) {
    if (!this.circuits.has(providerId)) {
      this.circuits.set(providerId, {
        state: CIRCUIT_STATES.CLOSED,
        failures: 0,
        lastFailure: 0,
        backoffIndex: 0
      });
    }
    return this.circuits.get(providerId);
  }

  isAvailable(providerId) {
    const circuit = this.getCircuit(providerId);

    if (circuit.state === CIRCUIT_STATES.CLOSED) return true;

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

  recordSuccess(providerId) {
    const circuit = this.getCircuit(providerId);
    circuit.state = CIRCUIT_STATES.CLOSED;
    circuit.failures = 0;
    circuit.backoffIndex = 0;
    this.providerRepo.updateHealth(providerId, 'healthy', 0);
  }

  recordFailure(providerId) {
    const circuit = this.getCircuit(providerId);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= FAILURE_THRESHOLD) {
      circuit.state = CIRCUIT_STATES.OPEN;
      circuit.backoffIndex = Math.min(circuit.backoffIndex + 1, BACKOFF_SCHEDULE.length - 1);
      this.providerRepo.updateHealth(providerId, 'down', circuit.failures);
      this.logger?.warn?.(`Circuit breaker OPEN for ${providerId} after ${circuit.failures} failures`);
    } else {
      this.providerRepo.updateHealth(providerId, 'degraded', circuit.failures);
    }
  }

  startPolling(intervalMs = 60000) {
    this.pollInterval = setInterval(() => this.pollLocalProviders(), intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollLocalProviders() {
    const localProviders = this.providerRepo.getAll({ is_local: true, enabled: true });

    for (const provider of localProviders) {
      const adapter = this.registry.get(provider.id);
      if (!adapter) continue;

      try {
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

  getStatus() {
    const status = {};
    for (const [id, circuit] of this.circuits) {
      status[id] = {
        state: circuit.state,
        failures: circuit.failures,
        available: this.isAvailable(id)
      };
    }
    return status;
  }
}
