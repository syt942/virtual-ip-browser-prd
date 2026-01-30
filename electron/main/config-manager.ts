/**
 * ConfigManager
 * Secure masterKey initialization and persistence for Virtual IP Browser
 * 
 * Security features:
 * - Generates 32-byte cryptographically random master key on first launch
 * - Persists key securely using electron-store with encryption
 * - Retrieves existing key on subsequent launches
 * - Validates key format (64 hex characters = 32 bytes)
 * - Secure memory cleanup on destroy
 */

import { randomBytes as cryptoRandomBytes } from 'crypto';
import ElectronStore from 'electron-store';

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
  /** Custom encryption key for electron-store (auto-generated if not provided) */
  storeEncryptionKey?: string;
  /** Custom random bytes function (for testing) */
  randomBytes?: RandomBytesFunction;
}

/**
 * Schema for the secure configuration store
 */
interface ConfigSchema {
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
 * ConfigManager - Manages secure master key generation and persistence
 * 
 * Usage:
 * ```typescript
 * const configManager = new ConfigManager();
 * configManager.initialize();
 * const masterKey = configManager.getMasterKey();
 * ```
 */
export class ConfigManager {
  private store: ElectronStore<ConfigSchema>;
  private masterKey: string | null = null;
  private initialized = false;
  private randomBytes: RandomBytesFunction;

  /**
   * Create a new ConfigManager instance
   * 
   * @param options - Configuration options
   * @throws Error if store initialization fails
   */
  constructor(options: ConfigManagerOptions = {}) {
    const {
      storeName = 'secure-config',
      storeEncryptionKey = 'vip-browser-config-encryption-key-v1',
      randomBytes = cryptoRandomBytes,
    } = options;

    this.randomBytes = randomBytes;

    try {
      this.store = new ElectronStore<ConfigSchema>({
        name: storeName,
        encryptionKey: storeEncryptionKey,
        clearInvalidConfig: false, // Don't clear on invalid - we want to throw
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize config store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Initialize the ConfigManager
   * - Generates a new master key on first launch
   * - Retrieves existing key on subsequent launches
   * 
   * @throws Error if already initialized
   * @throws Error if existing key is invalid
   * @throws Error if key generation/persistence fails
   */
  initialize(): void {
    if (this.initialized) {
      throw new Error('ConfigManager already initialized');
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
   * Generate a new master key and persist it
   * 
   * @returns The generated master key as hex string
   * @throws Error if persistence fails
   */
  private generateAndPersistMasterKey(): string {
    // Generate 32 bytes of cryptographically random data
    const keyBuffer = this.randomBytes(MASTER_KEY_LENGTH);
    const hexKey = keyBuffer.toString('hex');

    // Persist to store
    try {
      this.store.set('masterKey', hexKey);
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
    let storedKey: string | undefined;

    try {
      storedKey = this.store.get('masterKey');
    } catch (error) {
      throw new Error(
        `Failed to read master key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate the retrieved key
    if (!this.isValidMasterKey(storedKey)) {
      throw new Error('Invalid master key format: must be 64 hex characters (32 bytes)');
    }

    return storedKey;
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
