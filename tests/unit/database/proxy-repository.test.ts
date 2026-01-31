/**
 * ProxyRepository Unit Tests
 * Tests for proxy database operations with weight and rotation group management
 * 
 * Coverage targets:
 * - Weight management (update, batch, normalize, equalize)
 * - Rotation group operations
 * - Statistics queries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ProxyRepository } from '../../../electron/database/repositories/proxy.repository';
import { createTestDatabaseWithSchema, cleanupDatabase, insertTestProxy } from '../../helpers/test-helpers';

describe('ProxyRepository', () => {
  let db: Database.Database;
  let repo: ProxyRepository;

  beforeEach(() => {
    db = createTestDatabaseWithSchema();
    repo = new ProxyRepository(db);
  });

  afterEach(() => {
    cleanupDatabase(db);
  });

  // ============================================================
  // WEIGHT MANAGEMENT TESTS
  // ============================================================
  describe('updateWeight', () => {
    it('updates proxy weight successfully', () => {
      // Arrange
      const proxyId = insertTestProxy(db, { weight: 1.0 });

      // Act
      const result = repo.updateWeight(proxyId, 50);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get(proxyId) as { weight: number };
      expect(proxy.weight).toBe(50);
    });

    it('validates weight range 0-100', () => {
      // Arrange
      const proxyId = insertTestProxy(db);

      // Act & Assert - negative weight
      expect(() => repo.updateWeight(proxyId, -1)).toThrow('Weight must be between 0 and 100');

      // Act & Assert - weight over 100
      expect(() => repo.updateWeight(proxyId, 101)).toThrow('Weight must be between 0 and 100');
    });

    it('accepts weight at boundaries', () => {
      // Arrange
      const proxyId = insertTestProxy(db);

      // Act & Assert - weight 0
      expect(repo.updateWeight(proxyId, 0)).toBe(true);

      // Act & Assert - weight 100
      expect(repo.updateWeight(proxyId, 100)).toBe(true);
    });

    it('returns false for non-existent proxy', () => {
      // Act
      const result = repo.updateWeight('non-existent-id', 50);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('batchUpdateWeights', () => {
    it('updates weights in transaction', () => {
      // Arrange
      const proxy1 = insertTestProxy(db, { name: 'Proxy 1' });
      const proxy2 = insertTestProxy(db, { name: 'Proxy 2' });
      const proxy3 = insertTestProxy(db, { name: 'Proxy 3' });

      // Act
      repo.batchUpdateWeights([
        { proxyId: proxy1, weight: 30 },
        { proxyId: proxy2, weight: 40 },
        { proxyId: proxy3, weight: 30 },
      ]);

      // Assert
      const proxies = db.prepare('SELECT id, weight FROM proxies').all() as { id: string; weight: number }[];
      expect(proxies.find(p => p.id === proxy1)?.weight).toBe(30);
      expect(proxies.find(p => p.id === proxy2)?.weight).toBe(40);
      expect(proxies.find(p => p.id === proxy3)?.weight).toBe(30);
    });

    it('rolls back on invalid weight', () => {
      // Arrange
      const proxy1 = insertTestProxy(db, { name: 'Proxy 1', weight: 10 });
      const proxy2 = insertTestProxy(db, { name: 'Proxy 2', weight: 20 });

      // Act & Assert
      expect(() => {
        repo.batchUpdateWeights([
          { proxyId: proxy1, weight: 50 },
          { proxyId: proxy2, weight: 150 }, // Invalid
        ]);
      }).toThrow();

      // Verify rollback - original weights should be preserved
      const proxies = db.prepare('SELECT id, weight FROM proxies').all() as { id: string; weight: number }[];
      expect(proxies.find(p => p.id === proxy1)?.weight).toBe(10);
      expect(proxies.find(p => p.id === proxy2)?.weight).toBe(20);
    });
  });

  describe('normalizeWeights', () => {
    it('normalizes weights to sum to 100', () => {
      // Arrange
      insertTestProxy(db, { name: 'Proxy 1', weight: 10, status: 'active' });
      insertTestProxy(db, { name: 'Proxy 2', weight: 20, status: 'active' });
      insertTestProxy(db, { name: 'Proxy 3', weight: 20, status: 'active' });

      // Act
      repo.normalizeWeights();

      // Assert
      const stats = repo.getWeightStats();
      expect(Math.round(stats.total)).toBe(100);
    });

    it('handles zero total weight gracefully', () => {
      // Arrange
      insertTestProxy(db, { name: 'Proxy 1', weight: 0, status: 'active' });

      // Act & Assert - should not throw
      repo.normalizeWeights();
    });

    it('normalizes within rotation group', () => {
      // Arrange
      insertTestProxy(db, { name: 'Group A 1', weight: 10, rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { name: 'Group A 2', weight: 10, rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { name: 'Group B 1', weight: 50, rotation_group: 'group-b', status: 'active' });

      // Act
      repo.normalizeWeights('group-a');

      // Assert
      const statsA = repo.getWeightStats('group-a');
      const statsB = repo.getWeightStats('group-b');
      expect(Math.round(statsA.total)).toBe(100);
      expect(statsB.total).toBe(50); // Unchanged
    });
  });

  describe('equalizeWeights', () => {
    it('distributes weights evenly', () => {
      // Arrange
      insertTestProxy(db, { name: 'Proxy 1', weight: 10, status: 'active' });
      insertTestProxy(db, { name: 'Proxy 2', weight: 50, status: 'active' });
      insertTestProxy(db, { name: 'Proxy 3', weight: 40, status: 'active' });
      insertTestProxy(db, { name: 'Proxy 4', weight: 0, status: 'active' });

      // Act
      repo.equalizeWeights();

      // Assert
      const stats = repo.getWeightStats();
      expect(Math.round(stats.total)).toBe(100);
      expect(stats.min).toBeCloseTo(stats.max, 1); // All weights should be equal
    });

    it('handles no active proxies', () => {
      // Arrange - no proxies
      
      // Act & Assert - should not throw
      repo.equalizeWeights();
    });
  });

  // ============================================================
  // ROTATION GROUP TESTS
  // ============================================================
  describe('findByRotationGroup', () => {
    it('filters active proxies by rotation group', () => {
      // Arrange
      insertTestProxy(db, { name: 'Active A', rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { name: 'Active A2', rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { name: 'Failed A', rotation_group: 'group-a', status: 'failed' });
      insertTestProxy(db, { name: 'Active B', rotation_group: 'group-b', status: 'active' });

      // Act
      const result = repo.findByRotationGroup('group-a');

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(p => p.rotationGroup === 'group-a')).toBe(true);
      expect(result.every(p => p.status === 'active')).toBe(true);
    });

    it('returns empty array for non-existent group', () => {
      // Act
      const result = repo.findByRotationGroup('non-existent');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('orders by weight DESC', () => {
      // Arrange
      insertTestProxy(db, { name: 'Low', weight: 10, rotation_group: 'group', status: 'active' });
      insertTestProxy(db, { name: 'High', weight: 90, rotation_group: 'group', status: 'active' });
      insertTestProxy(db, { name: 'Medium', weight: 50, rotation_group: 'group', status: 'active' });

      // Act
      const result = repo.findByRotationGroup('group');

      // Assert
      expect(result[0].weight).toBe(90);
      expect(result[1].weight).toBe(50);
      expect(result[2].weight).toBe(10);
    });
  });

  describe('getGroupedByRotationGroup', () => {
    it('groups proxies including ungrouped', () => {
      // Arrange
      insertTestProxy(db, { name: 'Group A', rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { name: 'Group B', rotation_group: 'group-b', status: 'active' });
      insertTestProxy(db, { name: 'Ungrouped', rotation_group: null, status: 'active' });

      // Act
      const result = repo.getGroupedByRotationGroup();

      // Assert
      expect(result['group-a']).toHaveLength(1);
      expect(result['group-b']).toHaveLength(1);
      expect(result['_ungrouped']).toHaveLength(1);
    });

    it('excludes inactive proxies', () => {
      // Arrange
      insertTestProxy(db, { name: 'Active', rotation_group: 'group', status: 'active' });
      insertTestProxy(db, { name: 'Failed', rotation_group: 'group', status: 'failed' });

      // Act
      const result = repo.getGroupedByRotationGroup();

      // Assert
      expect(result['group']).toHaveLength(1);
    });
  });

  describe('getCountByRotationGroup', () => {
    it('returns accurate counts per group', () => {
      // Arrange
      insertTestProxy(db, { rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { rotation_group: 'group-b', status: 'active' });
      insertTestProxy(db, { rotation_group: null, status: 'active' });

      // Act
      const result = repo.getCountByRotationGroup();

      // Assert
      expect(result['group-a']).toBe(2);
      expect(result['group-b']).toBe(1);
      expect(result['_ungrouped']).toBe(1);
    });

    it('only counts active proxies', () => {
      // Arrange
      insertTestProxy(db, { rotation_group: 'group', status: 'active' });
      insertTestProxy(db, { rotation_group: 'group', status: 'failed' });
      insertTestProxy(db, { rotation_group: 'group', status: 'disabled' });

      // Act
      const result = repo.getCountByRotationGroup();

      // Assert
      expect(result['group']).toBe(1);
    });
  });

  describe('batchUpdateRotationGroups', () => {
    it('updates rotation groups in transaction', () => {
      // Arrange
      const proxy1 = insertTestProxy(db, { rotation_group: null });
      const proxy2 = insertTestProxy(db, { rotation_group: null });

      // Act
      repo.batchUpdateRotationGroups([
        { proxyId: proxy1, rotationGroup: 'new-group' },
        { proxyId: proxy2, rotationGroup: 'new-group' },
      ]);

      // Assert
      const proxies = repo.findByRotationGroup('new-group');
      expect(proxies).toHaveLength(2);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('getTotalWeight', () => {
    it('calculates total weight for all active proxies', () => {
      // Arrange
      insertTestProxy(db, { weight: 30, status: 'active' });
      insertTestProxy(db, { weight: 40, status: 'active' });
      insertTestProxy(db, { weight: 30, status: 'active' });
      insertTestProxy(db, { weight: 50, status: 'failed' }); // Should not count

      // Act
      const result = repo.getTotalWeight();

      // Assert
      expect(result).toBe(100);
    });

    it('calculates total weight for specific group', () => {
      // Arrange
      insertTestProxy(db, { weight: 50, rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { weight: 30, rotation_group: 'group-a', status: 'active' });
      insertTestProxy(db, { weight: 100, rotation_group: 'group-b', status: 'active' });

      // Act
      const result = repo.getTotalWeight('group-a');

      // Assert
      expect(result).toBe(80);
    });
  });

  describe('getWeightStats', () => {
    it('returns min/max/avg/total/count', () => {
      // Arrange
      insertTestProxy(db, { weight: 10, status: 'active' });
      insertTestProxy(db, { weight: 20, status: 'active' });
      insertTestProxy(db, { weight: 30, status: 'active' });

      // Act
      const stats = repo.getWeightStats();

      // Assert
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.avg).toBe(20);
      expect(stats.total).toBe(60);
      expect(stats.count).toBe(3);
    });

    it('handles no proxies', () => {
      // Act
      const stats = repo.getWeightStats();

      // Assert
      expect(stats.count).toBe(0);
      expect(stats.total).toBe(0);
    });
  });

  describe('findActiveByWeight', () => {
    it('returns proxies ordered by weight DESC', () => {
      // Arrange
      insertTestProxy(db, { name: 'Low', weight: 10, status: 'active' });
      insertTestProxy(db, { name: 'High', weight: 90, status: 'active' });
      insertTestProxy(db, { name: 'Medium', weight: 50, status: 'active' });

      // Act
      const result = repo.findActiveByWeight();

      // Assert
      expect(result[0].weight).toBe(90);
      expect(result[1].weight).toBe(50);
      expect(result[2].weight).toBe(10);
    });

    it('excludes proxies with weight 0', () => {
      // Arrange
      insertTestProxy(db, { weight: 50, status: 'active' });
      insertTestProxy(db, { weight: 0, status: 'active' });

      // Act
      const result = repo.findActiveByWeight();

      // Assert
      expect(result).toHaveLength(1);
    });
  });
});
