import { describe, it, expect, beforeEach } from 'vitest';
import { HealthMonitor } from '../../../src/providers/health-monitor.js';

const mockProviderRepo = {
  updateHealth: () => {},
  getAll: () => []
};

describe('HealthMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new HealthMonitor(new Map(), mockProviderRepo, null);
  });

  it('should start with all providers available', () => {
    expect(monitor.isAvailable('openai')).toBe(true);
  });

  it('should stay available after 1-2 failures', () => {
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(true);
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(true);
  });

  it('should open circuit after 3 failures', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(false);
  });

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

  it('should track multiple providers independently', () => {
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    monitor.recordFailure('openai');
    expect(monitor.isAvailable('openai')).toBe(false);
    expect(monitor.isAvailable('anthropic')).toBe(true);
  });

  it('should return status', () => {
    monitor.recordFailure('openai');
    const status = monitor.getStatus();
    expect(status['openai'].failures).toBe(1);
    expect(status['openai'].available).toBe(true);
  });
});
