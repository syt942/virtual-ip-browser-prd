/**
 * ConfigManager Tests
 * TDD tests for secure masterKey initialization and persistence
 * 
 * Tests cover:
 * - Key generation (32-byte random key)
 * - Key persistence (electron-store as hex string)
 * - Key retrieval on subsequent launches
 * - Key validation (format, length)
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomBytes as realRandomBytes } from 'crypto';

// Mock electron-store before importing ConfigManager
const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
};

vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => mockStore),
  };
});

// Import after mocks are set up
import { ConfigManager, type ConfigManagerOptions, type RandomBytesFunction } from '../../electron/main/config-manager';

/**
 * Create a mock randomBytes function that tracks calls
 */
function createMockRandomBytes(fillByte: number = 0xab): { 
  fn: RandomBytesFunction; 
  calls: number[];
} {
  const calls: number[] = [];
  const fn: RandomBytesFunction = (size: number) => {
    calls.push(size);
    return Buffer.alloc(size, fillByte);
  };
  return { fn, calls };
}

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockRandomBytes: ReturnType<typeof createMockRandomBytes>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockRandomBytes = createMockRandomBytes(0xab);
    
    // Default mock behavior: store is empty (first launch)
    mockStore.has.mockReturnValue(false);
    mockStore.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    if (configManager) {
      configManager.destroy();
    }
  });

  describe('Key Generation', () => {
    it('should generate a 32-byte key on first launch', () => {
      mockStore.has.mockReturnValue(false);
      
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      // Verify randomBytes was called with 32
      expect(mockRandomBytes.calls).toContain(32);
    });

    it('should store the generated key as hex string', () => {
      mockStore.has.mockReturnValue(false);
      
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      // 32 bytes of 0xab = 64 hex characters of 'ab'
      const expectedHexKey = 'ab'.repeat(32);
      expect(mockStore.set).toHaveBeenCalledWith('masterKey', expectedHexKey);
    });

    it('should generate cryptographically random key', () => {
      mockStore.has.mockReturnValue(false);
      
      // Use real randomBytes for this test
      configManager = new ConfigManager({ randomBytes: realRandomBytes });
      configManager.initialize();

      // Verify set was called with a 64-character hex string
      expect(mockStore.set).toHaveBeenCalledWith(
        'masterKey',
        expect.stringMatching(/^[a-f0-9]{64}$/i)
      );
    });

    it('should not generate key if one already exists', () => {
      const existingKey = 'cd'.repeat(32);
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(existingKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      // randomBytes should NOT be called when key exists
      expect(mockRandomBytes.calls).not.toContain(32);
      expect(mockStore.set).not.toHaveBeenCalled();
    });
  });

  describe('Key Persistence', () => {
    it('should persist key using electron-store', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      expect(mockStore.set).toHaveBeenCalledTimes(1);
      expect(mockStore.set).toHaveBeenCalledWith('masterKey', expect.any(String));
    });

    it('should use secure store name', async () => {
      const ElectronStoreMock = (await import('electron-store')).default as unknown as ReturnType<typeof vi.fn>;
      
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(ElectronStoreMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'secure-config',
          encryptionKey: expect.any(String),
        })
      );
    });

    it('should use custom store name when provided', async () => {
      const ElectronStoreMock = (await import('electron-store')).default as unknown as ReturnType<typeof vi.fn>;
      
      const options: ConfigManagerOptions = {
        storeName: 'custom-config',
        randomBytes: mockRandomBytes.fn,
      };
      configManager = new ConfigManager(options);

      expect(ElectronStoreMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'custom-config',
        })
      );
    });
  });

  describe('Key Retrieval', () => {
    it('should retrieve existing key on subsequent launches', () => {
      const existingKey = 'ef'.repeat(32);
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(existingKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      const masterKey = configManager.getMasterKey();
      expect(masterKey).toBe(existingKey);
    });

    it('should return the same key after initialization', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      const key1 = configManager.getMasterKey();
      const key2 = configManager.getMasterKey();

      expect(key1).toBe(key2);
      expect(key1).toBe('ab'.repeat(32));
    });

    it('should throw error if getMasterKey called before initialize', () => {
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.getMasterKey()).toThrow('ConfigManager not initialized');
    });
  });

  describe('Key Validation', () => {
    it('should validate key is exactly 64 hex characters', () => {
      const validKey = 'a1b2c3d4'.repeat(8); // 64 chars
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(validKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      expect(configManager.getMasterKey()).toBe(validKey);
    });

    it('should reject key shorter than 64 characters', () => {
      const shortKey = 'ab'.repeat(16); // 32 chars (too short)
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(shortKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Invalid master key format');
    });

    it('should reject key longer than 64 characters', () => {
      const longKey = 'ab'.repeat(40); // 80 chars (too long)
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(longKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Invalid master key format');
    });

    it('should reject key with non-hex characters', () => {
      const invalidKey = 'zz'.repeat(32); // Invalid hex
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(invalidKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Invalid master key format');
    });

    it('should reject empty key', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue('');

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Invalid master key format');
    });

    it('should reject null key', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(null);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Invalid master key format');
    });
  });

  describe('Key as Buffer', () => {
    it('should provide key as Buffer for encryption services', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      const keyBuffer = configManager.getMasterKeyBuffer();

      expect(Buffer.isBuffer(keyBuffer)).toBe(true);
      expect(keyBuffer.length).toBe(32);
      expect(keyBuffer.toString('hex')).toBe('ab'.repeat(32));
    });

    it('should throw error if getMasterKeyBuffer called before initialize', () => {
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.getMasterKeyBuffer()).toThrow('ConfigManager not initialized');
    });
  });

  describe('Initialization State', () => {
    it('should report not initialized before initialize() is called', () => {
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(configManager.isInitialized()).toBe(false);
    });

    it('should report initialized after initialize() is called', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      expect(configManager.isInitialized()).toBe(true);
    });

    it('should prevent double initialization', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      expect(() => configManager.initialize()).toThrow('ConfigManager already initialized');
    });
  });

  describe('Security - Memory Cleanup', () => {
    it('should clear master key from memory on destroy', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      // Verify key exists before destroy
      expect(configManager.isInitialized()).toBe(true);

      configManager.destroy();

      // After destroy, should not be initialized
      expect(configManager.isInitialized()).toBe(false);
      expect(() => configManager.getMasterKey()).toThrow('ConfigManager not initialized');
    });

    it('should allow destroy to be called multiple times safely', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      // Multiple destroy calls should not throw
      expect(() => {
        configManager.destroy();
        configManager.destroy();
        configManager.destroy();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle electron-store initialization failure', async () => {
      const ElectronStoreMock = (await import('electron-store')).default as unknown as ReturnType<typeof vi.fn>;
      ElectronStoreMock.mockImplementationOnce(() => {
        throw new Error('Failed to initialize store');
      });

      expect(() => new ConfigManager({ randomBytes: mockRandomBytes.fn })).toThrow('Failed to initialize config store');
    });

    it('should handle store read failure gracefully', () => {
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockImplementationOnce(() => {
        throw new Error('Read error');
      });

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Failed to read master key');
    });

    it('should handle store write failure gracefully', () => {
      mockStore.has.mockReturnValue(false);
      mockStore.set.mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.initialize()).toThrow('Failed to persist master key');
    });
  });

  describe('Key Regeneration', () => {
    it('should allow forced key regeneration', () => {
      const existingKey = 'cd'.repeat(32);
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(existingKey);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();
      
      // Clear calls from initialization
      mockRandomBytes.calls.length = 0;

      // Force regeneration
      const newKey = configManager.regenerateMasterKey();

      expect(newKey).toBe('ab'.repeat(32)); // From mock
      expect(mockRandomBytes.calls).toContain(32);
      expect(mockStore.set).toHaveBeenCalledWith('masterKey', 'ab'.repeat(32));
    });

    it('should throw if regenerateMasterKey called before initialize', () => {
      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });

      expect(() => configManager.regenerateMasterKey()).toThrow('ConfigManager not initialized');
    });
  });

  describe('Integration with ProxyManager', () => {
    it('should provide key compatible with ProxyManager requirements', () => {
      mockStore.has.mockReturnValue(false);

      configManager = new ConfigManager({ randomBytes: mockRandomBytes.fn });
      configManager.initialize();

      const masterKey = configManager.getMasterKey();

      // ProxyManager expects 64 hex characters (32 bytes)
      expect(masterKey.length).toBe(64);
      expect(/^[a-f0-9]{64}$/i.test(masterKey)).toBe(true);
    });
  });

  describe('Singleton Helpers', () => {
    it('should provide singleton instance via getConfigManager', async () => {
      const { getConfigManager, resetConfigManager } = await import('../../electron/main/config-manager');
      
      // Reset any existing singleton
      resetConfigManager();
      
      const instance1 = getConfigManager({ randomBytes: mockRandomBytes.fn });
      const instance2 = getConfigManager();
      
      expect(instance1).toBe(instance2);
      
      // Clean up
      resetConfigManager();
    });

    it('should reset singleton via resetConfigManager', async () => {
      const { getConfigManager, resetConfigManager } = await import('../../electron/main/config-manager');
      
      // Reset any existing singleton
      resetConfigManager();
      
      const instance1 = getConfigManager({ randomBytes: mockRandomBytes.fn });
      resetConfigManager();
      const instance2 = getConfigManager({ randomBytes: mockRandomBytes.fn });
      
      expect(instance1).not.toBe(instance2);
      
      // Clean up
      resetConfigManager();
    });
  });
});
