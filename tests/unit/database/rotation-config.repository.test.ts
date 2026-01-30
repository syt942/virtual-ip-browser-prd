/**
 * RotationConfigRepository Unit Tests
 * Tests for rotation configuration CRUD, activation, strategy management
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { RotationConfigRepository } from '../../../electron/database/repositories/rotation-config.repository';
import type {
  CreateRotationConfigInput,
  CommonRotationConfig,
  GeographicStrategyConfig
} from '../../../electron/database/migrations/types';
import { createTestDatabase } from './test-helpers';

describe('RotationConfigRepository', () => {
  let db: Database.Database;
  let repository: RotationConfigRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new RotationConfigRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================
  // CREATE OPERATIONS TESTS
  // ============================================================
  describe('create', () => {
    it('should create a new rotation config', () => {
      // Arrange
      const input: CreateRotationConfigInput = {
        name: 'Test Config',
        strategy: 'round-robin',
        description: 'A test rotation config'
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Config');
      expect(result.strategy).toBe('round-robin');
      expect(result.description).toBe('A test rotation config');
    });

    it('should set default values', () => {
      // Arrange
      const input: CreateRotationConfigInput = {
        name: 'Default Config',
        strategy: 'random'
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.isActive).toBe(false);
      expect(result.enabled).toBe(true);
      expect(result.priority).toBe(0);
    });

    it('should store common config', () => {
      // Arrange
      const commonConfig: CommonRotationConfig = {
        interval: 60000,
        maxRequestsPerProxy: 100,
        failureThreshold: 5,
        cooldownPeriod: 30000
      };
      const input: CreateRotationConfigInput = {
        name: 'Config with common',
        strategy: 'round-robin',
        commonConfig
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.commonConfig).toEqual(commonConfig);
    });

    it('should store strategy-specific config', () => {
      // Arrange
      const strategyConfig: GeographicStrategyConfig = {
        geographicPreferences: ['US', 'EU'],
        excludeCountries: ['CN'],
        preferredRegions: ['us-east', 'eu-west']
      };
      const input: CreateRotationConfigInput = {
        name: 'Geographic Config',
        strategy: 'geographic',
        strategyConfig
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.strategyConfig).toEqual(strategyConfig);
    });

    it('should store target group', () => {
      // Arrange
      const input: CreateRotationConfigInput = {
        name: 'Group Config',
        strategy: 'round-robin',
        targetGroup: 'premium-proxies'
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.targetGroup).toBe('premium-proxies');
    });

    it('should store createdBy', () => {
      // Arrange
      const input: CreateRotationConfigInput = {
        name: 'Admin Config',
        strategy: 'weighted',
        createdBy: 'admin-user'
      };

      // Act
      const result = repository.create(input);

      // Assert
      expect(result.createdBy).toBe('admin-user');
    });

    it('should create with all strategy types', () => {
      const strategies = [
        'round-robin', 'random', 'weighted', 'least-used', 
        'fastest', 'geographic', 'sticky-session', 
        'time-based', 'failure-aware', 'custom-rules'
      ];

      for (const strategy of strategies) {
        const result = repository.create({
          name: `${strategy} config`,
          strategy: strategy as any
        });
        expect(result.strategy).toBe(strategy);
      }
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findById', () => {
    it('should find config by ID', () => {
      // Arrange
      const created = repository.create({
        name: 'Find Test',
        strategy: 'random'
      });

      // Act
      const found = repository.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Test');
    });

    it('should return null for non-existent ID', () => {
      // Act
      const found = repository.findById('non-existent-id');

      // Assert
      expect(found).toBeNull();
    });

    it('should return properly typed DTO', () => {
      // Arrange
      const created = repository.create({
        name: 'DTO Test',
        strategy: 'round-robin'
      });

      // Act
      const found = repository.findById(created.id);

      // Assert
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
      expect(typeof found?.isActive).toBe('boolean');
      expect(typeof found?.enabled).toBe('boolean');
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      repository.create({ name: 'Config 1', strategy: 'round-robin', enabled: true, priority: 1 });
      repository.create({ name: 'Config 2', strategy: 'random', enabled: true, priority: 2 });
      repository.create({ name: 'Config 3', strategy: 'weighted', enabled: false, priority: 3 });
    });

    it('should return all configs', () => {
      // Act
      const configs = repository.findAll();

      // Assert
      expect(configs).toHaveLength(3);
    });

    it('should filter by enabled status', () => {
      // Act
      const enabled = repository.findAll({ enabled: true });
      const disabled = repository.findAll({ enabled: false });

      // Assert
      expect(enabled).toHaveLength(2);
      expect(disabled).toHaveLength(1);
    });

    it('should filter by strategy', () => {
      // Act
      const roundRobin = repository.findAll({ strategy: 'round-robin' });

      // Assert
      expect(roundRobin).toHaveLength(1);
      expect(roundRobin[0].strategy).toBe('round-robin');
    });

    it('should order by priority DESC, then created_at DESC', () => {
      // Act
      const configs = repository.findAll();

      // Assert
      expect(configs[0].priority).toBe(3);
      expect(configs[1].priority).toBe(2);
      expect(configs[2].priority).toBe(1);
    });
  });

  describe('findActive', () => {
    it('should find active config for target group', () => {
      // Arrange
      const config = repository.create({
        name: 'Active Config',
        strategy: 'round-robin',
        targetGroup: 'group-a'
      });
      repository.setActive(config.id);

      // Act
      const active = repository.findActive('group-a');

      // Assert
      expect(active).not.toBeNull();
      expect(active?.id).toBe(config.id);
      expect(active?.isActive).toBe(true);
    });

    it('should find active config without target group', () => {
      // Arrange
      const config = repository.create({
        name: 'Global Active',
        strategy: 'random'
      });
      repository.setActive(config.id);

      // Act
      const active = repository.findActive();

      // Assert
      expect(active).not.toBeNull();
      expect(active?.isActive).toBe(true);
    });

    it('should return null when no active config', () => {
      // Act
      const active = repository.findActive();

      // Assert
      expect(active).toBeNull();
    });
  });

  describe('findByTargetGroup', () => {
    beforeEach(() => {
      repository.create({ name: 'Group A Config 1', strategy: 'round-robin', targetGroup: 'group-a', priority: 1 });
      repository.create({ name: 'Group A Config 2', strategy: 'random', targetGroup: 'group-a', priority: 2 });
      repository.create({ name: 'Group B Config', strategy: 'weighted', targetGroup: 'group-b', priority: 1 });
    });

    it('should find configs by target group', () => {
      // Act
      const configs = repository.findByTargetGroup('group-a');

      // Assert
      expect(configs).toHaveLength(2);
      expect(configs.every(c => c.targetGroup === 'group-a')).toBe(true);
    });

    it('should order by priority DESC', () => {
      // Act
      const configs = repository.findByTargetGroup('group-a');

      // Assert
      expect(configs[0].priority).toBe(2);
      expect(configs[1].priority).toBe(1);
    });

    it('should return empty for non-existent group', () => {
      // Act
      const configs = repository.findByTargetGroup('non-existent');

      // Assert
      expect(configs).toHaveLength(0);
    });
  });

  // ============================================================
  // UPDATE OPERATIONS TESTS
  // ============================================================
  describe('update', () => {
    it('should update config fields', () => {
      // Arrange
      const config = repository.create({
        name: 'Original Name',
        strategy: 'round-robin'
      });

      // Act
      const updated = repository.update(config.id, {
        name: 'Updated Name',
        description: 'Updated description'
      });

      // Assert
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.description).toBe('Updated description');
    });

    it('should update strategy', () => {
      // Arrange
      const config = repository.create({
        name: 'Strategy Test',
        strategy: 'round-robin'
      });

      // Act
      const updated = repository.update(config.id, { strategy: 'random' });

      // Assert
      expect(updated?.strategy).toBe('random');
    });

    it('should update common config', () => {
      // Arrange
      const config = repository.create({
        name: 'Common Config Test',
        strategy: 'round-robin'
      });

      const newCommonConfig: CommonRotationConfig = {
        interval: 120000,
        maxRequestsPerProxy: 200
      };

      // Act
      const updated = repository.update(config.id, { commonConfig: newCommonConfig });

      // Assert
      expect(updated?.commonConfig).toEqual(newCommonConfig);
    });

    it('should update enabled status', () => {
      // Arrange
      const config = repository.create({
        name: 'Enable Test',
        strategy: 'round-robin'
      });

      // Act
      const updated = repository.update(config.id, { enabled: false });

      // Assert
      expect(updated?.enabled).toBe(false);
    });

    it('should return null for non-existent ID', () => {
      // Act
      const updated = repository.update('non-existent', { name: 'Test' });

      // Assert
      expect(updated).toBeNull();
    });

    it('should return existing config if no updates', () => {
      // Arrange
      const config = repository.create({
        name: 'No Update Test',
        strategy: 'round-robin'
      });

      // Act
      const updated = repository.update(config.id, {});

      // Assert
      expect(updated?.id).toBe(config.id);
    });
  });

  // ============================================================
  // ACTIVATION TESTS
  // ============================================================
  describe('setActive', () => {
    it('should activate config', () => {
      // Arrange
      const config = repository.create({
        name: 'Activate Test',
        strategy: 'round-robin'
      });

      // Act
      const result = repository.setActive(config.id);

      // Assert
      expect(result).toBe(true);
      const updated = repository.findById(config.id);
      expect(updated?.isActive).toBe(true);
    });

    it('should deactivate other configs in same target group', () => {
      // Arrange
      const config1 = repository.create({
        name: 'Config 1',
        strategy: 'round-robin',
        targetGroup: 'group-a'
      });
      const config2 = repository.create({
        name: 'Config 2',
        strategy: 'random',
        targetGroup: 'group-a'
      });

      repository.setActive(config1.id);

      // Act
      repository.setActive(config2.id);

      // Assert
      expect(repository.findById(config1.id)?.isActive).toBe(false);
      expect(repository.findById(config2.id)?.isActive).toBe(true);
    });

    it('should not affect configs in different target groups', () => {
      // Arrange
      const configA = repository.create({
        name: 'Group A Config',
        strategy: 'round-robin',
        targetGroup: 'group-a'
      });
      const configB = repository.create({
        name: 'Group B Config',
        strategy: 'random',
        targetGroup: 'group-b'
      });

      repository.setActive(configA.id);
      repository.setActive(configB.id);

      // Assert - Both should be active
      expect(repository.findById(configA.id)?.isActive).toBe(true);
      expect(repository.findById(configB.id)?.isActive).toBe(true);
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.setActive('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('should deactivate config', () => {
      // Arrange
      const config = repository.create({
        name: 'Deactivate Test',
        strategy: 'round-robin'
      });
      repository.setActive(config.id);

      // Act
      const result = repository.deactivate(config.id);

      // Assert
      expect(result).toBe(true);
      expect(repository.findById(config.id)?.isActive).toBe(false);
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.deactivate('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // DELETE OPERATIONS TESTS
  // ============================================================
  describe('delete', () => {
    it('should delete config', () => {
      // Arrange
      const config = repository.create({
        name: 'Delete Test',
        strategy: 'round-robin'
      });

      // Act
      const result = repository.delete(config.id);

      // Assert
      expect(result).toBe(true);
      expect(repository.findById(config.id)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // DUPLICATE OPERATIONS TESTS
  // ============================================================
  describe('duplicate', () => {
    it('should duplicate config with new name', () => {
      // Arrange
      const original = repository.create({
        name: 'Original Config',
        strategy: 'round-robin',
        description: 'Original description',
        commonConfig: { interval: 60000 },
        priority: 5
      });

      // Act
      const duplicate = repository.duplicate(original.id, 'Duplicated Config');

      // Assert
      expect(duplicate).not.toBeNull();
      expect(duplicate?.name).toBe('Duplicated Config');
      expect(duplicate?.strategy).toBe(original.strategy);
      expect(duplicate?.description).toBe(original.description);
      expect(duplicate?.commonConfig).toEqual(original.commonConfig);
      expect(duplicate?.priority).toBe(original.priority);
    });

    it('should create duplicate as disabled', () => {
      // Arrange
      const original = repository.create({
        name: 'Original',
        strategy: 'round-robin',
        enabled: true
      });
      repository.setActive(original.id);

      // Act
      const duplicate = repository.duplicate(original.id, 'Duplicate');

      // Assert
      expect(duplicate?.enabled).toBe(false);
      expect(duplicate?.isActive).toBe(false);
    });

    it('should return null for non-existent ID', () => {
      // Act
      const duplicate = repository.duplicate('non-existent', 'New Name');

      // Assert
      expect(duplicate).toBeNull();
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('countByStrategy', () => {
    beforeEach(() => {
      repository.create({ name: 'RR 1', strategy: 'round-robin' });
      repository.create({ name: 'RR 2', strategy: 'round-robin' });
      repository.create({ name: 'Random 1', strategy: 'random' });
      repository.create({ name: 'Weighted 1', strategy: 'weighted' });
    });

    it('should return count by strategy', () => {
      // Act
      const counts = repository.countByStrategy();

      // Assert
      expect(counts['round-robin']).toBe(2);
      expect(counts['random']).toBe(1);
      expect(counts['weighted']).toBe(1);
    });

    it('should not include zero counts', () => {
      // Act
      const counts = repository.countByStrategy();

      // Assert
      expect(counts['geographic']).toBeUndefined();
    });
  });

  // ============================================================
  // RUNTIME CONFIG CONVERSION TESTS
  // ============================================================
  describe('toRuntimeConfig', () => {
    it('should convert DTO to runtime config', () => {
      // Arrange
      const config = repository.create({
        name: 'Runtime Test',
        strategy: 'geographic',
        commonConfig: {
          interval: 60000,
          maxRequestsPerProxy: 100,
          failureThreshold: 5,
          cooldownPeriod: 30000
        },
        strategyConfig: {
          geographicPreferences: ['US', 'EU'],
          excludeCountries: ['CN']
        }
      });

      const dto = repository.findById(config.id)!;

      // Act
      const runtimeConfig = repository.toRuntimeConfig(dto);

      // Assert
      expect(runtimeConfig.strategy).toBe('geographic');
      expect(runtimeConfig.interval).toBe(60000);
      expect(runtimeConfig.maxRequestsPerProxy).toBe(100);
      expect(runtimeConfig.failureThreshold).toBe(5);
      expect(runtimeConfig.cooldownPeriod).toBe(30000);
      expect(runtimeConfig.geographicPreferences).toEqual(['US', 'EU']);
      expect(runtimeConfig.excludeCountries).toEqual(['CN']);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty database', () => {
      // Act & Assert
      expect(repository.findAll()).toHaveLength(0);
      expect(repository.findActive()).toBeNull();
      expect(repository.countByStrategy()).toEqual({});
    });

    it('should handle special characters in name', () => {
      // Arrange
      const config = repository.create({
        name: "Test Config with 'quotes' and \"double quotes\"",
        strategy: 'round-robin'
      });

      // Assert
      expect(repository.findById(config.id)?.name).toBe("Test Config with 'quotes' and \"double quotes\"");
    });

    it('should handle complex strategy config', () => {
      // Arrange
      const complexConfig = {
        rules: [
          { condition: 'domain', value: '*.google.com', action: 'prefer', priority: 1 },
          { condition: 'time', value: '09:00-17:00', action: 'rotate', priority: 2 }
        ],
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      const config = repository.create({
        name: 'Complex Config',
        strategy: 'custom-rules',
        strategyConfig: complexConfig
      });

      // Assert
      expect(repository.findById(config.id)?.strategyConfig).toEqual(complexConfig);
    });

    it('should handle null target group activation', () => {
      // Arrange
      const config1 = repository.create({ name: 'No Group 1', strategy: 'round-robin' });
      const config2 = repository.create({ name: 'No Group 2', strategy: 'random' });

      repository.setActive(config1.id);

      // Act
      repository.setActive(config2.id);

      // Assert - First should be deactivated
      expect(repository.findById(config1.id)?.isActive).toBe(false);
      expect(repository.findById(config2.id)?.isActive).toBe(true);
    });
  });
});
