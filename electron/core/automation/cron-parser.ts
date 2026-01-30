/**
 * Cron Expression Parser
 * Parses and validates cron expressions, calculates next execution times
 * 
 * Supports standard 5-field cron format:
 * ┌───────────── minute (0-59)
 * │ ┌───────────── hour (0-23)
 * │ │ ┌───────────── day of month (1-31)
 * │ │ │ ┌───────────── month (1-12)
 * │ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
 * │ │ │ │ │
 * * * * * *
 * 
 * @module electron/core/automation/cron-parser
 */

/**
 * Custom error class for cron parsing errors
 */
export class CronParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CronParseError';
  }
}

/**
 * Parsed cron field with expanded values
 */
export interface CronField {
  /** Original field string */
  raw: string;
  /** Expanded numeric values */
  values: number[];
  /** Whether field is a wildcard */
  isWildcard: boolean;
}

/**
 * Parsed cron expression (alias for compatibility)
 */
export interface ParsedCron {
  /** Original expression */
  expression: string;
  /** Minute field (0-59) */
  minute: CronField;
  /** Hour field (0-23) */
  hour: CronField;
  /** Day of month field (1-31) */
  dayOfMonth: CronField;
  /** Month field (1-12) */
  month: CronField;
  /** Day of week field (0-6) */
  dayOfWeek: CronField;
  /** Whether expression is valid */
  isValid: boolean;
  /** Validation error if invalid */
  error?: string;
}

/**
 * Validation result for cron expressions
 */
export interface CronValidationResult {
  /** Whether the expression is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Parsed expression if valid */
  parsed?: ParsedCron;
}

/**
 * Parsed cron expression (legacy alias)
 */
export type ParsedCronExpression = ParsedCron;

/**
 * Field constraints
 */
interface FieldConstraint {
  min: number;
  max: number;
  name: string;
}

/**
 * Field constraints for each cron field
 */
const FIELD_CONSTRAINTS: Record<string, FieldConstraint> = {
  minute: { min: 0, max: 59, name: 'minute' },
  hour: { min: 0, max: 23, name: 'hour' },
  dayOfMonth: { min: 1, max: 31, name: 'day of month' },
  month: { min: 1, max: 12, name: 'month' },
  dayOfWeek: { min: 0, max: 6, name: 'day of week' }
};

/**
 * Month name mappings
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

/**
 * Day name mappings
 */
const DAY_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

/**
 * Cron Expression Parser
 * 
 * @example
 * ```typescript
 * const parser = new CronParser();
 * 
 * // Parse expression - every 4 hours
 * const parsed = parser.parse('0 0,4,8,12,16,20 * * *');
 * console.log(parsed.isValid); // true
 * 
 * // Get next execution time
 * const nextRun = parser.getNextExecution('30 2 * * 1-5');
 * console.log(nextRun); // Next weekday at 2:30 AM
 * 
 * // Validate expression
 * const isValid = parser.validate('invalid');
 * console.log(isValid); // false
 * ```
 */
export class CronParser {
  /**
   * Parse a cron expression
   * 
   * @param expression - Cron expression string
   * @returns Parsed cron expression with expanded values
   * @throws {CronParseError} If expression is invalid
   */
  parse(expression: string): ParsedCron {
    const trimmed = expression.trim();
    const fields = trimmed.split(/\s+/);

    if (fields.length !== 5) {
      return this.createInvalidResult(
        expression,
        `Expected 5 fields, got ${fields.length}. Format: minute hour dayOfMonth month dayOfWeek`
      );
    }

    try {
      const minute = this.parseField(fields[0], FIELD_CONSTRAINTS.minute);
      const hour = this.parseField(fields[1], FIELD_CONSTRAINTS.hour);
      const dayOfMonth = this.parseField(fields[2], FIELD_CONSTRAINTS.dayOfMonth);
      const month = this.parseField(fields[3], FIELD_CONSTRAINTS.month, MONTH_NAMES);
      const dayOfWeek = this.parseField(fields[4], FIELD_CONSTRAINTS.dayOfWeek, DAY_NAMES);

      return {
        expression: trimmed,
        minute,
        hour,
        dayOfMonth,
        month,
        dayOfWeek,
        isValid: true
      };
    } catch (error) {
      return this.createInvalidResult(
        expression,
        error instanceof Error ? error.message : 'Unknown parsing error'
      );
    }
  }

  /**
   * Validate a cron expression
   * 
   * @param expression - Cron expression to validate
   * @returns Validation result with parsed cron or error
   */
  validate(expression: string): CronValidationResult {
    const parsed = this.parse(expression);
    return {
      isValid: parsed.isValid,
      error: parsed.error,
      parsed: parsed.isValid ? parsed : undefined
    };
  }

  /**
   * Check if a cron expression is valid
   * 
   * @param expression - Cron expression to check
   * @returns Whether the expression is valid
   */
  isValid(expression: string): boolean {
    return this.parse(expression).isValid;
  }

  /**
   * Get validation error message for an expression
   * 
   * @param expression - Cron expression to validate
   * @returns Error message or undefined if valid
   */
  getValidationError(expression: string): string | undefined {
    return this.parse(expression).error;
  }

  /**
   * Calculate the next execution time for a cron expression or parsed cron
   * 
   * @param expressionOrParsed - Cron expression string or pre-parsed cron object
   * @param fromDate - Starting date (defaults to now)
   * @returns Next execution date or null if invalid expression
   */
  getNextExecution(expressionOrParsed: string | ParsedCron, fromDate: Date = new Date()): Date | null {
    const parsed = typeof expressionOrParsed === 'string' 
      ? this.parse(expressionOrParsed)
      : expressionOrParsed;
      
    if (!parsed.isValid) {
      return null;
    }

    // Start from the next minute
    const current = new Date(fromDate);
    current.setSeconds(0);
    current.setMilliseconds(0);
    current.setMinutes(current.getMinutes() + 1);

    // Maximum iterations to prevent infinite loop (1 year worth of minutes)
    const maxIterations = 525600;
    let iterations = 0;

    while (iterations < maxIterations) {
      if (this.matchesExpression(current, parsed)) {
        return current;
      }

      current.setMinutes(current.getMinutes() + 1);
      iterations++;
    }

    return null;
  }

  /**
   * Get the next N execution times
   * 
   * @param expressionOrParsed - Cron expression string or pre-parsed cron object
   * @param count - Number of execution times to return
   * @param fromDate - Starting date (defaults to now)
   * @returns Array of next execution dates
   */
  getNextExecutions(expressionOrParsed: string | ParsedCron, count: number, fromDate: Date = new Date()): Date[] {
    const results: Date[] = [];
    let current = fromDate;

    for (let i = 0; i < count; i++) {
      const next = this.getNextExecution(expressionOrParsed, current);
      if (!next) break;

      results.push(next);
      current = next;
    }

    return results;
  }

  /**
   * Check if a date matches a cron expression
   * 
   * @param date - Date to check
   * @param expression - Cron expression
   * @returns Whether the date matches the expression
   */
  matches(date: Date, expression: string): boolean {
    const parsed = this.parse(expression);
    if (!parsed.isValid) {
      return false;
    }
    return this.matchesExpression(date, parsed);
  }

  /**
   * Get a human-readable description of a cron expression
   * 
   * @param expression - Cron expression
   * @returns Human-readable description
   * 
   * @example
   * ```typescript
   * parser.describe('0 0/4 * * *'); // "At minute 0, every 4 hours"
   * parser.describe('30 2 * * 1-5'); // "At 02:30, Monday through Friday"
   * ```
   */
  describe(expression: string): string {
    const parsed = this.parse(expression);
    if (!parsed.isValid) {
      return `Invalid expression: ${parsed.error}`;
    }

    const parts: string[] = [];

    // Time description
    const timeDesc = this.describeTime(parsed.minute, parsed.hour);
    if (timeDesc) parts.push(timeDesc);

    // Day of month description
    const domDesc = this.describeDayOfMonth(parsed.dayOfMonth);
    if (domDesc) parts.push(domDesc);

    // Month description
    const monthDesc = this.describeMonth(parsed.month);
    if (monthDesc) parts.push(monthDesc);

    // Day of week description
    const dowDesc = this.describeDayOfWeek(parsed.dayOfWeek);
    if (dowDesc) parts.push(dowDesc);

    return parts.join(', ') || 'Every minute';
  }

  /**
   * Parse a single cron field
   */
  private parseField(
    field: string,
    constraint: FieldConstraint,
    nameMap?: Record<string, number>
  ): CronField {
    const isWildcard = field === '*';

    if (isWildcard) {
      return {
        raw: field,
        values: this.range(constraint.min, constraint.max),
        isWildcard: true
      };
    }

    const values = new Set<number>();

    // Split by comma for multiple values
    const parts = field.split(',');

    for (const part of parts) {
      const expanded = this.expandPart(part.trim(), constraint, nameMap);
      expanded.forEach(v => values.add(v));
    }

    const sortedValues = Array.from(values).sort((a, b) => a - b);

    // Validate all values are within range
    for (const value of sortedValues) {
      if (value < constraint.min || value > constraint.max) {
        throw new Error(
          `Value ${value} is out of range for ${constraint.name} (${constraint.min}-${constraint.max})`
        );
      }
    }

    return {
      raw: field,
      values: sortedValues,
      isWildcard: false
    };
  }

  /**
   * Expand a single part of a cron field
   */
  private expandPart(
    part: string,
    constraint: FieldConstraint,
    nameMap?: Record<string, number>
  ): number[] {
    // Handle step values (*/n or range/n)
    if (part.includes('/')) {
      return this.expandStep(part, constraint, nameMap);
    }

    // Handle ranges (n-m)
    if (part.includes('-')) {
      return this.expandRange(part, constraint, nameMap);
    }

    // Handle single value
    return [this.parseValue(part, constraint, nameMap)];
  }

  /**
   * Expand step values like *\/4 or 1-10/2
   */
  private expandStep(
    part: string,
    constraint: FieldConstraint,
    nameMap?: Record<string, number>
  ): number[] {
    const [rangePart, stepStr] = part.split('/');
    const step = parseInt(stepStr, 10);

    if (isNaN(step) || step <= 0) {
      throw new Error(`Invalid step value: ${stepStr}`);
    }

    let start: number;
    let end: number;

    if (rangePart === '*') {
      start = constraint.min;
      end = constraint.max;
    } else if (rangePart.includes('-')) {
      const [rangeStart, rangeEnd] = rangePart.split('-');
      start = this.parseValue(rangeStart, constraint, nameMap);
      end = this.parseValue(rangeEnd, constraint, nameMap);
    } else {
      start = this.parseValue(rangePart, constraint, nameMap);
      end = constraint.max;
    }

    const values: number[] = [];
    for (let i = start; i <= end; i += step) {
      values.push(i);
    }

    return values;
  }

  /**
   * Expand range values like 1-5
   */
  private expandRange(
    part: string,
    constraint: FieldConstraint,
    nameMap?: Record<string, number>
  ): number[] {
    const [startStr, endStr] = part.split('-');
    const start = this.parseValue(startStr, constraint, nameMap);
    const end = this.parseValue(endStr, constraint, nameMap);

    if (start > end) {
      throw new Error(`Invalid range: ${start} > ${end}`);
    }

    return this.range(start, end);
  }

  /**
   * Parse a single value (number or name)
   */
  private parseValue(
    value: string,
    constraint: FieldConstraint,
    nameMap?: Record<string, number>
  ): number {
    const trimmed = value.trim().toLowerCase();

    // Check name map first
    if (nameMap && nameMap[trimmed] !== undefined) {
      return nameMap[trimmed];
    }

    const num = parseInt(trimmed, 10);

    if (isNaN(num)) {
      throw new Error(`Invalid value: ${value} for ${constraint.name}`);
    }

    return num;
  }

  /**
   * Check if a date matches a parsed expression
   */
  private matchesExpression(date: Date, parsed: ParsedCronExpression): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const dayOfWeek = date.getDay();

    // Check minute
    if (!parsed.minute.values.includes(minute)) {
      return false;
    }

    // Check hour
    if (!parsed.hour.values.includes(hour)) {
      return false;
    }

    // Check month
    if (!parsed.month.values.includes(month)) {
      return false;
    }

    // Day of month and day of week have special interaction:
    // If both are restricted (not wildcard), either can match
    // If only one is restricted, only that one needs to match
    const domRestricted = !parsed.dayOfMonth.isWildcard;
    const dowRestricted = !parsed.dayOfWeek.isWildcard;

    if (domRestricted && dowRestricted) {
      // Either can match
      const domMatches = parsed.dayOfMonth.values.includes(dayOfMonth);
      const dowMatches = parsed.dayOfWeek.values.includes(dayOfWeek);
      return domMatches || dowMatches;
    } else if (domRestricted) {
      return parsed.dayOfMonth.values.includes(dayOfMonth);
    } else if (dowRestricted) {
      return parsed.dayOfWeek.values.includes(dayOfWeek);
    }

    return true;
  }

  /**
   * Create an invalid parse result
   */
  private createInvalidResult(expression: string, error: string): ParsedCronExpression {
    const emptyField: CronField = { raw: '', values: [], isWildcard: false };
    return {
      expression,
      minute: emptyField,
      hour: emptyField,
      dayOfMonth: emptyField,
      month: emptyField,
      dayOfWeek: emptyField,
      isValid: false,
      error
    };
  }

  /**
   * Generate a range of numbers
   */
  private range(start: number, end: number): number[] {
    const result: number[] = [];
    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }

  /**
   * Describe time fields
   */
  private describeTime(minute: CronField, hour: CronField): string {
    if (minute.isWildcard && hour.isWildcard) {
      return 'every minute';
    }

    if (minute.isWildcard) {
      return `every minute during hour(s) ${this.formatValues(hour.values)}`;
    }

    if (hour.isWildcard) {
      return `at minute ${this.formatValues(minute.values)} of every hour`;
    }

    // Specific times
    const times: string[] = [];
    for (const h of hour.values) {
      for (const m of minute.values) {
        times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }

    if (times.length <= 3) {
      return `at ${times.join(', ')}`;
    }

    return `at ${times.length} specific times`;
  }

  /**
   * Describe day of month field
   */
  private describeDayOfMonth(field: CronField): string {
    if (field.isWildcard) return '';

    if (field.values.length === 1) {
      return `on day ${field.values[0]}`;
    }

    return `on days ${this.formatValues(field.values)}`;
  }

  /**
   * Describe month field
   */
  private describeMonth(field: CronField): string {
    if (field.isWildcard) return '';

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const names = field.values.map(v => monthNames[v]);

    if (names.length === 1) {
      return `in ${names[0]}`;
    }

    return `in ${names.join(', ')}`;
  }

  /**
   * Describe day of week field
   */
  private describeDayOfWeek(field: CronField): string {
    if (field.isWildcard) return '';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 
                      'Thursday', 'Friday', 'Saturday'];

    // Check for weekday range
    if (this.arraysEqual(field.values, [1, 2, 3, 4, 5])) {
      return 'on weekdays';
    }

    // Check for weekend
    if (this.arraysEqual(field.values, [0, 6])) {
      return 'on weekends';
    }

    const names = field.values.map(v => dayNames[v]);

    if (names.length === 1) {
      return `on ${names[0]}`;
    }

    // Check for consecutive range
    if (this.isConsecutive(field.values)) {
      return `${dayNames[field.values[0]]} through ${dayNames[field.values[field.values.length - 1]]}`;
    }

    return `on ${names.join(', ')}`;
  }

  /**
   * Format an array of values
   */
  private formatValues(values: number[]): string {
    if (values.length <= 5) {
      return values.join(', ');
    }

    if (this.isConsecutive(values)) {
      return `${values[0]}-${values[values.length - 1]}`;
    }

    return `${values.slice(0, 3).join(', ')}... (${values.length} values)`;
  }

  /**
   * Check if array values are consecutive
   */
  private isConsecutive(values: number[]): boolean {
    if (values.length <= 1) return true;

    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }
}

/**
 * Common cron expression presets
 */
export const CRON_PRESETS = {
  /** Every minute */
  EVERY_MINUTE: '* * * * *',
  /** Every hour at minute 0 */
  EVERY_HOUR: '0 * * * *',
  /** Every day at midnight */
  DAILY_MIDNIGHT: '0 0 * * *',
  /** Every day at noon */
  DAILY_NOON: '0 12 * * *',
  /** Every Monday at midnight */
  WEEKLY_MONDAY: '0 0 * * 1',
  /** First day of every month at midnight */
  MONTHLY: '0 0 1 * *',
  /** Every weekday at 9 AM */
  WEEKDAYS_9AM: '0 9 * * 1-5',
  /** Every 4 hours */
  EVERY_4_HOURS: '0 */4 * * *',
  /** Every 30 minutes */
  EVERY_30_MINUTES: '*/30 * * * *',
  /** Every 15 minutes during business hours */
  BUSINESS_HOURS_15MIN: '*/15 9-17 * * 1-5'
} as const;

/**
 * Singleton instance for convenience
 */
export const cronParser = new CronParser();
