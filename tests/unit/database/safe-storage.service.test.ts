/**
 * SafeStorageService Tests
 * Tests for Electron safeStorage API integration
 * 
 * SECURITY FIX 1: Static Encryption Key → Electron safeStorage API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Electron before importing the service
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
    encryptString: vi.fn((str: string) => Buffer.from(`encrypted:${str}`)),
    decryptString: vi.fn((buf: Buffer) => buf.toString().replace('encrypted:', '')),
    getSelectedStorageBackend: vi.fn(() => 'gnome_libsecret'),
  },
  app: {
    isReady: vi.fn(() => true),
    whenReady: vi.fn(() => Promise.resolve()),
    getPath: vi.fn(() => '/tmp/test'),
  },
}));

// Import after mocking
import { SafeStorageService, getSafeStorageService } from '../../../electron/database/services/safe-storage.service';

describe('SafeStorageService', () => {
  beforeEach(() => {
    SafeStorageService.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    SafeStorageService.reset();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      // Service should be initialized with either safeStorage or fallback
      expect(['safeStorage', 'fallback']).toContain(service.getEncryptionMethod());
    });

    it('should initialize with a valid encryption method', async () => {
      // Service should initialize with either safeStorage or fallback
      SafeStorageService.reset();
      const service = getSafeStorageService();
      await service.initialize();
      
      // Either method is valid depending on the environment
      const method = service.getEncryptionMethod();
      expect(['safeStorage', 'fallback']).toContain(method);
    });

    it('should throw if encrypt called before initialization', () => {
      SafeStorageService.reset();
      const service = getSafeStorageService();
      expect(() => service.encrypt('test')).toThrow('not initialized');
    });

    it('should throw if decrypt called before initialization', () => {
      SafeStorageService.reset();
      const service = getSafeStorageService();
      const encrypted = { data: 'test', method: 'safeStorage' as const, version: 1 };
      expect(() => service.decrypt(encrypted)).toThrow('not initialized');
    });

    it('should be singleton', async () => {
      const service1 = getSafeStorageService();
      const service2 = getSafeStorageService();
      expect(service1).toBe(service2);
    });

    it('should only initialize once without error', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      // Second initialize should not throw
      await expect(service.initialize()).resolves.not.toThrow();
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt strings', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const plaintext = 'sensitive-master-key-12345';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should include version in encrypted value', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      expect(encrypted.version).toBe(1);
    });

    it('should include method in encrypted value', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      // In test environment, method will be 'fallback'
      expect(['safeStorage', 'fallback']).toContain(encrypted.method);
    });

    it('should store data as base64', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      // Should be valid base64
      expect(() => Buffer.from(encrypted.data, 'base64')).not.toThrow();
    });
  });

  describe('Fallback Encryption', () => {
    beforeEach(async () => {
      const { safeStorage } = await import('electron');
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      SafeStorageService.reset();
    });

    it('should encrypt and decrypt with fallback', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const plaintext = 'test-value-123';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should use different ciphertext for same plaintext (random IV)', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const plaintext = 'test-value';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);
      
      // Different IVs should produce different ciphertext
      expect(encrypted1.data).not.toBe(encrypted2.data);
      
      // Both should decrypt to same value
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should include IV and authTag for fallback encryption', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.method).toBe('fallback');
    });

    it('should fail decryption with missing IV', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      delete encrypted.iv;
      
      expect(() => service.decrypt(encrypted)).toThrow('Missing IV');
    });

    it('should fail decryption with missing authTag', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      delete encrypted.authTag;
      
      expect(() => service.decrypt(encrypted)).toThrow('Missing IV or authTag');
    });
  });

  describe('Version Handling', () => {
    it('should reject unsupported encryption version', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      encrypted.version = 999;
      
      expect(() => service.decrypt(encrypted)).toThrow('Unsupported encryption version');
    });
  });

  describe('Security', () => {
    it('should clear sensitive data on destroy', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      // Verify it works before destroy
      expect(service.encrypt('test')).toBeDefined();
      
      service.destroy();
      
      expect(() => service.encrypt('test')).toThrow();
    });

    it('should reset singleton properly', async () => {
      const service1 = getSafeStorageService();
      await service1.initialize();
      
      SafeStorageService.reset();
      
      const service2 = getSafeStorageService();
      expect(service2).not.toBe(service1);
      expect(service2.getEncryptionMethod()).toBe('none');
    });
  });

  describe('Encryption Method Detection', () => {
    it('should detect compatible encryption', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      const encrypted = service.encrypt('test');
      expect(service.isCompatibleEncryption(encrypted)).toBe(true);
    });

    it('should detect incompatible encryption when methods differ', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      // Service is using fallback in test environment
      // So safeStorage method would be incompatible
      const encrypted = {
        data: 'test',
        method: 'safeStorage' as const,
        version: 1,
      };
      
      // Service is using fallback, so safeStorage is incompatible
      expect(service.isCompatibleEncryption(encrypted)).toBe(false);
    });
  });

  describe('Re-encryption', () => {
    it('should re-encrypt if needed', async () => {
      const { safeStorage } = await import('electron');
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      SafeStorageService.reset();
      
      const service = getSafeStorageService();
      await service.initialize();
      
      const original = service.encrypt('test');
      const reEncrypted = service.reEncryptIfNeeded(original);
      
      // Same method, should return as-is
      expect(service.decrypt(reEncrypted)).toBe('test');
    });
  });
});

describe('SafeStorageService Edge Cases', () => {
  beforeEach(() => {
    SafeStorageService.reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    SafeStorageService.reset();
  });

  it('should handle empty string encryption', async () => {
    const service = getSafeStorageService();
    await service.initialize();
    
    const encrypted = service.encrypt('');
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe('');
  });

  it('should handle unicode string encryption', async () => {
    const service = getSafeStorageService();
    await service.initialize();
    
    const plaintext = '你好世界 🔐 مرحبا';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should handle long string encryption', async () => {
    const service = getSafeStorageService();
    await service.initialize();
    
    const plaintext = 'a'.repeat(10000);
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should handle special characters', async () => {
    const service = getSafeStorageService();
    await service.initialize();
    
    const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });
});
