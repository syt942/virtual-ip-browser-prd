/**
 * RotationConfigRepository Unit Tests
 * Tests for rotation configuration database operations
 * 
 * Coverage targets:
 * - CRUD operations
 * - Active config management
 * - Target group filtering
 * - Runtime config conversion
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { RotationConfigRepository } from '../../../electron/database/repositories/rotation-config.repository';
import { createTestDatabaseWithSchema, cleanupDatabase } from '../../helpers/test-helpers';

describe('RotationConfigRepository', () => {
  let db: Database.Database;
  let repo: RotationConfigRepository;

  beforeEach(() => {
    db = createTestDatabaseWithSchema();
    repo = new RotationConfigRepository(db);
  });

  afterEach(() => {
    cleanupDatabase(db);
  });

  // ============================================================
  // CREATE TESTS
  // ============================================================
  describe('create', () => {
    it('creates config with all fields', () => {
      // Act
      const config = repo.create({
        name: 'Test Config',
        description: 'Test description',
        strategy: 'round-robin',
        commonConfig: { interval: 5000, maxRequestsPerProxy: 100 },
        strategyConfig: { jitterPercent: 10 },
        targetGroup: 'us-proxies',
        priority: 5,
        enabled: true,
        createdBy: 'admin',
      });

      // Assert
      expect(config.id).toBeDefined();
      expect(config.name).toBe('Test Config');
      expect(config.description).toBe('Test description');
      expect(config.strategy).toBe('round-robin');
      expect(config.targetGroup).toBe('us-proxies');
      expect(config.priority).toBe(5);
      expect(config.enabled).toBe(true);
    });

    it('creates config with minimal fields', () => {
      // Act
      const config = repo.create({
        name: 'Minimal Config',
        strategy: 'random',
      });

      // Assert
      expect(config.id).toBeDefined();
      expect(config.name).toBe('Minimal Config');
      expect(config.strategy).toBe('random');
      expect(config.isActive).toBe(false);
      expect(config.priority).toBe(0);
      expect(config.enabled).toBe(true); // Default
    });

    it('generates unique IDs', () => {
      // Act
      const config1 = repo.create({ name: 'Config 1', strategy: 'random' });
      const config2 = repo.create({ name: 'Config 2', strategy: 'random' });

      // Assert
      expect(config1.id).not.toBe(config2.id);
    });
  });

  // ============================================================
  // FIND TESTS
  // ============================================================
  describe('findById', () => {
    it('finds config by ID', () => {
      // Arrange
      const created = repo.create({ name: 'Test', strategy: 'random' });

      // Act
      const found = repo.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test');
    });

    it('returns null for non-existent ID', () => {
      // Act
      const result = repo.findById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all configs', () => {
      // Arrange
      repo.create({ name: 'Config 1', strategy: 'random' });
      repo.create({ name: 'Config 2', strategy: 'round-robin' });
      repo.create({ name: 'Config 3', strategy: 'fastest' });

      // Act
      const result = repo.findAll();

      // Assert
      expect(result).toHaveLength(3);
    });

    it('filters by enabled status', () => {
      // Arrange
      repo.create({ name: 'Enabled', strategy: 'random', enabled: true });
      repo.create({ name: 'Disabled', strategy: 'random', enabled: false });

      // Act
      const enabled = repo.findAll({ enabled: true });
      const disabled = repo.findAll({ enabled: false });

      // Assert
      expect(enabled).toHaveLength(1);
      expect(enabled[0].name).toBe('Enabled');
      expect(disabled).toHaveLength(1);
      expect(disabled[0].name).toBe('Disabled');
    });

    it('filters by strategy', () => {
      // Arrange
      repo.create({ name: 'Random 1', strategy: 'random' });
      repo.create({ name: 'Random 2', strategy: 'random' });
      repo.create({ name: 'Round Robin', strategy: 'round-robin' });

      // Act
      const result = repo.findAll({ strategy: 'random' });

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.strategy === 'random')).toBe(true);
    });
  });

  describe('findByTargetGroup', () => {
    it('returns configs for target group', () => {
      // Arrange
      repo.create({ name: 'US Config', strategy: 'random', targetGroup: 'us-proxies' });
      repo.create({ name: 'EU Config', strategy: 'random', targetGroup: 'eu-proxies' });

      // Act
      const result = repo.findByTargetGroup('us-proxies');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('US Config');
    });
  });

  // ============================================================
  // UPDATE TESTS
  // ============================================================
  describe('update', () => {
    it('updates config properties', () => {
      // Arrange
      const config = repo.create({ name: 'Original', strategy: 'random' });

      // Act
      const updated = repo.update(config.id, {
        name: 'Updated',
        description: 'New description',
        priority: 10,
      });

      // Assert
      expect(updated?.name).toBe('Updated');
      expect(updated?.description).toBe('New description');
      expect(updated?.priority).toBe(10);
    });

    it('returns null for non-existent ID', () => {
      // Act
      const result = repo.update('non-existent', { name: 'Test' });

      // Assert
      expect(result).toBeNull();
    });

    it('returns unchanged config when no updates provided', () => {
      // Arrange
      const config = repo.create({ name: 'Test', strategy: 'random' });

      // Act
      const result = repo.update(config.id, {});

      // Assert
      expect(result?.name).toBe('Test');
    });
  });

  // ============================================================
  // ACTIVE CONFIG TESTS
  // ============================================================
  describe('setActive', () => {
    it('activates config', () => {
      // Arrange
      const config = repo.create({ name: 'Test', strategy: 'random' });
      expect(config.isActive).toBe(false);

      // Act
      const result = repo.setActive(config.id);

      // Assert
      expect(result).toBe(true);
      const updated = repo.findById(config.id);
      expect(updated?.isActive).toBe(true);
    });

    it('deactivates other configs in same target group', () => {
      // Arrange
      const config1 = repo.create({ name: 'Config 1', strategy: 'random', targetGroup: 'group-a' });
      const config2 = repo.create({ name: 'Config 2', strategy: 'random', targetGroup: 'group-a' });
      
      repo.setActive(config1.id);
      expect(repo.findById(config1.id)?.isActive).toBe(true);

      // Act
      repo.setActive(config2.id);

      // Assert
      expect(repo.findById(config1.id)?.isActive).toBe(false);
      expect(repo.findById(config2.id)?.isActive).toBe(true);
    });

    it('returns false for non-existent config', () => {
      // Act
      const result = repo.setActive('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('deactivates config', () => {
      // Arrange
      const config = repo.create({ name: 'Test', strategy: 'random' });
      repo.setActive(config.id);

      // Act
      const result = repo.deactivate(config.id);

      // Assert
      expect(result).toBe(true);
      expect(repo.findById(config.id)?.isActive).toBe(false);
    });
  });

  describe('findActive', () => {
    it('returns active config for target group', () => {
      // Arrange
      const config = repo.create({ name: 'Test', strategy: 'random', targetGroup: 'group-a' });
      repo.setActive(config.id);

      // Act
      const active = repo.findActive('group-a');

      // Assert
      expect(active).not.toBeNull();
      expect(active?.id).toBe(config.id);
    });

    it('returns null when no active config', () => {
      // Arrange
      repo.create({ name: 'Test', strategy: 'random', targetGroup: 'group-a' });

      // Act
      const active = repo.findActive('group-a');

      // Assert
      expect(active).toBeNull();
    });
  });

  // ============================================================
  // DELETE TESTS
  // ============================================================
  describe('delete', () => {
    it('deletes config by ID', () => {
      // Arrange
      const config = repo.create({ name: 'Test', strategy: 'random' });

      // Act
      const result = repo.delete(config.id);

      // Assert
      expect(result).toBe(true);
      expect(repo.findById(config.id)).toBeNull();
    });

    it('returns false for non-existent ID', () => {
      // Act
      const result = repo.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // DUPLICATE TESTS
  // ============================================================
  describe('duplicate', () => {
    it('creates copy with new name', () => {
      // Arrange
      const original = repo.create({
        name: 'Original',
        strategy: 'random',
        description: 'Test description',
        priority: 5,
      });

      // Act
      const duplicate = repo.duplicate(original.id, 'Copy of Original');

      // Assert
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).not.toBe(original.id);
      expect(duplicate?.name).toBe('Copy of Original');
      expect(duplicate?.strategy).toBe('random');
      expect(duplicate?.description).toBe('Test description');
      expect(duplicate?.priority).toBe(5);
      expect(duplicate?.enabled).toBe(false); // Duplicates start disabled
    });

    it('returns null for non-existent original', () => {
      // Act
      const result = repo.duplicate('non-existent', 'New Name');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('countByStrategy', () => {
    it('returns count per strategy', () => {
      // Arrange
      repo.create({ name: 'R1', strategy: 'random' });
      repo.create({ name: 'R2', strategy: 'random' });
      repo.create({ name: 'RR1', strategy: 'round-robin' });
      repo.create({ name: 'F1', strategy: 'fastest' });

      // Act
      const result = repo.countByStrategy();

      // Assert
      expect(result['random']).toBe(2);
      expect(result['round-robin']).toBe(1);
      expect(result['fastest']).toBe(1);
    });
  });
});
