/**
 * EncryptionService Unit Tests
 * Tests for electron/database/services/encryption.service.ts
 * 
 * Coverage targets:
 * - Initialization with password/salt and raw key
 * - Encrypt/decrypt strings, objects, credentials
 * - Error handling for invalid inputs
 * - Key management and re-encryption
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptionService } from '../../../electron/database/services/encryption.service';
import { encryptionTestData } from '../../fixtures/credentials';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    service = new EncryptionService();
  });

  afterEach(() => {
    service.destroy();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('initializes with master password and salt', () => {
      service.initialize('test-password', 'test-salt-12345');
      
      expect(service.isInitialized()).toBe(true);
      expect(service.getKeyId()).not.toBeNull();
      expect(service.getKeyId()).toHaveLength(16);
    });

    it('initializes with master password using generated salt', () => {
      service.initialize('test-password');
      
      expect(service.isInitialized()).toBe(true);
      expect(service.getKeyId()).not.toBeNull();
    });

    it('initializes with raw key buffer', () => {
      const key = EncryptionService.generateKey();
      service.initializeWithKey(key);
      
      expect(service.isInitialized()).toBe(true);
      expect(service.getKeyId()).not.toBeNull();
    });

    it('throws if key length is incorrect', () => {
      const shortKey = Buffer.alloc(16); // Should be 32 bytes
      
      expect(() => service.initializeWithKey(shortKey)).toThrow('Key must be 32 bytes');
    });

    it('isInitialized returns false before initialization', () => {
      expect(service.isInitialized()).toBe(false);
      expect(service.getKeyId()).toBeNull();
    });

    it('generates different key IDs for different passwords', () => {
      const service1 = new EncryptionService();
      const service2 = new EncryptionService();
      
      service1.initialize('password1', 'salt');
      service2.initialize('password2', 'salt');
      
      expect(service1.getKeyId()).not.toBe(service2.getKeyId());
      
      service1.destroy();
      service2.destroy();
    });
  });

  // ============================================================================
  // ENCRYPTION TESTS
  // ============================================================================

  describe('Encryption', () => {
    beforeEach(() => {
      service.initialize('test-master-password', 'test-salt');
    });

    it('encrypts and decrypts string correctly', () => {
      const plaintext = 'Hello, World!';
      
      const { encrypted, keyId } = service.encrypt(plaintext);
      const result = service.decrypt(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe(plaintext);
      expect(keyId).toBe(service.getKeyId());
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same text';
      
      const result1 = service.encrypt(plaintext);
      const result2 = service.encrypt(plaintext);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      
      // But both decrypt to same value
      expect(service.decrypt(result1.encrypted).decrypted).toBe(plaintext);
      expect(service.decrypt(result2.encrypted).decrypted).toBe(plaintext);
    });

    it('throws when encrypting without initialization', () => {
      const uninitializedService = new EncryptionService();
      
      expect(() => uninitializedService.encrypt('test')).toThrow('Encryption service not initialized');
    });

    it('encrypts empty string', () => {
      const { encrypted } = service.encrypt('');
      const result = service.decrypt(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe('');
    });

    it('encrypts special characters correctly', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
      
      const { encrypted } = service.encrypt(specialChars);
      const result = service.decrypt(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe(specialChars);
    });

    it('encrypts unicode characters correctly', () => {
      const unicode = '你好世界 🎉 Привет мир';
      
      const { encrypted } = service.encrypt(unicode);
      const result = service.decrypt(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe(unicode);
    });

    it('encrypts long strings', () => {
      const longString = 'x'.repeat(10000);
      
      const { encrypted } = service.encrypt(longString);
      const result = service.decrypt(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.decrypted).toBe(longString);
    });
  });

  // ============================================================================
  // DECRYPTION ERROR TESTS
  // ============================================================================

  describe('Decryption Errors', () => {
    beforeEach(() => {
      service.initialize('test-master-password', 'test-salt');
    });

    it('returns error for uninitialized service', () => {
      const uninitializedService = new EncryptionService();
      
      const result = uninitializedService.decrypt('some:encrypted:data');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('returns error for invalid encrypted format', () => {
      const result = service.decrypt('not-valid-format');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid encrypted format');
    });

    it('returns error for tampered ciphertext', () => {
      const { encrypted } = service.encrypt('original');
      
      // Tamper with the ciphertext portion
      const parts = encrypted.split(':');
      parts[1] = 'tampered' + parts[1].slice(8);
      const tampered = parts.join(':');
      
      const result = service.decrypt(tampered);
      
      expect(result.success).toBe(false);
    });

    it('returns error for wrong key', () => {
      const { encrypted } = service.encrypt('secret');
      
      // Create new service with different key
      const otherService = new EncryptionService();
      otherService.initialize('different-password', 'different-salt');
      
      const result = otherService.decrypt(encrypted);
      
      expect(result.success).toBe(false);
      
      otherService.destroy();
    });

    it('returns error for empty encrypted value', () => {
      const result = service.decrypt('');
      
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // OBJECT ENCRYPTION TESTS
  // ============================================================================

  describe('Object Encryption', () => {
    beforeEach(() => {
      service.initialize('test-master-password', 'test-salt');
    });

    it('encrypts and decrypts objects correctly', () => {
      const obj = { name: 'test', value: 123, nested: { a: 1 } };
      
      const { encrypted } = service.encryptObject(obj);
      const result = service.decryptObject<typeof obj>(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(obj);
    });

    it('handles arrays in objects', () => {
      const obj = { items: [1, 2, 3], names: ['a', 'b'] };
      
      const { encrypted } = service.encryptObject(obj);
      const result = service.decryptObject<typeof obj>(encrypted);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(obj);
    });

    it('returns error for corrupted JSON', () => {
      // Encrypt valid object first
      const { encrypted } = service.encryptObject({ test: true });
      
      // Decrypt should work
      const result = service.decryptObject<{ test: boolean }>(encrypted);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // CREDENTIALS ENCRYPTION TESTS
  // ============================================================================

  describe('Credentials Encryption', () => {
    beforeEach(() => {
      service.initialize('test-master-password', 'test-salt');
    });

    it('encrypts credentials pair correctly', () => {
      const username = 'testuser';
      const password = 'testpass123';
      
      const result = service.encryptCredentials(username, password);
      
      expect(result.encryptedUsername).toBeTruthy();
      expect(result.encryptedPassword).toBeTruthy();
      expect(result.keyId).toBe(service.getKeyId());
      
      // Verify they're different
      expect(result.encryptedUsername).not.toBe(result.encryptedPassword);
    });

    it('decrypts credentials correctly', () => {
      const username = 'testuser';
      const password = 'testpass123';
      
      const { encryptedUsername, encryptedPassword } = service.encryptCredentials(username, password);
      const result = service.decryptCredentials(encryptedUsername, encryptedPassword);
      
      expect(result.success).toBe(true);
      expect(result.username).toBe(username);
      expect(result.password).toBe(password);
    });

    it('returns error for invalid username encryption', () => {
      const result = service.decryptCredentials('invalid', 'also-invalid');
      
      expect(result.success).toBe(false);
      expect(result.username).toBeNull();
      expect(result.password).toBeNull();
    });
  });

  // ============================================================================
  // KEY MANAGEMENT TESTS
  // ============================================================================

  describe('Key Management', () => {
    it('generates unique key IDs', () => {
      const service1 = new EncryptionService();
      const service2 = new EncryptionService();
      
      service1.initialize('password1', 'salt1');
      service2.initialize('password2', 'salt2');
      
      expect(service1.getKeyId()).not.toBe(service2.getKeyId());
      
      service1.destroy();
      service2.destroy();
    });

    it('verifyKeyId returns true for matching key', () => {
      service.initialize('password', 'salt');
      const keyId = service.getKeyId()!;
      
      expect(service.verifyKeyId(keyId)).toBe(true);
    });

    it('verifyKeyId returns false for non-matching key', () => {
      service.initialize('password', 'salt');
      
      expect(service.verifyKeyId('wrong-key-id')).toBe(false);
    });

    it('re-encrypts data with new key', () => {
      const oldKey = EncryptionService.generateKey();
      const newKey = EncryptionService.generateKey();
      
      // Encrypt with old key
      service.initializeWithKey(oldKey);
      const { encrypted: oldEncrypted } = service.encrypt('secret data');
      
      // Re-encrypt with new key
      const result = service.reEncrypt(oldEncrypted, oldKey, newKey);
      
      expect(result).not.toBeNull();
      expect(result!.encrypted).not.toBe(oldEncrypted);
      
      // Verify new encryption works with new key
      service.initializeWithKey(newKey);
      const decrypted = service.decrypt(result!.encrypted);
      
      expect(decrypted.success).toBe(true);
      expect(decrypted.decrypted).toBe('secret data');
    });

    it('reEncrypt returns null for invalid old key', () => {
      const wrongKey = EncryptionService.generateKey();
      const newKey = EncryptionService.generateKey();
      const actualKey = EncryptionService.generateKey();
      
      // Encrypt with actual key
      service.initializeWithKey(actualKey);
      const { encrypted } = service.encrypt('secret');
      
      // Try to re-encrypt with wrong old key
      const result = service.reEncrypt(encrypted, wrongKey, newKey);
      
      expect(result).toBeNull();
    });

    it('generateKey creates 32-byte keys', () => {
      const key = EncryptionService.generateKey();
      
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('generateSalt creates valid hex salt', () => {
      const salt = service.generateSalt();
      
      expect(salt).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(salt)).toBe(true);
    });
  });

  // ============================================================================
  // LIFECYCLE TESTS
  // ============================================================================

  describe('Lifecycle', () => {
    it('destroy clears the master key', () => {
      service.initialize('password', 'salt');
      expect(service.isInitialized()).toBe(true);
      
      service.destroy();
      
      expect(service.isInitialized()).toBe(false);
      expect(service.getKeyId()).toBeNull();
    });

    it('cannot encrypt after destroy', () => {
      service.initialize('password', 'salt');
      service.destroy();
      
      expect(() => service.encrypt('test')).toThrow();
    });

    it('can reinitialize after destroy', () => {
      service.initialize('password1', 'salt1');
      const keyId1 = service.getKeyId();
      
      service.destroy();
      
      service.initialize('password2', 'salt2');
      const keyId2 = service.getKeyId();
      
      expect(service.isInitialized()).toBe(true);
      expect(keyId2).not.toBe(keyId1);
    });
  });

  // ============================================================================
  // EDGE CASES WITH TEST DATA
  // ============================================================================

  describe('Edge Cases', () => {
    beforeEach(() => {
      service.initialize('test-password', 'test-salt');
    });

    it.each(encryptionTestData.plainTexts)(
      'encrypts and decrypts: %s',
      (plaintext) => {
        const { encrypted } = service.encrypt(plaintext);
        const result = service.decrypt(encrypted);
        
        expect(result.success).toBe(true);
        expect(result.decrypted).toBe(plaintext);
      }
    );
  });
});
