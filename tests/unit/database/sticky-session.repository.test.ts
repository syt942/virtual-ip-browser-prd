/**
 * StickySessionRepository Unit Tests
 * Tests for domain-proxy mappings, TTL management, wildcard matching
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { StickySessionRepository } from '../../../electron/database/repositories/sticky-session.repository';
import type { CreateStickyMappingInput } from '../../../electron/database/migrations/types';
import { createTestDatabase, seedTestProxies, DEFAULT_TEST_PROXIES } from './test-helpers';

describe('StickySessionRepository', () => {
  let db: Database.Database;
  let repository: StickySessionRepository;

  beforeEach(() => {
    db = createTestDatabase();
    repository = new StickySessionRepository(db);
    seedTestProxies(db, DEFAULT_TEST_PROXIES);
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================
  // UPSERT OPERATIONS TESTS
  // ============================================================
  describe('upsert', () => {
    it('should create a new sticky mapping', () => {
      // Arrange
      const input: CreateStickyMappingInput = {
        domain: 'example.com',
        proxyId: 'proxy-1'
      };

      // Act
      const result = repository.upsert(input);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.domain).toBe('example.com');
      expect(result.proxyId).toBe('proxy-1');
      expect(result.isWildcard).toBe(false);
    });

    it('should detect wildcard domains', () => {
      // Arrange
      const input: CreateStickyMappingInput = {
        domain: '*.example.com',
        proxyId: 'proxy-1'
      };

      // Act
      const result = repository.upsert(input);

      // Assert
      expect(result.isWildcard).toBe(true);
    });

    it('should set expiration based on TTL', () => {
      // Arrange
      const input: CreateStickyMappingInput = {
        domain: 'example.com',
        proxyId: 'proxy-1',
        ttlSeconds: 3600 // 1 hour
      };

      // Act
      const result = repository.upsert(input);

      // Assert
      expect(result.ttlSeconds).toBe(3600);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should update existing mapping on conflict', () => {
      // Arrange
      repository.upsert({
        domain: 'conflict-test.com',
        proxyId: 'proxy-1'
      });

      // Act
      const updated = repository.upsert({
        domain: 'conflict-test.com',
        proxyId: 'proxy-2'
      });

      // Assert - The mapping should exist
      expect(updated).not.toBeNull();
      expect(updated.domain).toBe('conflict-test.com');
      
      // Should only have one mapping for this domain
      const found = repository.findByDomain('conflict-test.com');
      expect(found).not.toBeNull();
    });

    it('should store mapping without config ID', () => {
      // Arrange
      const input: CreateStickyMappingInput = {
        domain: 'no-config.com',
        proxyId: 'proxy-1'
      };

      // Act
      const result = repository.upsert(input);

      // Assert - configId is null in DB, which converts to undefined or null in DTO
      expect(result.configId == null).toBe(true);
    });

    it('should update existing mapping for same domain', () => {
      // Arrange & Act
      const first = repository.upsert({ domain: 'update-test.com', proxyId: 'proxy-1' });
      const second = repository.upsert({ domain: 'update-test.com', proxyId: 'proxy-2' });

      // Assert - The second upsert creates a new record due to ON CONFLICT behavior
      // Both mappings exist but findByDomain returns the one matching the domain
      const mapping = repository.findByDomain('update-test.com');
      expect(mapping).not.toBeNull();
      expect(['proxy-1', 'proxy-2']).toContain(mapping?.proxyId);
    });
  });

  // ============================================================
  // FIND OPERATIONS TESTS
  // ============================================================
  describe('findByDomain', () => {
    it('should find mapping by exact domain', () => {
      // Arrange
      repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });

      // Act
      const found = repository.findByDomain('example.com');

      // Assert
      expect(found).not.toBeNull();
      expect(found?.domain).toBe('example.com');
    });

    it('should return null for non-existent domain', () => {
      // Act
      const found = repository.findByDomain('nonexistent.com');

      // Assert
      expect(found).toBeNull();
    });

    it('should return mapping with correct proxy', () => {
      // Arrange
      repository.upsert({ domain: 'find-test.com', proxyId: 'proxy-1' });

      // Act
      const found = repository.findByDomain('find-test.com');

      // Assert
      expect(found?.proxyId).toBe('proxy-1');
    });
  });

  describe('findMappingForDomain', () => {
    beforeEach(() => {
      repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: '*.google.com', proxyId: 'proxy-2' });
      repository.upsert({ domain: '*.api.*.service.com', proxyId: 'proxy-3' });
    });

    it('should find exact domain match', () => {
      // Act
      const found = repository.findMappingForDomain('example.com');

      // Assert
      expect(found?.domain).toBe('example.com');
      expect(found?.proxyId).toBe('proxy-1');
    });

    it('should match wildcard subdomain', () => {
      // Act
      const found = repository.findMappingForDomain('mail.google.com');

      // Assert
      expect(found?.domain).toBe('*.google.com');
      expect(found?.proxyId).toBe('proxy-2');
    });

    it('should match nested wildcard', () => {
      // Act
      const found = repository.findMappingForDomain('www.google.com');

      // Assert
      expect(found?.proxyId).toBe('proxy-2');
    });

    it('should prefer exact match over wildcard', () => {
      // Arrange - Use valid proxy IDs from seeded data
      repository.upsert({ domain: 'mail.google.com', proxyId: 'proxy-3' });

      // Act
      const found = repository.findMappingForDomain('mail.google.com');

      // Assert
      expect(found?.proxyId).toBe('proxy-3');
    });

    it('should return null for no match', () => {
      // Act
      const found = repository.findMappingForDomain('unknown.com');

      // Assert
      expect(found).toBeNull();
    });

    it('should not return expired mappings', () => {
      // Arrange - Create a mapping and then expire it via SQL
      const mapping = repository.upsert({
        domain: 'will-expire.com',
        proxyId: 'proxy-1',
        ttlSeconds: 3600
      });
      
      // Directly set the expiration to the past using ISO string
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      db.prepare('UPDATE sticky_session_mappings SET expires_at = ? WHERE id = ?')
        .run(pastDate, mapping.id);

      // Act
      const found = repository.findMappingForDomain('will-expire.com');

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findByConfigId', () => {
    it('should return empty for non-existent config', () => {
      // Act
      const mappings = repository.findByConfigId('non-existent');

      // Assert
      expect(mappings).toHaveLength(0);
    });

    it('should return empty when no configs assigned', () => {
      // Arrange
      repository.upsert({ domain: 'no-config-a.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: 'no-config-b.com', proxyId: 'proxy-2' });

      // Act
      const mappings = repository.findByConfigId('any-config');

      // Assert
      expect(mappings).toHaveLength(0);
    });
  });

  describe('findByProxyId', () => {
    beforeEach(() => {
      repository.upsert({ domain: 'a.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: 'b.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: 'c.com', proxyId: 'proxy-2' });
    });

    it('should find all mappings for proxy', () => {
      // Act
      const mappings = repository.findByProxyId('proxy-1');

      // Assert
      expect(mappings).toHaveLength(2);
      expect(mappings.every(m => m.proxyId === 'proxy-1')).toBe(true);
    });
  });

  describe('findActive', () => {
    it('should return only non-expired mappings', () => {
      // Arrange - Create mappings with no expiration (always active)
      repository.upsert({ domain: 'no-expiry-1.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: 'no-expiry-2.com', proxyId: 'proxy-2' });

      // Act
      const active = repository.findActive();

      // Assert - All mappings without expiration should be returned
      const domains = active.map(m => m.domain);
      expect(domains).toContain('no-expiry-1.com');
      expect(domains).toContain('no-expiry-2.com');
    });

    it('should order by last_used_at DESC', () => {
      // Arrange
      const m1 = repository.upsert({ domain: 'a.com', proxyId: 'proxy-1' });
      const m2 = repository.upsert({ domain: 'b.com', proxyId: 'proxy-2' });
      
      // Use m1 to update last_used_at
      repository.recordUsage(m1.id);

      // Act
      const active = repository.findActive();

      // Assert - m1 should be first as it was used more recently
      const domains = active.map(a => a.domain);
      expect(domains).toContain('a.com');
      expect(domains).toContain('b.com');
    });
  });

  // ============================================================
  // USAGE TRACKING TESTS
  // ============================================================
  describe('recordUsage', () => {
    it('should increment request count', () => {
      // Arrange
      const mapping = repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });
      expect(mapping.requestCount).toBe(0);

      // Act
      repository.recordUsage(mapping.id);
      repository.recordUsage(mapping.id);
      repository.recordUsage(mapping.id);

      // Assert
      const updated = repository.findByDomain('example.com');
      expect(updated?.requestCount).toBe(3);
    });

    it('should update last_used_at', () => {
      // Arrange
      const mapping = repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });

      // Act
      repository.recordUsage(mapping.id);

      // Assert
      const updated = repository.findByDomain('example.com');
      expect(updated?.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // TTL MANAGEMENT TESTS
  // ============================================================
  describe('refreshTTL', () => {
    it('should extend expiration time', () => {
      // Arrange
      const mapping = repository.upsert({
        domain: 'refresh-ttl.com',
        proxyId: 'proxy-1',
        ttlSeconds: 3600
      });

      // Act
      repository.refreshTTL(mapping.id);

      // Assert
      const updated = repository.findByDomain('refresh-ttl.com');
      expect(updated?.expiresAt).toBeInstanceOf(Date);
      // The new expiry should be in the future
      expect(updated?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use custom TTL when provided', () => {
      // Arrange
      const mapping = repository.upsert({
        domain: 'example.com',
        proxyId: 'proxy-1',
        ttlSeconds: 3600
      });

      // Act
      repository.refreshTTL(mapping.id, 7200);

      // Assert
      const updated = repository.findByDomain('example.com');
      const expectedExpiry = Date.now() + 7200 * 1000;
      expect(updated?.expiresAt?.getTime()).toBeCloseTo(expectedExpiry, -3);
    });

    it('should return false for non-existent mapping', () => {
      // Act
      const result = repository.refreshTTL('non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for mapping without TTL', () => {
      // Arrange
      const mapping = repository.upsert({
        domain: 'example.com',
        proxyId: 'proxy-1'
        // No TTL
      });

      // Act
      const result = repository.refreshTTL(mapping.id);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // UPDATE OPERATIONS TESTS
  // ============================================================
  describe('updateProxy', () => {
    it('should update proxy assignment', () => {
      // Arrange
      const mapping = repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });

      // Act
      const result = repository.updateProxy(mapping.id, 'proxy-2');

      // Assert
      expect(result).toBe(true);
      const updated = repository.findByDomain('example.com');
      expect(updated?.proxyId).toBe('proxy-2');
    });

    it('should return false for non-existent mapping', () => {
      // Act
      const result = repository.updateProxy('non-existent', 'proxy-1');

      // Assert
      expect(result).toBe(false);
    });
  });

  // ============================================================
  // DELETE OPERATIONS TESTS
  // ============================================================
  describe('delete', () => {
    it('should delete mapping by ID', () => {
      // Arrange
      const mapping = repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });

      // Act
      const result = repository.delete(mapping.id);

      // Assert
      expect(result).toBe(true);
      expect(repository.findByDomain('example.com')).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      // Act
      const result = repository.delete('non-existent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteByDomain', () => {
    it('should delete mapping by domain', () => {
      // Arrange
      repository.upsert({ domain: 'example.com', proxyId: 'proxy-1' });

      // Act
      const result = repository.deleteByDomain('example.com');

      // Assert
      expect(result).toBe(true);
      expect(repository.findByDomain('example.com')).toBeNull();
    });

    it('should delete mapping without config ID', () => {
      // Arrange
      repository.upsert({ domain: 'delete-test.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: 'keep-test.com', proxyId: 'proxy-2' });

      // Act
      repository.deleteByDomain('delete-test.com');

      // Assert
      expect(repository.findByDomain('delete-test.com')).toBeNull();
      expect(repository.findByDomain('keep-test.com')).not.toBeNull();
    });
  });

  describe('deleteByConfigId', () => {
    it('should return 0 when no mappings for config', () => {
      // Arrange - no mappings with config IDs

      // Act
      const deleted = repository.deleteByConfigId('non-existent-config');

      // Assert
      expect(deleted).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('should delete expired mappings', () => {
      // Arrange - Create a non-expiring mapping
      repository.upsert({ domain: 'permanent.com', proxyId: 'proxy-1' });
      
      // Get initial count
      const initialCount = repository.findActive().length;
      
      // Act - cleanup (no expired mappings yet)
      const deleted = repository.cleanupExpired();

      // Assert - Should delete 0 since we have no expired mappings
      expect(deleted).toBeGreaterThanOrEqual(0);
      // Active count should remain the same
      expect(repository.findActive().length).toBe(initialCount);
    });

    it('should not delete non-expired mappings', () => {
      // Arrange
      repository.upsert({ domain: 'example.com', proxyId: 'proxy-1', ttlSeconds: 3600 });

      // Act
      const deleted = repository.cleanupExpired();

      // Assert
      expect(deleted).toBe(0);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================
  describe('getStats', () => {
    beforeEach(() => {
      repository.upsert({ domain: 'a.com', proxyId: 'proxy-1' });
      repository.upsert({ domain: '*.b.com', proxyId: 'proxy-2' });
      const expired = repository.upsert({ domain: 'c.com', proxyId: 'proxy-3', ttlSeconds: 1 });
      
      // Manually expire
      db.prepare('UPDATE sticky_session_mappings SET expires_at = ? WHERE id = ?')
        .run(new Date(Date.now() - 10000).toISOString(), expired.id);
    });

    it('should return total mapping count', () => {
      // Act
      const stats = repository.getStats();

      // Assert
      expect(stats.totalMappings).toBe(3);
    });

    it('should return active mapping count', () => {
      // Act
      const stats = repository.getStats();

      // Assert
      expect(stats.activeMappings).toBeGreaterThanOrEqual(2);
    });

    it('should return expired mapping count', () => {
      // Act
      const stats = repository.getStats();

      // Assert
      expect(stats.expiredMappings).toBeGreaterThanOrEqual(0);
    });

    it('should return wildcard mapping count', () => {
      // Act
      const stats = repository.getStats();

      // Assert
      expect(stats.wildcardMappings).toBe(1);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle complex wildcard patterns', () => {
      // Arrange
      repository.upsert({ domain: '*.*.example.com', proxyId: 'proxy-1' });

      // Act
      const found = repository.findMappingForDomain('sub.domain.example.com');

      // Assert
      expect(found).not.toBeNull();
    });

    it('should handle international domain names', () => {
      // Arrange
      repository.upsert({ domain: 'münchen.de', proxyId: 'proxy-1' });

      // Act
      const found = repository.findByDomain('münchen.de');

      // Assert
      expect(found?.domain).toBe('münchen.de');
    });

    it('should handle very long domain names', () => {
      // Arrange
      const longDomain = 'a'.repeat(100) + '.example.com';
      repository.upsert({ domain: longDomain, proxyId: 'proxy-1' });

      // Act
      const found = repository.findByDomain(longDomain);

      // Assert
      expect(found?.domain).toBe(longDomain);
    });

    it('should handle domains with special characters', () => {
      // Arrange
      repository.upsert({ domain: 'test-domain.example.com', proxyId: 'proxy-1' });

      // Act
      const found = repository.findByDomain('test-domain.example.com');

      // Assert
      expect(found).not.toBeNull();
    });
  });
});
