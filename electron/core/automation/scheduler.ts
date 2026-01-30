/**
 * Task Scheduler
 * Manages scheduled automation tasks with cron expression support
 * 
 * Supports schedule types:
 * - one-time: Execute once at a specific time
 * - recurring: Execute at regular intervals
 * - continuous: Execute continuously with minimal delay
 * - cron: Execute based on cron expression (standard 5-field format)
 * 
 * @module electron/core/automation/scheduler
 */

import { EventEmitter } from 'events';
import type { TaskSchedule, ScheduleType } from './types';
import { CronParser, CronParseError } from './cron-parser';
import type { ParsedCron, CronValidationResult } from './cron-parser';
import {
  CRON_CHECK_INTERVAL_MS,
  CONTINUOUS_SCHEDULE_DELAY_MS,
  MAX_DAY_SEARCH_ITERATIONS
} from './constants';

export class TaskScheduler extends EventEmitter {
  private schedules: Map<string, TaskSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private cronParser: CronParser;
  private parsedCronCache: Map<string, ParsedCron> = new Map();
  private running: boolean = false;
  private checkIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.cronParser = new CronParser();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.scheduleAllTasks();
    
    // Check for tasks every minute (for cron schedules)
    this.checkIntervalId = setInterval(() => {
      if (!this.running) {
        if (this.checkIntervalId) {
          clearInterval(this.checkIntervalId);
          this.checkIntervalId = null;
        }
        return;
      }
      this.checkSchedules();
    }, CRON_CHECK_INTERVAL_MS);

    console.log('[Scheduler] Task scheduler started');
    this.emit('scheduler:started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;
    
    // Clear check interval
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    
    // Clear all timers
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    
    // Clear cron cache
    this.parsedCronCache.clear();

    console.log('[Scheduler] Task scheduler stopped');
    this.emit('scheduler:stopped');
  }

  /**
   * Add a schedule with validation
   * 
   * @param schedule - The schedule to add
   * @throws Error if cron expression is invalid
   */
  addSchedule(schedule: TaskSchedule): void {
    // Validate cron expression if type is cron/custom
    if ((schedule.type === 'cron' || schedule.type === 'custom') && schedule.cronExpression) {
      const validation = this.validateCronExpression(schedule.cronExpression);
      if (!validation.isValid) {
        throw new Error(`Invalid cron expression: ${validation.error}`);
      }
      // Cache the parsed cron
      if (validation.parsed) {
        this.parsedCronCache.set(schedule.id, validation.parsed);
      }
    }

    this.schedules.set(schedule.id, schedule);
    
    if (schedule.enabled && this.running) {
      this.scheduleTask(schedule);
    }

    this.emit('schedule:added', schedule);
  }

  /**
   * Validate a cron expression
   * 
   * @param expression - Cron expression to validate
   * @returns Validation result with parsed cron or error
   */
  validateCronExpression(expression: string): CronValidationResult {
    return this.cronParser.validate(expression);
  }

  /**
   * Get next execution time for a cron expression
   * 
   * @param expression - Cron expression
   * @param fromTime - Starting time (defaults to now)
   * @returns Next execution time or null
   */
  getNextCronExecution(expression: string, fromTime?: Date): Date | null {
    try {
      const parsed = this.cronParser.parse(expression);
      return this.cronParser.getNextExecution(parsed, fromTime);
    } catch (error) {
      // Invalid cron expression - return null to indicate no next execution
      console.debug('[Scheduler] Failed to parse cron expression:', expression,
        error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Get multiple upcoming execution times for a cron expression
   * 
   * @param expression - Cron expression
   * @param count - Number of times to return
   * @param fromTime - Starting time (defaults to now)
   * @returns Array of upcoming execution times
   */
  getNextCronExecutions(expression: string, count: number, fromTime?: Date): Date[] {
    try {
      const parsed = this.cronParser.parse(expression);
      return this.cronParser.getNextExecutions(parsed, count, fromTime);
    } catch (error) {
      // Invalid cron expression - return empty array to indicate no executions
      console.debug('[Scheduler] Failed to get cron executions for:', expression,
        error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  /**
   * Get human-readable description of a cron expression
   * 
   * @param expression - Cron expression
   * @returns Human-readable description
   */
  describeCronExpression(expression: string): string {
    try {
      return this.cronParser.describe(expression);
    } catch (error) {
      return `Invalid expression: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Remove a schedule
   */
  removeSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    // Clear timer if exists
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    // Clear cron cache
    this.parsedCronCache.delete(id);

    this.schedules.delete(id);
    this.emit('schedule:removed', schedule);
    return true;
  }

  /**
   * Update a schedule
   * 
   * @param id - Schedule ID
   * @param updates - Partial schedule updates
   * @throws Error if new cron expression is invalid
   */
  updateSchedule(id: string, updates: Partial<TaskSchedule>): TaskSchedule | undefined {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;

    // Validate cron expression if being updated
    if (updates.cronExpression && updates.cronExpression !== schedule.cronExpression) {
      const validation = this.validateCronExpression(updates.cronExpression);
      if (!validation.isValid) {
        throw new Error(`Invalid cron expression: ${validation.error}`);
      }
      // Update cache
      if (validation.parsed) {
        this.parsedCronCache.set(id, validation.parsed);
      }
    }

    // If type changed to/from cron, handle cache
    if (updates.type && updates.type !== schedule.type) {
      if (updates.type === 'cron' || updates.type === 'custom') {
        const cronExpr = updates.cronExpression || schedule.cronExpression;
        if (cronExpr) {
          const validation = this.validateCronExpression(cronExpr);
          if (!validation.isValid) {
            throw new Error(`Invalid cron expression: ${validation.error}`);
          }
          if (validation.parsed) {
            this.parsedCronCache.set(id, validation.parsed);
          }
        }
      } else {
        // No longer cron type, clear cache
        this.parsedCronCache.delete(id);
      }
    }

    const updated = { ...schedule, ...updates, updatedAt: new Date() };
    this.schedules.set(id, updated);

    // Reschedule if enabled
    if (updated.enabled && this.running) {
      this.scheduleTask(updated);
    } else {
      // Clear timer if disabled
      const timer = this.timers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(id);
      }
    }

    this.emit('schedule:updated', updated);
    return updated;
  }

  /**
   * Enable a schedule
   */
  enableSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    schedule.enabled = true;
    schedule.updatedAt = new Date();
    this.schedules.set(id, schedule);

    if (this.running) {
      this.scheduleTask(schedule);
    }

    this.emit('schedule:enabled', schedule);
    return true;
  }

  /**
   * Disable a schedule
   */
  disableSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    schedule.enabled = false;
    schedule.updatedAt = new Date();
    
    // Clear timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.schedules.set(id, schedule);
    this.emit('schedule:disabled', schedule);
    return true;
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): TaskSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule by ID
   */
  getSchedule(id: string): TaskSchedule | undefined {
    return this.schedules.get(id);
  }

  /**
   * Schedule all tasks
   */
  private scheduleAllTasks(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.scheduleTask(schedule);
      }
    }
  }

  /**
   * Schedule a single task
   */
  private scheduleTask(schedule: TaskSchedule): void {
    // Clear existing timer
    const existingTimer = this.timers.get(schedule.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const nextRun = this.calculateNextRun(schedule);
    if (!nextRun) return;

    schedule.nextRun = nextRun;
    this.schedules.set(schedule.id, schedule);

    const delay = nextRun.getTime() - Date.now();
    if (delay <= 0) {
      // Run immediately
      this.executeTask(schedule);
    } else {
      // Schedule for later
      const timer = setTimeout(() => {
        this.executeTask(schedule);
      }, delay);
      
      this.timers.set(schedule.id, timer);
    }
  }

  /**
   * Calculate next run time based on schedule type
   */
  private calculateNextRun(schedule: TaskSchedule): Date | null {
    const now = new Date();

    // Check if schedule has ended
    if (schedule.endTime && schedule.endTime < now) {
      return null;
    }

    switch (schedule.type) {
      case 'one-time':
        if (!schedule.startTime) return null;
        return schedule.startTime > now ? schedule.startTime : null;

      case 'recurring':
        return this.calculateRecurringNextRun(schedule, now);

      case 'continuous':
        // Run immediately after completion (with small delay to prevent CPU spinning)
        const continuousNext = new Date(now.getTime() + CONTINUOUS_SCHEDULE_DELAY_MS);
        return continuousNext;

      case 'cron':
      case 'custom':
        return this.calculateCronNextRun(schedule, now);

      default:
        return null;
    }
  }

  /**
   * Calculate next run time for recurring schedules
   */
  private calculateRecurringNextRun(schedule: TaskSchedule, now: Date): Date | null {
    if (!schedule.intervalMinutes) return null;

    // If has days of week restriction, check them
    if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
      return this.calculateRecurringWithDays(schedule, now);
    }

    // Simple interval-based scheduling
    if (schedule.lastRun) {
      const next = new Date(schedule.lastRun);
      next.setMinutes(next.getMinutes() + schedule.intervalMinutes);
      // If calculated next is in the past, schedule from now
      if (next <= now) {
        const next2 = new Date(now);
        next2.setMinutes(next2.getMinutes() + schedule.intervalMinutes);
        return next2;
      }
      return next;
    }
    
    return schedule.startTime && schedule.startTime > now ? schedule.startTime : now;
  }

  /**
   * Calculate next run for recurring schedule with day-of-week restrictions
   */
  private calculateRecurringWithDays(schedule: TaskSchedule, now: Date): Date | null {
    const { daysOfWeek, intervalMinutes, startTime } = schedule;
    if (!intervalMinutes || !daysOfWeek || daysOfWeek.length === 0) return null;

    let candidate = schedule.lastRun 
      ? new Date(schedule.lastRun.getTime() + intervalMinutes * 60000)
      : (startTime && startTime > now ? startTime : now);

    // Find the next valid day (check up to a week ahead)
    for (let i = 0; i < MAX_DAY_SEARCH_ITERATIONS; i++) {
      if (daysOfWeek.includes(candidate.getDay())) {
        if (candidate > now) {
          return candidate;
        }
      }
      // Move to next day at the same time
      candidate = new Date(candidate);
      candidate.setDate(candidate.getDate() + 1);
    }

    return null;
  }

  /**
   * Calculate next run time for cron-based schedules
   */
  private calculateCronNextRun(schedule: TaskSchedule, now: Date): Date | null {
    if (!schedule.cronExpression) {
      console.warn(`[Scheduler] Schedule ${schedule.id} has cron type but no cronExpression`);
      return null;
    }

    try {
      // Use cached parsed cron if available
      let parsed = this.parsedCronCache.get(schedule.id);
      
      if (!parsed) {
        parsed = this.cronParser.parse(schedule.cronExpression);
        this.parsedCronCache.set(schedule.id, parsed);
      }

      // Calculate from last run or now
      const fromTime = schedule.lastRun && schedule.lastRun > now 
        ? schedule.lastRun 
        : now;

      const nextExecution = this.cronParser.getNextExecution(parsed, fromTime);
      
      if (!nextExecution) {
        console.warn(`[Scheduler] Could not calculate next cron execution for ${schedule.id}`);
        return null;
      }

      // Respect end time if set
      if (schedule.endTime && nextExecution > schedule.endTime) {
        return null;
      }

      return nextExecution;
    } catch (error) {
      if (error instanceof CronParseError) {
        console.error(`[Scheduler] Invalid cron expression for ${schedule.id}: ${error.message}`);
        this.emit('schedule:error', { 
          scheduleId: schedule.id, 
          error: `Invalid cron expression: ${error.message}` 
        });
      } else {
        console.error(`[Scheduler] Error calculating cron next run for ${schedule.id}:`, error);
      }
      return null;
    }
  }

  /**
   * Check if any schedules need to run
   */
  private checkSchedules(): void {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;
      if (!schedule.nextRun) continue;

      if (schedule.nextRun <= now) {
        this.executeTask(schedule);
      }
    }
  }

  /**
   * Execute a scheduled task
   */
  private executeTask(schedule: TaskSchedule): void {
    console.log('[Scheduler] Executing task:', schedule.id);

    // Update schedule
    schedule.lastRun = new Date();
    schedule.runCount++;
    this.schedules.set(schedule.id, schedule);

    // Emit event for task execution
    this.emit('task:execute', schedule);

    // Check if max runs reached
    if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
      console.log(`[Scheduler] Max runs (${schedule.maxRuns}) reached for schedule ${schedule.id}`);
      schedule.enabled = false;
      this.schedules.set(schedule.id, schedule);
      this.emit('schedule:max-runs-reached', schedule);
      return;
    }

    // Schedule next run
    if (schedule.type !== 'one-time') {
      this.scheduleTask(schedule);
    } else {
      // Disable one-time schedule after execution
      schedule.enabled = false;
      this.schedules.set(schedule.id, schedule);
    }
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the number of active schedules
   */
  getActiveScheduleCount(): number {
    let count = 0;
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) count++;
    }
    return count;
  }

  /**
   * Get schedules by type
   */
  getSchedulesByType(type: ScheduleType): TaskSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.type === type);
  }

  /**
   * Export schedules for persistence
   * 
   * @returns Array of schedule objects ready for serialization
   */
  exportSchedules(): TaskSchedule[] {
    return Array.from(this.schedules.values()).map(schedule => ({
      ...schedule,
      // Convert dates to ISO strings for JSON serialization
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt
    }));
  }

  /**
   * Import schedules from persistence
   * 
   * @param schedules - Array of schedule objects
   * @param clearExisting - Whether to clear existing schedules first
   */
  importSchedules(schedules: TaskSchedule[], clearExisting: boolean = false): void {
    if (clearExisting) {
      // Stop and clear all existing schedules
      for (const [, timer] of this.timers) {
        clearTimeout(timer);
      }
      this.timers.clear();
      this.schedules.clear();
      this.parsedCronCache.clear();
    }

    for (const schedule of schedules) {
      try {
        // Ensure dates are Date objects
        const imported: TaskSchedule = {
          ...schedule,
          startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
          endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
          lastRun: schedule.lastRun ? new Date(schedule.lastRun) : undefined,
          nextRun: schedule.nextRun ? new Date(schedule.nextRun) : undefined,
          createdAt: new Date(schedule.createdAt),
          updatedAt: new Date(schedule.updatedAt)
        };

        this.addSchedule(imported);
      } catch (error) {
        console.error(`[Scheduler] Failed to import schedule ${schedule.id}:`, error);
        this.emit('schedule:import-error', { 
          scheduleId: schedule.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    this.emit('schedules:imported', { count: schedules.length });
  }

  /**
   * Clear all schedules
   */
  clearAllSchedules(): void {
    // Stop all timers
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.schedules.clear();
    this.parsedCronCache.clear();
    
    this.emit('schedules:cleared');
  }

  /**
   * Get cron parser instance for external use
   */
  getCronParser(): CronParser {
    return this.cronParser;
  }
}
