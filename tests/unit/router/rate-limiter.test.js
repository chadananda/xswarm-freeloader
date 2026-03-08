import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../../../src/router/rate-limiter.js';

describe('RateLimiter', () => {
  let rl;
  beforeEach(() => { rl = new RateLimiter(); });

  describe('canRequest — no limits', () => {
    it('always allows when no limits loaded', () => {
      expect(rl.canRequest('some/model', 100)).toEqual({ allowed: true });
    });
  });

  describe('loadLimits', () => {
    it('loads only defined fields', () => {
      rl.loadLimits([{ id: 'm1', free_tier_rpm: 10, free_tier_rpd: null }]);
      // rpm set, rpd not set — rpd should not block
      rl.recordRequest('m1', 0);
      const usage = rl.getUsage('m1');
      expect(usage.rpm.max).toBe(10);
      expect(usage.rpd.max).toBeNull();
    });
  });

  describe('canRequest — rpm', () => {
    it('allows when under rpm limit', () => {
      rl.loadLimits([{ id: 'm1', free_tier_rpm: 5 }]);
      for (let i = 0; i < 4; i++) rl.recordRequest('m1', 0);
      expect(rl.canRequest('m1', 0).allowed).toBe(true);
    });
    it('blocks at rpm limit', () => {
      rl.loadLimits([{ id: 'm1', free_tier_rpm: 3 }]);
      for (let i = 0; i < 3; i++) rl.recordRequest('m1', 0);
      const r = rl.canRequest('m1', 0);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('rpm');
      expect(r.retryAfter).toBe(60);
    });
  });

  describe('canRequest — tpm', () => {
    it('blocks when token estimate exceeds tpm', () => {
      rl.loadLimits([{ id: 'm2', free_tier_tpm: 1000 }]);
      rl.recordRequest('m2', 900);
      const r = rl.canRequest('m2', 200);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('tpm');
    });
    it('allows when token estimate fits within tpm', () => {
      rl.loadLimits([{ id: 'm2', free_tier_tpm: 1000 }]);
      rl.recordRequest('m2', 500);
      expect(rl.canRequest('m2', 400).allowed).toBe(true);
    });
  });

  describe('canRequest — rpd / tpd', () => {
    it('blocks at rpd limit', () => {
      rl.loadLimits([{ id: 'm3', free_tier_rpd: 2 }]);
      rl.recordRequest('m3', 0);
      rl.recordRequest('m3', 0);
      const r = rl.canRequest('m3', 0);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('rpd');
      expect(r.retryAfter).toBe(86400);
    });
    it('blocks at tpd limit', () => {
      rl.loadLimits([{ id: 'm4', free_tier_tpd: 500 }]);
      rl.recordRequest('m4', 400);
      const r = rl.canRequest('m4', 200);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe('tpd');
    });
  });

  describe('getUsage', () => {
    it('returns current counts and max', () => {
      rl.loadLimits([{ id: 'm5', free_tier_rpm: 10, free_tier_tpm: 5000 }]);
      rl.recordRequest('m5', 300);
      rl.recordRequest('m5', 700);
      const u = rl.getUsage('m5');
      expect(u.rpm.current).toBe(2);
      expect(u.rpm.max).toBe(10);
      expect(u.tpm.current).toBe(1000);
      expect(u.tpm.max).toBe(5000);
    });
    it('returns nulls for unlimited fields', () => {
      const u = rl.getUsage('unknown');
      expect(u.rpm.max).toBeNull();
      expect(u.rpd.max).toBeNull();
    });
  });
});
