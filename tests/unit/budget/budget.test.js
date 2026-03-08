import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, seedTestApp } from '../../helpers/testDb.js';
import { BudgetTracker } from '../../../src/budget/tracker.js';
import { BudgetEnforcer } from '../../../src/budget/enforcer.js';

describe('BudgetTracker', () => {
  let testDb, tracker, app;

  beforeEach(() => {
    testDb = createTestDb();
    tracker = new BudgetTracker(testDb.db);
    app = seedTestApp(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('should record and track usage', () => {
    tracker.recordUsage(app.id, 'default', 1.50);
    expect(tracker.getDailySpent(app.id)).toBe(1.50);
    expect(tracker.getMonthlySpent(app.id)).toBe(1.50);
  });

  it('should accumulate usage', () => {
    tracker.recordUsage(app.id, 'default', 1.00);
    tracker.recordUsage(app.id, 'default', 2.00);
    expect(tracker.getDailySpent(app.id)).toBe(3.00);
  });

  it('should return status with limits', () => {
    tracker.recordUsage(app.id, 'default', 6.00);
    const status = tracker.getStatus(app.id, 'default', app);
    expect(status.daily.spent).toBe(6.00);
    expect(status.daily.soft_limit_exceeded).toBe(true);
    expect(status.daily.hard_limit_exceeded).toBe(false);
  });
});

describe('BudgetEnforcer', () => {
  let testDb, tracker, enforcer, app;

  beforeEach(() => {
    testDb = createTestDb();
    tracker = new BudgetTracker(testDb.db);
    enforcer = new BudgetEnforcer(tracker);
    app = seedTestApp(testDb);
  });
  afterEach(() => { testDb.close(); });

  it('should allow under-budget requests', () => {
    expect(() => enforcer.checkBudget(app.id, 'default', app, 1.00)).not.toThrow();
  });

  it('should reject over-budget requests', () => {
    tracker.recordUsage(app.id, 'default', 9.50);
    expect(() => enforcer.checkBudget(app.id, 'default', app, 1.00)).toThrow('Daily budget exceeded');
  });
});
