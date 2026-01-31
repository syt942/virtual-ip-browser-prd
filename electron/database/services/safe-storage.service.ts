/**
 * Safe Storage Service
 * Uses Electron's safeStorage API for OS-native encryption
 * 
 * Security Features:
 * - OS-level encryption (Windows DPAPI, macOS Keychain, Linux libsecret)
 * - Automatic fallback to machine-derived key on unsupported platforms
 * - No hardcoded encryption keys
 * - Versioned encryption format for future upgrades
 */

import { safeStorage, app } from 'electron';
import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from 'crypto';
import { hostname, cpus, platform, arch } from 'os';

export interface EncryptedValue {
  /** Encrypted data (base64) */
  data: string;
  /** Encryption method used */
  method: 'safeStorage' | 'fallback';
  /** Schema version for future migrations */
  version: number;
  /** Initialization vector for fallback encryption */
  iv?: string;
  /** Authentication tag for fallback encryption */
  authTag?: string;
}

export interface SafeStorageConfig {
  /** Allow plaintext fallback on Linux without keyring (NOT RECOMMENDED) */
  allowPlaintextFallback?: boolean;
}

const CURRENT_VERSION = 1;
const FALLBACK_ALGORITHM = 'aes-256-gcm';
const FALLBACK_IV_LENGTH = 16;
const FALLBACK_AUTH_TAG_LENGTH = 16;
const FALLBACK_KEY_LENGTH = 32;

/**
 * SafeStorageService - Secure encryption using OS-native storage
 */
export class SafeStorageService {
  private static instance: SafeStorageService | null = null;
  
  private initialized = false;
  private useSafeStorage = false;
  private fallbackKey: Buffer | null = null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private constructor(_config: SafeStorageConfig = {}) {
    // Config parameter reserved for future features (e.g., allowPlaintextFallback)
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: SafeStorageConfig): SafeStorageService {
    if (!SafeStorageService.instance) {
      SafeStorageService.instance = new SafeStorageService(config);
    }
    return SafeStorageService.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (SafeStorageService.instance) {
      SafeStorageService.instance.destroy();
      SafeStorageService.instance = null;
    }
  }

  /**
   * Initialize the service
   * Must be called after app is ready
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Wait for app ready if needed
    if (!app.isReady()) {
      await app.whenReady();
    }

    // Check if safeStorage is available
    try {
      this.useSafeStorage = safeStorage.isEncryptionAvailable();
      
      if (this.useSafeStorage) {
        const backend = this.getStorageBackend();
        console.log(`[SafeStorageService] Using safeStorage with backend: ${backend}`);
      } else {
        console.warn('[SafeStorageService] safeStorage not available, using fallback encryption');
        this.initializeFallback();
      }
    } catch (error) {
      console.warn('[SafeStorageService] Error checking safeStorage availability:', error);
      this.initializeFallback();
    }

    this.initialized = true;
  }

  /**
   * Get the storage backend being used (for debugging)
   */
  private getStorageBackend(): string {
    try {
      // getSelectedStorageBackend is available in Electron 15+
      if (typeof safeStorage.getSelectedStorageBackend === 'function') {
        return safeStorage.getSelectedStorageBackend();
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Initialize fallback encryption using machine-derived key
   */
  private initializeFallback(): void {
    // Derive key from machine-specific values
    // This is NOT as secure as OS-native encryption but is better than a hardcoded key
    const machineId = this.getMachineIdentifier();
    const salt = createHash('sha256').update('vip-browser-fallback-salt-v1').digest();
    
    this.fallbackKey = scryptSync(machineId, salt, FALLBACK_KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
    });

    console.log('[SafeStorageService] Fallback encryption initialized with machine-derived key');
  }

  /**
   * Get a machine-specific identifier for fallback encryption
   * This creates a semi-unique key tied to the machine
   */
  private getMachineIdentifier(): string {
    const components = [
      hostname(),
      platform(),
      arch(),
      cpus().length.toString(),
      cpus()[0]?.model || 'unknown-cpu',
      // Add app path for additional uniqueness
      app.getPath('userData'),
    ];

    return createHash('sha512').update(components.join('|')).digest('hex');
  }

  /**
   * Check if service is using safeStorage
   */
  isUsingSafeStorage(): boolean {
    return this.useSafeStorage;
  }

  /**
   * Get current encryption method
   */
  getEncryptionMethod(): 'safeStorage' | 'fallback' | 'none' {
    if (!this.initialized) return 'none';
    return this.useSafeStorage ? 'safeStorage' : 'fallback';
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): EncryptedValue {
    if (!this.initialized) {
      throw new Error('SafeStorageService not initialized');
    }

    if (this.useSafeStorage) {
      return this.encryptWithSafeStorage(plaintext);
    } else {
      return this.encryptWithFallback(plaintext);
    }
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encrypted: EncryptedValue): string {
    if (!this.initialized) {
      throw new Error('SafeStorageService not initialized');
    }

    // Check version compatibility
    if (encrypted.version > CURRENT_VERSION) {
      throw new Error(`Unsupported encryption version: ${encrypted.version}`);
    }

    if (encrypted.method === 'safeStorage') {
      return this.decryptWithSafeStorage(encrypted);
    } else {
      return this.decryptWithFallback(encrypted);
    }
  }

  /**
   * Encrypt using Electron safeStorage API
   */
  private encryptWithSafeStorage(plaintext: string): EncryptedValue {
    const encrypted = safeStorage.encryptString(plaintext);
    
    return {
      data: encrypted.toString('base64'),
      method: 'safeStorage',
      version: CURRENT_VERSION,
    };
  }

  /**
   * Decrypt using Electron safeStorage API
   */
  private decryptWithSafeStorage(encrypted: EncryptedValue): string {
    const buffer = Buffer.from(encrypted.data, 'base64');
    return safeStorage.decryptString(buffer);
  }

  /**
   * Encrypt using fallback AES-256-GCM
   */
  private encryptWithFallback(plaintext: string): EncryptedValue {
    if (!this.fallbackKey) {
      throw new Error('Fallback encryption not initialized');
    }

    const iv = randomBytes(FALLBACK_IV_LENGTH);
    const cipher = createCipheriv(FALLBACK_ALGORITHM, this.fallbackKey, iv, {
      authTagLength: FALLBACK_AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      data: encrypted.toString('base64'),
      method: 'fallback',
      version: CURRENT_VERSION,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt using fallback AES-256-GCM
   */
  private decryptWithFallback(encrypted: EncryptedValue): string {
    if (!this.fallbackKey) {
      throw new Error('Fallback encryption not initialized');
    }

    if (!encrypted.iv || !encrypted.authTag) {
      throw new Error('Missing IV or authTag for fallback decryption');
    }

    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.data, 'base64');

    const decipher = createDecipheriv(FALLBACK_ALGORITHM, this.fallbackKey, iv, {
      authTagLength: FALLBACK_AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Check if a value was encrypted with the current method
   */
  isCompatibleEncryption(encrypted: EncryptedValue): boolean {
    if (this.useSafeStorage) {
      return encrypted.method === 'safeStorage';
    }
    return encrypted.method === 'fallback';
  }

  /**
   * Re-encrypt a value if needed (for migration)
   */
  reEncryptIfNeeded(encrypted: EncryptedValue): EncryptedValue {
    if (this.isCompatibleEncryption(encrypted)) {
      return encrypted;
    }

    const plaintext = this.decrypt(encrypted);
    return this.encrypt(plaintext);
  }

  /**
   * Securely destroy the service
   */
  destroy(): void {
    if (this.fallbackKey) {
      this.fallbackKey.fill(0);
      this.fallbackKey = null;
    }
    this.initialized = false;
    this.useSafeStorage = false;
  }
}

/**
 * Export singleton getter
 */
export function getSafeStorageService(config?: SafeStorageConfig): SafeStorageService {
  return SafeStorageService.getInstance(config);
}
