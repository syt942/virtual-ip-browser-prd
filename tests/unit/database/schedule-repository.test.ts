/**
 * ScheduleRepository Unit Tests
 * Tests for schedule database operations
 * 
 * Coverage targets:
 * - CRUD operations
 * - Schedule type filtering
 * - Next run queries
 * - Enable/disable operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDatabaseWithSchema, cleanupDatabase, generateTestUUID } from '../../helpers/test-helpers';

// Schedule repository interface for testing
interface Schedule {
  id: string;
  name: string | null;
  type: 'one-time' | 'recurring' | 'continuous' | 'custom';
  taskConfig: string;
  startTime: Date | null;
  endTime: Date | null;
  intervalMinutes: number | null;
  daysOfWeek: string | null;
  cronExpression: string | null;
  enabled: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Simple test repository implementation
class TestScheduleRepository {
  constructor(private db: Database.Database) {}

  create(input: {
    name?: string;
    type: Schedule['type'];
    taskConfig: object;
    startTime?: Date;
    endTime?: Date;
    intervalMinutes?: number;
    daysOfWeek?: number[];
    cronExpression?: string;
    enabled?: boolean;
  }): Schedule {
    const id = generateTestUUID();
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO schedules (
        id, name, type, task_config, start_time, end_time,
        interval_minutes, days_of_week, cron_expression, enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name || null,
      input.type,
      JSON.stringify(input.taskConfig),
      input.startTime?.toISOString() || null,
      input.endTime?.toISOString() || null,
      input.intervalMinutes || null,
      input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null,
      input.cronExpression || null,
      input.enabled !== false ? 1 : 0,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): Schedule | null {
    const row = this.db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as any;
    return row ? this.toDTO(row) : null;
  }

  findAll(options?: { enabled?: boolean; type?: Schedule['type'] }): Schedule[] {
    let sql = 'SELECT * FROM schedules WHERE 1=1';
    const params: any[] = [];

    if (options?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(options.enabled ? 1 : 0);
    }

    if (options?.type) {
      sql += ' AND type = ?';
      params.push(options.type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => this.toDTO(r));
  }

  findDue(): Schedule[] {
    const now = new Date().toISOString();
    const rows = this.db.prepare(`
      SELECT * FROM schedules 
      WHERE enabled = 1 
        AND (next_run IS NULL OR next_run <= ?)
      ORDER BY next_run ASC
    `).all(now) as any[];
    return rows.map(r => this.toDTO(r));
  }

  update(id: string, input: Partial<{
    name: string;
    enabled: boolean;
    nextRun: Date;
    lastRun: Date;
    runCount: number;
  }>): Schedule | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (input.enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(input.enabled ? 1 : 0);
    }
    if (input.nextRun !== undefined) {
      updates.push('next_run = ?');
      params.push(input.nextRun?.toISOString() || null);
    }
    if (input.lastRun !== undefined) {
      updates.push('last_run = ?');
      params.push(input.lastRun?.toISOString() || null);
    }
    if (input.runCount !== undefined) {
      updates.push('run_count = ?');
      params.push(input.runCount);
    }

    params.push(id);
    this.db.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  incrementRunCount(id: string): boolean {
    const result = this.db.prepare(`
      UPDATE schedules 
      SET run_count = run_count + 1, 
          last_run = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
    return result.changes > 0;
  }

  private toDTO(row: any): Schedule {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      taskConfig: row.task_config,
      startTime: row.start_time ? new Date(row.start_time) : null,
      endTime: row.end_time ? new Date(row.end_time) : null,
      intervalMinutes: row.interval_minutes,
      daysOfWeek: row.days_of_week,
      cronExpression: row.cron_expression,
      enabled: row.enabled === 1,
      lastRun: row.last_run ? new Date(row.last_run) : null,
      nextRun: row.next_run ? new Date(row.next_run) : null,
      runCount: row.run_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

describe('ScheduleRepository', () => {
  let db: Database.Database;
  let repo: TestScheduleRepository;

  beforeEach(() => {
    db = createTestDatabaseWithSchema();
    repo = new TestScheduleRepository(db);
  });

  afterEach(() => {
    cleanupDatabase(db);
  });

  // ============================================================
  // CREATE TESTS
  // ============================================================
  describe('create', () => {
    it('creates schedule with all fields', () => {
      // Act
      const schedule = repo.create({
        name: 'Test Schedule',
        type: 'recurring',
        taskConfig: { keywords: ['test'], engine: 'google' },
        startTime: new Date('2025-01-01'),
        intervalMinutes: 60,
        daysOfWeek: [1, 2, 3, 4, 5],
        enabled: true,
      });

      // Assert
      expect(schedule.id).toBeDefined();
      expect(schedule.name).toBe('Test Schedule');
      expect(schedule.type).toBe('recurring');
      expect(schedule.intervalMinutes).toBe(60);
      expect(schedule.enabled).toBe(true);
    });

    it('creates schedule with minimal fields', () => {
      // Act
      const schedule = repo.create({
        type: 'one-time',
        taskConfig: { action: 'test' },
      });

      // Assert
      expect(schedule.id).toBeDefined();
      expect(schedule.type).toBe('one-time');
      expect(schedule.enabled).toBe(true);
      expect(schedule.runCount).toBe(0);
    });

    it('creates schedule with cron expression', () => {
      // Act
      const schedule = repo.create({
        name: 'Cron Schedule',
        type: 'custom',
        taskConfig: {},
        cronExpression: '0 9 * * 1-5',
      });

      // Assert
      expect(schedule.cronExpression).toBe('0 9 * * 1-5');
    });
  });

  // ============================================================
  // FIND TESTS
  // ============================================================
  describe('findById', () => {
    it('finds schedule by ID', () => {
      // Arrange
      const created = repo.create({ type: 'one-time', taskConfig: {} });

      // Act
      const found = repo.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('returns null for non-existent ID', () => {
      // Act
      const result = repo.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all schedules', () => {
      // Arrange
      repo.create({ type: 'one-time', taskConfig: {} });
      repo.create({ type: 'recurring', taskConfig: {} });

      // Act
      const result = repo.findAll();

      // Assert
      expect(result).toHaveLength(2);
    });

    it('filters by enabled status', () => {
      // Arrange
      repo.create({ type: 'one-time', taskConfig: {}, enabled: true });
      repo.create({ type: 'one-time', taskConfig: {}, enabled: false });

      // Act
      const enabled = repo.findAll({ enabled: true });
      const disabled = repo.findAll({ enabled: false });

      // Assert
      expect(enabled).toHaveLength(1);
      expect(disabled).toHaveLength(1);
    });

    it('filters by type', () => {
      // Arrange
      repo.create({ type: 'one-time', taskConfig: {} });
      repo.create({ type: 'recurring', taskConfig: {} });
      repo.create({ type: 'recurring', taskConfig: {} });

      // Act
      const recurring = repo.findAll({ type: 'recurring' });

      // Assert
      expect(recurring).toHaveLength(2);
    });
  });

  describe('findDue', () => {
    it('returns schedules that are due', () => {
      // Arrange - create a schedule with past next_run time
      const due = repo.create({ type: 'one-time', taskConfig: {}, enabled: true });
      // Update next_run to a past time directly in DB
      db.prepare('UPDATE schedules SET next_run = ? WHERE id = ?')
        .run(new Date(Date.now() - 60000).toISOString(), due.id);

      const notDue = repo.create({ type: 'one-time', taskConfig: {}, enabled: true });
      db.prepare('UPDATE schedules SET next_run = ? WHERE id = ?')
        .run(new Date(Date.now() + 60000).toISOString(), notDue.id);

      // Act
      const result = repo.findDue();

      // Assert - due schedule should be in results
      expect(result.some(s => s.id === due.id)).toBe(true);
      expect(result.some(s => s.id === notDue.id)).toBe(false);
    });

    it('excludes disabled schedules', () => {
      // Arrange
      const disabled = repo.create({ type: 'one-time', taskConfig: {}, enabled: false });
      repo.update(disabled.id, { nextRun: new Date(Date.now() - 1000) });

      // Act
      const result = repo.findDue();

      // Assert
      expect(result.find(s => s.id === disabled.id)).toBeUndefined();
    });
  });

  // ============================================================
  // UPDATE TESTS
  // ============================================================
  describe('update', () => {
    it('updates schedule properties', () => {
      // Arrange
      const schedule = repo.create({ name: 'Original', type: 'one-time', taskConfig: {} });

      // Act
      const updated = repo.update(schedule.id, { name: 'Updated' });

      // Assert
      expect(updated?.name).toBe('Updated');
    });

    it('enables/disables schedule', () => {
      // Arrange
      const schedule = repo.create({ type: 'one-time', taskConfig: {}, enabled: true });

      // Act
      repo.update(schedule.id, { enabled: false });

      // Assert
      expect(repo.findById(schedule.id)?.enabled).toBe(false);
    });

    it('updates next run time', () => {
      // Arrange
      const schedule = repo.create({ type: 'recurring', taskConfig: {} });
      const nextRun = new Date('2025-06-01T10:00:00Z');

      // Act
      repo.update(schedule.id, { nextRun });

      // Assert
      const updated = repo.findById(schedule.id);
      expect(updated?.nextRun?.toISOString()).toBe(nextRun.toISOString());
    });

    it('returns null for non-existent ID', () => {
      // Act
      const result = repo.update('non-existent', { name: 'Test' });

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // DELETE TESTS
  // ============================================================
  describe('delete', () => {
    it('deletes schedule by ID', () => {
      // Arrange
      const schedule = repo.create({ type: 'one-time', taskConfig: {} });

      // Act
      const result = repo.delete(schedule.id);

      // Assert
      expect(result).toBe(true);
      expect(repo.findById(schedule.id)).toBeNull();
    });

    it('returns false for non-existent ID', () => {
      // Act
      const result = repo.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // RUN COUNT TESTS
  // ============================================================
  describe('incrementRunCount', () => {
    it('increments run count', () => {
      // Arrange
      const schedule = repo.create({ type: 'recurring', taskConfig: {} });
      expect(schedule.runCount).toBe(0);

      // Act
      repo.incrementRunCount(schedule.id);
      repo.incrementRunCount(schedule.id);

      // Assert
      expect(repo.findById(schedule.id)?.runCount).toBe(2);
    });

    it('updates last run timestamp', () => {
      // Arrange
      const schedule = repo.create({ type: 'recurring', taskConfig: {} });

      // Act
      repo.incrementRunCount(schedule.id);

      // Assert
      const updated = repo.findById(schedule.id);
      expect(updated?.lastRun).not.toBeNull();
    });
  });
});
