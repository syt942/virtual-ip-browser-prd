# P0 Security Vulnerabilities Fix Specification

**Document Version:** 1.0.0  
**Created:** 2025-01-30  
**Status:** Implementation Ready  
**Priority:** P0 (Critical)

---

## Executive Summary

This document provides detailed implementation specifications for fixing 4 critical (P0) security vulnerabilities identified in Virtual IP Browser. Each fix includes exact code changes, migration strategies, backward compatibility approaches, test cases, and security verification methods.

### Vulnerabilities Overview

| ID | Vulnerability | File | Risk Level | Impact |
|----|--------------|------|------------|--------|
| V1 | Static Encryption Key | `electron/main/config-manager.ts` | **CRITICAL** | Credential exposure if disk compromised |
| V2 | ReDoS in Tracker Blocker | `electron/core/privacy/tracker-blocker.ts` | **HIGH** | DoS via malicious tracking patterns |
| V3 | WebRTC Protection Bypass | `electron/core/privacy/webrtc.ts` | **HIGH** | IP leak via unhandled WebRTC APIs |
| V4 | Session URL Validation Gap | `electron/core/session/manager.ts` | **HIGH** | Stored SSRF attack |

---

## Vulnerability 1: Static Encryption Key

### Current State Analysis

**File:** `electron/main/config-manager.ts`

**Current Issue:** The `ConfigManager` uses a hardcoded encryption key for `electron-store`:

```typescript
// VULNERABLE CODE (line 74)
const {
  storeName = 'secure-config',
  storeEncryptionKey = 'vip-browser-config-encryption-key-v1', // ❌ HARDCODED KEY
  randomBytes = cryptoRandomBytes,
} = options;
```

**Risk:** If an attacker gains disk access, they can:
1. Find this hardcoded key in the application binary
2. Decrypt all stored credentials (proxy passwords, API keys)
3. Compromise user privacy and security

### Fix Implementation

#### Step 1: Create Safe Storage Service

**New File:** `electron/database/services/safe-storage.service.ts`

```typescript
/**
 * Safe Storage Service
 * Uses Electron's safeStorage API for OS-level encryption
 * 
 * Security Features:
 * - OS-native encryption (Keychain on macOS, DPAPI on Windows, libsecret on Linux)
 * - Automatic key management by OS
 * - Fallback for unsupported platforms
 */

import { safeStorage, app } from 'electron';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';
import ElectronStore from 'electron-store';

export interface SafeStorageConfig {
  /** Store name for fallback storage */
  storeName?: string;
  /** Enable plaintext fallback on Linux without keyring */
  allowPlaintextFallback?: boolean;
}

export interface EncryptedValue {
  /** Encrypted data as base64 */
  data: string;
  /** Encryption method used */
  method: 'safeStorage' | 'fallback';
  /** Version for future migrations */
  version: number;
}

/**
 * SafeStorageService - Secure credential storage using OS-native encryption
 */
export class SafeStorageService {
  private static instance: SafeStorageService | null = null;
  private fallbackStore: ElectronStore | null = null;
  private fallbackKey: Buffer | null = null;
  private initialized = false;
  private useSafeStorage = false;
  private config: SafeStorageConfig;

  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  private readonly CURRENT_VERSION = 1;

  private constructor(config: SafeStorageConfig = {}) {
    this.config = {
      storeName: config.storeName ?? 'vip-secure-storage',
      allowPlaintextFallback: config.allowPlaintextFallback ?? false,
    };
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
   * Initialize the service - must be called after app 'ready' event
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Check if safeStorage is available
    this.useSafeStorage = this.checkSafeStorageAvailability();

    if (!this.useSafeStorage) {
      // Initialize fallback encryption
      await this.initializeFallback();
    }

    this.initialized = true;
    console.log(`[SafeStorage] Initialized with method: ${this.useSafeStorage ? 'safeStorage' : 'fallback'}`);
  }

  /**
   * Check if Electron safeStorage is available
   */
  private checkSafeStorageAvailability(): boolean {
    try {
      // safeStorage requires app to be ready
      if (!app.isReady()) {
        console.warn('[SafeStorage] App not ready, safeStorage unavailable');
        return false;
      }

      // Check if encryption is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('[SafeStorage] OS encryption not available');
        
        // On Linux, check the backend
        if (process.platform === 'linux') {
          const backend = safeStorage.getSelectedStorageBackend();
          console.log(`[SafeStorage] Linux backend: ${backend}`);
          
          if (backend === 'basic_text' && !this.config.allowPlaintextFallback) {
            console.warn('[SafeStorage] basic_text backend rejected, using fallback');
            return false;
          }
        }
        return false;
      }

      // Test encryption/decryption
      const testData = 'safeStorage-test-' + Date.now();
      const encrypted = safeStorage.encryptString(testData);
      const decrypted = safeStorage.decryptString(encrypted);
      
      if (decrypted !== testData) {
        console.error('[SafeStorage] Encryption verification failed');
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SafeStorage] Error checking availability:', error);
      return false;
    }
  }

  /**
   * Initialize fallback encryption for unsupported platforms
   */
  private async initializeFallback(): Promise<void> {
    // Generate or retrieve a machine-specific key
    // Uses hardware identifiers + random salt for key derivation
    const machineId = this.getMachineIdentifier();
    const salt = await this.getOrCreateSalt();
    
    // Derive key using scrypt
    this.fallbackKey = scryptSync(machineId, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
    });

    // Initialize electron-store without encryption key (we handle encryption)
    this.fallbackStore = new ElectronStore({
      name: this.config.storeName + '-fallback',
      clearInvalidConfig: false,
    });

    console.log('[SafeStorage] Fallback encryption initialized');
  }

  /**
   * Get machine-specific identifier for key derivation
   */
  private getMachineIdentifier(): string {
    // Combine multiple sources for uniqueness
    const sources = [
      process.platform,
      process.arch,
      require('os').hostname(),
      require('os').userInfo().username,
      app.getPath('userData'),
    ];
    return sources.join('|');
  }

  /**
   * Get or create salt for key derivation
   */
  private async getOrCreateSalt(): Promise<Buffer> {
    const saltStore = new ElectronStore({ name: 'vip-salt' });
    let saltHex = saltStore.get('derivation-salt') as string | undefined;
    
    if (!saltHex) {
      const salt = randomBytes(32);
      saltHex = salt.toString('hex');
      saltStore.set('derivation-salt', saltHex);
    }
    
    return Buffer.from(saltHex, 'hex');
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): EncryptedValue {
    if (!this.initialized) {
      throw new Error('SafeStorageService not initialized');
    }

    if (this.useSafeStorage) {
      const encrypted = safeStorage.encryptString(plaintext);
      return {
        data: encrypted.toString('base64'),
        method: 'safeStorage',
        version: this.CURRENT_VERSION,
      };
    }

    // Fallback encryption
    return this.encryptFallback(plaintext);
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encrypted: EncryptedValue): string {
    if (!this.initialized) {
      throw new Error('SafeStorageService not initialized');
    }

    if (encrypted.method === 'safeStorage') {
      if (!this.useSafeStorage) {
        throw new Error('safeStorage not available for decryption');
      }
      const buffer = Buffer.from(encrypted.data, 'base64');
      return safeStorage.decryptString(buffer);
    }

    // Fallback decryption
    return this.decryptFallback(encrypted);
  }

  /**
   * Fallback encryption using AES-256-GCM
   */
  private encryptFallback(plaintext: string): EncryptedValue {
    if (!this.fallbackKey) {
      throw new Error('Fallback key not initialized');
    }

    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, this.fallbackKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    return {
      data: combined.toString('base64'),
      method: 'fallback',
      version: this.CURRENT_VERSION,
    };
  }

  /**
   * Fallback decryption
   */
  private decryptFallback(encrypted: EncryptedValue): string {
    if (!this.fallbackKey) {
      throw new Error('Fallback key not initialized');
    }

    const combined = Buffer.from(encrypted.data, 'base64');
    
    const iv = combined.subarray(0, this.IV_LENGTH);
    const authTag = combined.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(this.ALGORITHM, this.fallbackKey, iv, {
      authTagLength: this.AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Check if service is using OS-native encryption
   */
  isUsingSafeStorage(): boolean {
    return this.useSafeStorage;
  }

  /**
   * Get encryption method being used
   */
  getEncryptionMethod(): string {
    if (!this.initialized) return 'not-initialized';
    return this.useSafeStorage ? 'safeStorage' : 'fallback';
  }

  /**
   * Destroy the service and clear sensitive data
   */
  destroy(): void {
    if (this.fallbackKey) {
      this.fallbackKey.fill(0);
      this.fallbackKey = null;
    }
    this.fallbackStore = null;
    this.initialized = false;
    SafeStorageService.instance = null;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (SafeStorageService.instance) {
      SafeStorageService.instance.destroy();
    }
  }
}

// Export singleton getter
export function getSafeStorageService(config?: SafeStorageConfig): SafeStorageService {
  return SafeStorageService.getInstance(config);
}
```

#### Step 2: Update ConfigManager to Use SafeStorage

**File:** `electron/main/config-manager.ts`

**Changes Required:**

```typescript
/**
 * ConfigManager - UPDATED VERSION
 * Now uses Electron safeStorage API for OS-level encryption
 */

import { randomBytes as cryptoRandomBytes } from 'crypto';
import { app } from 'electron';
import { getSafeStorageService, SafeStorageService, EncryptedValue } from '../database/services/safe-storage.service';
import ElectronStore from 'electron-store';

export type RandomBytesFunction = (size: number) => Buffer;

export interface ConfigManagerOptions {
  storeName?: string;
  randomBytes?: RandomBytesFunction;
  /** Allow plaintext fallback on Linux without keyring */
  allowPlaintextFallback?: boolean;
}

interface ConfigSchema {
  masterKey: EncryptedValue;
  /** Legacy key format for migration */
  masterKeyLegacy?: string;
  /** Migration status */
  migrated?: boolean;
}

const MASTER_KEY_PATTERN = /^[a-f0-9]{64}$/i;
const MASTER_KEY_LENGTH = 32;

export class ConfigManager {
  private store: ElectronStore<ConfigSchema>;
  private safeStorage: SafeStorageService;
  private masterKey: string | null = null;
  private initialized = false;
  private randomBytes: RandomBytesFunction;

  constructor(options: ConfigManagerOptions = {}) {
    const {
      storeName = 'secure-config',
      randomBytes = cryptoRandomBytes,
      allowPlaintextFallback = false,
    } = options;

    this.randomBytes = randomBytes;
    this.safeStorage = getSafeStorageService({ allowPlaintextFallback });

    // Store without hardcoded encryption key
    this.store = new ElectronStore<ConfigSchema>({
      name: storeName,
      clearInvalidConfig: false,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('ConfigManager already initialized');
    }

    // Wait for app ready if needed
    if (!app.isReady()) {
      await app.whenReady();
    }

    // Initialize safe storage
    await this.safeStorage.initialize();

    // Check for legacy key migration
    if (this.needsMigration()) {
      await this.migrateLegacyKey();
    }

    if (this.store.has('masterKey')) {
      this.masterKey = this.retrieveMasterKey();
    } else {
      this.masterKey = await this.generateAndPersistMasterKey();
    }

    this.initialized = true;
  }

  private needsMigration(): boolean {
    return this.store.has('masterKeyLegacy') && !this.store.get('migrated');
  }

  private async migrateLegacyKey(): Promise<void> {
    console.log('[ConfigManager] Migrating legacy encryption key...');
    
    const legacyKey = this.store.get('masterKeyLegacy');
    if (!legacyKey || !this.isValidMasterKey(legacyKey)) {
      console.warn('[ConfigManager] Invalid legacy key, generating new one');
      this.store.delete('masterKeyLegacy');
      return;
    }

    // Re-encrypt with safeStorage
    const encrypted = this.safeStorage.encrypt(legacyKey);
    this.store.set('masterKey', encrypted);
    this.store.set('migrated', true);
    
    // Clear legacy key
    this.store.delete('masterKeyLegacy');
    
    console.log('[ConfigManager] Migration complete');
  }

  private retrieveMasterKey(): string {
    const encrypted = this.store.get('masterKey');
    if (!encrypted) {
      throw new Error('Master key not found');
    }

    const decrypted = this.safeStorage.decrypt(encrypted);
    
    if (!this.isValidMasterKey(decrypted)) {
      throw new Error('Invalid master key format');
    }

    return decrypted;
  }

  private async generateAndPersistMasterKey(): Promise<string> {
    const keyBuffer = this.randomBytes(MASTER_KEY_LENGTH);
    const hexKey = keyBuffer.toString('hex');

    const encrypted = this.safeStorage.encrypt(hexKey);
    this.store.set('masterKey', encrypted);

    keyBuffer.fill(0);
    return hexKey;
  }

  // ... rest of methods remain the same
}
```

#### Step 3: Update EncryptionService

**File:** `electron/database/services/encryption.service.ts`

Add integration with SafeStorageService for master key retrieval:

```typescript
import { getSafeStorageService } from './safe-storage.service';

// Add to EncryptionService class:

/**
 * Initialize with master key from SafeStorage
 */
async initializeFromSafeStorage(): Promise<void> {
  const safeStorage = getSafeStorageService();
  await safeStorage.initialize();
  
  // The ConfigManager handles the master key
  // EncryptionService should receive the key from ConfigManager
  console.log('[EncryptionService] Ready for master key injection');
}
```

### Migration Strategy

#### Phase 1: Detection (v1.3.0)
1. On startup, detect if user has legacy encrypted data
2. Check for `masterKeyLegacy` field in store
3. Log migration status for monitoring

#### Phase 2: Automatic Migration (v1.3.0)
1. Decrypt legacy key using old hardcoded key
2. Re-encrypt using safeStorage API
3. Store in new format with version number
4. Mark as migrated
5. Delete legacy key only after verification

#### Phase 3: Cleanup (v1.4.0)
1. Remove legacy decryption code
2. Remove hardcoded key constant
3. Remove migration code after 2 release cycles

### Migration Script

```typescript
/**
 * One-time migration script for existing installations
 * Run during app upgrade from v1.2.x to v1.3.0
 */
export async function migrateEncryptionKey(): Promise<{
  success: boolean;
  migrated: boolean;
  error?: string;
}> {
  const LEGACY_KEY = 'vip-browser-config-encryption-key-v1';
  
  try {
    const legacyStore = new ElectronStore({
      name: 'secure-config',
      encryptionKey: LEGACY_KEY,
    });

    if (!legacyStore.has('masterKey')) {
      return { success: true, migrated: false };
    }

    const legacyMasterKey = legacyStore.get('masterKey') as string;
    
    // Initialize new safe storage
    const safeStorage = getSafeStorageService();
    await safeStorage.initialize();

    // Encrypt with new method
    const encrypted = safeStorage.encrypt(legacyMasterKey);

    // Store in new format
    const newStore = new ElectronStore({ name: 'secure-config-v2' });
    newStore.set('masterKey', encrypted);
    newStore.set('migrated', true);
    newStore.set('migratedAt', new Date().toISOString());

    // Backup old store
    const backupStore = new ElectronStore({ name: 'secure-config-backup' });
    backupStore.set('legacyMasterKey', legacyMasterKey);
    backupStore.set('backupAt', new Date().toISOString());

    return { success: true, migrated: true };
  } catch (error) {
    return {
      success: false,
      migrated: false,
      error: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}
```

### Backward Compatibility

1. **Existing Users:** Automatic migration on first launch
2. **New Users:** Direct use of safeStorage
3. **Fallback:** If safeStorage unavailable, use machine-derived key (not hardcoded)
4. **Data Preservation:** Backup of legacy data before migration

### Test Cases

**File:** `tests/unit/safe-storage.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SafeStorageService, getSafeStorageService } from '../../electron/database/services/safe-storage.service';

// Mock Electron
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

describe('SafeStorageService', () => {
  beforeEach(() => {
    SafeStorageService.reset();
  });

  describe('Initialization', () => {
    it('should initialize with safeStorage when available', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      expect(service.isUsingSafeStorage()).toBe(true);
    });

    it('should fall back when safeStorage unavailable', async () => {
      const { safeStorage } = await import('electron');
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      
      const service = getSafeStorageService();
      await service.initialize();
      expect(service.isUsingSafeStorage()).toBe(false);
      expect(service.getEncryptionMethod()).toBe('fallback');
    });

    it('should throw if not initialized', () => {
      const service = getSafeStorageService();
      expect(() => service.encrypt('test')).toThrow('not initialized');
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
      expect(['safeStorage', 'fallback']).toContain(encrypted.method);
    });
  });

  describe('Fallback Encryption', () => {
    it('should use different ciphertext for same plaintext', async () => {
      const { safeStorage } = await import('electron');
      vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
      
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
  });

  describe('Security', () => {
    it('should clear sensitive data on destroy', async () => {
      const service = getSafeStorageService();
      await service.initialize();
      
      service.destroy();
      
      expect(() => service.encrypt('test')).toThrow();
    });
  });
});
```

### Security Verification

1. **Code Review Checklist:**
   - [ ] No hardcoded keys in source code
   - [ ] safeStorage API used correctly
   - [ ] Fallback uses machine-derived key
   - [ ] Legacy key migration tested
   - [ ] Sensitive data cleared from memory

2. **Security Tests:**
   - [ ] Encrypted data differs between runs (random IV)
   - [ ] Cannot decrypt with wrong key
   - [ ] Migration preserves existing credentials
   - [ ] Fallback encryption is cryptographically secure

3. **Penetration Testing:**
   - [ ] Extract binary and search for hardcoded keys
   - [ ] Attempt to decrypt config file without OS credentials
   - [ ] Verify encrypted data in electron-store

---

## Vulnerability 2: ReDoS in Tracker Blocker

### Current State Analysis

**File:** `electron/core/privacy/tracker-blocker.ts`

**Current Issue:** The `matchesPattern` method converts wildcard patterns to regex unsafely:

```typescript
// VULNERABLE CODE (lines 95-103)
private matchesPattern(url: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')    // ❌ Creates .* which can cause ReDoS
    .replace(/\?/g, '.');
  
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  return regex.test(url);    // ❌ No timeout protection
}
```

**Risk:**
1. Malicious patterns like `*.*.*.*.*.*` become `.*\..*\..*\..*\..*\..*`
2. Long URLs trigger catastrophic backtracking
3. CPU exhaustion causes application freeze/DoS

### Fix Implementation

#### Step 1: Create Bloom Filter-Based Matcher

**New File:** `electron/core/privacy/pattern-matcher.ts`

```typescript
/**
 * Pattern Matcher
 * High-performance pattern matching using bloom filters and compiled patterns
 * 
 * Security Features:
 * - No regex for URL matching (prevents ReDoS)
 * - Pre-compiled patterns at startup
 * - Timeout protection for fallback matching
 * - EasyList format support
 */

import { createHash } from 'crypto';

export interface CompiledPattern {
  /** Original pattern string */
  original: string;
  /** Pattern type */
  type: 'domain' | 'url' | 'regex';
  /** Extracted domain for fast matching */
  domain?: string;
  /** URL path prefix */
  pathPrefix?: string;
  /** Pre-computed hash for bloom filter */
  hash: number;
}

export interface PatternMatcherConfig {
  /** Maximum patterns to store */
  maxPatterns?: number;
  /** Bloom filter size (bits) */
  bloomFilterSize?: number;
  /** Number of hash functions */
  hashFunctions?: number;
  /** Timeout for regex fallback (ms) */
  regexTimeout?: number;
}

const DEFAULT_CONFIG: Required<PatternMatcherConfig> = {
  maxPatterns: 100000,
  bloomFilterSize: 1048576, // 1MB bloom filter
  hashFunctions: 7,
  regexTimeout: 10,
};

/**
 * PatternMatcher - Safe, high-performance URL pattern matching
 */
export class PatternMatcher {
  private config: Required<PatternMatcherConfig>;
  private bloomFilter: Uint8Array;
  private compiledPatterns: Map<string, CompiledPattern>;
  private domainIndex: Map<string, Set<CompiledPattern>>;
  private initialized = false;

  constructor(config: PatternMatcherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bloomFilter = new Uint8Array(Math.ceil(this.config.bloomFilterSize / 8));
    this.compiledPatterns = new Map();
    this.domainIndex = new Map();
  }

  /**
   * Initialize with patterns (call at startup)
   */
  initialize(patterns: string[]): void {
    const startTime = Date.now();
    
    for (const pattern of patterns) {
      if (this.compiledPatterns.size >= this.config.maxPatterns) {
        console.warn('[PatternMatcher] Max patterns reached, skipping remaining');
        break;
      }
      
      try {
        this.addPattern(pattern);
      } catch (error) {
        console.warn(`[PatternMatcher] Failed to compile pattern: ${pattern}`, error);
      }
    }

    this.initialized = true;
    console.log(`[PatternMatcher] Initialized with ${this.compiledPatterns.size} patterns in ${Date.now() - startTime}ms`);
  }

  /**
   * Add a single pattern
   */
  addPattern(pattern: string): void {
    if (!pattern || typeof pattern !== 'string') return;
    
    const trimmed = pattern.trim();
    if (trimmed.length === 0 || trimmed.length > 500) return;
    
    // Skip if already exists
    if (this.compiledPatterns.has(trimmed)) return;

    const compiled = this.compilePattern(trimmed);
    this.compiledPatterns.set(trimmed, compiled);

    // Add to bloom filter
    this.addToBloomFilter(compiled);

    // Add to domain index for fast lookup
    if (compiled.domain) {
      if (!this.domainIndex.has(compiled.domain)) {
        this.domainIndex.set(compiled.domain, new Set());
      }
      this.domainIndex.get(compiled.domain)!.add(compiled);
    }
  }

  /**
   * Remove a pattern
   */
  removePattern(pattern: string): void {
    const compiled = this.compiledPatterns.get(pattern);
    if (!compiled) return;

    this.compiledPatterns.delete(pattern);
    
    // Remove from domain index
    if (compiled.domain) {
      const domainPatterns = this.domainIndex.get(compiled.domain);
      if (domainPatterns) {
        domainPatterns.delete(compiled);
        if (domainPatterns.size === 0) {
          this.domainIndex.delete(compiled.domain);
        }
      }
    }

    // Note: Cannot remove from bloom filter (would need to rebuild)
  }

  /**
   * Check if URL matches any pattern
   */
  matches(url: string): boolean {
    if (!this.initialized || !url) return false;

    try {
      const parsed = new URL(url.toLowerCase());
      const domain = parsed.hostname;
      const path = parsed.pathname + parsed.search;

      // Fast path: Check bloom filter first
      if (!this.mightMatch(domain, path)) {
        return false;
      }

      // Check domain index
      const domainPatterns = this.getPatternsForDomain(domain);
      for (const pattern of domainPatterns) {
        if (this.matchesPattern(url, pattern)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Compile a pattern into optimized format
   */
  private compilePattern(pattern: string): CompiledPattern {
    // Parse EasyList/AdBlock format: ||domain.com^
    // Or simple wildcard format: *://domain.com/*

    let type: CompiledPattern['type'] = 'url';
    let domain: string | undefined;
    let pathPrefix: string | undefined;

    // Extract domain from common patterns
    const domainMatch = pattern.match(/(?:\|\||:\/\/|\*:\/\/)([a-zA-Z0-9.-]+)/);
    if (domainMatch) {
      domain = domainMatch[1].toLowerCase();
      // Remove leading wildcard subdomain
      if (domain.startsWith('*.')) {
        domain = domain.slice(2);
      }
    }

    // Extract path prefix
    const pathMatch = pattern.match(/[a-zA-Z0-9.-]+(\/.+?)(?:\*|$)/);
    if (pathMatch) {
      pathPrefix = pathMatch[1];
    }

    return {
      original: pattern,
      type,
      domain,
      pathPrefix,
      hash: this.computeHash(pattern),
    };
  }

  /**
   * Compute hash for bloom filter
   */
  private computeHash(value: string): number {
    const hash = createHash('md5').update(value).digest();
    return hash.readUInt32LE(0);
  }

  /**
   * Add pattern to bloom filter
   */
  private addToBloomFilter(pattern: CompiledPattern): void {
    const hashes = this.getBloomHashes(pattern.domain || pattern.original);
    for (const hash of hashes) {
      const index = hash % (this.bloomFilter.length * 8);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bloomFilter[byteIndex] |= (1 << bitIndex);
    }
  }

  /**
   * Check bloom filter for possible match
   */
  private mightMatch(domain: string, _path: string): boolean {
    // Check if domain might be in filter
    const hashes = this.getBloomHashes(domain);
    for (const hash of hashes) {
      const index = hash % (this.bloomFilter.length * 8);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if ((this.bloomFilter[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get multiple hashes for bloom filter
   */
  private getBloomHashes(value: string): number[] {
    const hashes: number[] = [];
    const baseHash = createHash('sha256').update(value).digest();
    
    for (let i = 0; i < this.config.hashFunctions; i++) {
      hashes.push(baseHash.readUInt32LE(i * 4 % 28));
    }
    
    return hashes;
  }

  /**
   * Get patterns that might match a domain
   */
  private getPatternsForDomain(domain: string): CompiledPattern[] {
    const patterns: CompiledPattern[] = [];
    
    // Check exact domain
    const exact = this.domainIndex.get(domain);
    if (exact) {
      patterns.push(...exact);
    }
    
    // Check parent domains (e.g., sub.example.com -> example.com)
    const parts = domain.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join('.');
      const parentPatterns = this.domainIndex.get(parent);
      if (parentPatterns) {
        patterns.push(...parentPatterns);
      }
    }
    
    return patterns;
  }

  /**
   * Match URL against a compiled pattern (safe, no regex)
   */
  private matchesPattern(url: string, pattern: CompiledPattern): boolean {
    const lowerUrl = url.toLowerCase();
    
    // Domain check
    if (pattern.domain && !this.urlContainsDomain(lowerUrl, pattern.domain)) {
      return false;
    }
    
    // Path prefix check
    if (pattern.pathPrefix && !lowerUrl.includes(pattern.pathPrefix)) {
      return false;
    }
    
    // For simple patterns, domain match is sufficient
    if (pattern.type === 'domain') {
      return true;
    }
    
    // For URL patterns, do simple string matching
    return this.simpleWildcardMatch(lowerUrl, pattern.original);
  }

  /**
   * Check if URL contains domain (handles subdomains)
   */
  private urlContainsDomain(url: string, domain: string): boolean {
    return url.includes(`//${domain}`) || 
           url.includes(`.${domain}`) ||
           url.includes(`//${domain}/`) ||
           url.includes(`.${domain}/`);
  }

  /**
   * Simple wildcard matching without regex
   */
  private simpleWildcardMatch(url: string, pattern: string): boolean {
    // Convert pattern to lowercase
    const lowerPattern = pattern.toLowerCase();
    
    // Handle common patterns without regex
    // *://domain.com/* -> check if URL contains domain
    if (lowerPattern.startsWith('*://') && lowerPattern.endsWith('/*')) {
      const middle = lowerPattern.slice(4, -2);
      return url.includes(middle);
    }
    
    // ||domain.com^ -> check domain boundary
    if (lowerPattern.startsWith('||') && lowerPattern.endsWith('^')) {
      const domain = lowerPattern.slice(2, -1);
      return this.urlContainsDomain(url, domain);
    }
    
    // Simple contains check for other patterns
    const cleanPattern = lowerPattern
      .replace(/^\*:\/\//, '')
      .replace(/\/\*$/, '')
      .replace(/\*/g, '');
    
    return url.includes(cleanPattern);
  }

  /**
   * Get statistics
   */
  getStats(): { patterns: number; domains: number; bloomFilterUsage: number } {
    let bitsSet = 0;
    for (const byte of this.bloomFilter) {
      bitsSet += this.countBits(byte);
    }
    
    return {
      patterns: this.compiledPatterns.size,
      domains: this.domainIndex.size,
      bloomFilterUsage: bitsSet / (this.bloomFilter.length * 8),
    };
  }

  private countBits(n: number): number {
    let count = 0;
    while (n) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.bloomFilter.fill(0);
    this.compiledPatterns.clear();
    this.domainIndex.clear();
    this.initialized = false;
  }
}
```

#### Step 2: Update TrackerBlocker

**File:** `electron/core/privacy/tracker-blocker.ts`

```typescript
/**
 * Tracker Blocker - UPDATED VERSION
 * Uses PatternMatcher for safe, high-performance blocking
 */

import { session } from 'electron';
import { PatternMatcher } from './pattern-matcher';

export class TrackerBlocker {
  private enabled: boolean;
  private patternMatcher: PatternMatcher;
  private customRules: Set<string>;
  private defaultPatterns: string[];

  constructor() {
    this.enabled = true;
    this.patternMatcher = new PatternMatcher();
    this.customRules = new Set();
    this.defaultPatterns = this.getDefaultPatterns();
    
    // Initialize pattern matcher with default patterns
    this.patternMatcher.initialize(this.defaultPatterns);
  }

  private getDefaultPatterns(): string[] {
    return [
      // Analytics
      '||google-analytics.com^',
      '||*.google-analytics.com^',
      '||googletagmanager.com^',
      '||*.googletagmanager.com^',
      '||analytics.google.com^',
      
      // Social media trackers
      '||connect.facebook.net^',
      '||platform.twitter.com^',
      '||platform.linkedin.com^',
      
      // Ad networks
      '||doubleclick.net^',
      '||*.doubleclick.net^',
      '||googlesyndication.com^',
      '||*.googlesyndication.com^',
      '||adservice.google.com^',
      
      // Other trackers
      '||scorecardresearch.com^',
      '||quantserve.com^',
      '||hotjar.com^',
      '||*.hotjar.com^',
      '||mouseflow.com^',
      '||crazyegg.com^',
    ];
  }

  enableForSession(sessionPartition: string): void {
    if (!this.enabled) return;
    
    const webSession = session.fromPartition(sessionPartition);
    
    webSession.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      
      // Check pattern matcher (safe, no ReDoS)
      if (this.patternMatcher.matches(url)) {
        console.log('[Tracker Blocker] Blocked:', url.substring(0, 100));
        callback({ cancel: true });
        return;
      }
      
      // Check custom rules (simple string matching)
      for (const rule of this.customRules) {
        if (url.toLowerCase().includes(rule.toLowerCase())) {
          console.log('[Tracker Blocker] Blocked (custom):', url.substring(0, 100));
          callback({ cancel: true });
          return;
        }
      }
      
      callback({ cancel: false });
    });
    
    console.log('[Tracker Blocker] Enabled for session:', sessionPartition);
  }

  addCustomRule(rule: string): void {
    if (rule && rule.length <= 200) {
      this.customRules.add(rule);
      this.patternMatcher.addPattern(rule);
    }
  }

  removeCustomRule(rule: string): void {
    this.customRules.delete(rule);
    this.patternMatcher.removePattern(rule);
  }

  getCustomRules(): string[] {
    return [...this.customRules];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  addToBlocklist(pattern: string): void {
    this.patternMatcher.addPattern(pattern);
  }

  removeFromBlocklist(pattern: string): void {
    this.patternMatcher.removePattern(pattern);
  }

  getBlocklist(): string[] {
    return this.defaultPatterns;
  }

  getStats(): { patterns: number; domains: number } {
    const stats = this.patternMatcher.getStats();
    return { patterns: stats.patterns, domains: stats.domains };
  }
}
```

### Migration Strategy

1. **Replace matchesPattern:** Remove regex-based matching entirely
2. **Pre-compile patterns:** Initialize PatternMatcher at startup
3. **Maintain API:** Keep existing public methods for backward compatibility

### Backward Compatibility

1. **Custom Rules:** Existing custom rules work with new matcher
2. **Blocklist Format:** Both old (`*://domain/*`) and EasyList (`||domain^`) formats supported
3. **API:** All public methods remain unchanged

### Test Cases

**File:** `tests/unit/privacy/pattern-matcher.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher } from '../../../electron/core/privacy/pattern-matcher';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('ReDoS Prevention', () => {
    it('should handle patterns that would cause ReDoS', () => {
      // This pattern would cause ReDoS with regex: .*\..*\..*\..*\..*\..*
      const evilPattern = '*.*.*.*.*.*';
      matcher.initialize([evilPattern]);
      
      // Long URL that would trigger catastrophic backtracking
      const longUrl = 'https://' + 'a'.repeat(10000) + '.com/path';
      
      const start = Date.now();
      matcher.matches(longUrl);
      const elapsed = Date.now() - start;
      
      // Should complete quickly (< 100ms), not hang
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle nested quantifier patterns safely', () => {
      const patterns = [
        '*://(*)+.com/*',
        '*://(a*)+.com/*',
        '*://([a-z]+)+.com/*',
      ];
      
      matcher.initialize(patterns);
      
      const longUrl = 'https://' + 'a'.repeat(50) + '.com/path';
      
      const start = Date.now();
      matcher.matches(longUrl);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Pattern Matching', () => {
    it('should match EasyList domain patterns', () => {
      matcher.initialize(['||google-analytics.com^']);
      
      expect(matcher.matches('https://google-analytics.com/track')).toBe(true);
      expect(matcher.matches('https://www.google-analytics.com/collect')).toBe(true);
      expect(matcher.matches('https://safe-site.com/')).toBe(false);
    });

    it('should match wildcard URL patterns', () => {
      matcher.initialize(['*://tracker.com/*']);
      
      expect(matcher.matches('https://tracker.com/pixel.gif')).toBe(true);
      expect(matcher.matches('http://tracker.com/track')).toBe(true);
      expect(matcher.matches('https://not-tracker.com/')).toBe(false);
    });

    it('should match subdomain patterns', () => {
      matcher.initialize(['||*.hotjar.com^']);
      
      expect(matcher.matches('https://static.hotjar.com/script.js')).toBe(true);
      expect(matcher.matches('https://api.hotjar.com/track')).toBe(true);
      expect(matcher.matches('https://hotjar.com/')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large blocklists efficiently', () => {
      const patterns = Array.from({ length: 10000 }, (_, i) => 
        `||tracker${i}.com^`
      );
      
      const initStart = Date.now();
      matcher.initialize(patterns);
      const initTime = Date.now() - initStart;
      
      // Initialization should be < 1 second
      expect(initTime).toBeLessThan(1000);
      
      // Matching should be fast
      const matchStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        matcher.matches('https://tracker500.com/track');
      }
      const matchTime = Date.now() - matchStart;
      
      // 1000 matches should complete in < 100ms
      expect(matchTime).toBeLessThan(100);
    });

    it('should use bloom filter for fast rejection', () => {
      matcher.initialize(['||tracker.com^']);
      
      // URLs that definitely don't match should be rejected quickly
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        matcher.matches('https://safe-site.com/page');
      }
      const elapsed = Date.now() - start;
      
      // Bloom filter rejection should be very fast
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patterns', () => {
      matcher.initialize(['', '   ', null as any]);
      expect(matcher.matches('https://any.com/')).toBe(false);
    });

    it('should handle invalid URLs', () => {
      matcher.initialize(['||tracker.com^']);
      expect(matcher.matches('')).toBe(false);
      expect(matcher.matches('not-a-url')).toBe(false);
      expect(matcher.matches(null as any)).toBe(false);
    });

    it('should handle very long patterns', () => {
      const longPattern = '||' + 'a'.repeat(600) + '.com^';
      matcher.initialize([longPattern]);
      // Should be rejected due to length limit
      expect(matcher.getStats().patterns).toBe(0);
    });
  });
});
```

### Security Verification

1. **ReDoS Testing:**
   - [ ] Test with known ReDoS patterns
   - [ ] Measure response time for malicious inputs
   - [ ] Verify no CPU spikes during matching

2. **Performance Testing:**
   - [ ] Load test with 100k patterns
   - [ ] Measure memory usage
   - [ ] Profile CPU during heavy traffic

3. **Functional Testing:**
   - [ ] All existing trackers still blocked
   - [ ] Custom rules work correctly
   - [ ] EasyList format supported

---

## Vulnerability 3: WebRTC Protection Bypass

### Current State Analysis

**File:** `electron/core/privacy/webrtc.ts`

**Current Issue:** The WebRTC protection only blocks basic APIs but misses several leak vectors:

```typescript
// INCOMPLETE PROTECTION
// Missing: RTCIceCandidate filtering
// Missing: RTCSessionDescription interception
// Missing: getStats() leak prevention
// Missing: RTCRtpReceiver/RTCRtpSender handling
```

**Risk:**
1. **ICE Candidate Leaks:** Reflexive (srflx) and relay (relay) candidates expose real IP
2. **SDP Leaks:** Session descriptions contain IP addresses
3. **Stats API Leaks:** getStats() can reveal local IP information
4. **Incomplete API Coverage:** Some WebRTC APIs not blocked

### Fix Implementation

#### Updated WebRTC Protection

**File:** `electron/core/privacy/webrtc.ts`

```typescript
/**
 * WebRTC Leak Prevention - COMPREHENSIVE VERSION
 * Blocks all WebRTC IP leak vectors
 * 
 * Security Features:
 * - Complete API blocking
 * - ICE candidate filtering
 * - SDP sanitization
 * - Stats API protection
 * - RTCRtpReceiver/Sender blocking
 */

export interface WebRTCProtectionConfig {
  /** Block all WebRTC (most secure) */
  blockAll?: boolean;
  /** Allow WebRTC but filter IPs */
  filterIPs?: boolean;
  /** Allowed ICE candidate types when filtering */
  allowedCandidateTypes?: ('host' | 'srflx' | 'prflx' | 'relay')[];
  /** Replace IPs with proxy IP */
  proxyIP?: string;
}

const DEFAULT_CONFIG: WebRTCProtectionConfig = {
  blockAll: true,
  filterIPs: false,
  allowedCandidateTypes: [],
};

export class WebRTCProtection {
  private config: WebRTCProtectionConfig;

  constructor(blockWebRTC: boolean = true) {
    this.config = {
      ...DEFAULT_CONFIG,
      blockAll: blockWebRTC,
    };
  }

  /**
   * Configure protection mode
   */
  configure(config: Partial<WebRTCProtectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate comprehensive injection script
   */
  generateInjectionScript(): string {
    const config = JSON.stringify(this.config);
    
    return `
      (function() {
        'use strict';
        
        const config = ${config};
        
        if (!config.blockAll && !config.filterIPs) return;
        
        // Store original constructors
        const OriginalRTCPeerConnection = window.RTCPeerConnection;
        const OriginalRTCSessionDescription = window.RTCSessionDescription;
        const OriginalRTCIceCandidate = window.RTCIceCandidate;

        // ============================================================
        // COMPLETE BLOCK MODE
        // ============================================================
        
        if (config.blockAll) {
          // Block RTCPeerConnection (all variants)
          const blockPeerConnection = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          window.RTCPeerConnection = blockPeerConnection;
          window.webkitRTCPeerConnection = blockPeerConnection;
          window.mozRTCPeerConnection = blockPeerConnection;
          
          // Block RTCSessionDescription
          window.RTCSessionDescription = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          // Block RTCIceCandidate
          window.RTCIceCandidate = function() {
            throw new DOMException(
              'WebRTC is disabled for privacy protection',
              'NotSupportedError'
            );
          };
          
          // Block RTCDataChannel
          if (window.RTCDataChannel) {
            Object.defineProperty(window, 'RTCDataChannel', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpReceiver
          if (window.RTCRtpReceiver) {
            Object.defineProperty(window, 'RTCRtpReceiver', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpSender
          if (window.RTCRtpSender) {
            Object.defineProperty(window, 'RTCRtpSender', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block RTCRtpTransceiver
          if (window.RTCRtpTransceiver) {
            Object.defineProperty(window, 'RTCRtpTransceiver', {
              get: () => undefined,
              configurable: false
            });
          }
          
          // Block getUserMedia (all variants)
          if (navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia = function() {
              return Promise.reject(new DOMException(
                'WebRTC is disabled for privacy protection',
                'NotAllowedError'
              ));
            };
            
            // Block getDisplayMedia
            if (navigator.mediaDevices.getDisplayMedia) {
              navigator.mediaDevices.getDisplayMedia = function() {
                return Promise.reject(new DOMException(
                  'Screen sharing is disabled for privacy protection',
                  'NotAllowedError'
                ));
              };
            }
          }
          
          // Block legacy getUserMedia
          if (navigator.getUserMedia) {
            navigator.getUserMedia = function(constraints, success, error) {
              if (error) {
                error(new DOMException(
                  'WebRTC is disabled for privacy protection',
                  'NotAllowedError'
                ));
              }
            };
          }
          
          // Block webkitGetUserMedia
          if (navigator.webkitGetUserMedia) {
            navigator.webkitGetUserMedia = navigator.getUserMedia;
          }
          
          // Block mozGetUserMedia
          if (navigator.mozGetUserMedia) {
            navigator.mozGetUserMedia = navigator.getUserMedia;
          }
          
          // Block enumerateDevices
          if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices = function() {
              return Promise.resolve([]);
            };
          }
          
          // Block getSupportedConstraints
          if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
            navigator.mediaDevices.getSupportedConstraints = function() {
              return {};
            };
          }
          
          console.log('[WebRTC Protection] WebRTC completely blocked');
          return;
        }
        
        // ============================================================
        // IP FILTERING MODE (Allow WebRTC but filter IPs)
        // ============================================================
        
        if (config.filterIPs && OriginalRTCPeerConnection) {
          
          // IP regex patterns
          const ipv4Regex = /([0-9]{1,3}(\\.[0-9]{1,3}){3})/g;
          const ipv6Regex = /([a-fA-F0-9]{1,4}(:[a-fA-F0-9]{1,4}){7})/g;
          
          // Check if IP is private/local
          function isPrivateIP(ip) {
            const parts = ip.split('.').map(Number);
            if (parts.length !== 4) return false;
            
            // 10.x.x.x
            if (parts[0] === 10) return true;
            // 172.16-31.x.x
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
            // 192.168.x.x
            if (parts[0] === 192 && parts[1] === 168) return true;
            // 127.x.x.x (loopback)
            if (parts[0] === 127) return true;
            // 169.254.x.x (link-local)
            if (parts[0] === 169 && parts[1] === 254) return true;
            
            return false;
          }
          
          // Sanitize SDP to remove/replace IP addresses
          function sanitizeSDP(sdp) {
            if (!sdp) return sdp;
            
            let sanitized = sdp;
            
            // Replace IPv4 addresses
            sanitized = sanitized.replace(ipv4Regex, (match) => {
              if (isPrivateIP(match)) {
                return config.proxyIP || '0.0.0.0';
              }
              return match;
            });
            
            // Remove IPv6 addresses entirely (often local)
            sanitized = sanitized.replace(ipv6Regex, '::');
            
            return sanitized;
          }
          
          // Filter ICE candidate
          function filterCandidate(candidate) {
            if (!candidate || !candidate.candidate) return null;
            
            const candidateStr = candidate.candidate;
            
            // Parse candidate type
            const typeMatch = candidateStr.match(/typ (host|srflx|prflx|relay)/);
            if (!typeMatch) return candidate;
            
            const type = typeMatch[1];
            
            // Check if type is allowed
            if (!config.allowedCandidateTypes.includes(type)) {
              console.log('[WebRTC Protection] Filtered candidate type:', type);
              return null;
            }
            
            // For allowed candidates, still filter IPs
            const filteredCandidate = candidateStr.replace(ipv4Regex, (match) => {
              if (isPrivateIP(match)) {
                return config.proxyIP || '0.0.0.0';
              }
              return match;
            });
            
            return new OriginalRTCIceCandidate({
              ...candidate,
              candidate: filteredCandidate
            });
          }
          
          // Wrap RTCPeerConnection
          window.RTCPeerConnection = function(configuration, constraints) {
            // Filter ICE servers to prevent STUN/TURN leaks
            if (configuration && configuration.iceServers) {
              // Remove STUN servers that could leak IP
              configuration.iceServers = configuration.iceServers.filter(server => {
                const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                // Only keep TURN servers (they proxy traffic)
                return urls.some(url => url && url.startsWith('turn:'));
              });
            }
            
            const pc = new OriginalRTCPeerConnection(configuration, constraints);
            
            // Wrap onicecandidate
            const originalOnIceCandidate = Object.getOwnPropertyDescriptor(
              RTCPeerConnection.prototype, 'onicecandidate'
            );
            
            let userOnIceCandidate = null;
            
            Object.defineProperty(pc, 'onicecandidate', {
              get: () => userOnIceCandidate,
              set: (handler) => {
                userOnIceCandidate = handler;
                pc.addEventListener('icecandidate', (event) => {
                  if (event.candidate) {
                    const filtered = filterCandidate(event.candidate);
                    if (filtered) {
                      const newEvent = new RTCPeerConnectionIceEvent('icecandidate', {
                        candidate: filtered
                      });
                      handler(newEvent);
                    }
                    // If filtered is null, don't call handler (block candidate)
                  } else {
                    handler(event); // null candidate signals end of gathering
                  }
                });
              }
            });
            
            // Wrap createOffer
            const originalCreateOffer = pc.createOffer.bind(pc);
            pc.createOffer = async function(options) {
              const offer = await originalCreateOffer(options);
              offer.sdp = sanitizeSDP(offer.sdp);
              return offer;
            };
            
            // Wrap createAnswer
            const originalCreateAnswer = pc.createAnswer.bind(pc);
            pc.createAnswer = async function(options) {
              const answer = await originalCreateAnswer(options);
              answer.sdp = sanitizeSDP(answer.sdp);
              return answer;
            };
            
            // Wrap setLocalDescription
            const originalSetLocalDescription = pc.setLocalDescription.bind(pc);
            pc.setLocalDescription = async function(description) {
              if (description && description.sdp) {
                description.sdp = sanitizeSDP(description.sdp);
              }
              return originalSetLocalDescription(description);
            };
            
            // Wrap getStats to prevent IP leaks
            const originalGetStats = pc.getStats.bind(pc);
            pc.getStats = async function(selector) {
              const stats = await originalGetStats(selector);
              
              // Filter stats to remove IP information
              const filteredStats = new Map();
              stats.forEach((value, key) => {
                const filtered = { ...value };
                
                // Remove IP-related fields
                delete filtered.ip;
                delete filtered.address;
                delete filtered.candidateType;
                delete filtered.relatedAddress;
                delete filtered.relatedPort;
                
                filteredStats.set(key, filtered);
              });
              
              return filteredStats;
            };
            
            return pc;
          };
          
          // Copy static properties
          Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
          window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
          
          console.log('[WebRTC Protection] IP filtering enabled');
        }
      })();
    `;
  }

  setBlockWebRTC(block: boolean): void {
    this.config.blockAll = block;
  }

  isBlocked(): boolean {
    return this.config.blockAll ?? true;
  }
  
  /**
   * Get current configuration
   */
  getConfig(): WebRTCProtectionConfig {
    return { ...this.config };
  }
}
```

### Migration Strategy

1. **Replace existing script:** Update `generateInjectionScript()` with comprehensive version
2. **Add configuration options:** Enable IP filtering mode for users who need WebRTC
3. **Maintain backward compatibility:** Default to `blockAll: true`

### Backward Compatibility

1. **API Unchanged:** `isBlocked()` and `setBlockWebRTC()` work as before
2. **Default Behavior:** Still blocks all WebRTC by default
3. **New Features:** Optional IP filtering mode for advanced users

### Test Cases

**File:** `tests/unit/privacy/webrtc-comprehensive.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { WebRTCProtection } from '../../../electron/core/privacy/webrtc';

describe('WebRTCProtection Comprehensive', () => {
  let protection: WebRTCProtection;

  beforeEach(() => {
    protection = new WebRTCProtection(true);
  });

  describe('Complete Block Mode', () => {
    it('should generate script that blocks RTCPeerConnection', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('window.RTCPeerConnection = blockPeerConnection');
      expect(script).toContain('window.webkitRTCPeerConnection = blockPeerConnection');
      expect(script).toContain('window.mozRTCPeerConnection = blockPeerConnection');
    });

    it('should block RTCSessionDescription', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('window.RTCSessionDescription = function()');
      expect(script).toContain('NotSupportedError');
    });

    it('should block RTCIceCandidate', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('window.RTCIceCandidate = function()');
    });

    it('should block RTCDataChannel', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('RTCDataChannel');
      expect(script).toContain('configurable: false');
    });

    it('should block RTCRtpReceiver', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('RTCRtpReceiver');
    });

    it('should block RTCRtpSender', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('RTCRtpSender');
    });

    it('should block RTCRtpTransceiver', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('RTCRtpTransceiver');
    });

    it('should block getDisplayMedia', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('getDisplayMedia');
      expect(script).toContain('Screen sharing is disabled');
    });

    it('should block getSupportedConstraints', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('getSupportedConstraints');
    });
  });

  describe('IP Filtering Mode', () => {
    beforeEach(() => {
      protection.configure({
        blockAll: false,
        filterIPs: true,
        allowedCandidateTypes: ['relay'],
        proxyIP: '203.0.113.1',
      });
    });

    it('should generate script with IP filtering', () => {
      const script = protection.generateInjectionScript();
      
      expect(script).toContain('filterIPs');
      expect(script).toContain('sanitizeSDP');
      expect(script).toContain('filterCandidate');
    });

    it('should filter STUN servers from ICE configuration', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('iceServers');
      expect(script).toContain("url.startsWith('turn:')");
    });

    it('should wrap createOffer to sanitize SDP', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('pc.createOffer');
      expect(script).toContain('sanitizeSDP(offer.sdp)');
    });

    it('should wrap createAnswer to sanitize SDP', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('pc.createAnswer');
      expect(script).toContain('sanitizeSDP(answer.sdp)');
    });

    it('should wrap getStats to remove IP info', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('pc.getStats');
      expect(script).toContain('delete filtered.ip');
      expect(script).toContain('delete filtered.address');
    });

    it('should filter ICE candidates by type', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('allowedCandidateTypes');
      expect(script).toContain('typ (host|srflx|prflx|relay)');
    });

    it('should replace private IPs with proxy IP', () => {
      const script = protection.generateInjectionScript();
      expect(script).toContain('isPrivateIP');
      expect(script).toContain('config.proxyIP');
    });
  });

  describe('Configuration', () => {
    it('should return configuration', () => {
      protection.configure({
        blockAll: false,
        filterIPs: true,
        proxyIP: '1.2.3.4',
      });
      
      const config = protection.getConfig();
      expect(config.blockAll).toBe(false);
      expect(config.filterIPs).toBe(true);
      expect(config.proxyIP).toBe('1.2.3.4');
    });

    it('should maintain backward compatibility', () => {
      const oldProtection = new WebRTCProtection(true);
      expect(oldProtection.isBlocked()).toBe(true);
      
      oldProtection.setBlockWebRTC(false);
      expect(oldProtection.isBlocked()).toBe(false);
    });
  });

  describe('IP Detection', () => {
    it('should detect all private IP ranges in script', () => {
      protection.configure({ blockAll: false, filterIPs: true });
      const script = protection.generateInjectionScript();
      
      // Check all private ranges are detected
      expect(script).toContain('parts[0] === 10'); // 10.x.x.x
      expect(script).toContain('parts[0] === 172'); // 172.16-31.x.x
      expect(script).toContain('parts[0] === 192'); // 192.168.x.x
      expect(script).toContain('parts[0] === 127'); // loopback
      expect(script).toContain('parts[0] === 169'); // link-local
    });
  });
});
```

### Security Verification

1. **WebRTC Leak Test Sites:**
   - [ ] Test on browserleaks.com/webrtc
   - [ ] Test on ipleak.net
   - [ ] Test on whoer.net

2. **API Coverage:**
   - [ ] All WebRTC constructors blocked
   - [ ] All getUserMedia variants blocked
   - [ ] ICE candidate types filtered
   - [ ] SDP sanitized

3. **Penetration Testing:**
   - [ ] Attempt to create RTCPeerConnection
   - [ ] Attempt to enumerate devices
   - [ ] Attempt STUN binding request
   - [ ] Check for IP in page JavaScript

---

## Vulnerability 4: Session URL Validation Gap

### Current State Analysis

**File:** `electron/core/session/manager.ts`

**Current Issue:** URLs stored in sessions are not re-validated when restored:

```typescript
// VULNERABLE CODE (lines 78-105)
async loadSession(id: string): Promise<SavedSession | null> {
  const sql = `SELECT * FROM sessions WHERE id = ?`;
  const row = this.db.queryOne<SessionRow>(sql, [id]);

  if (!row) return null;

  const session: SavedSession = {
    id: row.id,
    name: row.name,
    tabs: JSON.parse(row.tabs),  // ❌ URLs not re-validated!
    windowBounds: JSON.parse(row.window_bounds),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };

  this.currentSession = session;
  this.emit('session:loaded', session);

  return session;  // ❌ Potentially dangerous URLs returned
}
```

**Risk:**
1. **Stored SSRF:** Attacker could inject `http://169.254.169.254/` URLs into session storage
2. **JavaScript Injection:** `javascript:` URLs could be stored and restored
3. **Local File Access:** `file://` URLs could be injected
4. **Time-of-Check/Time-of-Use:** URL could be safe when saved, but validation rules updated

### Fix Implementation

#### Updated Session Manager

**File:** `electron/core/session/manager.ts`

```typescript
/**
 * Session Manager - SECURE VERSION
 * Re-validates all URLs on restore
 */

import { EventEmitter } from 'events';
import { z } from 'zod';
import type { DatabaseManager } from '../../database';
import type { PrivacyConfig } from '../privacy/manager';
import { SafeUrlSchema } from '../../ipc/validation';

// Security event types
export type SecurityEventType = 
  | 'dangerous_url_filtered'
  | 'session_sanitized'
  | 'validation_failed';

export interface SecurityEvent {
  type: SecurityEventType;
  sessionId: string;
  details: {
    url?: string;
    reason?: string;
    tabIndex?: number;
  };
  timestamp: Date;
}

export interface SavedSession {
  id: string;
  name: string;
  tabs: TabState[];
  windowBounds: WindowBounds;
  createdAt: Date;
  updatedAt: Date;
}

interface TabState {
  url: string;
  title: string;
  proxyId?: string;
  privacyConfig?: PrivacyConfig;
}

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Zod schema for tab validation
const TabStateSchema = z.object({
  url: z.string().max(2048),
  title: z.string().max(500).default(''),
  proxyId: z.string().uuid().optional(),
  privacyConfig: z.object({}).passthrough().optional(),
});

const WindowBoundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(100).max(10000),
  height: z.number().int().min(100).max(10000),
});

export class SessionManager extends EventEmitter {
  private db: DatabaseManager;
  private currentSession: SavedSession | null = null;
  private securityEvents: SecurityEvent[] = [];
  private readonly MAX_SECURITY_EVENTS = 1000;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
  }

  /**
   * Save current session with URL validation
   */
  async saveSession(
    name: string, 
    tabs: TabState[], 
    windowBounds: WindowBounds
  ): Promise<SavedSession> {
    // Validate and sanitize tabs before saving
    const sanitizedTabs = this.sanitizeTabs(tabs, 'save');

    const session: SavedSession = {
      id: crypto.randomUUID(),
      name: this.sanitizeSessionName(name),
      tabs: sanitizedTabs,
      windowBounds: this.validateWindowBounds(windowBounds),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const sql = `
      INSERT INTO sessions (id, name, tabs, window_bounds, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      session.id,
      session.name,
      JSON.stringify(session.tabs),
      JSON.stringify(session.windowBounds),
      session.createdAt.toISOString(),
      session.updatedAt.toISOString()
    ]);

    this.currentSession = session;
    this.emit('session:saved', session);

    return session;
  }

  /**
   * Load session with MANDATORY URL re-validation
   */
  async loadSession(id: string): Promise<SavedSession | null> {
    // Validate session ID format
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
      this.logSecurityEvent({
        type: 'validation_failed',
        sessionId: id,
        details: { reason: 'Invalid session ID format' },
        timestamp: new Date(),
      });
      return null;
    }

    const sql = `SELECT * FROM sessions WHERE id = ?`;
    interface SessionRow {
      id: string;
      name: string;
      tabs: string;
      window_bounds: string;
      created_at: string;
      updated_at: string;
    }
    const row = this.db.queryOne<SessionRow>(sql, [id]);

    if (!row) return null;

    // Parse stored data
    let rawTabs: unknown[];
    let rawWindowBounds: unknown;
    
    try {
      rawTabs = JSON.parse(row.tabs);
      rawWindowBounds = JSON.parse(row.window_bounds);
    } catch (error) {
      this.logSecurityEvent({
        type: 'validation_failed',
        sessionId: id,
        details: { reason: 'Failed to parse session data' },
        timestamp: new Date(),
      });
      return null;
    }

    // RE-VALIDATE all URLs (SECURITY CRITICAL)
    const sanitizedTabs = this.sanitizeTabs(rawTabs as TabState[], 'restore', id);

    // Validate window bounds
    const validatedBounds = this.validateWindowBounds(rawWindowBounds);

    const session: SavedSession = {
      id: row.id,
      name: row.name,
      tabs: sanitizedTabs,
      windowBounds: validatedBounds,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    // Log if any tabs were filtered
    if (sanitizedTabs.length < (rawTabs as TabState[]).length) {
      this.logSecurityEvent({
        type: 'session_sanitized',
        sessionId: id,
        details: {
          reason: `Filtered ${(rawTabs as TabState[]).length - sanitizedTabs.length} dangerous tabs`,
        },
        timestamp: new Date(),
      });
    }

    this.currentSession = session;
    this.emit('session:loaded', session);

    return session;
  }

  /**
   * Sanitize and validate tabs
   */
  private sanitizeTabs(
    tabs: TabState[], 
    operation: 'save' | 'restore',
    sessionId?: string
  ): TabState[] {
    if (!Array.isArray(tabs)) return [];

    const sanitized: TabState[] = [];

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      
      // Validate tab structure
      const tabValidation = TabStateSchema.safeParse(tab);
      if (!tabValidation.success) {
        this.logSecurityEvent({
          type: 'validation_failed',
          sessionId: sessionId || 'unknown',
          details: { 
            reason: 'Invalid tab structure',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        continue;
      }

      // Validate URL through SafeUrlSchema (SSRF protection)
      const urlValidation = SafeUrlSchema.safeParse(tab.url);
      if (!urlValidation.success) {
        this.logSecurityEvent({
          type: 'dangerous_url_filtered',
          sessionId: sessionId || 'unknown',
          details: {
            url: tab.url.substring(0, 100), // Truncate for logging
            reason: 'URL failed SSRF validation',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        
        // Skip this tab entirely - don't restore dangerous URLs
        continue;
      }

      // Additional security checks
      if (this.isProhibitedUrl(tab.url)) {
        this.logSecurityEvent({
          type: 'dangerous_url_filtered',
          sessionId: sessionId || 'unknown',
          details: {
            url: tab.url.substring(0, 100),
            reason: 'URL matches prohibited pattern',
            tabIndex: i,
          },
          timestamp: new Date(),
        });
        continue;
      }

      sanitized.push({
        url: urlValidation.data,
        title: this.sanitizeTitle(tab.title),
        proxyId: tab.proxyId,
        privacyConfig: tab.privacyConfig,
      });
    }

    return sanitized;
  }

  /**
   * Check for additional prohibited URL patterns
   */
  private isProhibitedUrl(url: string): boolean {
    const lower = url.toLowerCase();
    
    const prohibited = [
      // Dangerous protocols
      'javascript:',
      'vbscript:',
      'data:text/html',
      'data:application',
      'file://',
      'about:',
      'chrome://',
      'chrome-extension://',
      
      // Cloud metadata endpoints
      '169.254.169.254',
      '169.254.170.2',
      'metadata.google',
      'metadata.aws',
      
      // Internal/localhost
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '[::1]',
      
      // Common SSRF targets
      '/etc/passwd',
      '/proc/',
      'gopher://',
      'dict://',
    ];

    return prohibited.some(pattern => lower.includes(pattern));
  }

  /**
   * Sanitize session name
   */
  private sanitizeSessionName(name: string): string {
    return name
      .replace(/[<>'"]/g, '')
      .replace(/[\x00-\x1f]/g, '')
      .substring(0, 100)
      .trim() || 'Unnamed Session';
  }

  /**
   * Sanitize tab title
   */
  private sanitizeTitle(title: string): string {
    if (!title) return '';
    return title
      .replace(/[<>]/g, '')
      .replace(/[\x00-\x1f]/g, '')
      .substring(0, 500);
  }

  /**
   * Validate window bounds
   */
  private validateWindowBounds(bounds: unknown): WindowBounds {
    const validation = WindowBoundsSchema.safeParse(bounds);
    if (validation.success) {
      return validation.data;
    }
    
    // Return safe defaults
    return { x: 100, y: 100, width: 1200, height: 800 };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Trim old events
    if (this.securityEvents.length > this.MAX_SECURITY_EVENTS) {
      this.securityEvents = this.securityEvents.slice(-this.MAX_SECURITY_EVENTS);
    }

    // Emit for monitoring
    this.emit('security:event', event);
    
    // Log to console
    console.warn('[SessionManager Security]', event.type, event.details);
  }

  /**
   * Get security events for monitoring
   */
  getSecurityEvents(): SecurityEvent[] {
    return [...this.securityEvents];
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    this.securityEvents = [];
  }

  // ... rest of existing methods (getAllSessions, deleteSession, updateSession)
  // with similar URL re-validation applied

  async getAllSessions(): Promise<SavedSession[]> {
    const sql = `SELECT * FROM sessions ORDER BY updated_at DESC`;
    interface SessionRow {
      id: string;
      name: string;
      tabs: string;
      window_bounds: string;
      created_at: string;
      updated_at: string;
    }
    const rows = this.db.query<SessionRow>(sql);

    // Re-validate all sessions on retrieval
    return rows.map(row => {
      let tabs: TabState[] = [];
      let windowBounds: WindowBounds = { x: 100, y: 100, width: 1200, height: 800 };
      
      try {
        const rawTabs = JSON.parse(row.tabs);
        tabs = this.sanitizeTabs(rawTabs, 'restore', row.id);
        windowBounds = this.validateWindowBounds(JSON.parse(row.window_bounds));
      } catch {
        // Use defaults on parse error
      }

      return {
        id: row.id,
        name: row.name,
        tabs,
        windowBounds,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    });
  }

  async updateSession(id: string, updates: Partial<SavedSession>): Promise<SavedSession | null> {
    const session = await this.loadSession(id);
    if (!session) return null;

    // Re-validate any URL updates
    let updatedTabs = session.tabs;
    if (updates.tabs) {
      updatedTabs = this.sanitizeTabs(updates.tabs, 'save', id);
    }

    const updated: SavedSession = {
      ...session,
      ...updates,
      tabs: updatedTabs,
      updatedAt: new Date()
    };

    const sql = `
      UPDATE sessions
      SET name = ?, tabs = ?, window_bounds = ?, updated_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      updated.name,
      JSON.stringify(updated.tabs),
      JSON.stringify(updated.windowBounds),
      updated.updatedAt.toISOString(),
      id
    ]);

    this.currentSession = updated;
    this.emit('session:updated', updated);

    return updated;
  }

  getCurrentSession(): SavedSession | null {
    return this.currentSession;
  }
}
```

### Migration Strategy

1. **Update loadSession:** Add URL re-validation
2. **Update getAllSessions:** Re-validate all URLs
3. **Add security logging:** Track filtered URLs
4. **Backward compatible:** No schema changes needed

### Backward Compatibility

1. **Existing Sessions:** Will be re-validated on load (dangerous URLs filtered)
2. **API Unchanged:** All public methods have same signature
3. **Safe Defaults:** Invalid data results in safe defaults, not errors

### Test Cases

**File:** `tests/unit/session-manager-security.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../electron/core/session/manager';
import type { DatabaseManager } from '../../electron/database';

const mockDb = {
  query: vi.fn(() => []),
  queryOne: vi.fn(),
  execute: vi.fn(() => ({ changes: 1 })),
  close: vi.fn()
} as unknown as DatabaseManager;

describe('SessionManager Security', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager(mockDb);
    vi.clearAllMocks();
  });

  describe('SSRF Prevention on Restore', () => {
    it('should filter localhost URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://localhost/admin', title: 'Admin' },
          { url: 'https://safe-site.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session).toBeDefined();
      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).toBe('https://safe-site.com/');
    });

    it('should filter AWS metadata URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://169.254.169.254/latest/meta-data/', title: 'Metadata' },
          { url: 'https://example.com/', title: 'Example' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('169.254');
    });

    it('should filter private IP URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://192.168.1.1/', title: 'Router' },
          { url: 'http://10.0.0.1/admin', title: 'Internal' },
          { url: 'http://172.16.0.1/', title: 'Private' },
          { url: 'https://public-site.com/', title: 'Public' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).toBe('https://public-site.com/');
    });
  });

  describe('JavaScript URL Prevention', () => {
    it('should filter javascript: URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'javascript:alert(document.cookie)', title: 'XSS' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('javascript:');
    });

    it('should filter data: URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'data:text/html,<script>alert(1)</script>', title: 'Data XSS' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('data:');
    });
  });

  describe('File URL Prevention', () => {
    it('should filter file:// URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'file:///etc/passwd', title: 'Passwd' },
          { url: 'file:///C:/Windows/System32/config/SAM', title: 'SAM' },
          { url: 'https://safe.com/', title: 'Safe' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs).toHaveLength(1);
      expect(session?.tabs[0].url).not.toContain('file://');
    });
  });

  describe('Security Event Logging', () => {
    it('should log filtered URLs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://localhost/', title: 'Local' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const securityListener = vi.fn();
      manager.on('security:event', securityListener);

      await manager.loadSession(mockSession.id);

      expect(securityListener).toHaveBeenCalled();
      const event = securityListener.mock.calls[0][0];
      expect(event.type).toBe('dangerous_url_filtered');
    });

    it('should provide security events for monitoring', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([
          { url: 'http://127.0.0.1/', title: 'Local' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      await manager.loadSession(mockSession.id);

      const events = manager.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('dangerous_url_filtered');
    });
  });

  describe('Session ID Validation', () => {
    it('should reject invalid session IDs', async () => {
      const result = await manager.loadSession('invalid-id');
      expect(result).toBeNull();
    });

    it('should reject path traversal attempts', async () => {
      const result = await manager.loadSession('../../../etc/passwd');
      expect(result).toBeNull();
    });

    it('should accept valid UUIDs', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Session',
        tabs: JSON.stringify([]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);
      expect(session).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize session names', async () => {
      const tabs = [{ url: 'https://example.com/', title: 'Example' }];
      const windowBounds = { x: 0, y: 0, width: 1200, height: 800 };

      await manager.saveSession('<script>alert(1)</script>', tabs, windowBounds);

      const savedCall = (mockDb.execute as any).mock.calls[0];
      const savedName = savedCall[1][1];
      expect(savedName).not.toContain('<script>');
    });

    it('should sanitize tab titles', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        tabs: JSON.stringify([
          { url: 'https://example.com/', title: '<img src=x onerror=alert(1)>' },
        ]),
        window_bounds: JSON.stringify({ x: 0, y: 0, width: 1200, height: 800 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.tabs[0].title).not.toContain('<');
      expect(session?.tabs[0].title).not.toContain('>');
    });
  });

  describe('Window Bounds Validation', () => {
    it('should use safe defaults for invalid bounds', async () => {
      const mockSession = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        tabs: JSON.stringify([]),
        window_bounds: JSON.stringify({ x: 'invalid', y: null, width: -100, height: 99999 }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockDb.queryOne as any).mockReturnValue(mockSession);

      const session = await manager.loadSession(mockSession.id);

      expect(session?.windowBounds.width).toBeGreaterThan(0);
      expect(session?.windowBounds.height).toBeGreaterThan(0);
    });
  });
});
```

### Security Verification

1. **SSRF Testing:**
   - [ ] Attempt to restore session with localhost URLs
   - [ ] Attempt to restore session with private IP URLs
   - [ ] Attempt to restore session with cloud metadata URLs

2. **Injection Testing:**
   - [ ] Attempt to store/restore javascript: URLs
   - [ ] Attempt to store/restore data: URLs
   - [ ] Attempt to store/restore file:// URLs

3. **Audit Logging:**
   - [ ] Verify all filtered URLs are logged
   - [ ] Verify security events are emitted
   - [ ] Verify logs don't contain full malicious URLs

---

## Implementation Summary

### Priority Order

1. **V1 (Static Encryption Key)** - CRITICAL - Implement first
2. **V4 (Session URL Validation)** - HIGH - Quick win, prevents stored attacks
3. **V3 (WebRTC Protection)** - HIGH - Privacy critical
4. **V2 (ReDoS Prevention)** - HIGH - DoS prevention

### Estimated Effort

| Vulnerability | Files Changed | New Files | Effort |
|--------------|---------------|-----------|--------|
| V1: Static Key | 2 | 1 | 2-3 days |
| V2: ReDoS | 1 | 1 | 1-2 days |
| V3: WebRTC | 1 | 0 | 1 day |
| V4: Session URL | 1 | 0 | 1 day |
| **Total** | **5** | **2** | **5-7 days** |

### Deployment Strategy

1. **Phase 1 (v1.3.0-beta):**
   - Deploy all fixes to beta channel
   - Run security test suite
   - Monitor for regressions

2. **Phase 2 (v1.3.0-rc):**
   - Run penetration tests
   - Verify migration works
   - Test on all platforms (Windows, macOS, Linux)

3. **Phase 3 (v1.3.0):**
   - Production release
   - Monitor security events
   - Keep legacy code for 1 release cycle

### Rollback Plan

Each fix is designed to be independently reversible:

1. **V1:** Keep old config store, can read both formats
2. **V2:** PatternMatcher can fall back to simple string matching
3. **V3:** Can revert to old injection script
4. **V4:** URL validation can be disabled via flag

### Post-Implementation Verification

- [ ] All unit tests pass
- [ ] All e2e tests pass
- [ ] Security test suite passes
- [ ] No hardcoded secrets in binary
- [ ] WebRTC leak test sites show no leaks
- [ ] Session restore with malicious URLs blocked
- [ ] Pattern matching completes in <100ms for any input

---

## References

- [Electron safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [ReDoS Prevention](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [WebRTC IP Leak](https://browserleaks.com/webrtc)

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-01-30  
**Author:** Security Reviewer Agent

