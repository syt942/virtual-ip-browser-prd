/**
 * Cron Parser Unit Tests
 * Tests for cron expression parsing and next execution calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CronParser, CronParseError, CRON_PRESETS } from '../../electron/core/automation/cron-parser';

describe('CronParser', () => {
  let parser: CronParser;

  beforeEach(() => {
    parser = new CronParser();
  });

  describe('parse', () => {
    it('should parse basic wildcard expression', () => {
      const result = parser.parse('* * * * *');

      expect(result.isValid).toBe(true);
      expect(result.minute.isWildcard).toBe(true);
      expect(result.hour.isWildcard).toBe(true);
      expect(result.dayOfMonth.isWildcard).toBe(true);
      expect(result.month.isWildcard).toBe(true);
      expect(result.dayOfWeek.isWildcard).toBe(true);
    });

    it('should parse specific values', () => {
      const result = parser.parse('30 2 15 6 3');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([30]);
      expect(result.hour.values).toEqual([2]);
      expect(result.dayOfMonth.values).toEqual([15]);
      expect(result.month.values).toEqual([6]);
      expect(result.dayOfWeek.values).toEqual([3]);
    });

    it('should parse step values with wildcard', () => {
      const result = parser.parse('*/15 */4 * * *');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0, 15, 30, 45]);
      expect(result.hour.values).toEqual([0, 4, 8, 12, 16, 20]);
    });

    it('should parse step values with range', () => {
      const result = parser.parse('0-30/10 9-17/2 * * *');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0, 10, 20, 30]);
      expect(result.hour.values).toEqual([9, 11, 13, 15, 17]);
    });

    it('should parse range values', () => {
      const result = parser.parse('0 9-17 * * 1-5');

      expect(result.isValid).toBe(true);
      expect(result.hour.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      expect(result.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should parse comma-separated values', () => {
      const result = parser.parse('0,15,30,45 8,12,18 * * *');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0, 15, 30, 45]);
      expect(result.hour.values).toEqual([8, 12, 18]);
    });

    it('should parse mixed values', () => {
      const result = parser.parse('0,30 9-17 1,15 * 1-5');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0, 30]);
      expect(result.hour.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
      expect(result.dayOfMonth.values).toEqual([1, 15]);
      expect(result.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should parse month names', () => {
      const result = parser.parse('0 0 1 jan,jun,dec *');

      expect(result.isValid).toBe(true);
      expect(result.month.values).toEqual([1, 6, 12]);
    });

    it('should parse day names', () => {
      const result = parser.parse('0 0 * * mon,wed,fri');

      expect(result.isValid).toBe(true);
      expect(result.dayOfWeek.values).toEqual([1, 3, 5]);
    });

    it('should handle case insensitivity for names', () => {
      const result = parser.parse('0 0 * JAN,FEB MON,TUE');

      expect(result.isValid).toBe(true);
      expect(result.month.values).toEqual([1, 2]);
      expect(result.dayOfWeek.values).toEqual([1, 2]);
    });

    it('should reject invalid field count', () => {
      const result = parser.parse('* * *');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Expected 5 fields');
    });

    it('should reject out of range values', () => {
      const result = parser.parse('60 * * * *');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('out of range');
    });

    it('should reject invalid step value', () => {
      const result = parser.parse('*/0 * * * *');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid step');
    });

    it('should reject invalid range', () => {
      const result = parser.parse('30-10 * * * *');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid range');
    });

    it('should handle whitespace correctly', () => {
      const result = parser.parse('  0   */4   *   *   *  ');

      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0]);
    });
  });

  describe('validate', () => {
    it('should return valid result for valid expressions', () => {
      const result1 = parser.validate('* * * * *');
      expect(result1.isValid).toBe(true);
      expect(result1.parsed).toBeDefined();
      expect(result1.error).toBeUndefined();

      const result2 = parser.validate('0 */4 * * *');
      expect(result2.isValid).toBe(true);

      const result3 = parser.validate('30 2 * * 1-5');
      expect(result3.isValid).toBe(true);
    });

    it('should return invalid result for invalid expressions', () => {
      const result1 = parser.validate('invalid');
      expect(result1.isValid).toBe(false);
      expect(result1.error).toBeDefined();
      expect(result1.parsed).toBeUndefined();

      const result2 = parser.validate('* * *');
      expect(result2.isValid).toBe(false);

      const result3 = parser.validate('60 * * * *');
      expect(result3.isValid).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid expressions', () => {
      expect(parser.isValid('* * * * *')).toBe(true);
      expect(parser.isValid('0 */4 * * *')).toBe(true);
      expect(parser.isValid('30 2 * * 1-5')).toBe(true);
    });

    it('should return false for invalid expressions', () => {
      expect(parser.isValid('invalid')).toBe(false);
      expect(parser.isValid('* * *')).toBe(false);
      expect(parser.isValid('60 * * * *')).toBe(false);
    });
  });

  describe('getValidationError', () => {
    it('should return undefined for valid expressions', () => {
      expect(parser.getValidationError('* * * * *')).toBeUndefined();
    });

    it('should return error message for invalid expressions', () => {
      const error = parser.getValidationError('invalid');
      expect(error).toBeDefined();
      expect(typeof error).toBe('string');
    });
  });

  describe('getNextExecution', () => {
    it('should calculate next execution for every minute', () => {
      const baseDate = new Date('2024-06-15T10:30:00');
      const next = parser.getNextExecution('* * * * *', baseDate);

      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(31);
      expect(next!.getHours()).toBe(10);
    });

    it('should calculate next execution for specific time', () => {
      const baseDate = new Date('2024-06-15T10:30:00');
      const next = parser.getNextExecution('0 12 * * *', baseDate);

      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(0);
      expect(next!.getHours()).toBe(12);
      expect(next!.getDate()).toBe(15);
    });

    it('should roll over to next day when time has passed', () => {
      const baseDate = new Date('2024-06-15T14:00:00');
      const next = parser.getNextExecution('0 12 * * *', baseDate);

      expect(next).not.toBeNull();
      expect(next!.getHours()).toBe(12);
      expect(next!.getDate()).toBe(16);
    });

    it('should respect day of week constraints', () => {
      // June 15, 2024 is a Saturday
      const baseDate = new Date('2024-06-15T10:00:00');
      const next = parser.getNextExecution('0 9 * * 1', baseDate); // Monday

      expect(next).not.toBeNull();
      expect(next!.getDay()).toBe(1); // Monday
      expect(next!.getDate()).toBe(17); // June 17, 2024
    });

    it('should handle weekday range (Mon-Fri)', () => {
      // June 15, 2024 is a Saturday
      const baseDate = new Date('2024-06-15T10:00:00');
      const next = parser.getNextExecution('0 9 * * 1-5', baseDate);

      expect(next).not.toBeNull();
      const dayOfWeek = next!.getDay();
      expect(dayOfWeek).toBeGreaterThanOrEqual(1);
      expect(dayOfWeek).toBeLessThanOrEqual(5);
    });

    it('should handle step values in hours', () => {
      const baseDate = new Date('2024-06-15T09:30:00');
      const next = parser.getNextExecution('0 */4 * * *', baseDate);

      expect(next).not.toBeNull();
      expect(next!.getMinutes()).toBe(0);
      expect(next!.getHours()).toBe(12); // Next multiple of 4 after 9
    });

    it('should handle month constraints', () => {
      const baseDate = new Date('2024-06-15T10:00:00');
      const next = parser.getNextExecution('0 0 1 12 *', baseDate); // Dec 1st

      expect(next).not.toBeNull();
      expect(next!.getMonth()).toBe(11); // December (0-indexed)
      expect(next!.getDate()).toBe(1);
    });

    it('should return null for invalid expression', () => {
      const next = parser.getNextExecution('invalid', new Date());
      expect(next).toBeNull();
    });

    it('should accept pre-parsed cron object', () => {
      const parsed = parser.parse('0 12 * * *');
      const baseDate = new Date('2024-06-15T10:00:00');
      const next = parser.getNextExecution(parsed, baseDate);

      expect(next).not.toBeNull();
      expect(next!.getHours()).toBe(12);
    });
  });

  describe('getNextExecutions', () => {
    it('should return multiple execution times', () => {
      const baseDate = new Date('2024-06-15T10:00:00');
      const executions = parser.getNextExecutions('0 12 * * *', 5, baseDate);

      expect(executions).toHaveLength(5);
      executions.forEach((exec, index) => {
        expect(exec.getHours()).toBe(12);
        expect(exec.getMinutes()).toBe(0);
        expect(exec.getDate()).toBe(15 + index);
      });
    });

    it('should return empty array for invalid expression', () => {
      const executions = parser.getNextExecutions('invalid', 5);
      expect(executions).toHaveLength(0);
    });
  });

  describe('describe', () => {
    it('should describe every minute', () => {
      const desc = parser.describe('* * * * *');
      expect(desc).toContain('every minute');
    });

    it('should describe specific time', () => {
      const desc = parser.describe('30 14 * * *');
      expect(desc).toContain('14:30');
    });

    it('should describe weekdays', () => {
      const desc = parser.describe('0 9 * * 1-5');
      expect(desc.toLowerCase()).toContain('weekday');
    });

    it('should describe weekend', () => {
      const desc = parser.describe('0 10 * * 0,6');
      expect(desc.toLowerCase()).toContain('weekend');
    });

    it('should return error for invalid expression', () => {
      const desc = parser.describe('invalid');
      expect(desc).toContain('Invalid');
    });
  });

  describe('CRON_PRESETS', () => {
    it('should have valid every minute preset', () => {
      expect(parser.isValid(CRON_PRESETS.EVERY_MINUTE)).toBe(true);
    });

    it('should have valid every hour preset', () => {
      expect(parser.isValid(CRON_PRESETS.EVERY_HOUR)).toBe(true);
      const parsed = parser.parse(CRON_PRESETS.EVERY_HOUR);
      expect(parsed.minute.values).toEqual([0]);
    });

    it('should have valid daily midnight preset', () => {
      expect(parser.isValid(CRON_PRESETS.DAILY_MIDNIGHT)).toBe(true);
      const parsed = parser.parse(CRON_PRESETS.DAILY_MIDNIGHT);
      expect(parsed.minute.values).toEqual([0]);
      expect(parsed.hour.values).toEqual([0]);
    });

    it('should have valid weekdays 9am preset', () => {
      expect(parser.isValid(CRON_PRESETS.WEEKDAYS_9AM)).toBe(true);
      const parsed = parser.parse(CRON_PRESETS.WEEKDAYS_9AM);
      expect(parsed.hour.values).toEqual([9]);
      expect(parsed.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should have valid every 4 hours preset', () => {
      expect(parser.isValid(CRON_PRESETS.EVERY_4_HOURS)).toBe(true);
      const parsed = parser.parse(CRON_PRESETS.EVERY_4_HOURS);
      expect(parsed.hour.values).toEqual([0, 4, 8, 12, 16, 20]);
    });

    it('should have valid every 30 minutes preset', () => {
      expect(parser.isValid(CRON_PRESETS.EVERY_30_MINUTES)).toBe(true);
      const parsed = parser.parse(CRON_PRESETS.EVERY_30_MINUTES);
      expect(parsed.minute.values).toEqual([0, 30]);
    });
  });

  describe('edge cases', () => {
    it('should handle day 31 correctly', () => {
      const result = parser.parse('0 0 31 * *');
      expect(result.isValid).toBe(true);
      expect(result.dayOfMonth.values).toEqual([31]);
    });

    it('should handle Sunday as 0', () => {
      const result = parser.parse('0 0 * * 0');
      expect(result.isValid).toBe(true);
      expect(result.dayOfWeek.values).toEqual([0]);
    });

    it('should handle complex combined patterns', () => {
      const result = parser.parse('0,30 9-17/2 1,15 1-6 1-5');
      expect(result.isValid).toBe(true);
      expect(result.minute.values).toEqual([0, 30]);
      expect(result.hour.values).toEqual([9, 11, 13, 15, 17]);
      expect(result.dayOfMonth.values).toEqual([1, 15]);
      expect(result.month.values).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle year boundary for next execution', () => {
      const baseDate = new Date('2024-12-31T23:59:00');
      const next = parser.getNextExecution('0 0 1 1 *', baseDate);

      expect(next).not.toBeNull();
      expect(next!.getFullYear()).toBe(2025);
      expect(next!.getMonth()).toBe(0); // January
      expect(next!.getDate()).toBe(1);
    });
  });
});
