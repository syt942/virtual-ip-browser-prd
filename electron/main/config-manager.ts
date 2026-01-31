/**
 * ConfigManager
 * Secure masterKey initialization and persistence for Virtual IP Browser
 * 
 * Security features:
 * - Uses Electron safeStorage API for OS-level encryption (SECURITY FIX)
 * - Generates 32-byte cryptographically random master key on first launch
 * - Automatic migration from legacy hardcoded encryption key
 * - Validates key format (64 hex characters = 32 bytes)
 * - Secure memory cleanup on destroy
 */

import { randomBytes as cryptoRandomBytes } from 'crypto';
import { app } from 'electron';
import ElectronStore from 'electron-store';
import { getSafeStorageService, SafeStorageService, EncryptedValue } from '../database/services/safe-storage.service';

/**
 * Function type for generating random bytes
 */
export type RandomBytesFunction = (size: number) => Buffer;

/**
 * Configuration options for ConfigManager
 */
export interface ConfigManagerOptions {
  /** Custom store name (default: 'secure-config') */
  storeName?: string;
  /** Custom random bytes function (for testing) */
  randomBytes?: RandomBytesFunction;
  /** Allow plaintext fallback on Linux without keyring */
  allowPlaintextFallback?: boolean;
  /** Skip safeStorage initialization (for testing) */
  skipSafeStorage?: boolean;
}

/**
 * Schema for the secure configuration store
 */
interface ConfigSchema {
  /** Master key encrypted with safeStorage */
  masterKey: EncryptedValue;
  /** Legacy key format for migration (will be removed after migration) */
  masterKeyLegacy?: string;
  /** Migration status */
  migrated?: boolean;
  /** Migration timestamp */
  migratedAt?: string;
}

/**
 * Legacy store schema (for migration only)
 */
interface LegacyConfigSchema {
  masterKey: string;
}

/**
 * Regex pattern for validating 64-character hex string (32 bytes)
 */
const MASTER_KEY_PATTERN = /^[a-f0-9]{64}$/i;

/**
 * Master key length in bytes
 */
const MASTER_KEY_LENGTH = 32;

/**
 * Legacy encryption key (kept for migration only - DO NOT USE FOR NEW ENCRYPTION)
 * @deprecated Will be removed in v1.4.0
 */
const LEGACY_ENCRYPTION_KEY = 'vip-browser-config-encryption-key-v1';

/**
 * ConfigManager - Manages secure master key generation and persistence
 * Now uses Electron safeStorage API for OS-level encryption
 * 
 * Usage:
 * ```typescript
 * const configManager = new ConfigManager();
 * await configManager.initialize();
 * const masterKey = configManager.getMasterKey();
 * ```
 */
export class ConfigManager {
  private store: ElectronStore<ConfigSchema>;
  private safeStorage: SafeStorageService;
  private masterKey: string | null = null;
  private initialized = false;
  private randomBytes: RandomBytesFunction;
  private skipSafeStorage: boolean;

  /**
   * Create a new ConfigManager instance
   * 
   * @param options - Configuration options
   * @throws Error if store initialization fails
   */
  constructor(options: ConfigManagerOptions = {}) {
    const {
      storeName = 'secure-config',
      randomBytes = cryptoRandomBytes,
      allowPlaintextFallback = false,
      skipSafeStorage = false,
    } = options;

    this.randomBytes = randomBytes;
    this.skipSafeStorage = skipSafeStorage;
    this.safeStorage = getSafeStorageService({ allowPlaintextFallback });

    try {
      // Store WITHOUT hardcoded encryption key (SECURITY FIX)
      this.store = new ElectronStore<ConfigSchema>({
        name: storeName,
        clearInvalidConfig: false,
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize config store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initialize the ConfigManager asynchronously with safeStorage
   * - Migrates legacy encrypted data if present
   * - Generates a new master key on first launch
   * - Retrieves existing key on subsequent launches
   * 
   * @throws Error if already initialized
   * @throws Error if existing key is invalid
   * @throws Error if key generation/persistence fails
   */
  async initializeAsync(): Promise<void> {
    if (this.initialized) {
      throw new Error('ConfigManager already initialized');
    }

    // Wait for app ready if needed
    if (!app.isReady()) {
      await app.whenReady();
    }

    // Initialize safeStorage service
    if (!this.skipSafeStorage) {
      await this.safeStorage.initialize();
    }

    // Check for legacy key migration
    if (this.needsMigration()) {
      await this.migrateLegacyKey();
    }

    if (this.store.has('masterKey')) {
      // Retrieve existing key
      this.masterKey = this.retrieveMasterKey();
    } else {
      // Generate and persist new key
      this.masterKey = this.generateAndPersistMasterKey();
    }

    this.initialized = true;
  }

  /**
   * Synchronous initialize for backward compatibility (legacy mode)
   * Uses masterKey field directly without safeStorage encryption
   */
  initialize(): void {
    if (this.initialized) {
      throw new Error('ConfigManager already initialized');
    }

    // Synchronous legacy mode: use masterKey field directly
    if (this.store.has('masterKey')) {
      // Try to read the stored value
      let storedValue: unknown;
      try {
        storedValue = this.store.get('masterKey');
      } catch (error) {
        throw new Error(
          `Failed to read master key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      
      if (typeof storedValue === 'string') {
        // Plain string format - validate it
        if (!this.isValidMasterKey(storedValue)) {
          throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
        }
        this.masterKey = storedValue;
      } else if (storedValue && typeof storedValue === 'object') {
        // New encrypted format - try to decrypt
        try {
          if (!this.skipSafeStorage) {
            const decrypted = this.safeStorage.decrypt(storedValue as EncryptedValue);
            if (!this.isValidMasterKey(decrypted)) {
              throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
            }
            this.masterKey = decrypted;
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Invalid master key')) {
            throw error;
          }
          // Other decryption errors - fall through to generate new key
        }
      } else if (storedValue !== undefined && storedValue !== null) {
        // Invalid type stored
        throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
      }
    }
    
    if (!this.masterKey && this.store.has('masterKeyLegacy')) {
      // Try legacy key field
      const legacyKey = this.store.get('masterKeyLegacy');
      if (legacyKey && typeof legacyKey === 'string') {
        if (!this.isValidMasterKey(legacyKey)) {
          throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
        }
        this.masterKey = legacyKey;
      }
    }
    
    if (!this.masterKey) {
      // Generate new key only if store doesn't have masterKey
      if (!this.store.has('masterKey')) {
        this.masterKey = this.generateAndPersistMasterKeySync();
      } else {
        throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
      }
    }

    this.initialized = true;
  }
  
  /**
   * Generate and persist master key synchronously (for legacy mode)
   */
  private generateAndPersistMasterKeySync(): string {
    const keyBuffer = this.randomBytes(MASTER_KEY_LENGTH);
    const hexKey = keyBuffer.toString('hex');

    // Store directly without safeStorage encryption
    try {
      this.store.set('masterKey', hexKey);
    } catch (error) {
      throw new Error(
        `Failed to persist master key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    keyBuffer.fill(0);
    return hexKey;
  }

  /**
   * Check if migration from legacy format is needed
   */
  private needsMigration(): boolean {
    // Check if we have data in the old encrypted format
    try {
      const legacyStore = new ElectronStore<LegacyConfigSchema>({
        name: 'secure-config',
        encryptionKey: LEGACY_ENCRYPTION_KEY,
      });
      
      const hasLegacyKey = legacyStore.has('masterKey');
      const notMigrated = !this.store.get('migrated');
      
      return hasLegacyKey && notMigrated;
    } catch {
      return false;
    }
  }

  /**
   * Migrate from legacy hardcoded encryption to safeStorage
   */
  private async migrateLegacyKey(): Promise<void> {
    console.log('[ConfigManager] Migrating legacy encryption key...');
    
    try {
      // Read from legacy encrypted store
      const legacyStore = new ElectronStore<LegacyConfigSchema>({
        name: 'secure-config',
        encryptionKey: LEGACY_ENCRYPTION_KEY,
      });
      
      const legacyKey = legacyStore.get('masterKey');
      
      if (!legacyKey || !this.isValidMasterKey(legacyKey)) {
        console.warn('[ConfigManager] Invalid legacy key, will generate new one');
        this.store.set('migrated', true);
        this.store.set('migratedAt', new Date().toISOString());
        return;
      }

      // Re-encrypt with safeStorage
      if (!this.skipSafeStorage) {
        const encrypted = this.safeStorage.encrypt(legacyKey);
        this.store.set('masterKey', encrypted);
      } else {
        // For testing without safeStorage, store as plain string
        this.store.set('masterKey', legacyKey);
      }
      
      this.store.set('migrated', true);
      this.store.set('migratedAt', new Date().toISOString());
      
      console.log('[ConfigManager] Migration complete');
    } catch (error) {
      console.error('[ConfigManager] Migration failed:', error);
      // Don't throw - allow fresh key generation
      this.store.set('migrated', true);
    }
  }

  /**
   * Check if ConfigManager is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.masterKey !== null;
  }

  /**
   * Get the master key as hex string
   * 
   * @returns 64-character hex string (32 bytes)
   * @throws Error if not initialized
   */
  getMasterKey(): string {
    if (!this.initialized || this.masterKey === null) {
      throw new Error('ConfigManager not initialized');
    }
    return this.masterKey;
  }

  /**
   * Get the master key as Buffer
   * Useful for encryption services that require Buffer input
   * 
   * @returns 32-byte Buffer
   * @throws Error if not initialized
   */
  getMasterKeyBuffer(): Buffer {
    const hexKey = this.getMasterKey();
    return Buffer.from(hexKey, 'hex');
  }

  /**
   * Regenerate the master key
   * WARNING: This will invalidate all previously encrypted data!
   * 
   * @returns The new master key as hex string
   * @throws Error if not initialized
   */
  regenerateMasterKey(): string {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }

    this.masterKey = this.generateAndPersistMasterKey();
    return this.masterKey;
  }

  /**
   * Securely destroy the ConfigManager
   * Clears the master key from memory
   */
  destroy(): void {
    if (this.masterKey !== null) {
      // Overwrite in memory before clearing (best effort for string)
      // Note: JavaScript strings are immutable, so this is limited
      // For true secure memory handling, consider using Buffer throughout
      this.masterKey = null;
    }
    this.initialized = false;
  }

  /**
   * Generate a new master key and persist it (async version with safeStorage)
   * 
   * @returns The generated master key as hex string
   * @throws Error if persistence fails
   */
  private generateAndPersistMasterKey(): string {
    // Generate 32 bytes of cryptographically random data
    const keyBuffer = this.randomBytes(MASTER_KEY_LENGTH);
    const hexKey = keyBuffer.toString('hex');

    // Persist to store with safeStorage encryption
    try {
      if (!this.skipSafeStorage && this.safeStorage.getEncryptionMethod() !== 'none') {
        const encrypted = this.safeStorage.encrypt(hexKey);
        this.store.set('masterKey', encrypted);
      } else {
        // Fallback for testing or when safeStorage unavailable - store as plain string
        this.store.set('masterKey', hexKey);
      }
    } catch (error) {
      throw new Error(
        `Failed to persist master key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Clear the buffer
    keyBuffer.fill(0);

    return hexKey;
  }

  /**
   * Retrieve and validate the existing master key
   * 
   * @returns The validated master key as hex string
   * @throws Error if retrieval fails
   * @throws Error if key format is invalid
   */
  private retrieveMasterKey(): string {
    let decryptedKey: string | undefined;

    try {
      // Try new safeStorage format first
      const encryptedValue = this.store.get('masterKey');
      
      if (encryptedValue && typeof encryptedValue === 'object' && 'data' in encryptedValue) {
        // New format: decrypt with safeStorage
        if (!this.skipSafeStorage) {
          decryptedKey = this.safeStorage.decrypt(encryptedValue as EncryptedValue);
        }
      }
      
      // Fallback to legacy format
      if (!decryptedKey) {
        const legacyKey = this.store.get('masterKeyLegacy');
        if (legacyKey && typeof legacyKey === 'string') {
          decryptedKey = legacyKey;
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to read master key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate the retrieved key
    if (!this.isValidMasterKey(decryptedKey)) {
      throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
    }

    return decryptedKey;
  }

  /**
   * Validate master key format
   * 
   * @param key - The key to validate
   * @returns true if valid, false otherwise
   */
  private isValidMasterKey(key: unknown): key is string {
    if (typeof key !== 'string') {
      return false;
    }
    return MASTER_KEY_PATTERN.test(key);
  }
}

/**
 * Singleton instance for application-wide use
 */
let configManagerInstance: ConfigManager | null = null;

/**
 * Get or create the singleton ConfigManager instance
 * 
 * @param options - Configuration options (only used on first call)
 * @returns The ConfigManager singleton instance
 */
export function getConfigManager(options?: ConfigManagerOptions): ConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new ConfigManager(options);
  }
  return configManagerInstance;
}

/**
 * Reset the singleton instance (primarily for testing)
 */
export function resetConfigManager(): void {
  if (configManagerInstance) {
    configManagerInstance.destroy();
    configManagerInstance = null;
  }
}
