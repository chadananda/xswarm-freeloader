import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthMonitor } from '../../../src/providers/health-monitor.js';
import { DegradationScorer } from '../../../src/providers/degradation-scorer.js';
//
const mockProviderRepo = {
  updateHealth: () => {},
  getAll: () => []
};
//
describe('HealthMonitor', () => {
  let monitor;
  beforeEach(() => {
    monitor = new HealthMonitor(new Map(), mockProviderRepo, null);
  });
  //
  it('should start with all providers available', () => {
    expect(monitor.isAvailable('openai')).toBe(true);
  });
  //
  it('should stay available after 1-2 failures', () => {
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(true);
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(true);
  });
  //
  it('should open circuit after 3 failures', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(false);
  });
  //
  it('should recover after success', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(false);
    // Simulate backoff elapsed
    const circuit = monitor.getCircuit('openai');
    circuit.lastFailure = Date.now() - 310000; // 5+ min ago, past max backoff
    expect(monitor.isAvailable('openai')).toBe(true);
    monitor.recordSuccess('openai');
    expect(monitor.isAvailable('openai')).toBe(true);
    expect(monitor.getCircuit('openai').state).toBe('closed');
  });
  //
  it('should track multiple providers independently', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(false);
    expect(monitor.isAvailable('anthropic')).toBe(true);
  });
  //
  it('should return status', () => {
    monitor.recordFailure('openai');
    const status = monitor.getStatus();
    expect(status['openai'].failures).toBe(1);
    expect(status['openai'].available).toBe(true);
  });
});
//
describe('HealthMonitor — QUARANTINE State', () => {
  let monitor;
  // Helper: drive a provider to HALF_OPEN state
  const openAndHalfOpen = (mon, id) => {
    mon.recordFailure(id);
    mon.recordFailure(id);
    mon.recordFailure(id);
    // Fast-forward past backoff
    const circuit = mon.getCircuit(id);
    circuit.lastFailure = Date.now() - 310000;
    // This call transitions OPEN → HALF_OPEN
    mon.isAvailable(id);
  };
  //
  beforeEach(() => {
    monitor = new HealthMonitor(new Map(), mockProviderRepo, null);
  });
  //
  it('provider enters QUARANTINE after 3 failed half-open probes', () => {
    openAndHalfOpen(monitor, 'openai');
    // First HALF_OPEN failure → back to OPEN (halfOpenFailures=1)
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').state).toBe('open');
    // Advance past backoff again → HALF_OPEN
    monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
    monitor.isAvailable('openai');
    // Second HALF_OPEN failure → OPEN (halfOpenFailures=2)
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').state).toBe('open');
    // Advance past backoff again → HALF_OPEN
    monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
    monitor.isAvailable('openai');
    // Third HALF_OPEN failure → QUARANTINE
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').state).toBe('quarantine');
  });
  //
  it('QUARANTINE provider is not available (isAvailable returns false)', () => {
    openAndHalfOpen(monitor, 'openai');
    // Drive to QUARANTINE with 3 half-open failures
    for (let i = 0; i < 3; i++) {
      monitor.recordFailure('openai');
      if (monitor.getCircuit('openai').state === 'open') {
        monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
        monitor.isAvailable('openai');
      }
    }
    expect(monitor.getCircuit('openai').state).toBe('quarantine');
    expect(monitor.isAvailable('openai')).toBe(false);
  });
  //
  it('QUARANTINE provider can recover via polling (active probe success → CLOSED)', () => {
    // Drive to quarantine
    openAndHalfOpen(monitor, 'openai');
    for (let i = 0; i < 3; i++) {
      monitor.recordFailure('openai');
      if (monitor.getCircuit('openai').state === 'open') {
        monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
        monitor.isAvailable('openai');
      }
    }
    expect(monitor.getCircuit('openai').state).toBe('quarantine');
    // recordSuccess should recover from quarantine
    monitor.recordSuccess('openai');
    expect(monitor.getCircuit('openai').state).toBe('closed');
    expect(monitor.isAvailable('openai')).toBe(true);
  });
  //
  it('half-open failure count resets on success', () => {
    openAndHalfOpen(monitor, 'openai');
    // One half-open failure → back to open with halfOpenFailures=1
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').halfOpenFailures).toBe(1);
    // Now succeed — resets halfOpenFailures
    monitor.recordSuccess('openai');
    expect(monitor.getCircuit('openai').halfOpenFailures).toBe(0);
    expect(monitor.getCircuit('openai').state).toBe('closed');
  });
  //
  it('half-open failure increments correctly (1, 2, then 3 → QUARANTINE)', () => {
    openAndHalfOpen(monitor, 'openai');
    // First HALF_OPEN fail
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').halfOpenFailures).toBe(1);
    // Back to half-open
    monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
    monitor.isAvailable('openai');
    // Second HALF_OPEN fail
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').halfOpenFailures).toBe(2);
    // Back to half-open
    monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
    monitor.isAvailable('openai');
    // Third HALF_OPEN fail → QUARANTINE
    monitor.recordFailure('openai');
    expect(monitor.getCircuit('openai').halfOpenFailures).toBe(3);
    expect(monitor.getCircuit('openai').state).toBe('quarantine');
  });
});
//
describe('HealthMonitor — Degradation Scorer Integration', () => {
  let monitor;
  let mockScorer;
  //
  beforeEach(() => {
    mockScorer = { recordObservation: vi.fn() };
    monitor = new HealthMonitor(new Map(), mockProviderRepo, null, mockScorer);
  });
  //
  it('recordSuccess feeds degradation scorer with success observation', () => {
    monitor.recordSuccess('openai');
    expect(mockScorer.recordObservation).toHaveBeenCalledWith(
      'openai', null, { success: true, timeout: false }
    );
  });
  //
  it('recordFailure feeds degradation scorer with failure observation', () => {
    monitor.recordFailure('openai');
    expect(mockScorer.recordObservation).toHaveBeenCalledWith(
      'openai', null, { success: false, timeout: false }
    );
  });
  //
  it('constructor accepts degradationScorer as 4th argument', () => {
    const scorer = new DegradationScorer(null);
    const mon = new HealthMonitor(new Map(), mockProviderRepo, null, scorer);
    expect(mon.degradationScorer).toBe(scorer);
  });
  //
  it('works without degradationScorer (null)', () => {
    const mon = new HealthMonitor(new Map(), mockProviderRepo, null, null);
    expect(() => mon.recordSuccess('openai')).not.toThrow();
    expect(() => mon.recordFailure('openai')).not.toThrow();
  });
  //
  it('works without degradationScorer (undefined)', () => {
    const mon = new HealthMonitor(new Map(), mockProviderRepo, null);
    expect(() => mon.recordSuccess('openai')).not.toThrow();
    expect(() => mon.recordFailure('openai')).not.toThrow();
  });
  //
  it('degradation scorer called once per recordSuccess', () => {
    monitor.recordSuccess('openai');
    monitor.recordSuccess('openai');
    expect(mockScorer.recordObservation).toHaveBeenCalledTimes(2);
  });
  //
  it('degradation scorer called once per recordFailure', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(mockScorer.recordObservation).toHaveBeenCalledTimes(3);
  });
});
//
describe('HealthMonitor — Enhanced getStatus', () => {
  let monitor;
  beforeEach(() => {
    monitor = new HealthMonitor(new Map(), mockProviderRepo, null);
  });
  //
  it('getStatus includes halfOpenFailures count', () => {
    monitor.recordFailure('openai');
    const status = monitor.getStatus();
    expect(status['openai']).toHaveProperty('halfOpenFailures');
    expect(status['openai'].halfOpenFailures).toBe(0);
  });
  //
  it('getStatus shows correct halfOpenFailures after half-open probe failure', () => {
    // Open circuit
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    // Advance to half-open
    monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
    monitor.isAvailable('openai');
    // Fail once in half-open
    monitor.recordFailure('openai');
    const status = monitor.getStatus();
    expect(status['openai'].halfOpenFailures).toBe(1);
  });
  //
  it('getStatus shows QUARANTINE state', () => {
    // Open circuit and drive to quarantine
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    for (let i = 0; i < 3; i++) {
      monitor.getCircuit('openai').lastFailure = Date.now() - 310000;
      monitor.isAvailable('openai');
      monitor.recordFailure('openai');
      if (monitor.getCircuit('openai').state === 'quarantine') break;
    }
    const status = monitor.getStatus();
    expect(status['openai'].state).toBe('quarantine');
    expect(status['openai'].available).toBe(false);
  });
});
//
describe('HealthMonitor — pollProviders', () => {
  it('pollProviders polls all enabled providers', async () => {
    const healthCheck = vi.fn().mockResolvedValue(true);
    const mockRegistry = { get: vi.fn(() => ({ healthCheck })) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [
        { id: 'openai', enabled: true },
        { id: 'anthropic', enabled: true }
      ])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    await monitor.pollProviders();
    expect(mockRepo.getAll).toHaveBeenCalledWith({ enabled: true });
    expect(healthCheck).toHaveBeenCalledTimes(2);
  });
  //
  it('pollProviders handles providers without healthCheck method', async () => {
    const mockRegistry = { get: vi.fn(() => ({ /* no healthCheck */ })) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [{ id: 'local', enabled: true }])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    await expect(monitor.pollProviders()).resolves.not.toThrow();
  });
  //
  it('pollProviders handles registry returning null adapter', async () => {
    const mockRegistry = { get: vi.fn(() => null) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [{ id: 'unknown', enabled: true }])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    await expect(monitor.pollProviders()).resolves.not.toThrow();
  });
  //
  it('pollProviders records success when healthCheck returns true', async () => {
    const healthCheck = vi.fn().mockResolvedValue(true);
    const mockRegistry = { get: vi.fn(() => ({ healthCheck })) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [{ id: 'openai', enabled: true }])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    // Drive to OPEN so state change is observable
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    await monitor.pollProviders();
    expect(monitor.getCircuit('openai').state).toBe('closed');
  });
  //
  it('pollProviders records failure when healthCheck throws', async () => {
    const healthCheck = vi.fn().mockRejectedValue(new Error('timeout'));
    const mockRegistry = { get: vi.fn(() => ({ healthCheck })) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [{ id: 'openai', enabled: true }])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    await monitor.pollProviders();
    expect(monitor.getCircuit('openai').failures).toBe(1);
  });
  //
  it('pollProviders probes QUARANTINE providers (only way to recover)', async () => {
    const healthCheck = vi.fn().mockResolvedValue(true);
    const mockRegistry = { get: vi.fn(() => ({ healthCheck })) };
    const mockRepo = {
      updateHealth: vi.fn(),
      getAll: vi.fn(() => [{ id: 'openai', enabled: true }])
    };
    const monitor = new HealthMonitor(mockRegistry, mockRepo, null);
    // Force quarantine state directly
    monitor.getCircuit('openai').state = 'quarantine';
    await monitor.pollProviders();
    // healthCheck was called even though QUARANTINE
    expect(healthCheck).toHaveBeenCalled();
    // Success should recover to closed
    expect(monitor.getCircuit('openai').state).toBe('closed');
  });
});
