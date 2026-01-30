/**
 * ExecutionLogsRepository Unit Tests
 * Tests for execution tracking, status management, analytics
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ExecutionLogsRepository } from '../../../electron/database/repositories/execution-logs.repository';
import type {
  CreateExecutionLogInput,
  ExecutionType,
  ExecutionStatus,
  ResourceUsage
} from '../../../electron/database/migrations/types';
import { createTestDatabase, getUnixTimestamp } from './test-helpers';

describe('ExecutionLogsRepository', () => {
  let db: Database.Database;
  let repository: ExecutionLogsRepository;

  beforeEach(() => {
    // Arrange: Create fresh in-memory database for each test
    db = createTestDatabase();
    repository = new ExecutionLogsRepository(db);
  });

  afterEach(() => {
    // Cleanup: Close database connection
    db.close();
  });

  // ============================================================
  // CREATE OPERATIONS TESTS
  // ============================================================
  describe('create', () => {
    it('should create a new execution log', () => {
      // Arrange
      const input: CreateExecutionLogInput = {
        executionType: 'search',
        startTime: new Date()
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.executionType).toBe('search');
      expect(result.status).toBe('running');
      expect(result.startTime).toBeInstanceOf(Date);
    });

    it('should handle Date startTime', () => {
      // Arrange
      const now = new Date();
      const input: CreateExecutionLogInput = {
        executionType: 'creator_support',
        startTime: now
      };

      // Act
      const result = repository.create(input);

      // Assert - Unix timestamp precision (seconds), allow 2 second tolerance
      const diffSeconds = Math.abs(result.startTime.getTime() - now.getTime()) / 1000;
      expect(diffSeconds).toBeLessThan(2);
    });

    it('should handle Unix timestamp startTime', () => {
      // Arrange
      const unixTime = getUnixTimestamp();
      const input: CreateExecutionLogInput = {
        executionType: 'scheduled',
        startTime: unixTime
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(Math.floor(result.startTime.getTime() / 1000)).toBe(unixTime);
    });

    it('should set default values', () => {
      // Arrange
      const input: CreateExecutionLogInput = {
        executionType: 'search',
        startTime: new Date()
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.status).toBe('running');
      expect(result.proxyRotations).toBe(0);
      expect(result.errorsCount).toBe(0);
      expect(result.endTime).toBeUndefined();
    });

    it('should store initial metrics', () => {
      // Arrange
      const input: CreateExecutionLogInput = {
        executionType: 'search',
        startTime: new Date(),
        keywordsProcessed: 10,
        resultsFound: 50,
        proxyRotations: 2,
        errorsCount: 1
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.keywordsProcessed).toBe(10);
      expect(result.resultsFound).toBe(50);
      expect(result.proxyRotations).toBe(2);
      expect(result.errorsCount).toBe(1);
    });

    it('should store error details', () => {
      // Arrange
      const errorDetails = [
        { timestamp: getUnixTimestamp(), message: 'Network error', code: 'NET_ERR' },
        { timestamp: getUnixTimestamp(), message: 'Timeout', code: 'TIMEOUT' }
      ];
      const input: CreateExecutionLogInput = {
        executionType: 'search',
        startTime: new Date(),
        errorDetails
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.errorDetails).toEqual(errorDetails);
    });

    it('should store resource usage', () => {
      // Arrange
      const resourceUsage: ResourceUsage = { cpu: 45.5, memory: 256.7 };
      const input: CreateExecutionLogInput = {
        executionType: 'creator_support',
        startTime: new Date(),
        resourceUsage
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.resourceUsage).toEqual(resourceUsage);
    });

    it('should store metadata', () => {
      // Arrange
      const metadata = { taskId: 'task-123', priority: 'high', tags: ['automation'] };
      const input: CreateExecutionLogInput = {
        executionType: 'scheduled',
        startTime: new Date(),
        metadata
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findById', () => {
    it('should find execution log by ID', () => {
      // Arrange
      const created = repository.create({
        executionType: 'search',
        startTime: new Date()
      });

      // Act
      const found = repository.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', () => {
      // Act
      const found = repository.findById(999999);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findByType', () => {
    beforeEach(() => {
      repository.create({ executionType: 'search', startTime: new Date() });
      repository.create({ executionType: 'search', startTime: new Date() });
      repository.create({ executionType: 'creator_support', startTime: new Date() });
      repository.create({ executionType: 'scheduled', startTime: new Date() });
    });

    it('should find by execution type', () => {
      // Act
      const logs = repository.findByType('search');

      // Assert
      expect(logs).toHaveLength(2);
      expect(logs.every(l => l.executionType === 'search')).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Act
      const logs = repository.findByType('search', 1);

      // Assert
      expect(logs).toHaveLength(1);
    });

    it('should return empty for type with no logs', () => {
      // Arrange - Clear all
      db.prepare('DELETE FROM execution_logs').run();

      // Act
      const logs = repository.findByType('search');

      // Assert
      expect(logs).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    beforeEach(() => {
      const log1 = repository.create({ executionType: 'search', startTime: new Date() });
      const log2 = repository.create({ executionType: 'search', startTime: new Date() });
      repository.complete(log1.id);
      repository.fail(log2.id);
      repository.create({ executionType: 'search', startTime: new Date() }); // Running
    });

    it('should find by status', () => {
      // Act
      const completed = repository.findByStatus('completed');
      const failed = repository.findByStatus('failed');
      const running = repository.findByStatus('running');

      // Assert
      expect(completed).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(running).toHaveLength(1);
    });
  });

  describe('findRunning', () => {
    it('should find all running executions', () => {
      // Arrange
      repository.create({ executionType: 'search', startTime: new Date() });
      repository.create({ executionType: 'creator_support', startTime: new Date() });
      const completed = repository.create({ executionType: 'scheduled', startTime: new Date() });
      repository.complete(completed.id);

      // Act
      const running = repository.findRunning();

      // Assert
      expect(running).toHaveLength(2);
      expect(running.every(l => l.status === 'running')).toBe(true);
    });
  });

  describe('findRecent', () => {
    beforeEach(() => {
      for (let i = 0; i < 150; i++) {
        repository.create({
          executionType: 'search',
          startTime: getUnixTimestamp() - i
        });
      }
    });

    it('should return most recent logs', () => {
      // Act
      const recent = repository.findRecent(50);

      // Assert
      expect(recent).toHaveLength(50);
    });

    it('should use default limit of 100', () => {
      // Act
      const recent = repository.findRecent();

      // Assert
      expect(recent).toHaveLength(100);
    });

    it('should order by start_time DESC', () => {
      // Act
      const recent = repository.findRecent(10);

      // Assert
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].startTime.getTime()).toBeGreaterThanOrEqual(recent[i].startTime.getTime());
      }
    });
  });

  describe('findByTimeRange', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      repository.create({ executionType: 'search', startTime: now - 3600 }); // 1 hour ago
      repository.create({ executionType: 'search', startTime: now - 7200 }); // 2 hours ago
      repository.create({ executionType: 'search', startTime: now - 86400 }); // 24 hours ago
    });

    it('should find logs within time range', () => {
      // Arrange
      const endTime = new Date();
      const startTime = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago

      // Act
      const logs = repository.findByTimeRange(startTime, endTime);

      // Assert
      expect(logs).toHaveLength(2);
    });
  });

  // ============================================================
  // UPDATE OPERATIONS TESTS
  // ============================================================
  describe('update', () => {
    it('should update execution log fields', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const updated = repository.update(log.id, {
        keywordsProcessed: 25,
        resultsFound: 100,
        proxyRotations: 5
      });

      // Assert
      expect(updated?.keywordsProcessed).toBe(25);
      expect(updated?.resultsFound).toBe(100);
      expect(updated?.proxyRotations).toBe(5);
    });

    it('should update status', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const updated = repository.update(log.id, { status: 'completed' });

      // Assert
      expect(updated?.status).toBe('completed');
    });

    it('should update end time', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });
      const endTime = new Date();

      // Act
      const updated = repository.update(log.id, { endTime });

      // Assert
      expect(updated?.endTime).toBeInstanceOf(Date);
    });

    it('should return existing log if no updates', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const updated = repository.update(log.id, {});

      // Assert
      expect(updated?.id).toBe(log.id);
    });

    it('should return null for non-existent ID', () => {
      // Act
      const updated = repository.update(999999, { status: 'completed' });

      // Assert
      expect(updated).toBeNull();
    });
  });

  describe('complete', () => {
    it('should mark execution as completed', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const completed = repository.complete(log.id);

      // Assert
      expect(completed?.status).toBe('completed');
      expect(completed?.endTime).toBeInstanceOf(Date);
    });

    it('should apply additional updates', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const completed = repository.complete(log.id, {
        keywordsProcessed: 50,
        resultsFound: 200
      });

      // Assert
      expect(completed?.status).toBe('completed');
      expect(completed?.keywordsProcessed).toBe(50);
      expect(completed?.resultsFound).toBe(200);
    });
  });

  describe('fail', () => {
    it('should mark execution as failed', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const failed = repository.fail(log.id);

      // Assert
      expect(failed?.status).toBe('failed');
      expect(failed?.endTime).toBeInstanceOf(Date);
    });

    it('should increment error count', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const failed = repository.fail(log.id);

      // Assert
      expect(failed?.errorsCount).toBe(1);
    });

    it('should store error details', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });
      const errorDetails = [{ timestamp: Date.now(), message: 'Fatal error', code: 'FATAL' }];

      // Act
      const failed = repository.fail(log.id, errorDetails);

      // Assert
      expect(failed?.errorDetails).toEqual(errorDetails);
    });
  });

  describe('cancel', () => {
    it('should mark execution as cancelled', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const cancelled = repository.cancel(log.id);

      // Assert
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.endTime).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // INCREMENT OPERATIONS TESTS
  // ============================================================
  describe('incrementProxyRotations', () => {
    it('should increment proxy rotations counter', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      repository.incrementProxyRotations(log.id, 3);

      // Assert
      const updated = repository.findById(log.id);
      expect(updated?.proxyRotations).toBe(3);
    });

    it('should use default increment of 1', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      repository.incrementProxyRotations(log.id);

      // Assert
      const updated = repository.findById(log.id);
      expect(updated?.proxyRotations).toBe(1);
    });

    it('should accumulate increments', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      repository.incrementProxyRotations(log.id, 2);
      repository.incrementProxyRotations(log.id, 3);

      // Assert
      const updated = repository.findById(log.id);
      expect(updated?.proxyRotations).toBe(5);
    });
  });

  describe('incrementErrors', () => {
    it('should increment error counter', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      repository.incrementErrors(log.id, 2);

      // Assert
      const updated = repository.findById(log.id);
      expect(updated?.errorsCount).toBe(2);
    });
  });

  describe('updateResourceUsage', () => {
    it('should update resource usage', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });
      const resourceUsage: ResourceUsage = { cpu: 75.5, memory: 512.3 };

      // Act
      repository.updateResourceUsage(log.id, resourceUsage);

      // Assert
      const updated = repository.findById(log.id);
      expect(updated?.resourceUsage).toEqual(resourceUsage);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('getSummaryByType', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Search executions
      const search1 = repository.create({ 
        executionType: 'search', 
        startTime: now,
        keywordsProcessed: 10,
        resultsFound: 50
      });
      repository.complete(search1.id);
      
      const search2 = repository.create({ executionType: 'search', startTime: now });
      repository.fail(search2.id);
      
      // Creator support
      const cs1 = repository.create({ 
        executionType: 'creator_support', 
        startTime: now,
        creatorsVisited: 5
      });
      repository.complete(cs1.id);
    });

    it('should return summary for each execution type', () => {
      // Act
      const summary = repository.getSummaryByType();

      // Assert
      expect(summary.search).toBeDefined();
      expect(summary.creator_support).toBeDefined();
      expect(summary.scheduled).toBeDefined();
    });

    it('should count executions by status', () => {
      // Act
      const summary = repository.getSummaryByType();

      // Assert
      expect(summary.search.totalExecutions).toBe(2);
      expect(summary.search.completedCount).toBe(1);
      expect(summary.search.failedCount).toBe(1);
    });

    it('should return zeros for types with no executions', () => {
      // Act
      const summary = repository.getSummaryByType();

      // Assert
      expect(summary.scheduled.totalExecutions).toBe(0);
      expect(summary.scheduled.completedCount).toBe(0);
    });
  });

  describe('getHourlyCounts', () => {
    it('should return hourly counts', () => {
      // Arrange
      const now = getUnixTimestamp();
      for (let i = 0; i < 10; i++) {
        repository.create({
          executionType: 'search',
          startTime: now - i * 1800
        });
      }

      // Act
      const counts = repository.getHourlyCounts(24);

      // Assert
      expect(Array.isArray(counts)).toBe(true);
      expect(counts.length).toBeGreaterThan(0);
      expect(counts[0]).toHaveProperty('hour');
      expect(counts[0]).toHaveProperty('count');
    });
  });

  describe('getSuccessRate', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // 8 completed, 2 failed
      for (let i = 0; i < 8; i++) {
        const log = repository.create({ executionType: 'search', startTime: now - i });
        repository.complete(log.id);
      }
      for (let i = 0; i < 2; i++) {
        const log = repository.create({ executionType: 'search', startTime: now - 10 - i });
        repository.fail(log.id);
      }
    });

    it('should calculate success rate', () => {
      // Act
      const rate = repository.getSuccessRate(24);

      // Assert
      expect(rate).toBe(80); // 8/10 * 100
    });

    it('should exclude running executions', () => {
      // Arrange - Add running execution
      repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const rate = repository.getSuccessRate(24);

      // Assert - Should still be 80% (running not counted)
      expect(rate).toBe(80);
    });

    it('should return 100 for empty period', () => {
      // Arrange
      db.prepare('DELETE FROM execution_logs').run();

      // Act
      const rate = repository.getSuccessRate(24);

      // Assert
      expect(rate).toBe(100);
    });
  });

  describe('getAverageDuration', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Create completed executions with known durations
      const log1 = repository.create({ executionType: 'search', startTime: now - 100 });
      repository.update(log1.id, { endTime: now - 50, status: 'completed' }); // 50s duration
      
      const log2 = repository.create({ executionType: 'search', startTime: now - 200 });
      repository.update(log2.id, { endTime: now - 100, status: 'completed' }); // 100s duration
    });

    it('should calculate average duration', () => {
      // Act
      const avgDuration = repository.getAverageDuration();

      // Assert
      expect(avgDuration).toBe(75); // (50 + 100) / 2
    });

    it('should filter by execution type', () => {
      // Arrange - Add creator_support execution
      const now = getUnixTimestamp();
      const log = repository.create({ executionType: 'creator_support', startTime: now - 300 });
      repository.update(log.id, { endTime: now, status: 'completed' }); // 300s duration

      // Act
      const searchAvg = repository.getAverageDuration('search');
      const csAvg = repository.getAverageDuration('creator_support');

      // Assert
      expect(searchAvg).toBe(75);
      expect(csAvg).toBe(300);
    });

    it('should return 0 for no completed executions', () => {
      // Arrange
      db.prepare('DELETE FROM execution_logs').run();

      // Act
      const avgDuration = repository.getAverageDuration();

      // Assert
      expect(avgDuration).toBe(0);
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================
  describe('cleanup', () => {
    it('should delete logs older than retention period', () => {
      // Arrange
      const now = getUnixTimestamp();
      const recentLog = repository.create({ executionType: 'search', startTime: now });
      repository.complete(recentLog.id);
      
      const oldLog = repository.create({ executionType: 'search', startTime: now - 40 * 24 * 3600 });
      repository.complete(oldLog.id);

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(1);
      expect(repository.findById(recentLog.id)).not.toBeNull();
      expect(repository.findById(oldLog.id)).toBeNull();
    });

    it('should not delete running executions', () => {
      // Arrange
      const now = getUnixTimestamp();
      repository.create({ executionType: 'search', startTime: now - 40 * 24 * 3600 }); // Old but running

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(0);
    });

    it('should use default retention of 30 days', () => {
      // Arrange
      const now = getUnixTimestamp();
      const log = repository.create({ executionType: 'search', startTime: now - 35 * 24 * 3600 });
      repository.complete(log.id);

      // Act
      const deleted = repository.cleanup();

      // Assert
      expect(deleted).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete execution log by ID', () => {
      // Arrange
      const log = repository.create({ executionType: 'search', startTime: new Date() });

      // Act
      const result = repository.delete(log.id);

      // Assert
      expect(result).toBe(true);
      expect(repository.findById(log.id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.delete(999999);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle large keyword/result counts', () => {
      // Arrange
      const log = repository.create({
        executionType: 'search',
        startTime: new Date(),
        keywordsProcessed: 1000000,
        resultsFound: 5000000
      });

      // Assert
      expect(log.keywordsProcessed).toBe(1000000);
      expect(log.resultsFound).toBe(5000000);
    });

    it('should handle complex error details', () => {
      // Arrange
      const errorDetails = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() - i * 1000,
        message: `Error ${i}: Something went wrong with unicode: 日本語`,
        code: `ERR_${i}`
      }));

      const log = repository.create({
        executionType: 'search',
        startTime: new Date(),
        errorDetails
      });

      // Assert
      expect(log.errorDetails).toHaveLength(100);
    });

    it('should handle all execution types', () => {
      const types: ExecutionType[] = ['search', 'creator_support', 'scheduled'];
      
      for (const type of types) {
        const log = repository.create({ executionType: type, startTime: new Date() });
        expect(log.executionType).toBe(type);
      }
    });

    it('should handle all execution statuses', () => {
      const log = repository.create({ executionType: 'search', startTime: new Date() });
      const statuses: ExecutionStatus[] = ['running', 'completed', 'failed', 'cancelled'];
      
      for (const status of statuses) {
        repository.update(log.id, { status });
        const updated = repository.findById(log.id);
        expect(updated?.status).toBe(status);
      }
    });
  });
});
