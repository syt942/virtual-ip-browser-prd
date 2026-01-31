/**
 * EncryptedCredentialsRepository Unit Tests
 * Tests for secure credential storage operations
 * 
 * Coverage targets:
 * - CRUD operations
 * - Query methods (by proxy, type, provider)
 * - Access tracking
 * - Rotation management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { EncryptedCredentialsRepository } from '../../../electron/database/repositories/encrypted-credentials.repository';
import { createTestDatabaseWithSchema, cleanupDatabase, insertTestProxy } from '../../helpers/test-helpers';

describe('EncryptedCredentialsRepository', () => {
  let db: Database.Database;
  let repo: EncryptedCredentialsRepository;
  let proxyId: string;

  beforeEach(() => {
    db = createTestDatabaseWithSchema();
    repo = new EncryptedCredentialsRepository(db);
    proxyId = insertTestProxy(db);
  });

  afterEach(() => {
    cleanupDatabase(db);
  });

  // ============================================================
  // CREATE TESTS
  // ============================================================
  describe('create', () => {
    it('creates credential with all fields', () => {
      // Act
      const cred = repo.create({
        proxyId,
        credentialName: 'Test Credential',
        credentialType: 'basic',
        encryptedUsername: 'encrypted-user',
        encryptedPassword: 'encrypted-pass',
        keyId: 'key-123',
        provider: 'test-provider',
        expiresAt: new Date('2025-12-31'),
        accessLevel: 'team',
      });

      // Assert
      expect(cred.id).toBeDefined();
      expect(cred.credentialName).toBe('Test Credential');
      expect(cred.credentialType).toBe('basic');
      expect(cred.proxyId).toBe(proxyId);
      expect(cred.accessLevel).toBe('team');
    });

    it('creates credential with minimal fields', () => {
      // Act
      const cred = repo.create({
        credentialName: 'Minimal',
        credentialType: 'api_key',
      });

      // Assert
      expect(cred.id).toBeDefined();
      expect(cred.credentialName).toBe('Minimal');
      expect(cred.encryptionVersion).toBe(1);
      expect(cred.rotationRequired).toBe(false);
      expect(cred.accessLevel).toBe('private');
      expect(cred.accessCount).toBe(0);
    });
  });

  // ============================================================
  // FIND BY ID TESTS
  // ============================================================
  describe('findById', () => {
    it('finds credential by ID', () => {
      // Arrange
      const created = repo.create({
        credentialName: 'Test',
        credentialType: 'basic',
      });

      // Act
      const found = repo.findById(created.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('returns null for non-existent ID', () => {
      // Act
      const result = repo.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================================
  // QUERY METHOD TESTS
  // ============================================================
  describe('findByProxyId', () => {
    it('finds credentials for proxy', () => {
      // Arrange
      repo.create({ proxyId, credentialName: 'Cred 1', credentialType: 'basic' });
      repo.create({ proxyId, credentialName: 'Cred 2', credentialType: 'api_key' });
      repo.create({ credentialName: 'Other', credentialType: 'basic' }); // No proxy

      // Act
      const result = repo.findByProxyId(proxyId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.proxyId === proxyId)).toBe(true);
    });
  });

  describe('findByType', () => {
    it('finds credentials by type', () => {
      // Arrange
      repo.create({ credentialName: 'Basic 1', credentialType: 'basic' });
      repo.create({ credentialName: 'Basic 2', credentialType: 'basic' });
      repo.create({ credentialName: 'API Key', credentialType: 'api_key' });

      // Act
      const result = repo.findByType('basic');

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(c => c.credentialType === 'basic')).toBe(true);
    });
  });

  describe('findByProvider', () => {
    it('finds credentials by provider', () => {
      // Arrange
      repo.create({ credentialName: 'P1', credentialType: 'api_key', provider: 'provider-a' });
      repo.create({ credentialName: 'P2', credentialType: 'api_key', provider: 'provider-a' });
      repo.create({ credentialName: 'P3', credentialType: 'api_key', provider: 'provider-b' });

      // Act
      const result = repo.findByProvider('provider-a');

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  // ============================================================
  // ACCESS TRACKING TESTS
  // ============================================================
  describe('getWithAccessTracking', () => {
    it('increments access count on retrieval', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });
      expect(cred.accessCount).toBe(0);

      // Act
      repo.getWithAccessTracking(cred.id);
      repo.getWithAccessTracking(cred.id);
      const result = repo.getWithAccessTracking(cred.id);

      // Assert
      expect(result?.accessCount).toBe(3);
    });

    it('updates lastAccessedAt timestamp', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });
      expect(cred.lastAccessedAt).toBeUndefined();

      // Act
      const result = repo.getWithAccessTracking(cred.id);

      // Assert
      expect(result?.lastAccessedAt).not.toBeUndefined();
    });
  });

  // ============================================================
  // ENCRYPTION MANAGEMENT TESTS
  // ============================================================
  describe('updateEncryptedData', () => {
    it('updates encrypted data fields', () => {
      // Arrange
      const cred = repo.create({
        credentialName: 'Test',
        credentialType: 'basic',
        encryptedUsername: 'old-user',
        encryptedPassword: 'old-pass',
      });

      // Act
      const result = repo.updateEncryptedData(cred.id, {
        encryptedUsername: 'new-user',
        encryptedPassword: 'new-pass',
      });

      // Assert
      expect(result).toBe(true);
      const updated = repo.findById(cred.id);
      expect(updated?.encryptedUsername).toBe('new-user');
      expect(updated?.encryptedPassword).toBe('new-pass');
    });

    it('updates key ID', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });

      // Act
      repo.updateEncryptedData(cred.id, { keyId: 'new-key-id' });

      // Assert
      expect(repo.findById(cred.id)?.keyId).toBe('new-key-id');
    });
  });

  describe('markForRotation', () => {
    it('marks credential for rotation', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });
      expect(cred.rotationRequired).toBe(false);

      // Act
      const result = repo.markForRotation(cred.id);

      // Assert
      expect(result).toBe(true);
      expect(repo.findById(cred.id)?.rotationRequired).toBe(true);
    });
  });

  describe('clearRotationRequired', () => {
    it('clears rotation required flag', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });
      repo.markForRotation(cred.id);

      // Act
      const result = repo.clearRotationRequired(cred.id);

      // Assert
      expect(result).toBe(true);
      const updated = repo.findById(cred.id);
      expect(updated?.rotationRequired).toBe(false);
      expect(updated?.lastRotatedAt).not.toBeUndefined();
    });
  });

  describe('incrementEncryptionVersion', () => {
    it('increments encryption version', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });
      expect(cred.encryptionVersion).toBe(1);

      // Act
      repo.incrementEncryptionVersion(cred.id);

      // Assert
      expect(repo.findById(cred.id)?.encryptionVersion).toBe(2);
    });
  });

  // ============================================================
  // ROTATION QUERY TESTS
  // ============================================================
  describe('findNeedingRotation', () => {
    it('finds credentials marked for rotation', () => {
      // Arrange
      const needsRotation = repo.create({ credentialName: 'Needs', credentialType: 'basic' });
      repo.markForRotation(needsRotation.id);
      repo.create({ credentialName: 'Does Not Need', credentialType: 'basic' });

      // Act
      const result = repo.findNeedingRotation();

      // Assert
      expect(result.some(c => c.id === needsRotation.id)).toBe(true);
    });

    it('finds credentials expiring within 7 days', () => {
      // Arrange
      const expiringSoon = repo.create({
        credentialName: 'Expiring Soon',
        credentialType: 'basic',
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      });

      const notExpiring = repo.create({
        credentialName: 'Not Expiring',
        credentialType: 'basic',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Act
      const result = repo.findNeedingRotation();

      // Assert
      expect(result.some(c => c.id === expiringSoon.id)).toBe(true);
    });
  });

  describe('findExpired', () => {
    it('finds expired credentials', () => {
      // Arrange
      const expired = repo.create({
        credentialName: 'Expired',
        credentialType: 'basic',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const valid = repo.create({
        credentialName: 'Valid',
        credentialType: 'basic',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      });

      // Act
      const result = repo.findExpired();

      // Assert
      expect(result.some(c => c.id === expired.id)).toBe(true);
      expect(result.some(c => c.id === valid.id)).toBe(false);
    });
  });

  // ============================================================
  // DELETE TESTS
  // ============================================================
  describe('delete', () => {
    it('deletes credential by ID', () => {
      // Arrange
      const cred = repo.create({ credentialName: 'Test', credentialType: 'basic' });

      // Act
      const result = repo.delete(cred.id);

      // Assert
      expect(result).toBe(true);
      expect(repo.findById(cred.id)).toBeNull();
    });
  });

  describe('deleteByProxyId', () => {
    it('deletes all credentials for proxy', () => {
      // Arrange
      repo.create({ proxyId, credentialName: 'Cred 1', credentialType: 'basic' });
      repo.create({ proxyId, credentialName: 'Cred 2', credentialType: 'api_key' });
      const otherProxy = insertTestProxy(db, { name: 'Other' });
      repo.create({ proxyId: otherProxy, credentialName: 'Other', credentialType: 'basic' });

      // Act
      const count = repo.deleteByProxyId(proxyId);

      // Assert
      expect(count).toBe(2);
      expect(repo.findByProxyId(proxyId)).toHaveLength(0);
      expect(repo.findByProxyId(otherProxy)).toHaveLength(1);
    });
  });
});
