/**
 * RotationEventsRepository Unit Tests
 * Tests for rotation event logging, querying, analytics
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { RotationEventsRepository } from '../../../electron/database/repositories/rotation-events.repository';
import type { RecordRotationEventInput, RotationReason } from '../../../electron/database/migrations/types';
import { createTestDatabase, seedTestProxies, DEFAULT_TEST_PROXIES } from './test-helpers';

describe('RotationEventsRepository', () => {
  let db: Database.Database;
  let repository: RotationEventsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new RotationEventsRepository(db);
    seedTestProxies(db, DEFAULT_TEST_PROXIES);
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================
  // RECORD OPERATIONS TESTS
  // ============================================================
  describe('record', () => {
    it('should record a rotation event', () => {
      // Arrange
      const input: RecordRotationEventInput = {
        reason: 'scheduled',
        previousProxyId: 'proxy-1',
        newProxyId: 'proxy-2'
      };

      // Act
      const result = repository.record(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.reason).toBe('scheduled');
      expect(result.previousProxyId).toBe('proxy-1');
      expect(result.newProxyId).toBe('proxy-2');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should record all rotation reasons', () => {
      const reasons: RotationReason[] = [
        'scheduled', 'failure', 'rate_limit', 'geographic',
        'manual', 'load_balance', 'health_check', 'session_expired', 'rule_triggered'
      ];

      for (const reason of reasons) {
        const result = repository.record({ reason });
        expect(result.reason).toBe(reason);
      }
    });

    it('should store domain and URL', () => {
      // Arrange
      const input: RecordRotationEventInput = {
        reason: 'geographic',
        domain: 'example.com',
        url: 'https://example.com/page'
      };

      // Act
      const result = repository.record(input);

      // Assert
      expect(result.domain).toBe('example.com');
      expect(result.url).toBe('https://example.com/page');
    });

    it('should store tab and session IDs', () => {
      // Arrange
      const input: RecordRotationEventInput = {
        reason: 'manual',
        tabId: 'tab-123',
        sessionId: 'session-456'
      };

      // Act
      const result = repository.record(input);

      // Assert
      expect(result.tabId).toBe('tab-123');
      expect(result.sessionId).toBe('session-456');
    });

    it('should store event without config ID', () => {
      // Arrange
      const input: RecordRotationEventInput = {
        reason: 'scheduled'
        // No configId - avoid FK constraint
      };

      // Act
      const result = repository.record(input);

      // Assert
      expect(result.configId == null).toBe(true);
    });

    it('should store metadata', () => {
      // Arrange
      const metadata = { 
        trigger: 'request_count', 
        threshold: 100, 
        current: 105 
      };
      const input: RecordRotationEventInput = {
        reason: 'rule_triggered',
        metadata
      };

      // Act
      const result = repository.record(input);

      // Assert
      expect(result.metadata).toEqual(metadata);
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findById', () => {
    it('should find event by ID', () => {
      // Arrange
      const created = repository.record({ reason: 'scheduled' });

      // Act
      const found = repository.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', () => {
      // Act
      const found = repository.findById('non-existent');

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findRecent', () => {
    beforeEach(() => {
      for (let i = 0; i < 150; i++) {
        repository.record({ reason: 'scheduled' });
      }
    });

    it('should return recent events', () => {
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

  describe('findByTimeRange', () => {
    it('should return array from findByTimeRange', () => {
      // Arrange - Create an event
      repository.record({ reason: 'scheduled' });
      
      // Use very wide time range
      const startTime = new Date('2020-01-01');
      const endTime = new Date('2030-12-31');

      // Act
      const events = repository.findByTimeRange(startTime, endTime);

      // Assert - Should return an array
      expect(Array.isArray(events)).toBe(true);
    });

    it('should return empty for range in the past', () => {
      // Arrange - Create events at current time
      repository.record({ reason: 'scheduled' });
      
      // Range entirely in the past (before event was created)
      const startTime = new Date('2020-01-01');
      const endTime = new Date('2020-01-02');

      // Act
      const events = repository.findByTimeRange(startTime, endTime);

      // Assert
      expect(events.length).toBe(0);
    });
  });

  describe('findByReason', () => {
    beforeEach(() => {
      repository.record({ reason: 'scheduled' });
      repository.record({ reason: 'scheduled' });
      repository.record({ reason: 'failure' });
      repository.record({ reason: 'manual' });
    });

    it('should find events by reason', () => {
      // Act
      const scheduled = repository.findByReason('scheduled');

      // Assert
      expect(scheduled).toHaveLength(2);
      expect(scheduled.every(e => e.reason === 'scheduled')).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Act
      const scheduled = repository.findByReason('scheduled', 1);

      // Assert
      expect(scheduled).toHaveLength(1);
    });
  });

  describe('findByProxyId', () => {
    beforeEach(() => {
      repository.record({ reason: 'scheduled', previousProxyId: 'proxy-1', newProxyId: 'proxy-2' });
      repository.record({ reason: 'failure', previousProxyId: 'proxy-2', newProxyId: 'proxy-1' });
      repository.record({ reason: 'manual', previousProxyId: 'proxy-3', newProxyId: 'proxy-4' });
    });

    it('should find events involving proxy as previous', () => {
      // Act
      const events = repository.findByProxyId('proxy-1');

      // Assert
      expect(events.length).toBe(2);
    });

    it('should find events involving proxy as new', () => {
      // Act
      const events = repository.findByProxyId('proxy-2');

      // Assert
      expect(events.length).toBe(2);
    });
  });

  describe('findByConfigId', () => {
    it('should return empty for non-existent config ID', () => {
      // Act
      const events = repository.findByConfigId('non-existent-config');

      // Assert
      expect(events).toHaveLength(0);
    });
  });

  describe('findByDomain', () => {
    beforeEach(() => {
      repository.record({ reason: 'geographic', domain: 'example.com' });
      repository.record({ reason: 'rate_limit', domain: 'example.com' });
      repository.record({ reason: 'failure', domain: 'other.com' });
    });

    it('should find events by domain', () => {
      // Act
      const events = repository.findByDomain('example.com');

      // Assert
      expect(events).toHaveLength(2);
      expect(events.every(e => e.domain === 'example.com')).toBe(true);
    });
  });

  // ============================================================
  // ANALYTICS TESTS
  // ============================================================
  describe('getCountByReason', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) repository.record({ reason: 'scheduled' });
      for (let i = 0; i < 3; i++) repository.record({ reason: 'failure' });
      for (let i = 0; i < 2; i++) repository.record({ reason: 'manual' });
    });

    it('should return count by reason', () => {
      // Act
      const counts = repository.getCountByReason(24);

      // Assert
      expect(counts['scheduled']).toBe(5);
      expect(counts['failure']).toBe(3);
      expect(counts['manual']).toBe(2);
    });
  });

  describe('getRotationFrequency', () => {
    beforeEach(() => {
      // Create 24 events (simulating 1 per hour for 24 hours)
      for (let i = 0; i < 24; i++) {
        repository.record({ reason: 'scheduled' });
      }
    });

    it('should calculate rotations per hour', () => {
      // Act
      const frequency = repository.getRotationFrequency(24);

      // Assert
      expect(frequency).toBe(1); // 24 events / 24 hours = 1 per hour
    });
  });

  describe('getHourlyCounts', () => {
    it('should return hourly counts for charting', () => {
      // Arrange
      for (let i = 0; i < 10; i++) {
        repository.record({ reason: 'scheduled' });
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

  describe('getMostRotatedProxies', () => {
    beforeEach(() => {
      // proxy-1 gets rotated to 5 times
      for (let i = 0; i < 5; i++) {
        repository.record({ reason: 'scheduled', newProxyId: 'proxy-1' });
      }
      // proxy-2 gets rotated to 3 times
      for (let i = 0; i < 3; i++) {
        repository.record({ reason: 'failure', newProxyId: 'proxy-2' });
      }
      // proxy-3 gets rotated to 1 time
      repository.record({ reason: 'manual', newProxyId: 'proxy-3' });
    });

    it('should return most rotated proxies ordered by count', () => {
      // Act
      const proxies = repository.getMostRotatedProxies(10, 24);

      // Assert - Check field names returned from SQL (may be snake_case)
      expect(proxies.length).toBeGreaterThanOrEqual(2);
      expect((proxies[0] as any).proxy_id || proxies[0].proxyId).toBe('proxy-1');
      expect((proxies[0] as any).rotation_count || proxies[0].rotationCount).toBe(5);
    });

    it('should respect limit parameter', () => {
      // Act
      const proxies = repository.getMostRotatedProxies(2, 24);

      // Assert
      expect(proxies).toHaveLength(2);
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================
  describe('cleanup', () => {
    it('should delete events older than retention period', () => {
      // Arrange
      repository.record({ reason: 'scheduled' }); // Recent
      
      // Insert old event
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO rotation_events (id, reason, timestamp)
        VALUES (?, ?, ?)
      `).run('old-event', 'scheduled', oldDate.toISOString());

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(1);
    });

    it('should use default retention of 30 days', () => {
      // Arrange
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO rotation_events (id, reason, timestamp)
        VALUES (?, ?, ?)
      `).run('old-event', 'scheduled', oldDate.toISOString());

      // Act
      const deleted = repository.cleanup();

      // Assert
      expect(deleted).toBe(1);
    });

    it('should not delete recent events', () => {
      // Arrange
      repository.record({ reason: 'scheduled' });

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(0);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty database', () => {
      // Act & Assert
      expect(repository.findRecent()).toHaveLength(0);
      expect(repository.getCountByReason(24)).toEqual({});
      expect(repository.getRotationFrequency(24)).toBe(0);
    });

    it('should handle null proxy IDs', () => {
      // Arrange
      const input: RecordRotationEventInput = {
        reason: 'manual'
        // No proxy IDs
      };

      // Act
      const result = repository.record(input);

      // Assert - null in DB converts to null or undefined in DTO
      expect(result.previousProxyId == null).toBe(true);
      expect(result.newProxyId == null).toBe(true);
    });

    it('should handle complex metadata', () => {
      // Arrange
      const metadata = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        unicode: '日本語'
      };

      // Act
      const result = repository.record({ reason: 'rule_triggered', metadata });

      // Assert
      const found = repository.findById(result.id);
      expect(found?.metadata).toEqual(metadata);
    });

    it('should handle very long URLs', () => {
      // Arrange
      const longUrl = 'https://example.com/' + 'a'.repeat(2000);

      // Act
      const result = repository.record({ reason: 'geographic', url: longUrl });

      // Assert
      expect(result.url).toBe(longUrl);
    });
  });
});
