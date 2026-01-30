/**
 * Scheduling Types
 * Type definitions for the scheduling system including cron expressions
 * 
 * @module electron/types/scheduling
 */

/**
 * Schedule types supported by the automation system
 */
export type ScheduleType = 'one-time' | 'recurring' | 'continuous' | 'cron';

/**
 * Days of the week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Cron field types
 */
export type CronFieldType = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

/**
 * Represents a single cron field value
 */
export interface CronFieldValue {
  /** Type of value: specific number, range, step, or wildcard */
  type: 'value' | 'range' | 'step' | 'wildcard' | 'list';
  /** Specific value (for 'value' type) */
  value?: number;
  /** Start of range (for 'range' type) */
  start?: number;
  /** End of range (for 'range' type) */
  end?: number;
  /** Step interval (for 'step' type) */
  step?: number;
  /** List of values (for 'list' type) */
  values?: number[];
}

/**
 * Parsed cron expression
 */
export interface ParsedCronExpression {
  /** Original cron expression string */
  original: string;
  /** Minute field (0-59) */
  minute: CronFieldValue;
  /** Hour field (0-23) */
  hour: CronFieldValue;
  /** Day of month field (1-31) */
  dayOfMonth: CronFieldValue;
  /** Month field (1-12) */
  month: CronFieldValue;
  /** Day of week field (0-6, Sunday = 0) */
  dayOfWeek: CronFieldValue;
  /** Whether the expression is valid */
  isValid: boolean;
  /** Validation error message if invalid */
  error?: string;
}

/**
 * Cron field constraints
 */
export interface CronFieldConstraints {
  min: number;
  max: number;
  name: string;
}

/**
 * Map of cron field constraints
 */
export const CRON_FIELD_CONSTRAINTS: Record<CronFieldType, CronFieldConstraints> = {
  minute: { min: 0, max: 59, name: 'minute' },
  hour: { min: 0, max: 23, name: 'hour' },
  dayOfMonth: { min: 1, max: 31, name: 'day of month' },
  month: { min: 1, max: 12, name: 'month' },
  dayOfWeek: { min: 0, max: 6, name: 'day of week' }
};

/**
 * Month name aliases for cron expressions
 */
export const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

/**
 * Day of week aliases for cron expressions
 */
export const DAY_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

/**
 * Common cron expression presets
 */
export const CRON_PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *'
};

/**
 * Schedule configuration for task scheduling
 */
export interface ScheduleConfig {
  /** Unique identifier for the schedule */
  id: string;
  /** Optional human-readable name */
  name?: string;
  /** Type of schedule */
  type: ScheduleType;
  /** Cron expression (for 'cron' type) */
  cronExpression?: string;
  /** Parsed cron data (populated after validation) */
  parsedCron?: ParsedCronExpression;
  /** Start time for one-time schedules */
  startTime?: Date;
  /** End time (optional, for limited schedules) */
  endTime?: Date;
  /** Interval in minutes (for 'recurring' type) */
  intervalMinutes?: number;
  /** Days of week to run (for 'recurring' type) */
  daysOfWeek?: DayOfWeek[];
  /** Whether the schedule is enabled */
  enabled: boolean;
  /** Last execution time */
  lastRun?: Date;
  /** Next scheduled execution time */
  nextRun?: Date;
  /** Number of times executed */
  runCount: number;
  /** Maximum number of executions (optional) */
  maxRuns?: number;
  /** Timezone for schedule evaluation (default: local) */
  timezone?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Result of cron validation
 */
export interface CronValidationResult {
  /** Whether the expression is valid */
  isValid: boolean;
  /** Parsed expression (if valid) */
  parsed?: ParsedCronExpression;
  /** Error message (if invalid) */
  error?: string;
  /** Field-specific errors */
  fieldErrors?: Partial<Record<CronFieldType, string>>;
}

/**
 * Options for calculating next execution time
 */
export interface NextExecutionOptions {
  /** Reference time (defaults to now) */
  fromTime?: Date;
  /** Maximum iterations to check (prevents infinite loops) */
  maxIterations?: number;
  /** Maximum time to look ahead in milliseconds */
  maxLookAhead?: number;
}

/**
 * Result of next execution calculation
 */
export interface NextExecutionResult {
  /** Next execution time (null if none found within limits) */
  nextTime: Date | null;
  /** Whether the calculation hit iteration limits */
  limitReached: boolean;
  /** Number of iterations performed */
  iterations: number;
}

/**
 * Schedule persistence format for database storage
 */
export interface PersistedSchedule {
  id: string;
  name: string | null;
  type: ScheduleType;
  cron_expression: string | null;
  start_time: string | null;
  end_time: string | null;
  interval_minutes: number | null;
  days_of_week: string | null; // JSON array
  enabled: number; // SQLite boolean
  last_run: string | null;
  next_run: string | null;
  run_count: number;
  max_runs: number | null;
  timezone: string | null;
  task_config: string; // JSON
  created_at: string;
  updated_at: string;
}

/**
 * Schedule event types for EventEmitter
 */
export interface ScheduleEvents {
  'schedule:added': ScheduleConfig;
  'schedule:updated': ScheduleConfig;
  'schedule:removed': { id: string };
  'schedule:triggered': ScheduleConfig;
  'schedule:completed': { id: string; duration: number };
  'schedule:error': { id: string; error: string };
  'schedule:disabled': { id: string; reason: string };
}
