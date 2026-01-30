/**
 * Cron Parser and Scheduler Tests
 * Comprehensive test coverage for scheduling system
 * 
 * @module tests/unit/cron-scheduler.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CronParser, CronParseError, cronParser, CRON_PRESETS } from '../../electron/core/automation/cron-parser';
import { TaskScheduler } from '../../electron/core/automation/scheduler';
import type { TaskSchedule, SearchConfig } from '../../electron/core/automation/types';

// ============================================================================
// CRON PARSER TESTS
// ============================================================================

describe('CronParser', () => {
  let parser: CronParser;

  beforeEach(() => {
    parser = new CronParser();
  });

  describe('Basic Parsing', () => {
    it('should parse simple wildcard expression', () => {
      const parsed = parser.parse('* * * * *');
      expect(parsed.isValid).toBe(true);
      expect(parsed.minute.isWildcard).toBe(true);
      expect(parsed.hour.isWildcard).toBe(true);
      expect(parsed.dayOfMonth.isWildcard).toBe(true);
      expect(parsed.month.isWildcard).toBe(true);
      expect(parsed.dayOfWeek.isWildcard).toBe(true);
    });

    it('should parse specific values', () => {
      const parsed = parser.parse('30 9 15 6 3');
      expect(parsed.isValid).toBe(true);
      expect(parsed.minute.values).toContain(30);
      expect(parsed.hour.values).toContain(9);
      expect(parsed.dayOfMonth.values).toContain(15);
      expect(parsed.month.values).toContain(6);
      expect(parsed.dayOfWeek.values).toContain(3);
    });

    it('should parse ranges', () => {
      const parsed = parser.parse('0-30 9-17 1-15 1-6 1-5');
      expect(parsed.isValid).toBe(true);
      expect(parsed.minute.values).toEqual(expect.arrayContaining([0, 15, 30]));
      expect(parsed.hour.values).toEqual(expect.arrayContaining([9, 12, 17]));
      expect(parsed.dayOfWeek.values).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    });

    it('should parse step values', () => {
      const parsed = parser.parse('*/15 */2 * * *');
      expect(parsed.isValid).toBe(true);
      // Every 15 minutes: 0, 15, 30, 45
      expect(parsed.minute.values).toEqual([0, 15, 30, 45]);
      // Every 2 hours: 0, 2, 4, ..., 22
      expect(parsed.hour.values).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    });

    it('should parse range with step', () => {
      const parsed = parser.parse('0-30/10 9-17/2 * * *');
      expect(parsed.isValid).toBe(true);
      // 0-30 every 10: 0, 10, 20, 30
      expect(parsed.minute.values).toEqual([0, 10, 20, 30]);
      // 9-17 every 2: 9, 11, 13, 15, 17
      expect(parsed.hour.values).toEqual([9, 11, 13, 15, 17]);
    });

    it('should parse lists', () => {
      const parsed = parser.parse('0,15,30,45 9,12,18 * * 1,3,5');
      expect(parsed.isValid).toBe(true);
      expect(parsed.minute.values).toEqual([0, 15, 30, 45]);
      expect(parsed.hour.values).toEqual([9, 12, 18]);
      expect(parsed.dayOfWeek.values).toEqual([1, 3, 5]);
    });

    it('should parse mixed expressions', () => {
      const parsed = parser.parse('0,30 9-17 1,15 * 1-5');
      expect(parsed.isValid).toBe(true);
      expect(parsed.minute.values).toEqual([0, 30]);
      expect(parsed.hour.values.length).toBe(9); // 9 through 17
      expect(parsed.dayOfMonth.values).toEqual([1, 15]);
      expect(parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Name Aliases', () => {
    it('should parse month names', () => {
      const parsed = parser.parse('0 0 1 jan,mar,jun *');
      expect(parsed.isValid).toBe(true);
      expect(parsed.month.values).toEqual([1, 3, 6]);
    });

    it('should parse day names', () => {
      const parsed = parser.parse('0 9 * * mon,wed,fri');
      expect(parsed.isValid).toBe(true);
      expect(parsed.dayOfWeek.values).toEqual([1, 3, 5]);
    });

    it('should parse day name ranges', () => {
      const parsed = parser.parse('0 9 * * mon-fri');
      expect(parsed.isValid).toBe(true);
      expect(parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle case insensitivity', () => {
      const parsed = parser.parse('0 0 1 JAN,FEB,MAR MON,TUE');
      expect(parsed.isValid).toBe(true);
      expect(parsed.month.values).toEqual([1, 2, 3]);
      expect(parsed.dayOfWeek.values).toEqual([1, 2]);
    });
  });

  describe('Validation', () => {
    it('should reject invalid number of fields', () => {
      const result1 = parser.parse('* * *');
      expect(result1.isValid).toBe(false);
      
      const result2 = parser.parse('* * * * * *');
      expect(result2.isValid).toBe(false);
    });

    it('should reject out-of-range minute values', () => {
      const result = parser.parse('60 * * * *');
      expect(result.isValid).toBe(false);
    });

    it('should reject out-of-range hour values', () => {
      const result = parser.parse('* 24 * * *');
      expect(result.isValid).toBe(false);
    });

    it('should reject out-of-range day values', () => {
      const result = parser.parse('* * 32 * *');
      expect(result.isValid).toBe(false);
    });

    it('should reject out-of-range month values', () => {
      const result = parser.parse('* * * 13 *');
      expect(result.isValid).toBe(false);
    });

    it('should reject out-of-range weekday values', () => {
      const result = parser.parse('* * * * 7');
      expect(result.isValid).toBe(false);
    });

    it('should validate using validate() method', () => {
      const result = parser.validate('60 * * * *');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return parsed result on valid expression', () => {
      const result = parser.validate('0 9 * * 1-5');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toBeDefined();
    });

    it('should check validity with isValid() method', () => {
      expect(parser.isValid('0 9 * * *')).toBe(true);
      expect(parser.isValid('invalid')).toBe(false);
    });
  });

  describe('Next Execution Calculation', () => {
    it('should calculate next execution for simple expression', () => {
      const baseTime = new Date('2024-01-15T10:30:00');
      const next = parser.getNextExecution('0 * * * *', baseTime);
      
      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(0);
      expect(next!.getHours()).toBe(11); // Next hour at minute 0
    });

    it('should calculate next execution for daily schedule', () => {
      const baseTime = new Date('2024-01-15T10:30:00');
      const next = parser.getNextExecution('0 9 * * *', baseTime);
      
      expect(next).not.toBeNull();
      expect(next!.getHours()).toBe(9);
      expect(next!.getMinutes()).toBe(0);
      // Should be next day since 9:00 already passed
      expect(next!.getDate()).toBe(16);
    });

    it('should calculate next execution for weekday schedule', () => {
      // January 15, 2024 is a Monday
      const baseTime = new Date('2024-01-15T10:30:00');
      const next = parser.getNextExecution('0 9 * * 1-5', baseTime);
      
      expect(next).not.toBeNull();
      expect(next!.getDay()).toBeGreaterThanOrEqual(1);
      expect(next!.getDay()).toBeLessThanOrEqual(5);
    });

    it('should return multiple next executions', () => {
      const baseTime = new Date('2024-01-15T00:00:00');
      const parsed = parser.parse('0 * * * *');
      const times = parser.getNextExecutions(parsed, 5, baseTime);
      
      expect(times).toHaveLength(5);
      // Each should be 1 hour apart
      for (let i = 1; i < times.length; i++) {
        const diff = times[i].getTime() - times[i-1].getTime();
        expect(diff).toBe(60 * 60 * 1000); // 1 hour in ms
      }
    });

    it('should handle step expressions in next calculation', () => {
      const baseTime = new Date('2024-01-15T10:07:00');
      const next = parser.getNextExecution('*/15 * * * *', baseTime);
      
      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(15); // Next 15-minute mark
    });
  });

  describe('Time Matching via getNextExecution', () => {
    it('should find next match after given time', () => {
      const baseTime = new Date('2024-01-15T09:29:00');
      const next = parser.getNextExecution('30 9 * * *', baseTime);
      
      // Should find 09:30 on the same day
      expect(next).not.toBeNull();
      expect(next!.getHours()).toBe(9);
      expect(next!.getMinutes()).toBe(30);
    });

    it('should skip past times', () => {
      const baseTime = new Date('2024-01-15T09:31:00'); // After 09:30
      const next = parser.getNextExecution('30 9 * * *', baseTime);
      
      // Should find 09:30 the next day
      expect(next).not.toBeNull();
      expect(next!.getDate()).toBe(16);
    });

    it('should handle wildcards', () => {
      const baseTime = new Date('2024-01-15T09:25:00');
      const next = parser.getNextExecution('30 * * * *', baseTime);
      
      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(30);
    });

    it('should handle weekday ranges', () => {
      // January 14, 2024 is a Sunday
      const baseTime = new Date('2024-01-14T09:30:00');
      const next = parser.getNextExecution('30 9 * * 1-5', baseTime);
      
      // Should find Monday (Jan 15)
      expect(next).not.toBeNull();
      expect(next!.getDay()).toBe(1); // Monday
    });
  });

  describe('describe()', () => {
    it('should describe simple expression', () => {
      const desc = parser.describe('0 9 * * *');
      expect(desc.toLowerCase()).toContain('09:00');
    });

    it('should describe every minute', () => {
      const desc = parser.describe('* * * * *');
      expect(desc.toLowerCase()).toContain('every minute');
    });

    it('should describe weekday schedule', () => {
      const desc = parser.describe('0 9 * * 1-5');
      // The actual implementation uses "weekdays" instead of full day names
      expect(desc.toLowerCase()).toContain('weekday');
    });
  });

  describe('Singleton Export', () => {
    it('should export singleton cronParser', () => {
      expect(cronParser).toBeInstanceOf(CronParser);
    });

    it('should export CRON_PRESETS', () => {
      expect(CRON_PRESETS).toBeDefined();
      expect(CRON_PRESETS.EVERY_HOUR).toBe('0 * * * *');
    });
  });
});

// ============================================================================
// TASK SCHEDULER TESTS
// ============================================================================

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  let mockConfig: SearchConfig;

  beforeEach(() => {
    scheduler = new TaskScheduler();
    mockConfig = {
      keywords: ['test keyword'],
      engine: 'google',
      targetDomains: ['example.com'],
      maxRetries: 3,
      delayBetweenSearches: 1000,
      useRandomProxy: true,
      clickThrough: true,
      simulateHumanBehavior: true
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should start and stop correctly', () => {
      expect(scheduler.isRunning()).toBe(false);
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should emit events on start/stop', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      
      scheduler.on('scheduler:started', startHandler);
      scheduler.on('scheduler:stopped', stopHandler);
      
      scheduler.start();
      expect(startHandler).toHaveBeenCalled();
      
      scheduler.stop();
      expect(stopHandler).toHaveBeenCalled();
    });

    it('should not start twice', () => {
      const startHandler = vi.fn();
      scheduler.on('scheduler:started', startHandler);
      
      scheduler.start();
      scheduler.start();
      
      expect(startHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Schedule Management', () => {
    it('should add a schedule', () => {
      const schedule = createSchedule('one-time');
      scheduler.addSchedule(schedule);
      
      expect(scheduler.getSchedule(schedule.id)).toBeDefined();
      expect(scheduler.getAllSchedules()).toHaveLength(1);
    });

    it('should remove a schedule', () => {
      const schedule = createSchedule('one-time');
      scheduler.addSchedule(schedule);
      
      const removed = scheduler.removeSchedule(schedule.id);
      
      expect(removed).toBe(true);
      expect(scheduler.getSchedule(schedule.id)).toBeUndefined();
    });

    it('should update a schedule', () => {
      const schedule = createSchedule('one-time');
      scheduler.addSchedule(schedule);
      
      const updated = scheduler.updateSchedule(schedule.id, { name: 'Updated Name' });
      
      expect(updated?.name).toBe('Updated Name');
    });

    it('should enable/disable a schedule', () => {
      const schedule = createSchedule('one-time', { enabled: false });
      scheduler.addSchedule(schedule);
      
      scheduler.enableSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id)?.enabled).toBe(true);
      
      scheduler.disableSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id)?.enabled).toBe(false);
    });

    it('should emit events on schedule changes', () => {
      const addHandler = vi.fn();
      const removeHandler = vi.fn();
      const updateHandler = vi.fn();
      
      scheduler.on('schedule:added', addHandler);
      scheduler.on('schedule:removed', removeHandler);
      scheduler.on('schedule:updated', updateHandler);
      
      const schedule = createSchedule('one-time');
      scheduler.addSchedule(schedule);
      expect(addHandler).toHaveBeenCalledWith(schedule);
      
      scheduler.updateSchedule(schedule.id, { name: 'Updated' });
      expect(updateHandler).toHaveBeenCalled();
      
      scheduler.removeSchedule(schedule.id);
      expect(removeHandler).toHaveBeenCalled();
    });
  });

  describe('Cron Schedule Support', () => {
    it('should add cron schedule with valid expression', () => {
      const schedule = createSchedule('cron', { cronExpression: '0 9 * * 1-5' });
      
      expect(() => scheduler.addSchedule(schedule)).not.toThrow();
      expect(scheduler.getSchedule(schedule.id)).toBeDefined();
    });

    it('should reject cron schedule with invalid expression', () => {
      const schedule = createSchedule('cron', { cronExpression: '* * *' }); // Invalid
      
      expect(() => scheduler.addSchedule(schedule)).toThrow(/Invalid cron expression/);
    });

    it('should validate cron expression', () => {
      const valid = scheduler.validateCronExpression('0 9 * * 1-5');
      expect(valid.isValid).toBe(true);
      
      const invalid = scheduler.validateCronExpression('invalid');
      expect(invalid.isValid).toBe(false);
    });

    it('should get next cron execution', () => {
      const next = scheduler.getNextCronExecution('0 9 * * *');
      expect(next).toBeInstanceOf(Date);
    });

    it('should get multiple cron executions', () => {
      const times = scheduler.getNextCronExecutions('0 9 * * *', 5);
      expect(times).toHaveLength(5);
    });

    it('should describe cron expression', () => {
      const desc = scheduler.describeCronExpression('0 9 * * 1-5');
      expect(desc).toBeTruthy();
      expect(desc).not.toContain('Invalid');
    });

    it('should update cron cache when expression changes', () => {
      const schedule = createSchedule('cron', { cronExpression: '0 9 * * *' });
      scheduler.addSchedule(schedule);
      
      // Update with new expression
      scheduler.updateSchedule(schedule.id, { cronExpression: '30 10 * * *' });
      
      // Should not throw
      expect(scheduler.getSchedule(schedule.id)?.cronExpression).toBe('30 10 * * *');
    });

    it('should reject update with invalid cron expression', () => {
      const schedule = createSchedule('cron', { cronExpression: '0 9 * * *' });
      scheduler.addSchedule(schedule);
      
      expect(() => {
        scheduler.updateSchedule(schedule.id, { cronExpression: 'invalid' });
      }).toThrow(/Invalid cron expression/);
    });
  });

  describe('Task Execution', () => {
    it('should execute one-time schedule', () => {
      const executeHandler = vi.fn();
      scheduler.on('task:execute', executeHandler);
      
      const futureTime = new Date(Date.now() + 1000);
      const schedule = createSchedule('one-time', {
        startTime: futureTime,
        enabled: true
      });
      
      scheduler.start();
      scheduler.addSchedule(schedule);
      
      // Advance time past start time
      vi.advanceTimersByTime(2000);
      
      expect(executeHandler).toHaveBeenCalled();
    });

    it('should disable one-time schedule after execution', () => {
      const futureTime = new Date(Date.now() + 1000);
      const schedule = createSchedule('one-time', {
        startTime: futureTime,
        enabled: true
      });
      
      scheduler.start();
      scheduler.addSchedule(schedule);
      
      vi.advanceTimersByTime(2000);
      
      expect(scheduler.getSchedule(schedule.id)?.enabled).toBe(false);
    });

    it('should increment runCount on execution', () => {
      const futureTime = new Date(Date.now() + 1000);
      const schedule = createSchedule('one-time', {
        startTime: futureTime,
        enabled: true,
        runCount: 0
      });
      
      scheduler.start();
      scheduler.addSchedule(schedule);
      
      vi.advanceTimersByTime(2000);
      
      expect(scheduler.getSchedule(schedule.id)?.runCount).toBe(1);
    });

    it('should stop at maxRuns', () => {
      const maxRunsHandler = vi.fn();
      scheduler.on('schedule:max-runs-reached', maxRunsHandler);
      
      const schedule = createSchedule('recurring', {
        intervalMinutes: 1,
        enabled: true,
        maxRuns: 2,
        runCount: 0
      });
      
      scheduler.start();
      scheduler.addSchedule(schedule);
      
      // Run once
      vi.advanceTimersByTime(60000);
      // Run twice
      vi.advanceTimersByTime(60000);
      
      expect(maxRunsHandler).toHaveBeenCalled();
      expect(scheduler.getSchedule(schedule.id)?.enabled).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should export schedules', () => {
      const schedule1 = createSchedule('one-time');
      const schedule2 = createSchedule('cron', { cronExpression: '0 9 * * *' });
      
      scheduler.addSchedule(schedule1);
      scheduler.addSchedule(schedule2);
      
      const exported = scheduler.exportSchedules();
      
      expect(exported).toHaveLength(2);
      expect(exported.find(s => s.id === schedule1.id)).toBeDefined();
      expect(exported.find(s => s.id === schedule2.id)).toBeDefined();
    });

    it('should import schedules', () => {
      const schedules = [
        createSchedule('one-time'),
        createSchedule('recurring', { intervalMinutes: 30 })
      ];
      
      scheduler.importSchedules(schedules);
      
      expect(scheduler.getAllSchedules()).toHaveLength(2);
    });

    it('should clear existing on import if requested', () => {
      scheduler.addSchedule(createSchedule('one-time'));
      expect(scheduler.getAllSchedules()).toHaveLength(1);
      
      scheduler.importSchedules([createSchedule('recurring', { intervalMinutes: 30 })], true);
      
      expect(scheduler.getAllSchedules()).toHaveLength(1);
    });

    it('should emit import error for invalid schedules', () => {
      const errorHandler = vi.fn();
      scheduler.on('schedule:import-error', errorHandler);
      
      const invalidSchedule = createSchedule('cron', { cronExpression: 'invalid' });
      scheduler.importSchedules([invalidSchedule]);
      
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should clear all schedules', () => {
      scheduler.addSchedule(createSchedule('one-time'));
      scheduler.addSchedule(createSchedule('recurring', { intervalMinutes: 30 }));
      
      scheduler.clearAllSchedules();
      
      expect(scheduler.getAllSchedules()).toHaveLength(0);
    });
  });

  describe('Query Methods', () => {
    it('should get active schedule count', () => {
      scheduler.addSchedule(createSchedule('one-time', { enabled: true }));
      scheduler.addSchedule(createSchedule('one-time', { enabled: false }));
      scheduler.addSchedule(createSchedule('recurring', { enabled: true, intervalMinutes: 30 }));
      
      expect(scheduler.getActiveScheduleCount()).toBe(2);
    });

    it('should get schedules by type', () => {
      scheduler.addSchedule(createSchedule('one-time'));
      scheduler.addSchedule(createSchedule('recurring', { intervalMinutes: 30 }));
      scheduler.addSchedule(createSchedule('cron', { cronExpression: '0 9 * * *' }));
      
      expect(scheduler.getSchedulesByType('one-time')).toHaveLength(1);
      expect(scheduler.getSchedulesByType('recurring')).toHaveLength(1);
      expect(scheduler.getSchedulesByType('cron')).toHaveLength(1);
    });

    it('should expose cron parser', () => {
      const parser = scheduler.getCronParser();
      expect(parser).toBeInstanceOf(CronParser);
    });
  });

  // Helper function to create test schedules
  function createSchedule(
    type: TaskSchedule['type'],
    overrides: Partial<TaskSchedule> = {}
  ): TaskSchedule {
    return {
      id: crypto.randomUUID(),
      name: `Test ${type} Schedule`,
      type,
      taskConfig: mockConfig,
      enabled: overrides.enabled ?? true,
      runCount: overrides.runCount ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
});
