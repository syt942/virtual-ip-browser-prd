/**
 * Creator Support Scheduler Module (EP-007)
 * Handles scheduling of creator support tasks
 */

import { EventEmitter } from 'events';

export type SupportScheduleType = 'recurring' | 'daily' | 'weekly' | 'one-time';

export interface SupportSchedule {
  id: string;
  creatorId: string;
  type: SupportScheduleType;
  intervalMinutes?: number;
  timeOfDay?: string;
  daysOfWeek?: number[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportScheduleInput {
  creatorId: string;
  type: SupportScheduleType;
  intervalMinutes?: number;
  timeOfDay?: string;
  daysOfWeek?: number[];
  enabled?: boolean;
}

export class CreatorSupportScheduler extends EventEmitter {
  private schedules: Map<string, SupportSchedule>;
  private timers: Map<string, NodeJS.Timeout>;
  private running: boolean;

  constructor() {
    super();
    this.schedules = new Map();
    this.timers = new Map();
    this.running = false;
  }

  /**
   * Add a support schedule
   */
  addSupportSchedule(input: SupportScheduleInput): SupportSchedule {
    const id = crypto.randomUUID();
    const now = new Date();

    const schedule: SupportSchedule = {
      id,
      creatorId: input.creatorId,
      type: input.type,
      intervalMinutes: input.intervalMinutes,
      timeOfDay: input.timeOfDay,
      daysOfWeek: input.daysOfWeek,
      enabled: input.enabled ?? true,
      runCount: 0,
      createdAt: now,
      updatedAt: now
    };

    // Calculate initial next run
    schedule.nextRun = this.calculateNextRunInternal(schedule);

    this.schedules.set(id, schedule);
    this.emit('schedule:added', schedule);

    // Start timer if scheduler is running
    if (this.running && schedule.enabled) {
      this.scheduleTimer(schedule);
    }

    return schedule;
  }

  /**
   * Get schedule by ID
   */
  getSchedule(id: string): SupportSchedule | undefined {
    return this.schedules.get(id);
  }

  /**
   * Get all support schedules
   */
  getSupportSchedules(): SupportSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedules for a specific creator
   */
  getSchedulesForCreator(creatorId: string): SupportSchedule[] {
    return this.getSupportSchedules().filter(s => s.creatorId === creatorId);
  }

  /**
   * Remove a support schedule
   */
  removeSupportSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    // Clear timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.schedules.delete(id);
    this.emit('schedule:removed', schedule);
    return true;
  }

  /**
   * Enable a schedule
   */
  enableSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    schedule.enabled = true;
    schedule.updatedAt = new Date();
    schedule.nextRun = this.calculateNextRunInternal(schedule);
    this.schedules.set(id, schedule);

    if (this.running) {
      this.scheduleTimer(schedule);
    }

    this.emit('schedule:enabled', schedule);
    return true;
  }

  /**
   * Disable a schedule
   */
  disableSchedule(id: string): boolean {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return false;
    }

    schedule.enabled = false;
    schedule.updatedAt = new Date();
    this.schedules.set(id, schedule);

    // Clear timer
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.emit('schedule:disabled', schedule);
    return true;
  }

  /**
   * Calculate next run time for a schedule
   */
  calculateNextRun(scheduleId: string): Date | null {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return null;
    }
    return this.calculateNextRunInternal(schedule);
  }

  /**
   * Internal method to calculate next run
   */
  private calculateNextRunInternal(schedule: SupportSchedule): Date {
    const now = new Date();

    switch (schedule.type) {
      case 'recurring': {
        if (!schedule.intervalMinutes) {
          // If no interval, schedule for 1 minute in the future
          const next = new Date(now);
          next.setMinutes(next.getMinutes() + 1);
          return next;
        }
        if (schedule.lastRun) {
          const next = new Date(schedule.lastRun);
          next.setMinutes(next.getMinutes() + schedule.intervalMinutes);
          return next > now ? next : now;
        }
        // First run: schedule for intervalMinutes from now
        const next = new Date(now);
        next.setMinutes(next.getMinutes() + schedule.intervalMinutes);
        return next;
      }

      case 'daily': {
        if (!schedule.timeOfDay) {
          return now;
        }
        const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }

      case 'weekly': {
        if (!schedule.daysOfWeek || schedule.daysOfWeek.length === 0 || !schedule.timeOfDay) {
          return now;
        }
        const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
        const currentDay = now.getDay();
        
        // Find next day in schedule
        let daysUntilNext = 7;
        for (const day of schedule.daysOfWeek) {
          let diff = day - currentDay;
          if (diff < 0) {diff += 7;}
          if (diff === 0) {
            const todayTime = new Date(now);
            todayTime.setHours(hours, minutes, 0, 0);
            if (todayTime > now) {
              diff = 0;
            } else {
              diff = 7;
            }
          }
          if (diff < daysUntilNext) {
            daysUntilNext = diff;
          }
        }
        
        const next = new Date(now);
        next.setDate(next.getDate() + daysUntilNext);
        next.setHours(hours, minutes, 0, 0);
        return next;
      }

      case 'one-time': {
        return schedule.nextRun || now;
      }

      default:
        return now;
    }
  }

  /**
   * Schedule timer for a schedule
   */
  private scheduleTimer(schedule: SupportSchedule): void {
    // Clear existing timer
    const existingTimer = this.timers.get(schedule.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    if (!schedule.nextRun || !schedule.enabled) {
      return;
    }

    // Calculate delay with bounds checking
    // setTimeout max safe value is 2^31-1 ms (about 24.8 days)
    const MAX_TIMEOUT = 2147483647;
    let delay = Math.max(0, schedule.nextRun.getTime() - Date.now());
    
    // If delay exceeds max timeout, cap it and reschedule later
    if (delay > MAX_TIMEOUT) {
      delay = MAX_TIMEOUT;
      console.warn(`[CreatorSupportScheduler] Schedule ${schedule.id} delayed beyond max timeout, will reschedule`);
    }
    
    const timer = setTimeout(() => {
      // Check if we need to reschedule or execute
      const actualDelay = schedule.nextRun!.getTime() - Date.now();
      if (actualDelay > 1000) {
        // Still more time to wait, reschedule
        this.scheduleTimer(schedule);
      } else {
        // Time to execute
        this.executeSchedule(schedule);
      }
    }, delay);

    this.timers.set(schedule.id, timer);
  }

  /**
   * Execute a scheduled support task
   */
  private executeSchedule(schedule: SupportSchedule): void {
    schedule.lastRun = new Date();
    schedule.runCount++;
    schedule.nextRun = this.calculateNextRunInternal(schedule);
    schedule.updatedAt = new Date();
    this.schedules.set(schedule.id, schedule);

    this.emit('schedule:execute', schedule);

    // Re-schedule if not one-time
    if (schedule.type !== 'one-time' && schedule.enabled) {
      this.scheduleTimer(schedule);
    } else if (schedule.type === 'one-time') {
      schedule.enabled = false;
      this.schedules.set(schedule.id, schedule);
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) {return;}
    this.running = true;

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.scheduleTimer(schedule);
      }
    }

    this.emit('scheduler:started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.running) {return;}
    this.running = false;

    for (const [_id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    this.emit('scheduler:stopped');
  }

  /**
   * Update a schedule
   */
  updateSchedule(id: string, updates: Partial<SupportScheduleInput>): SupportSchedule | undefined {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      return undefined;
    }

    const updated: SupportSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };
    updated.nextRun = this.calculateNextRunInternal(updated);

    this.schedules.set(id, updated);

    // Reschedule if running
    if (this.running) {
      if (updated.enabled) {
        this.scheduleTimer(updated);
      } else {
        const timer = this.timers.get(id);
        if (timer) {
          clearTimeout(timer);
          this.timers.delete(id);
        }
      }
    }

    this.emit('schedule:updated', updated);
    return updated;
  }
}
