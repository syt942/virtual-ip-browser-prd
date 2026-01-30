/**
 * ProxyRepository Unit Tests
 * Tests for CRUD operations, filtering, health status updates, weight management
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { ProxyRepository } from '../../../electron/database/repositories/proxy.repository';
import {
  createTestDatabase,
  seedTestProxies,
  DEFAULT_TEST_PROXIES,
  TestProxyData
} from './test-helpers';

describe('ProxyRepository', () => {
  let db: Database.Database;
  let repository: ProxyRepository;

  beforeEach(() => {
    // Arrange: Create fresh in-memory database for each test
    db = createTestDatabase();
    repository = new ProxyRepository(db);
  });

  afterEach(() => {
    // Cleanup: Close database connection
    db.close();
  });

  // ============================================================
  // WEIGHT MANAGEMENT TESTS
  // ============================================================
  describe('updateWeight', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should update weight for existing proxy', () => {
      // Arrange
      const proxyId = 'proxy-1';
      const newWeight = 50;

      // Act
      const result = repository.updateWeight(proxyId, newWeight);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get(proxyId) as { weight: number };
      expect(proxy.weight).toBe(50);
    });

    it('should return false for non-existent proxy', () => {
      // Arrange
      const proxyId = 'non-existent';
      const newWeight = 50;

      // Act
      const result = repository.updateWeight(proxyId, newWeight);

      // Assert
      expect(result).toBe(false);
    });

    it('should throw error for weight below 0', () => {
      // Arrange
      const proxyId = 'proxy-1';
      const invalidWeight = -1;

      // Act & Assert
      expect(() => repository.updateWeight(proxyId, invalidWeight))
        .toThrow('Weight must be between 0 and 100');
    });

    it('should throw error for weight above 100', () => {
      // Arrange
      const proxyId = 'proxy-1';
      const invalidWeight = 101;

      // Act & Assert
      expect(() => repository.updateWeight(proxyId, invalidWeight))
        .toThrow('Weight must be between 0 and 100');
    });

    it('should accept weight of exactly 0', () => {
      // Arrange
      const proxyId = 'proxy-1';

      // Act
      const result = repository.updateWeight(proxyId, 0);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get(proxyId) as { weight: number };
      expect(proxy.weight).toBe(0);
    });

    it('should accept weight of exactly 100', () => {
      // Arrange
      const proxyId = 'proxy-1';

      // Act
      const result = repository.updateWeight(proxyId, 100);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get(proxyId) as { weight: number };
      expect(proxy.weight).toBe(100);
    });

    it('should update updated_at timestamp', () => {
      // Arrange
      const proxyId = 'proxy-1';
      const beforeUpdate = db.prepare('SELECT updated_at FROM proxies WHERE id = ?').get(proxyId) as { updated_at: string };

      // Act
      repository.updateWeight(proxyId, 50);

      // Assert
      const afterUpdate = db.prepare('SELECT updated_at FROM proxies WHERE id = ?').get(proxyId) as { updated_at: string };
      expect(new Date(afterUpdate.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate.updated_at).getTime());
    });
  });

  // ============================================================
  // ROTATION GROUP TESTS
  // ============================================================
  describe('updateRotationGroup', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should update rotation group for existing proxy', () => {
      // Arrange
      const proxyId = 'proxy-1';
      const newGroup = 'new-group';

      // Act
      const result = repository.updateRotationGroup(proxyId, newGroup);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT rotation_group FROM proxies WHERE id = ?').get(proxyId) as { rotation_group: string };
      expect(proxy.rotation_group).toBe('new-group');
    });

    it('should set rotation group to null', () => {
      // Arrange
      const proxyId = 'proxy-1';

      // Act
      const result = repository.updateRotationGroup(proxyId, null);

      // Assert
      expect(result).toBe(true);
      const proxy = db.prepare('SELECT rotation_group FROM proxies WHERE id = ?').get(proxyId) as { rotation_group: string | null };
      expect(proxy.rotation_group).toBeNull();
    });

    it('should return false for non-existent proxy', () => {
      // Arrange & Act
      const result = repository.updateRotationGroup('non-existent', 'group');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // BATCH UPDATE TESTS
  // ============================================================
  describe('batchUpdateWeights', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should update weights for multiple proxies', () => {
      // Arrange
      const updates = [
        { proxyId: 'proxy-1', weight: 30 },
        { proxyId: 'proxy-2', weight: 40 },
        { proxyId: 'proxy-3', weight: 30 }
      ];

      // Act
      repository.batchUpdateWeights(updates);

      // Assert
      const proxy1 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-1') as { weight: number };
      const proxy2 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-2') as { weight: number };
      const proxy3 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-3') as { weight: number };
      
      expect(proxy1.weight).toBe(30);
      expect(proxy2.weight).toBe(40);
      expect(proxy3.weight).toBe(30);
    });

    it('should rollback all updates on invalid weight', () => {
      // Arrange
      const updates = [
        { proxyId: 'proxy-1', weight: 30 },
        { proxyId: 'proxy-2', weight: 150 }, // Invalid
        { proxyId: 'proxy-3', weight: 20 }
      ];

      // Act & Assert
      expect(() => repository.batchUpdateWeights(updates)).toThrow();

      // Verify original weights are preserved (transaction rollback)
      const proxy1 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-1') as { weight: number };
      expect(proxy1.weight).toBe(10); // Original weight
    });

    it('should handle empty updates array', () => {
      // Arrange & Act & Assert
      expect(() => repository.batchUpdateWeights([])).not.toThrow();
    });
  });

  describe('batchUpdateRotationGroups', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should update rotation groups for multiple proxies', () => {
      // Arrange
      const updates = [
        { proxyId: 'proxy-1', rotationGroup: 'group-a' },
        { proxyId: 'proxy-2', rotationGroup: 'group-b' },
        { proxyId: 'proxy-4', rotationGroup: null }
      ];

      // Act
      repository.batchUpdateRotationGroups(updates);

      // Assert
      const proxy1 = db.prepare('SELECT rotation_group FROM proxies WHERE id = ?').get('proxy-1') as { rotation_group: string };
      const proxy2 = db.prepare('SELECT rotation_group FROM proxies WHERE id = ?').get('proxy-2') as { rotation_group: string };
      const proxy4 = db.prepare('SELECT rotation_group FROM proxies WHERE id = ?').get('proxy-4') as { rotation_group: string | null };
      
      expect(proxy1.rotation_group).toBe('group-a');
      expect(proxy2.rotation_group).toBe('group-b');
      expect(proxy4.rotation_group).toBeNull();
    });
  });

  // ============================================================
  // QUERY BY ROTATION GROUP TESTS
  // ============================================================
  describe('findByRotationGroup', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should find active proxies by rotation group', () => {
      // Arrange & Act
      const proxies = repository.findByRotationGroup('us-east');

      // Assert
      expect(proxies).toHaveLength(2);
      expect(proxies.every(p => p.rotationGroup === 'us-east')).toBe(true);
      expect(proxies.every(p => p.status === 'active')).toBe(true);
    });

    it('should return empty array for non-existent group', () => {
      // Arrange & Act
      const proxies = repository.findByRotationGroup('non-existent');

      // Assert
      expect(proxies).toHaveLength(0);
    });

    it('should order results by weight DESC, then success_rate DESC', () => {
      // Arrange & Act
      const proxies = repository.findByRotationGroup('us-east');

      // Assert
      expect(proxies[0].weight).toBeGreaterThanOrEqual(proxies[1].weight);
    });

    it('should not include inactive proxies', () => {
      // Arrange: Add inactive proxy to us-east group
      db.prepare('UPDATE proxies SET rotation_group = ?, status = ? WHERE id = ?')
        .run('us-east', 'disabled', 'proxy-4');

      // Act
      const proxies = repository.findByRotationGroup('us-east');

      // Assert
      expect(proxies.every(p => p.status === 'active')).toBe(true);
      expect(proxies.find(p => p.id === 'proxy-4')).toBeUndefined();
    });
  });

  describe('findByRotationGroups', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should find proxies in multiple rotation groups', () => {
      // Arrange & Act
      const proxies = repository.findByRotationGroups(['us-east', 'eu-west']);

      // Assert
      expect(proxies).toHaveLength(3);
      expect(proxies.some(p => p.rotationGroup === 'us-east')).toBe(true);
      expect(proxies.some(p => p.rotationGroup === 'eu-west')).toBe(true);
    });

    it('should handle empty array', () => {
      // Act & Assert - Should not throw
      const proxies = repository.findByRotationGroups([]);
      expect(proxies).toHaveLength(0);
    });
  });

  describe('getRotationGroups', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should return all distinct rotation groups', () => {
      // Act
      const groups = repository.getRotationGroups();

      // Assert
      expect(groups).toContain('us-east');
      expect(groups).toContain('eu-west');
      expect(groups).toHaveLength(2);
    });

    it('should not include null groups', () => {
      // Act
      const groups = repository.getRotationGroups();

      // Assert
      expect(groups.includes(null as any)).toBe(false);
    });

    it('should return sorted results', () => {
      // Act
      const groups = repository.getRotationGroups();

      // Assert
      const sortedGroups = [...groups].sort();
      expect(groups).toEqual(sortedGroups);
    });
  });

  describe('getGroupedByRotationGroup', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should group active proxies by rotation group', () => {
      // Act
      const grouped = repository.getGroupedByRotationGroup();

      // Assert
      expect(grouped['us-east']).toHaveLength(2);
      expect(grouped['eu-west']).toHaveLength(1);
    });

    it('should include _ungrouped for proxies without group', () => {
      // Arrange: Ensure there's an active proxy without group
      db.prepare('UPDATE proxies SET status = ?, rotation_group = NULL WHERE id = ?')
        .run('active', 'proxy-4');

      // Act
      const grouped = repository.getGroupedByRotationGroup();

      // Assert
      expect(grouped['_ungrouped']).toBeDefined();
      expect(grouped['_ungrouped'].length).toBeGreaterThan(0);
    });

    it('should not include inactive proxies', () => {
      // Act
      const grouped = repository.getGroupedByRotationGroup();

      // Assert
      const allProxies = Object.values(grouped).flat();
      expect(allProxies.every(p => p.status === 'active')).toBe(true);
    });
  });

  // ============================================================
  // WEIGHT-BASED QUERIES
  // ============================================================
  describe('findActiveByWeight', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should return active proxies with weight > 0 ordered by weight DESC', () => {
      // Act
      const proxies = repository.findActiveByWeight();

      // Assert
      expect(proxies.length).toBeGreaterThan(0);
      expect(proxies.every(p => p.weight > 0)).toBe(true);
      expect(proxies.every(p => p.status === 'active')).toBe(true);
      
      // Verify ordering
      for (let i = 1; i < proxies.length; i++) {
        expect(proxies[i - 1].weight).toBeGreaterThanOrEqual(proxies[i].weight);
      }
    });

    it('should not include proxies with weight 0', () => {
      // Arrange
      db.prepare('UPDATE proxies SET weight = 0 WHERE id = ?').run('proxy-1');

      // Act
      const proxies = repository.findActiveByWeight();

      // Assert
      expect(proxies.find(p => p.id === 'proxy-1')).toBeUndefined();
    });
  });

  describe('getTotalWeight', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should return total weight of all active proxies', () => {
      // Act
      const totalWeight = repository.getTotalWeight();

      // Assert - Sum of active proxies: 10 + 20 + 15 = 45
      expect(totalWeight).toBe(45);
    });

    it('should return total weight for specific rotation group', () => {
      // Act
      const totalWeight = repository.getTotalWeight('us-east');

      // Assert - Sum of us-east: 10 + 20 = 30
      expect(totalWeight).toBe(30);
    });

    it('should return 0 for empty rotation group', () => {
      // Act
      const totalWeight = repository.getTotalWeight('non-existent');

      // Assert
      expect(totalWeight).toBe(0);
    });
  });

  describe('getWeightStats', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should return weight statistics for all active proxies', () => {
      // Act
      const stats = repository.getWeightStats();

      // Assert
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(20);
      expect(stats.total).toBe(45);
      expect(stats.count).toBe(3);
      expect(stats.avg).toBe(15);
    });

    it('should return weight statistics for specific rotation group', () => {
      // Act
      const stats = repository.getWeightStats('us-east');

      // Assert
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(20);
      expect(stats.total).toBe(30);
      expect(stats.count).toBe(2);
      expect(stats.avg).toBe(15);
    });

    it('should return zeros for non-existent group', () => {
      // Act
      const stats = repository.getWeightStats('non-existent');

      // Assert
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.count).toBe(0);
    });
  });

  // ============================================================
  // WEIGHT NORMALIZATION TESTS
  // ============================================================
  describe('normalizeWeights', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should normalize weights to sum to 100', () => {
      // Act
      repository.normalizeWeights();

      // Assert
      const totalWeight = repository.getTotalWeight();
      expect(Math.abs(totalWeight - 100)).toBeLessThan(0.1); // Allow small floating point error
    });

    it('should normalize weights within rotation group', () => {
      // Act
      repository.normalizeWeights('us-east');

      // Assert
      const totalWeight = repository.getTotalWeight('us-east');
      expect(Math.abs(totalWeight - 100)).toBeLessThan(0.1);
    });

    it('should not change weights if total is 0', () => {
      // Arrange: Remove all active proxies
      db.prepare('UPDATE proxies SET status = ?').run('disabled');

      // Act - Should not throw
      repository.normalizeWeights();

      // Assert
      const totalWeight = repository.getTotalWeight();
      expect(totalWeight).toBe(0);
    });

    it('should preserve relative weight proportions', () => {
      // Arrange
      const beforeStats = repository.getWeightStats('us-east');
      const beforeRatio = 20 / 10; // proxy-2 / proxy-1

      // Act
      repository.normalizeWeights('us-east');

      // Assert
      const proxy1 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-1') as { weight: number };
      const proxy2 = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-2') as { weight: number };
      const afterRatio = proxy2.weight / proxy1.weight;
      
      expect(Math.abs(afterRatio - beforeRatio)).toBeLessThan(0.01);
    });
  });

  describe('equalizeWeights', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should set equal weights for all active proxies', () => {
      // Act
      repository.equalizeWeights();

      // Assert
      const proxies = repository.findActiveByWeight();
      const expectedWeight = 100 / proxies.length;
      
      for (const proxy of proxies) {
        expect(Math.abs(proxy.weight - expectedWeight)).toBeLessThan(0.1);
      }
    });

    it('should set equal weights within rotation group', () => {
      // Act
      repository.equalizeWeights('us-east');

      // Assert
      const proxies = repository.findByRotationGroup('us-east');
      const expectedWeight = 100 / 2; // 2 proxies in us-east
      
      for (const proxy of proxies) {
        expect(Math.abs(proxy.weight - expectedWeight)).toBeLessThan(0.1);
      }
    });

    it('should not affect proxies outside the specified group', () => {
      // Arrange
      const originalWeight = 15; // eu-west proxy weight

      // Act
      repository.equalizeWeights('us-east');

      // Assert
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-3') as { weight: number };
      expect(proxy.weight).toBe(originalWeight);
    });
  });

  // ============================================================
  // COUNT AND STATISTICS
  // ============================================================
  describe('getCountByRotationGroup', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should return count of active proxies by rotation group', () => {
      // Act
      const counts = repository.getCountByRotationGroup();

      // Assert
      expect(counts['us-east']).toBe(2);
      expect(counts['eu-west']).toBe(1);
    });

    it('should include _ungrouped count', () => {
      // Arrange: Make an active proxy without group
      db.prepare('UPDATE proxies SET status = ?, rotation_group = NULL WHERE id = ?')
        .run('active', 'proxy-4');

      // Act
      const counts = repository.getCountByRotationGroup();

      // Assert
      expect(counts['_ungrouped']).toBeDefined();
      expect(counts['_ungrouped']).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // DTO CONVERSION TESTS
  // ============================================================
  describe('toDTO conversion', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should correctly convert database row to DTO', () => {
      // Act
      const proxies = repository.findByRotationGroup('us-east');
      const proxy = proxies[0];

      // Assert
      expect(proxy.id).toBeDefined();
      expect(proxy.name).toBeDefined();
      expect(proxy.host).toBeDefined();
      expect(proxy.port).toBeTypeOf('number');
      expect(proxy.protocol).toBeDefined();
      expect(proxy.status).toBeDefined();
      expect(proxy.failureCount).toBeTypeOf('number');
      expect(proxy.totalRequests).toBeTypeOf('number');
      expect(proxy.successRate).toBeTypeOf('number');
      expect(proxy.weight).toBeTypeOf('number');
      expect(proxy.createdAt).toBeInstanceOf(Date);
      expect(proxy.updatedAt).toBeInstanceOf(Date);
    });

    it('should parse tags JSON correctly', () => {
      // Arrange
      db.prepare('UPDATE proxies SET tags = ? WHERE id = ?')
        .run(JSON.stringify(['tag1', 'tag2']), 'proxy-1');

      // Act
      const proxies = repository.findByRotationGroup('us-east');
      const proxy = proxies.find(p => p.id === 'proxy-1');

      // Assert
      expect(proxy?.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle null optional fields', () => {
      // Act
      const proxies = repository.findByRotationGroup('us-east');
      const proxy = proxies[0];

      // Assert - Optional fields can be null or undefined
      expect(proxy.username == null).toBe(true);
      expect(proxy.password == null).toBe(true);
      expect(proxy.latency == null).toBe(true);
    });
  });

  // ============================================================
  // CONCURRENT ACCESS TESTS
  // ============================================================
  describe('concurrent access', () => {
    beforeEach(() => {
      seedTestProxies(db, DEFAULT_TEST_PROXIES);
    });

    it('should handle concurrent weight updates', () => {
      // Arrange
      const updates: Promise<void>[] = [];

      // Act - Simulate concurrent updates
      for (let i = 0; i < 10; i++) {
        updates.push(Promise.resolve().then(() => {
          repository.updateWeight('proxy-1', i * 10);
        }));
      }

      // Assert - Should not throw
      return Promise.all(updates).then(() => {
        const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-1') as { weight: number };
        expect(proxy.weight).toBeGreaterThanOrEqual(0);
        expect(proxy.weight).toBeLessThanOrEqual(100);
      });
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty database', () => {
      // Act & Assert - Should not throw
      expect(() => repository.findActiveByWeight()).not.toThrow();
      expect(repository.findActiveByWeight()).toHaveLength(0);
      expect(repository.getTotalWeight()).toBe(0);
      expect(repository.getRotationGroups()).toHaveLength(0);
    });

    it('should handle special characters in rotation group name', () => {
      // Arrange
      seedTestProxies(db, [{
        id: 'special-proxy',
        name: 'Special Proxy',
        host: '192.168.100.1',
        port: 8080,
        protocol: 'http',
        status: 'active',
        rotationGroup: 'group-with-special_chars.123'
      }]);

      // Act
      const proxies = repository.findByRotationGroup('group-with-special_chars.123');

      // Assert
      expect(proxies).toHaveLength(1);
      expect(proxies[0].rotationGroup).toBe('group-with-special_chars.123');
    });

    it('should handle decimal weights', () => {
      // Arrange
      seedTestProxies(db, DEFAULT_TEST_PROXIES);

      // Act
      repository.updateWeight('proxy-1', 33.33);

      // Assert
      const proxy = db.prepare('SELECT weight FROM proxies WHERE id = ?').get('proxy-1') as { weight: number };
      expect(Math.abs(proxy.weight - 33.33)).toBeLessThan(0.01);
    });
  });
});
