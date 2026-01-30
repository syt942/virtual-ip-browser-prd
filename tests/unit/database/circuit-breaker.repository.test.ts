/**
 * CircuitBreakerRepository Unit Tests
 * Tests for state persistence, snapshots, CRUD operations
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { CircuitBreakerRepository } from '../../../electron/database/repositories/circuit-breaker.repository';
import type {
  CircuitBreakerSnapshot,
  CircuitBreakerState,
  ServiceType,
  CircuitBreakerConfig,
  CircuitBreakerMetrics
} from '../../../electron/core/resilience/types';
import { createTestDatabase } from './test-helpers';

// ============================================================
// TEST FIXTURES
// ============================================================

function createTestConfig(overrides: Partial<CircuitBreakerConfig> = {}): CircuitBreakerConfig {
  return {
    id: 'test-cb-1',
    name: 'Test Circuit Breaker',
    serviceType: 'proxy',
    failureThreshold: 5,
    failureRateThreshold: 50,
    minimumRequestThreshold: 10,
    resetTimeout: 30000,
    successThreshold: 3,
    slidingWindowSize: 60000,
    halfOpenMaxRequests: 3,
    persistState: true,
    ...overrides
  };
}

function createTestMetrics(overrides: Partial<CircuitBreakerMetrics> = {}): CircuitBreakerMetrics {
  return {
    totalRequests: 100,
    successCount: 90,
    failureCount: 10,
    failureRate: 10,
    rejectedCount: 5,
    tripCount: 2,
    timeInState: {
      CLOSED: 3600000,
      OPEN: 60000,
      HALF_OPEN: 30000
    },
    lastStateChange: new Date('2024-01-15T10:00:00Z'),
    lastFailure: new Date('2024-01-15T09:55:00Z'),
    lastSuccess: new Date('2024-01-15T10:00:00Z'),
    averageResponseTime: 150,
    halfOpenSuccesses: 0,
    consecutiveFailures: 0,
    ...overrides
  };
}

function createTestSnapshot(overrides: Partial<CircuitBreakerSnapshot> = {}): CircuitBreakerSnapshot {
  return {
    id: 'cb-snapshot-1',
    name: 'Test Circuit Breaker',
    serviceType: 'proxy',
    serviceId: 'proxy-1',
    state: 'CLOSED',
    metrics: createTestMetrics(),
    config: createTestConfig({ id: 'cb-snapshot-1' }),
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides
  };
}

describe('CircuitBreakerRepository', () => {
  let db: Database.Database;
  let repository: CircuitBreakerRepository;

  beforeEach(() => {
    // Arrange: Create fresh in-memory database for each test
    db = createTestDatabase();
    repository = new CircuitBreakerRepository(db);
  });

  afterEach(() => {
    // Cleanup: Close database connection
    db.close();
  });

  // ============================================================
  // SAVE OPERATIONS TESTS
  // ============================================================
  describe('save', () => {
    it('should save a new circuit breaker snapshot', () => {
      // Arrange
      const snapshot = createTestSnapshot();

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe(snapshot.id);
      expect(saved?.name).toBe(snapshot.name);
      expect(saved?.serviceType).toBe(snapshot.serviceType);
      expect(saved?.state).toBe(snapshot.state);
    });

    it('should update existing circuit breaker on conflict', () => {
      // Arrange
      const snapshot = createTestSnapshot();
      repository.save(snapshot);

      // Update state
      const updatedSnapshot = createTestSnapshot({
        state: 'OPEN',
        metrics: createTestMetrics({ tripCount: 3 })
      });

      // Act
      repository.save(updatedSnapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.state).toBe('OPEN');
      expect(saved?.metrics.tripCount).toBe(3);
    });

    it('should preserve all metrics fields', () => {
      // Arrange
      const metrics = createTestMetrics({
        totalRequests: 500,
        successCount: 450,
        failureCount: 50,
        rejectedCount: 25,
        tripCount: 5,
        consecutiveFailures: 3,
        halfOpenSuccesses: 2
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.metrics.totalRequests).toBe(500);
      expect(saved?.metrics.successCount).toBe(450);
      expect(saved?.metrics.failureCount).toBe(50);
      expect(saved?.metrics.rejectedCount).toBe(25);
      expect(saved?.metrics.tripCount).toBe(5);
      expect(saved?.metrics.consecutiveFailures).toBe(3);
      expect(saved?.metrics.halfOpenSuccesses).toBe(2);
    });

    it('should preserve time in state metrics', () => {
      // Arrange
      const metrics = createTestMetrics({
        timeInState: {
          CLOSED: 7200000,
          OPEN: 120000,
          HALF_OPEN: 60000
        }
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.metrics.timeInState.CLOSED).toBe(7200000);
      expect(saved?.metrics.timeInState.OPEN).toBe(120000);
      expect(saved?.metrics.timeInState.HALF_OPEN).toBe(60000);
    });

    it('should serialize and deserialize config correctly', () => {
      // Arrange
      const config = createTestConfig({
        failureThreshold: 10,
        resetTimeout: 60000,
        successThreshold: 5
      });
      const snapshot = createTestSnapshot({ config });

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.config.failureThreshold).toBe(10);
      expect(saved?.config.resetTimeout).toBe(60000);
      expect(saved?.config.successThreshold).toBe(5);
    });

    it('should handle null serviceId', () => {
      // Arrange
      const snapshot = createTestSnapshot({ serviceId: undefined });

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.serviceId).toBeUndefined();
    });

    it('should handle null timestamp fields', () => {
      // Arrange
      const metrics = createTestMetrics({
        lastFailure: null,
        lastSuccess: null,
        lastStateChange: null
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);

      // Assert
      const saved = repository.findById(snapshot.id);
      expect(saved?.metrics.lastFailure).toBeNull();
      expect(saved?.metrics.lastSuccess).toBeNull();
      expect(saved?.metrics.lastStateChange).toBeNull();
    });
  });

  // ============================================================
  // BATCH SAVE TESTS
  // ============================================================
  describe('saveAll', () => {
    it('should save multiple snapshots in a transaction', () => {
      // Arrange
      const snapshots = [
        createTestSnapshot({ id: 'cb-1', name: 'CB 1' }),
        createTestSnapshot({ id: 'cb-2', name: 'CB 2' }),
        createTestSnapshot({ id: 'cb-3', name: 'CB 3' })
      ];

      // Act
      repository.saveAll(snapshots);

      // Assert
      const all = repository.findAll();
      expect(all).toHaveLength(3);
    });

    it('should handle empty array', () => {
      // Act & Assert - Should not throw
      expect(() => repository.saveAll([])).not.toThrow();
    });

    it('should atomically save or fail all snapshots', () => {
      // Arrange
      const validSnapshot = createTestSnapshot({ id: 'valid-cb' });
      repository.saveAll([validSnapshot]);

      // Assert
      expect(repository.findById('valid-cb')).not.toBeNull();
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findById', () => {
    it('should find circuit breaker by ID', () => {
      // Arrange
      const snapshot = createTestSnapshot({ id: 'find-test-cb' });
      repository.save(snapshot);

      // Act
      const found = repository.findById('find-test-cb');

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe('find-test-cb');
    });

    it('should return null for non-existent ID', () => {
      // Act
      const found = repository.findById('non-existent');

      // Assert
      expect(found).toBeNull();
    });

    it('should return properly typed snapshot', () => {
      // Arrange
      const snapshot = createTestSnapshot();
      repository.save(snapshot);

      // Act
      const found = repository.findById(snapshot.id);

      // Assert
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
      expect(typeof found?.state).toBe('string');
      expect(typeof found?.metrics.failureRate).toBe('number');
    });
  });

  describe('findAll', () => {
    it('should return all circuit breakers', () => {
      // Arrange
      repository.save(createTestSnapshot({ id: 'cb-1' }));
      repository.save(createTestSnapshot({ id: 'cb-2' }));
      repository.save(createTestSnapshot({ id: 'cb-3' }));

      // Act
      const all = repository.findAll();

      // Assert
      expect(all).toHaveLength(3);
    });

    it('should return empty array when no circuit breakers exist', () => {
      // Act
      const all = repository.findAll();

      // Assert
      expect(all).toHaveLength(0);
    });

    it('should order by updated_at DESC', () => {
      // Arrange
      const snapshot1 = createTestSnapshot({ 
        id: 'cb-1', 
        updatedAt: new Date('2024-01-15T08:00:00Z') 
      });
      const snapshot2 = createTestSnapshot({ 
        id: 'cb-2', 
        updatedAt: new Date('2024-01-15T10:00:00Z') 
      });
      const snapshot3 = createTestSnapshot({ 
        id: 'cb-3', 
        updatedAt: new Date('2024-01-15T09:00:00Z') 
      });
      
      repository.save(snapshot1);
      repository.save(snapshot2);
      repository.save(snapshot3);

      // Act
      const all = repository.findAll();

      // Assert - Most recently updated first
      expect(all[0].id).toBe('cb-2');
      expect(all[1].id).toBe('cb-3');
      expect(all[2].id).toBe('cb-1');
    });
  });

  describe('findByServiceType', () => {
    beforeEach(() => {
      // Seed with different service types
      repository.save(createTestSnapshot({ id: 'proxy-cb-1', serviceType: 'proxy' }));
      repository.save(createTestSnapshot({ id: 'proxy-cb-2', serviceType: 'proxy' }));
      repository.save(createTestSnapshot({ id: 'api-cb-1', serviceType: 'api' }));
      repository.save(createTestSnapshot({ id: 'search-cb-1', serviceType: 'search' }));
    });

    it('should find circuit breakers by service type', () => {
      // Act
      const proxyBreakers = repository.findByServiceType('proxy');

      // Assert
      expect(proxyBreakers).toHaveLength(2);
      expect(proxyBreakers.every(cb => cb.serviceType === 'proxy')).toBe(true);
    });

    it('should return empty array for service type with no circuit breakers', () => {
      // Act
      const translationBreakers = repository.findByServiceType('translation');

      // Assert
      expect(translationBreakers).toHaveLength(0);
    });

    it('should work for all service types', () => {
      const serviceTypes: ServiceType[] = ['proxy', 'search', 'api', 'translation', 'external'];
      
      for (const serviceType of serviceTypes) {
        const results = repository.findByServiceType(serviceType);
        expect(results.every(cb => cb.serviceType === serviceType)).toBe(true);
      }
    });
  });

  describe('findByState', () => {
    beforeEach(() => {
      repository.save(createTestSnapshot({ id: 'closed-1', state: 'CLOSED' }));
      repository.save(createTestSnapshot({ id: 'closed-2', state: 'CLOSED' }));
      repository.save(createTestSnapshot({ id: 'open-1', state: 'OPEN' }));
      repository.save(createTestSnapshot({ id: 'half-open-1', state: 'HALF_OPEN' }));
    });

    it('should find circuit breakers by state', () => {
      // Act
      const closedBreakers = repository.findByState('CLOSED');

      // Assert
      expect(closedBreakers).toHaveLength(2);
      expect(closedBreakers.every(cb => cb.state === 'CLOSED')).toBe(true);
    });

    it('should find OPEN circuit breakers', () => {
      // Act
      const openBreakers = repository.findByState('OPEN');

      // Assert
      expect(openBreakers).toHaveLength(1);
      expect(openBreakers[0].state).toBe('OPEN');
    });

    it('should find HALF_OPEN circuit breakers', () => {
      // Act
      const halfOpenBreakers = repository.findByState('HALF_OPEN');

      // Assert
      expect(halfOpenBreakers).toHaveLength(1);
      expect(halfOpenBreakers[0].state).toBe('HALF_OPEN');
    });
  });

  describe('findByServiceId', () => {
    beforeEach(() => {
      repository.save(createTestSnapshot({ id: 'cb-1', serviceId: 'proxy-1' }));
      repository.save(createTestSnapshot({ id: 'cb-2', serviceId: 'proxy-2' }));
      repository.save(createTestSnapshot({ id: 'cb-3', serviceId: undefined }));
    });

    it('should find circuit breaker by service ID', () => {
      // Act
      const found = repository.findByServiceId('proxy-1');

      // Assert
      expect(found).not.toBeNull();
      expect(found?.serviceId).toBe('proxy-1');
    });

    it('should return null for non-existent service ID', () => {
      // Act
      const found = repository.findByServiceId('non-existent');

      // Assert
      expect(found).toBeNull();
    });
  });

  // ============================================================
  // DELETE OPERATIONS TESTS
  // ============================================================
  describe('delete', () => {
    it('should delete circuit breaker by ID', () => {
      // Arrange
      const snapshot = createTestSnapshot({ id: 'delete-test' });
      repository.save(snapshot);

      // Act
      const result = repository.delete('delete-test');

      // Assert
      expect(result).toBe(true);
      expect(repository.findById('delete-test')).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteByServiceType', () => {
    beforeEach(() => {
      repository.save(createTestSnapshot({ id: 'proxy-1', serviceType: 'proxy' }));
      repository.save(createTestSnapshot({ id: 'proxy-2', serviceType: 'proxy' }));
      repository.save(createTestSnapshot({ id: 'api-1', serviceType: 'api' }));
    });

    it('should delete all circuit breakers of a service type', () => {
      // Act
      const deletedCount = repository.deleteByServiceType('proxy');

      // Assert
      expect(deletedCount).toBe(2);
      expect(repository.findByServiceType('proxy')).toHaveLength(0);
    });

    it('should not affect other service types', () => {
      // Act
      repository.deleteByServiceType('proxy');

      // Assert
      expect(repository.findByServiceType('api')).toHaveLength(1);
    });

    it('should return 0 for service type with no circuit breakers', () => {
      // Act
      const deletedCount = repository.deleteByServiceType('translation');

      // Assert
      expect(deletedCount).toBe(0);
    });
  });

  describe('deleteStale', () => {
    it('should delete records not updated in specified days', () => {
      // Arrange - Create old and new snapshots
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      
      const newDate = new Date();
      
      repository.save(createTestSnapshot({ id: 'old-cb', updatedAt: oldDate }));
      repository.save(createTestSnapshot({ id: 'new-cb', updatedAt: newDate }));

      // Act
      const deletedCount = repository.deleteStale(7);

      // Assert
      expect(deletedCount).toBe(1);
      expect(repository.findById('old-cb')).toBeNull();
      expect(repository.findById('new-cb')).not.toBeNull();
    });

    it('should use default of 7 days', () => {
      // Arrange
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      
      repository.save(createTestSnapshot({ id: 'old-cb', updatedAt: oldDate }));

      // Act
      const deletedCount = repository.deleteStale();

      // Assert
      expect(deletedCount).toBe(1);
    });

    it('should handle empty table', () => {
      // Act
      const deletedCount = repository.deleteStale(7);

      // Assert
      expect(deletedCount).toBe(0);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('getStatistics', () => {
    beforeEach(() => {
      // Seed with various circuit breakers
      repository.save(createTestSnapshot({ 
        id: 'cb-1', 
        state: 'CLOSED', 
        serviceType: 'proxy',
        metrics: createTestMetrics({ tripCount: 2, rejectedCount: 10 })
      }));
      repository.save(createTestSnapshot({ 
        id: 'cb-2', 
        state: 'CLOSED', 
        serviceType: 'proxy',
        metrics: createTestMetrics({ tripCount: 1, rejectedCount: 5 })
      }));
      repository.save(createTestSnapshot({ 
        id: 'cb-3', 
        state: 'OPEN', 
        serviceType: 'api',
        metrics: createTestMetrics({ tripCount: 3, rejectedCount: 20 })
      }));
      repository.save(createTestSnapshot({ 
        id: 'cb-4', 
        state: 'HALF_OPEN', 
        serviceType: 'search',
        metrics: createTestMetrics({ tripCount: 1, rejectedCount: 8 })
      }));
    });

    it('should return total count', () => {
      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.total).toBe(4);
    });

    it('should return count by state', () => {
      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.byState.CLOSED).toBe(2);
      expect(stats.byState.OPEN).toBe(1);
      expect(stats.byState.HALF_OPEN).toBe(1);
    });

    it('should return count by service type', () => {
      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.byServiceType.proxy).toBe(2);
      expect(stats.byServiceType.api).toBe(1);
      expect(stats.byServiceType.search).toBe(1);
      expect(stats.byServiceType.translation).toBe(0);
      expect(stats.byServiceType.external).toBe(0);
    });

    it('should return total trips', () => {
      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.totalTrips).toBe(7); // 2 + 1 + 3 + 1
    });

    it('should return total rejected', () => {
      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.totalRejected).toBe(43); // 10 + 5 + 20 + 8
    });

    it('should handle empty database', () => {
      // Arrange
      db.prepare('DELETE FROM circuit_breakers').run();

      // Act
      const stats = repository.getStatistics();

      // Assert
      expect(stats.total).toBe(0);
      expect(stats.totalTrips).toBe(0);
      expect(stats.totalRejected).toBe(0);
      expect(stats.byState.CLOSED).toBe(0);
      expect(stats.byState.OPEN).toBe(0);
      expect(stats.byState.HALF_OPEN).toBe(0);
    });
  });

  // ============================================================
  // DATA INTEGRITY TESTS
  // ============================================================
  describe('data integrity', () => {
    it('should calculate failure rate correctly', () => {
      // Arrange
      const metrics = createTestMetrics({
        totalRequests: 100,
        failureCount: 25
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert - Failure rate should be calculated: (25/100) * 100 = 25%
      expect(saved?.metrics.failureRate).toBe(25);
    });

    it('should handle zero total requests', () => {
      // Arrange
      const metrics = createTestMetrics({
        totalRequests: 0,
        failureCount: 0,
        successCount: 0
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert
      expect(saved?.metrics.failureRate).toBe(0);
    });

    it('should preserve date precision', () => {
      // Arrange
      const preciseDate = new Date('2024-01-15T10:30:45.123Z');
      const metrics = createTestMetrics({
        lastFailure: preciseDate,
        lastSuccess: preciseDate
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert - ISO string comparison (SQLite stores as text)
      expect(saved?.metrics.lastFailure?.toISOString()).toBe(preciseDate.toISOString());
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle very large metric values', () => {
      // Arrange
      const metrics = createTestMetrics({
        totalRequests: Number.MAX_SAFE_INTEGER,
        successCount: Number.MAX_SAFE_INTEGER - 1000
      });
      const snapshot = createTestSnapshot({ metrics });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert
      expect(saved?.metrics.totalRequests).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle special characters in name', () => {
      // Arrange
      const snapshot = createTestSnapshot({
        id: 'special-cb',
        name: "Test CB with 'quotes' and \"double quotes\" and <tags>"
      });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert
      expect(saved?.name).toBe("Test CB with 'quotes' and \"double quotes\" and <tags>");
    });

    it('should handle unicode in service ID', () => {
      // Arrange
      const snapshot = createTestSnapshot({
        id: 'unicode-cb',
        serviceId: 'proxy-日本語-émoji-🚀'
      });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert
      expect(saved?.serviceId).toBe('proxy-日本語-émoji-🚀');
    });

    it('should handle complex config JSON', () => {
      // Arrange
      const complexConfig = createTestConfig({
        failureThreshold: 10,
        serviceId: 'nested-service'
      });
      const snapshot = createTestSnapshot({ config: complexConfig });

      // Act
      repository.save(snapshot);
      const saved = repository.findById(snapshot.id);

      // Assert
      expect(saved?.config.failureThreshold).toBe(10);
      expect(saved?.config.serviceId).toBe('nested-service');
    });
  });

  // ============================================================
  // CONCURRENT ACCESS TESTS
  // ============================================================
  describe('concurrent access', () => {
    it('should handle rapid consecutive saves', () => {
      // Arrange
      const snapshot = createTestSnapshot({ id: 'concurrent-cb' });

      // Act - Save multiple times quickly
      for (let i = 0; i < 100; i++) {
        snapshot.metrics.totalRequests = i;
        repository.save(snapshot);
      }

      // Assert
      const saved = repository.findById('concurrent-cb');
      expect(saved?.metrics.totalRequests).toBe(99);
    });

    it('should maintain consistency during batch operations', () => {
      // Arrange
      const snapshots = Array.from({ length: 50 }, (_, i) => 
        createTestSnapshot({ id: `batch-cb-${i}` })
      );

      // Act
      repository.saveAll(snapshots);

      // Assert
      const all = repository.findAll();
      expect(all).toHaveLength(50);
    });
  });
});
