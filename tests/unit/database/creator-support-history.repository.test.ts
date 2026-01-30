/**
 * CreatorSupportHistoryRepository Unit Tests
 * Tests for creator support tracking, action history, statistics
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { CreatorSupportHistoryRepository } from '../../../electron/database/repositories/creator-support-history.repository';
import type {
  CreateCreatorSupportHistoryInput,
  CreatorSupportActionType
} from '../../../electron/database/migrations/types';
import {
  createTestDatabase,
  seedTestCreators,
  DEFAULT_TEST_CREATORS,
  getUnixTimestamp,
  getTimestampHoursAgo
} from './test-helpers';

describe('CreatorSupportHistoryRepository', () => {
  let db: Database.Database;
  let repository: CreatorSupportHistoryRepository;
  let creatorIds: number[];

  beforeEach(() => {
    // Arrange: Create fresh in-memory database for each test
    db = createTestDatabase();
    repository = new CreatorSupportHistoryRepository(db);
    // Seed test creators and get their IDs
    creatorIds = seedTestCreators(db, DEFAULT_TEST_CREATORS);
  });

  afterEach(() => {
    // Cleanup: Close database connection
    db.close();
  });

  // ============================================================
  // CREATE OPERATIONS TESTS
  // ============================================================
  describe('create', () => {
    it('should create a new support history record', () => {
      // Arrange
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'click',
        targetUrl: 'https://youtube.com/watch?v=123',
        timestamp: new Date(),
        success: true
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.creatorId).toBe(creatorIds[0]);
      expect(result.actionType).toBe('click');
      expect(result.targetUrl).toBe('https://youtube.com/watch?v=123');
      expect(result.success).toBe(true);
    });

    it('should handle Date timestamp', () => {
      // Arrange
      const now = new Date();
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'visit',
        timestamp: now
      };

      // Act
      const result = repository.create(input);

      // Assert - Unix timestamp precision (seconds), allow 2 second tolerance
      const diffSeconds = Math.abs(result.timestamp.getTime() - now.getTime()) / 1000;
      expect(diffSeconds).toBeLessThan(2);
    });

    it('should handle Unix timestamp', () => {
      // Arrange
      const unixTime = getUnixTimestamp();
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'scroll',
        timestamp: unixTime
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(Math.floor(result.timestamp.getTime() / 1000)).toBe(unixTime);
    });

    it('should store metadata as JSON', () => {
      // Arrange
      const metadata = { duration: 30, scrollDepth: 75, deviceType: 'desktop' };
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'scroll',
        timestamp: new Date(),
        metadata
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });

    it('should store error message for failed actions', () => {
      // Arrange
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'click',
        timestamp: new Date(),
        success: false,
        errorMessage: 'Element not found'
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Element not found');
    });

    it('should default success to true', () => {
      // Arrange
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'visit',
        timestamp: new Date()
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should store session and proxy IDs', () => {
      // Arrange
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'click',
        timestamp: new Date(),
        sessionId: 'session-123',
        proxyId: 456
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.sessionId).toBe('session-123');
      expect(result.proxyId).toBe(456);
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findById', () => {
    it('should find record by ID', () => {
      // Arrange
      const created = repository.create({
        creatorId: creatorIds[0],
        actionType: 'click',
        timestamp: new Date()
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

  describe('findByCreatorId', () => {
    beforeEach(() => {
      // Seed history for multiple creators
      const now = getUnixTimestamp();
      for (let i = 0; i < 5; i++) {
        repository.create({
          creatorId: creatorIds[0],
          actionType: 'click',
          timestamp: now - i * 60
        });
      }
      for (let i = 0; i < 3; i++) {
        repository.create({
          creatorId: creatorIds[1],
          actionType: 'visit',
          timestamp: now - i * 60
        });
      }
    });

    it('should find records by creator ID', () => {
      // Act
      const records = repository.findByCreatorId(creatorIds[0]);

      // Assert
      expect(records).toHaveLength(5);
      expect(records.every(r => r.creatorId === creatorIds[0])).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Act
      const records = repository.findByCreatorId(creatorIds[0], 3);

      // Assert
      expect(records).toHaveLength(3);
    });

    it('should order by timestamp DESC', () => {
      // Act
      const records = repository.findByCreatorId(creatorIds[0]);

      // Assert
      for (let i = 1; i < records.length; i++) {
        expect(records[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(records[i].timestamp.getTime());
      }
    });

    it('should return empty array for creator with no history', () => {
      // Act
      const records = repository.findByCreatorId(creatorIds[2]); // Disabled creator

      // Assert
      expect(records).toHaveLength(0);
    });
  });

  describe('findBySessionId', () => {
    beforeEach(() => {
      repository.create({
        creatorId: creatorIds[0],
        actionType: 'click',
        timestamp: new Date(),
        sessionId: 'session-abc'
      });
      repository.create({
        creatorId: creatorIds[0],
        actionType: 'scroll',
        timestamp: new Date(),
        sessionId: 'session-abc'
      });
      repository.create({
        creatorId: creatorIds[1],
        actionType: 'visit',
        timestamp: new Date(),
        sessionId: 'session-xyz'
      });
    });

    it('should find records by session ID', () => {
      // Act
      const records = repository.findBySessionId('session-abc');

      // Assert
      expect(records).toHaveLength(2);
      expect(records.every(r => r.sessionId === 'session-abc')).toBe(true);
    });

    it('should return empty array for non-existent session', () => {
      // Act
      const records = repository.findBySessionId('non-existent');

      // Assert
      expect(records).toHaveLength(0);
    });
  });

  describe('findByTimeRange', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Create records at different times
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 3600 }); // 1 hour ago
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 7200 }); // 2 hours ago
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 86400 }); // 24 hours ago
    });

    it('should find records within time range', () => {
      // Arrange
      const endTime = new Date();
      const startTime = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago

      // Act
      const records = repository.findByTimeRange(startTime, endTime);

      // Assert
      expect(records).toHaveLength(2);
    });

    it('should return empty for range with no records', () => {
      // Arrange
      const startTime = new Date(Date.now() - 100000 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() - 99999 * 60 * 60 * 1000);

      // Act
      const records = repository.findByTimeRange(startTime, endTime);

      // Assert
      expect(records).toHaveLength(0);
    });
  });

  describe('findByActionType', () => {
    beforeEach(() => {
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: new Date() });
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: new Date() });
      repository.create({ creatorId: creatorIds[0], actionType: 'scroll', timestamp: new Date() });
      repository.create({ creatorId: creatorIds[0], actionType: 'visit', timestamp: new Date() });
    });

    it('should find records by action type', () => {
      // Act
      const clicks = repository.findByActionType('click');

      // Assert
      expect(clicks).toHaveLength(2);
      expect(clicks.every(r => r.actionType === 'click')).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Act
      const clicks = repository.findByActionType('click', 1);

      // Assert
      expect(clicks).toHaveLength(1);
    });
  });

  describe('findRecent', () => {
    beforeEach(() => {
      for (let i = 0; i < 150; i++) {
        repository.create({
          creatorId: creatorIds[0],
          actionType: 'click',
          timestamp: getUnixTimestamp() - i
        });
      }
    });

    it('should return most recent records', () => {
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

    it('should order by timestamp DESC', () => {
      // Act
      const recent = repository.findRecent(10);

      // Assert
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(recent[i].timestamp.getTime());
      }
    });
  });

  describe('findFailed', () => {
    beforeEach(() => {
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: new Date(), success: true });
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: new Date(), success: false, errorMessage: 'Error 1' });
      repository.create({ creatorId: creatorIds[0], actionType: 'scroll', timestamp: new Date(), success: false, errorMessage: 'Error 2' });
    });

    it('should find only failed records', () => {
      // Act
      const failed = repository.findFailed();

      // Assert
      expect(failed).toHaveLength(2);
      expect(failed.every(r => r.success === false)).toBe(true);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('getCreatorStats', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Create varied actions for creator
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now, success: true });
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 60, success: true });
      repository.create({ creatorId: creatorIds[0], actionType: 'scroll', timestamp: now - 120, success: true });
      repository.create({ creatorId: creatorIds[0], actionType: 'visit', timestamp: now - 180, success: false });
    });

    it('should return total actions count', () => {
      // Act
      const stats = repository.getCreatorStats(creatorIds[0]);

      // Assert
      expect(stats.totalActions).toBe(4);
    });

    it('should return successful and failed counts', () => {
      // Act
      const stats = repository.getCreatorStats(creatorIds[0]);

      // Assert
      expect(stats.successfulActions).toBe(3);
      expect(stats.failedActions).toBe(1);
    });

    it('should return counts by action type', () => {
      // Act
      const stats = repository.getCreatorStats(creatorIds[0]);

      // Assert
      expect(stats.totalClicks).toBe(2);
      expect(stats.totalScrolls).toBe(1);
      expect(stats.totalVisits).toBe(1);
    });

    it('should return last action timestamp', () => {
      // Act
      const stats = repository.getCreatorStats(creatorIds[0]);

      // Assert
      expect(stats.lastActionTimestamp).toBeInstanceOf(Date);
    });

    it('should return zeros for creator with no history', () => {
      // Act
      const stats = repository.getCreatorStats(creatorIds[2]);

      // Assert
      expect(stats.totalActions).toBe(0);
      expect(stats.successfulActions).toBe(0);
      expect(stats.failedActions).toBe(0);
    });
  });

  describe('getActionCountsByType', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Recent actions (within 24 hours)
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now });
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 3600 });
      repository.create({ creatorId: creatorIds[0], actionType: 'scroll', timestamp: now - 7200 });
      // Old action (outside 24 hours)
      repository.create({ creatorId: creatorIds[0], actionType: 'visit', timestamp: now - 100000 });
    });

    it('should return counts by type for time period', () => {
      // Act
      const counts = repository.getActionCountsByType(24);

      // Assert
      expect(counts.click).toBe(2);
      expect(counts.scroll).toBe(1);
      expect(counts.visit).toBe(0); // Outside 24h window
    });

    it('should use default of 24 hours', () => {
      // Act
      const counts = repository.getActionCountsByType();

      // Assert
      expect(counts.click).toBe(2);
    });
  });

  describe('getHourlyCounts', () => {
    it('should return hourly counts for charting', () => {
      // Arrange
      const now = getUnixTimestamp();
      for (let i = 0; i < 10; i++) {
        repository.create({
          creatorId: creatorIds[0],
          actionType: 'click',
          timestamp: now - i * 1800 // Every 30 minutes
        });
      }

      // Act
      const hourlyCounts = repository.getHourlyCounts(24);

      // Assert
      expect(Array.isArray(hourlyCounts)).toBe(true);
      expect(hourlyCounts.length).toBeGreaterThan(0);
      expect(hourlyCounts[0]).toHaveProperty('hour');
      expect(hourlyCounts[0]).toHaveProperty('count');
    });
  });

  describe('getSuccessRate', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // 8 successful, 2 failed
      for (let i = 0; i < 8; i++) {
        repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - i, success: true });
      }
      for (let i = 0; i < 2; i++) {
        repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 10 - i, success: false });
      }
    });

    it('should calculate success rate', () => {
      // Act
      const rate = repository.getSuccessRate(24);

      // Assert
      expect(rate).toBe(80); // 8/10 * 100
    });

    it('should return 100 for empty period', () => {
      // Arrange
      db.prepare('DELETE FROM creator_support_history').run();

      // Act
      const rate = repository.getSuccessRate(24);

      // Assert
      expect(rate).toBe(100);
    });
  });

  describe('getMostActiveCreators', () => {
    beforeEach(() => {
      const now = getUnixTimestamp();
      // Creator 0: 10 actions
      for (let i = 0; i < 10; i++) {
        repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - i });
      }
      // Creator 1: 5 actions
      for (let i = 0; i < 5; i++) {
        repository.create({ creatorId: creatorIds[1], actionType: 'visit', timestamp: now - i });
      }
    });

    it('should return most active creators ordered by action count', () => {
      // Act
      const active = repository.getMostActiveCreators(10, 24);

      // Assert
      expect(active).toHaveLength(2);
      // Field is returned as action_count from SQL
      expect((active[0] as any).action_count).toBeGreaterThan((active[1] as any).action_count);
    });

    it('should respect limit parameter', () => {
      // Act
      const active = repository.getMostActiveCreators(1, 24);

      // Assert
      expect(active).toHaveLength(1);
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================
  describe('cleanup', () => {
    it('should delete records older than retention period', () => {
      // Arrange
      const now = getUnixTimestamp();
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now }); // Recent
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 40 * 24 * 3600 }); // 40 days old

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(1);
      expect(repository.findRecent()).toHaveLength(1);
    });

    it('should use default retention of 30 days', () => {
      // Arrange
      const now = getUnixTimestamp();
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: now - 35 * 24 * 3600 });

      // Act
      const deleted = repository.cleanup();

      // Assert
      expect(deleted).toBe(1);
    });
  });

  describe('deleteByCreatorId', () => {
    beforeEach(() => {
      repository.create({ creatorId: creatorIds[0], actionType: 'click', timestamp: new Date() });
      repository.create({ creatorId: creatorIds[0], actionType: 'scroll', timestamp: new Date() });
      repository.create({ creatorId: creatorIds[1], actionType: 'visit', timestamp: new Date() });
    });

    it('should delete all records for a creator', () => {
      // Act
      const deleted = repository.deleteByCreatorId(creatorIds[0]);

      // Assert
      expect(deleted).toBe(2);
      expect(repository.findByCreatorId(creatorIds[0])).toHaveLength(0);
    });

    it('should not affect other creators', () => {
      // Act
      repository.deleteByCreatorId(creatorIds[0]);

      // Assert
      expect(repository.findByCreatorId(creatorIds[1])).toHaveLength(1);
    });
  });

  // ============================================================
  // BATCH OPERATIONS TESTS
  // ============================================================
  describe('batchCreate', () => {
    it('should create multiple records in transaction', () => {
      // Arrange
      const inputs: CreateCreatorSupportHistoryInput[] = [
        { creatorId: creatorIds[0], actionType: 'click', timestamp: new Date() },
        { creatorId: creatorIds[0], actionType: 'scroll', timestamp: new Date() },
        { creatorId: creatorIds[0], actionType: 'visit', timestamp: new Date() }
      ];

      // Act
      const count = repository.batchCreate(inputs);

      // Assert
      expect(count).toBe(3);
      expect(repository.findByCreatorId(creatorIds[0])).toHaveLength(3);
    });

    it('should handle empty array', () => {
      // Act
      const count = repository.batchCreate([]);

      // Assert
      expect(count).toBe(0);
    });

    it('should store all fields correctly in batch', () => {
      // Arrange
      const inputs: CreateCreatorSupportHistoryInput[] = [
        {
          creatorId: creatorIds[0],
          actionType: 'click',
          timestamp: new Date(),
          targetUrl: 'https://example.com',
          sessionId: 'session-1',
          success: true,
          metadata: { key: 'value' }
        }
      ];

      // Act
      repository.batchCreate(inputs);

      // Assert
      const records = repository.findByCreatorId(creatorIds[0]);
      expect(records[0].targetUrl).toBe('https://example.com');
      expect(records[0].sessionId).toBe('session-1');
      expect(records[0].metadata).toEqual({ key: 'value' });
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle very long URLs', () => {
      // Arrange
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'visit',
        timestamp: new Date(),
        targetUrl: longUrl
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.targetUrl).toBe(longUrl);
    });

    it('should handle special characters in error message', () => {
      // Arrange
      const errorMessage = "Error: Can't find element <div class=\"test\"> with 'quotes'";
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'click',
        timestamp: new Date(),
        success: false,
        errorMessage
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.errorMessage).toBe(errorMessage);
    });

    it('should handle complex metadata objects', () => {
      // Arrange
      const metadata = {
        nested: {
          deeply: {
            value: 'test'
          }
        },
        array: [1, 2, 3],
        unicode: '日本語テスト'
      };
      const input: CreateCreatorSupportHistoryInput = {
        creatorId: creatorIds[0],
        actionType: 'scroll',
        timestamp: new Date(),
        metadata
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });
  });
});
