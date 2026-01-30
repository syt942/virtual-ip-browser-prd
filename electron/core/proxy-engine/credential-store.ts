/**
 * Secure Credential Store
 * Encrypted storage for proxy credentials using Electron's safeStorage API + Node.js crypto
 * 
 * Security features:
 * - Uses Electron safeStorage API for OS-level encryption (Keychain/DPAPI/libsecret)
 * - Falls back to AES-256-GCM encryption when safeStorage unavailable
 * - Unique IV per encryption operation
 * - Secure key derivation using PBKDF2
 * - Memory-safe credential handling
 * - Credential validation and sanitization
 */

import * as crypto from 'crypto';

// Try to import safeStorage - will be available in main process
let safeStorage: Electron.SafeStorage | null = null;
try {
  // Dynamic import to handle both main process and test environments
  const electron = require('electron');
  safeStorage = electron.safeStorage;
} catch {
  // safeStorage not available (running in tests or renderer)
  safeStorage = null;
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000;

// Credential validation limits
const MAX_USERNAME_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 1024;

/**
 * Encrypted credential structure
 */
export interface EncryptedCredential {
  /** Base64 encoded encrypted data */
  encryptedData: string;
  /** Base64 encoded initialization vector */
  iv: string;
  /** Base64 encoded authentication tag */
  authTag: string;
  /** Base64 encoded salt for key derivation */
  salt: string;
  /** Version for future migration support */
  version: number;
  /** Encryption method used: 'safeStorage' or 'aes-gcm' */
  method: 'safeStorage' | 'aes-gcm';
}

/**
 * Decrypted credential pair
 */
export interface DecryptedCredentials {
  username: string;
  password: string;
}

/**
 * Check if Electron's safeStorage is available and encryption is ready
 */
export function isSafeStorageAvailable(): boolean {
  try {
    return safeStorage !== null && safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * Secure Credential Store for proxy authentication
 * 
 * SECURITY NOTES:
 * - Prefers Electron's safeStorage API for OS-level encryption
 * - Falls back to AES-256-GCM with master key when safeStorage unavailable
 * - Master key should be stored securely (e.g., OS keychain, hardware security module)
 * - Never log or expose encrypted credentials or master key
 * - Credentials are encrypted at rest and only decrypted when needed
 */
export class CredentialStore {
  private masterKey: Buffer;
  private readonly currentVersion = 2; // Version 2 adds safeStorage support
  private useSafeStorage: boolean;

  /**
   * Initialize credential store with master key
   * 
   * @param masterKeySource - Master key for encryption (hex string or Buffer)
   *                          Should be at least 32 bytes of cryptographically random data
   * @param preferSafeStorage - Whether to prefer safeStorage when available (default: true)
   * @throws Error if master key is invalid or too short
   */
  constructor(masterKeySource: string | Buffer, preferSafeStorage: boolean = true) {
    if (!masterKeySource) {
      throw new Error('Master key is required for credential store');
    }

    if (typeof masterKeySource === 'string') {
      // Assume hex-encoded string
      if (masterKeySource.length < 64) { // 32 bytes = 64 hex chars
        throw new Error('Master key must be at least 32 bytes (64 hex characters)');
      }
      this.masterKey = Buffer.from(masterKeySource, 'hex');
    } else {
      if (masterKeySource.length < 32) {
        throw new Error('Master key must be at least 32 bytes');
      }
      this.masterKey = masterKeySource;
    }
    
    // Use safeStorage if available and preferred
    this.useSafeStorage = preferSafeStorage && isSafeStorageAvailable();
    
    if (this.useSafeStorage) {
      console.log('[CredentialStore] Using Electron safeStorage for OS-level encryption');
    } else {
      console.log('[CredentialStore] Using AES-256-GCM encryption (safeStorage unavailable)');
    }
  }

  /**
   * Generate a cryptographically secure master key
   * 
   * @returns Hex-encoded master key suitable for storage in secure location
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }
  
  /**
   * Validate and sanitize credential input
   * 
   * @param value - Credential value to validate
   * @param maxLength - Maximum allowed length
   * @param fieldName - Name of field for error messages
   * @throws Error if validation fails
   */
  private validateCredential(value: unknown, maxLength: number, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }
    
    if (value.length === 0) {
      throw new Error(`${fieldName} cannot be empty`);
    }
    
    if (value.length > maxLength) {
      throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    }
    
    // Check for null bytes which could cause issues
    if (value.includes('\0')) {
      throw new Error(`${fieldName} contains invalid characters`);
    }
    
    return value;
  }

  /**
   * Encrypt credentials using Electron's safeStorage API
   * This uses OS-level encryption (Keychain on macOS, DPAPI on Windows, libsecret on Linux)
   */
  private encryptWithSafeStorage(username: string, password: string): EncryptedCredential {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage is not available');
    }
    
    // Prepare credential data as JSON
    const credentialData = JSON.stringify({ username, password });
    
    // Encrypt using safeStorage
    const encryptedBuffer = safeStorage.encryptString(credentialData);
    
    return {
      encryptedData: encryptedBuffer.toString('base64'),
      iv: '', // Not used with safeStorage
      authTag: '', // Not used with safeStorage
      salt: '', // Not used with safeStorage
      version: this.currentVersion,
      method: 'safeStorage'
    };
  }
  
  /**
   * Decrypt credentials using Electron's safeStorage API
   */
  private decryptWithSafeStorage(encrypted: EncryptedCredential): DecryptedCredentials {
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage is not available');
    }
    
    const encryptedBuffer = Buffer.from(encrypted.encryptedData, 'base64');
    const decryptedString = safeStorage.decryptString(encryptedBuffer);
    
    const credentials = JSON.parse(decryptedString);
    
    if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
      throw new Error('Invalid decrypted credential format');
    }
    
    return {
      username: credentials.username,
      password: credentials.password
    };
  }

  /**
   * Encrypt credentials for secure storage
   * 
   * @param username - Proxy username
   * @param password - Proxy password
   * @returns Encrypted credential object safe for storage
   */
  encrypt(username: string, password: string): EncryptedCredential {
    // Validate inputs
    const validUsername = this.validateCredential(username, MAX_USERNAME_LENGTH, 'Username');
    const validPassword = this.validateCredential(password, MAX_PASSWORD_LENGTH, 'Password');

    // Try safeStorage first if available
    if (this.useSafeStorage) {
      try {
        return this.encryptWithSafeStorage(validUsername, validPassword);
      } catch (error) {
        console.warn('[CredentialStore] safeStorage encryption failed, falling back to AES-GCM:', 
          error instanceof Error ? error.message : 'Unknown error');
        // Fall through to AES-GCM encryption
      }
    }

    // Generate unique salt and IV for this encryption
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key from master key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );

    // Prepare credential data as JSON
    const credentialData = JSON.stringify({ username: validUsername, password: validPassword });

    // Encrypt using AES-256-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });

    const encrypted = Buffer.concat([
      cipher.update(credentialData, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Clear sensitive data from memory
    derivedKey.fill(0);

    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      version: this.currentVersion,
      method: 'aes-gcm'
    };
  }

  /**
   * Decrypt stored credentials
   * 
   * @param encrypted - Encrypted credential object
   * @returns Decrypted username and password
   * @throws Error if decryption fails (tampered data, wrong key, etc.)
   */
  decrypt(encrypted: EncryptedCredential): DecryptedCredentials {
    // Validate encrypted credential structure
    if (!encrypted || typeof encrypted !== 'object') {
      throw new Error('Invalid encrypted credential format');
    }

    const { encryptedData, iv, authTag, salt, version, method } = encrypted;

    if (!encryptedData) {
      throw new Error('Missing encrypted data');
    }

    // Check version compatibility (support both v1 and v2)
    if (version !== this.currentVersion && version !== 1) {
      throw new Error(`Unsupported credential version: ${version}`);
    }
    
    // Handle safeStorage encrypted credentials
    if (method === 'safeStorage') {
      try {
        return this.decryptWithSafeStorage(encrypted);
      } catch (error) {
        throw new Error('Failed to decrypt credentials with safeStorage - OS keychain may be locked');
      }
    }
    
    // Handle AES-GCM encrypted credentials (v1 or v2 with method='aes-gcm')
    if (!iv || !authTag || !salt) {
      throw new Error('Missing required encrypted credential fields for AES-GCM decryption');
    }

    try {
      // Decode base64 values
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      const authTagBuffer = Buffer.from(authTag, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');

      // Validate buffer lengths
      if (ivBuffer.length !== IV_LENGTH) {
        throw new Error('Invalid IV length');
      }
      if (authTagBuffer.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
      }
      if (saltBuffer.length !== SALT_LENGTH) {
        throw new Error('Invalid salt length');
      }

      // Derive the same key using PBKDF2
      const derivedKey = crypto.pbkdf2Sync(
        this.masterKey,
        saltBuffer,
        PBKDF2_ITERATIONS,
        KEY_LENGTH,
        'sha256'
      );

      // Decrypt using AES-256-GCM
      const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, ivBuffer, {
        authTagLength: AUTH_TAG_LENGTH
      });
      decipher.setAuthTag(authTagBuffer);

      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);

      // Clear sensitive data from memory
      derivedKey.fill(0);

      // Parse decrypted JSON
      const credentials = JSON.parse(decrypted.toString('utf8'));

      if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
        throw new Error('Invalid decrypted credential format');
      }

      return {
        username: credentials.username,
        password: credentials.password
      };
    } catch (error) {
      // Don't leak specific crypto errors - could aid attackers
      if (error instanceof Error && error.message.includes('Invalid')) {
        throw error;
      }
      throw new Error('Failed to decrypt credentials - data may be corrupted or tampered');
    }
  }
  
  /**
   * Check if this store is using OS-level encryption (safeStorage)
   */
  isUsingSafeStorage(): boolean {
    return this.useSafeStorage;
  }

  /**
   * Securely clear the master key from memory
   * Call this when the credential store is no longer needed
   */
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);
    }
  }
}

/**
 * URL-encode credentials for safe use in proxy URLs
 * 
 * SECURITY: Credentials must be properly encoded to prevent:
 * - URL injection attacks
 * - Credential parsing issues with special characters
 * - Authentication bypass via malformed URLs
 * 
 * @param value - The credential value to encode
 * @returns URL-encoded string safe for use in proxy URLs
 */
export function encodeCredential(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('Credential value must be a string');
  }
  
  // Use encodeURIComponent for RFC 3986 compliance
  // Additional encoding for characters that may cause issues in userinfo
  return encodeURIComponent(value)
    // Encode additional characters that could cause issues in URL userinfo section
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

/**
 * Build a secure proxy URL with properly encoded credentials
 * 
 * @param protocol - Proxy protocol (http, https, socks4, socks5)
 * @param host - Proxy host
 * @param port - Proxy port
 * @param username - Optional username (will be URL-encoded)
 * @param password - Optional password (will be URL-encoded)
 * @returns Properly formatted proxy URL
 */
export function buildSecureProxyUrl(
  protocol: string,
  host: string,
  port: number,
  username?: string,
  password?: string
): string {
  // Validate protocol
  const validProtocols = ['http', 'https', 'socks4', 'socks5'];
  if (!validProtocols.includes(protocol.toLowerCase())) {
    throw new Error(`Invalid proxy protocol: ${protocol}`);
  }

  // Build auth portion with URL-encoded credentials
  let auth = '';
  if (username && password) {
    const encodedUser = encodeCredential(username);
    const encodedPass = encodeCredential(password);
    auth = `${encodedUser}:${encodedPass}@`;
  } else if (username) {
    // Username only (some proxies support this)
    auth = `${encodeCredential(username)}@`;
  }

  return `${protocol.toLowerCase()}://${auth}${host}:${port}`;
}
