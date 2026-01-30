/**
 * ProxyUsageStatsRepository Unit Tests
 * Tests for usage tracking, analytics, time-series data
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ProxyUsageStatsRepository } from '../../../electron/database/repositories/proxy-usage-stats.repository';
import { createTestDatabase, seedTestProxies, DEFAULT_TEST_PROXIES } from './test-helpers';

describe('ProxyUsageStatsRepository', () => {
  let db: Database.Database;
  let repository: ProxyUsageStatsRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new ProxyUsageStatsRepository(db);
    seedTestProxies(db, DEFAULT_TEST_PROXIES);
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================
  // RECORD USAGE TESTS
  // ============================================================
  describe('recordUsage', () => {
    it('should create new stats record for proxy', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', {
        requests: 10,
        successful: 8,
        failed: 2
      });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats).toHaveLength(1);
      expect(stats[0].totalRequests).toBe(10);
      expect(stats[0].successfulRequests).toBe(8);
      expect(stats[0].failedRequests).toBe(2);
    });

    it('should accumulate stats in same time bucket', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', { requests: 5, successful: 4, failed: 1 });
      repository.recordUsage('proxy-1', { requests: 5, successful: 5, failed: 0 });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats).toHaveLength(1);
      expect(stats[0].totalRequests).toBe(10);
      expect(stats[0].successfulRequests).toBe(9);
      expect(stats[0].failedRequests).toBe(1);
    });

    it('should track latency statistics', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', { requests: 1, latencyMs: 100 });
      repository.recordUsage('proxy-1', { requests: 1, latencyMs: 200 });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].minLatencyMs).toBe(100);
      expect(stats[0].maxLatencyMs).toBe(200);
    });

    it('should track bytes sent and received', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', { bytesSent: 1000, bytesReceived: 5000 });
      repository.recordUsage('proxy-1', { bytesSent: 500, bytesReceived: 2000 });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].bytesSent).toBe(1500);
      expect(stats[0].bytesReceived).toBe(7000);
    });

    it('should track error counts by type', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', {
        error: { type: 'timeout', message: 'Request timed out' }
      });
      repository.recordUsage('proxy-1', {
        error: { type: 'timeout', message: 'Another timeout' }
      });
      repository.recordUsage('proxy-1', {
        error: { type: 'connection', message: 'Connection refused' }
      });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].errorCounts).toEqual({
        timeout: 2,
        connection: 1
      });
    });

    it('should store last error message', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', {
        error: { type: 'timeout', message: 'First error' }
      });
      repository.recordUsage('proxy-1', {
        error: { type: 'connection', message: 'Last error' }
      });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].lastError).toBe('Last error');
      expect(stats[0].lastErrorAt).toBeInstanceOf(Date);
    });

    it('should track target countries', () => {
      // Arrange & Act
      repository.recordUsage('proxy-1', { country: 'US' });
      repository.recordUsage('proxy-1', { country: 'UK' });
      repository.recordUsage('proxy-1', { country: 'US' }); // Duplicate

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].targetCountries).toContain('US');
      expect(stats[0].targetCountries).toContain('UK');
      expect(stats[0].targetCountries).toHaveLength(2); // No duplicates
    });
  });

  describe('recordRotation', () => {
    it('should increment rotation count', () => {
      // Arrange & Act
      repository.recordRotation('proxy-1', 'scheduled');
      repository.recordRotation('proxy-1', 'failure');
      repository.recordRotation('proxy-1', 'scheduled');

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].rotationCount).toBe(3);
    });

    it('should track rotation reasons', () => {
      // Arrange & Act
      repository.recordRotation('proxy-1', 'scheduled');
      repository.recordRotation('proxy-1', 'failure');

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].rotationReasons).toContain('scheduled');
      expect(stats[0].rotationReasons).toContain('failure');
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findByProxyId', () => {
    beforeEach(() => {
      repository.recordUsage('proxy-1', { requests: 10 });
      repository.recordUsage('proxy-2', { requests: 20 });
    });

    it('should find stats by proxy ID', () => {
      // Act
      const stats = repository.findByProxyId('proxy-1');

      // Assert
      expect(stats).toHaveLength(1);
      expect(stats[0].proxyId).toBe('proxy-1');
    });

    it('should filter by time range', () => {
      // Arrange
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Act
      const stats = repository.findByProxyId('proxy-1', {
        startTime: oneHourAgo,
        endTime: now
      });

      // Assert
      expect(stats).toHaveLength(1);
    });

    it('should respect limit parameter', () => {
      // Arrange - Create multiple time buckets by manipulating DB
      const now = new Date();
      for (let i = 1; i <= 5; i++) {
        const bucket = new Date(now.getTime() - i * 60 * 60 * 1000);
        db.prepare(`
          INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, total_requests)
          VALUES (?, ?, ?, ?)
        `).run(`stat-${i}`, 'proxy-1', bucket.toISOString(), i * 10);
      }

      // Act
      const stats = repository.findByProxyId('proxy-1', { limit: 3 });

      // Assert
      expect(stats).toHaveLength(3);
    });

    it('should order by time_bucket DESC', () => {
      // Arrange - Create multiple time buckets
      const now = new Date();
      for (let i = 1; i <= 3; i++) {
        const bucket = new Date(now.getTime() - i * 60 * 60 * 1000);
        db.prepare(`
          INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, total_requests)
          VALUES (?, ?, ?, ?)
        `).run(`stat-${i}`, 'proxy-test', bucket.toISOString(), i * 10);
      }

      // Act
      const stats = repository.findByProxyId('proxy-test');

      // Assert
      for (let i = 1; i < stats.length; i++) {
        expect(stats[i - 1].timeBucket.getTime()).toBeGreaterThanOrEqual(
          stats[i].timeBucket.getTime()
        );
      }
    });
  });

  // ============================================================
  // AGGREGATED STATS TESTS
  // ============================================================
  describe('getAggregatedStats', () => {
    beforeEach(() => {
      repository.recordUsage('proxy-1', {
        requests: 100,
        successful: 90,
        failed: 10,
        latencyMs: 150,
        bytesSent: 10000,
        bytesReceived: 50000
      });
      repository.recordRotation('proxy-1', 'scheduled');
      repository.recordRotation('proxy-1', 'failure');
    });

    it('should return aggregated statistics', () => {
      // Act
      const stats = repository.getAggregatedStats('proxy-1', 24);

      // Assert
      expect(stats.totalRequests).toBe(100);
      expect(stats.successfulRequests).toBe(90);
      expect(stats.failedRequests).toBe(10);
      expect(stats.totalRotations).toBe(2);
    });

    it('should calculate success rate', () => {
      // Act
      const stats = repository.getAggregatedStats('proxy-1', 24);

      // Assert
      expect(stats.successRate).toBe(90); // 90/100 * 100
    });

    it('should aggregate bytes', () => {
      // Act
      const stats = repository.getAggregatedStats('proxy-1', 24);

      // Assert
      expect(stats.totalBytesSent).toBe(10000);
      expect(stats.totalBytesReceived).toBe(50000);
    });

    it('should return zeros for proxy with no stats', () => {
      // Act
      const stats = repository.getAggregatedStats('non-existent', 24);

      // Assert
      expect(stats.totalRequests).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  // ============================================================
  // TIME SERIES TESTS
  // ============================================================
  describe('getTimeSeries', () => {
    beforeEach(() => {
      // Create time series data
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const bucket = new Date(now.getTime() - i * 60 * 60 * 1000);
        db.prepare(`
          INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, total_requests, successful_requests, avg_latency_ms)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(`ts-${i}`, 'proxy-1', bucket.toISOString(), 100 + i * 10, 90 + i * 5, 100 + i * 20);
      }
    });

    it('should return time series data points', () => {
      // Act
      const series = repository.getTimeSeries('proxy-1', 24);

      // Assert
      expect(series.length).toBeGreaterThan(0);
      expect(series[0]).toHaveProperty('timeBucket');
      expect(series[0]).toHaveProperty('requests');
      expect(series[0]).toHaveProperty('successRate');
      expect(series[0]).toHaveProperty('avgLatency');
    });

    it('should order by time bucket ASC', () => {
      // Act
      const series = repository.getTimeSeries('proxy-1', 24);

      // Assert
      for (let i = 1; i < series.length; i++) {
        expect(series[i].timeBucket.getTime()).toBeGreaterThanOrEqual(
          series[i - 1].timeBucket.getTime()
        );
      }
    });
  });

  // ============================================================
  // TOP PROXIES TESTS
  // ============================================================
  describe('getTopProxiesBySuccessRate', () => {
    beforeEach(() => {
      // Proxy 1: 95% success rate
      repository.recordUsage('proxy-1', { requests: 100, successful: 95, failed: 5 });
      // Proxy 2: 80% success rate
      repository.recordUsage('proxy-2', { requests: 100, successful: 80, failed: 20 });
      // Proxy 3: 99% success rate
      repository.recordUsage('proxy-3', { requests: 100, successful: 99, failed: 1 });
    });

    it('should return top proxies by success rate', () => {
      // Act
      const top = repository.getTopProxiesBySuccessRate(10, 24);

      // Assert
      expect(top.length).toBe(3);
      // Field names from SQL may be snake_case
      expect((top[0] as any).proxy_id).toBe('proxy-3'); // 99%
      expect((top[1] as any).proxy_id).toBe('proxy-1'); // 95%
      expect((top[2] as any).proxy_id).toBe('proxy-2'); // 80%
    });

    it('should respect limit parameter', () => {
      // Act
      const top = repository.getTopProxiesBySuccessRate(2, 24);

      // Assert
      expect(top).toHaveLength(2);
    });
  });

  // ============================================================
  // ERROR DISTRIBUTION TESTS
  // ============================================================
  describe('getErrorDistribution', () => {
    beforeEach(() => {
      repository.recordUsage('proxy-1', {
        error: { type: 'timeout', message: 'Timeout' }
      });
      repository.recordUsage('proxy-1', {
        error: { type: 'timeout', message: 'Timeout' }
      });
      repository.recordUsage('proxy-2', {
        error: { type: 'connection', message: 'Connection error' }
      });
      repository.recordUsage('proxy-3', {
        error: { type: 'auth', message: 'Auth failed' }
      });
    });

    it('should return error distribution across all proxies', () => {
      // Act
      const distribution = repository.getErrorDistribution(24);

      // Assert
      expect(distribution['timeout']).toBe(2);
      expect(distribution['connection']).toBe(1);
      expect(distribution['auth']).toBe(1);
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================
  describe('cleanup', () => {
    it('should delete stats older than retention period', () => {
      // Arrange
      repository.recordUsage('proxy-1', { requests: 10 }); // Recent
      
      // Insert old stats
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, total_requests)
        VALUES (?, ?, ?, ?)
      `).run('old-stat', 'proxy-1', oldDate.toISOString(), 100);

      // Act
      const deleted = repository.cleanup(30);

      // Assert
      expect(deleted).toBe(1);
    });

    it('should use default retention of 30 days', () => {
      // Arrange
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      db.prepare(`
        INSERT INTO proxy_usage_stats (id, proxy_id, time_bucket, total_requests)
        VALUES (?, ?, ?, ?)
      `).run('old-stat', 'proxy-1', oldDate.toISOString(), 100);

      // Act
      const deleted = repository.cleanup();

      // Assert
      expect(deleted).toBe(1);
    });

    it('should not delete recent stats', () => {
      // Arrange
      repository.recordUsage('proxy-1', { requests: 10 });

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
      expect(repository.findByProxyId('proxy-1')).toHaveLength(0);
      expect(repository.getAggregatedStats('proxy-1', 24).totalRequests).toBe(0);
      expect(repository.getTimeSeries('proxy-1', 24)).toHaveLength(0);
    });

    it('should handle very large numbers', () => {
      // Arrange
      repository.recordUsage('proxy-1', {
        requests: 1000000,
        successful: 999000,
        failed: 1000,
        bytesSent: Number.MAX_SAFE_INTEGER / 2,
        bytesReceived: Number.MAX_SAFE_INTEGER / 2
      });

      // Assert
      const stats = repository.getAggregatedStats('proxy-1', 24);
      expect(stats.totalRequests).toBe(1000000);
    });

    it('should handle rapid successive updates', () => {
      // Arrange & Act
      for (let i = 0; i < 100; i++) {
        repository.recordUsage('proxy-1', { requests: 1, successful: 1 });
      }

      // Assert
      const stats = repository.getAggregatedStats('proxy-1', 24);
      expect(stats.totalRequests).toBe(100);
    });

    it('should handle special characters in error messages', () => {
      // Arrange
      repository.recordUsage('proxy-1', {
        error: { 
          type: 'custom', 
          message: "Error with 'quotes' and \"double quotes\" and <tags>" 
        }
      });

      // Assert
      const stats = repository.findByProxyId('proxy-1');
      expect(stats[0].lastError).toContain('quotes');
    });
  });
});
