/**
 * Encryption Service
 * Secure encryption/decryption for credential storage using AES-256-GCM
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash
} from 'crypto';

export interface EncryptionResult {
  encrypted: string; // base64(iv:ciphertext:authTag)
  keyId: string;
}

export interface DecryptionResult {
  decrypted: string;
  success: boolean;
  error?: string;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  authTag: string;
  version: number;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly keyLength = 32; // 256 bits
  
  private masterKey: Buffer | null = null;
  private keyId: string | null = null;

  /**
   * Initialize with a master password
   * In production, this should come from a secure key management system
   */
  initialize(masterPassword: string, salt?: string): void {
    const useSalt = salt || this.generateSalt();
    this.masterKey = this.deriveKey(masterPassword, useSalt);
    this.keyId = this.generateKeyId(this.masterKey);
  }

  /**
   * Initialize with a raw key (for testing or key import)
   */
  initializeWithKey(key: Buffer): void {
    if (key.length !== this.keyLength) {
      throw new Error(`Key must be ${this.keyLength} bytes`);
    }
    this.masterKey = key;
    this.keyId = this.generateKeyId(key);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Get current key ID
   */
  getKeyId(): string | null {
    return this.keyId;
  }

  /**
   * Generate a random salt
   */
  generateSalt(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Derive key from password using scrypt
   */
  private deriveKey(password: string, salt: string): Buffer {
    return scryptSync(password, salt, this.keyLength, {
      N: 16384, // CPU/memory cost
      r: 8,     // Block size
      p: 1      // Parallelization
    });
  }

  /**
   * Generate key ID (truncated hash of key)
   */
  private generateKeyId(key: Buffer): string {
    return createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Encrypt a string value
   */
  encrypt(plaintext: string): EncryptionResult {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv, {
      authTagLength: this.authTagLength
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine: iv:ciphertext:authTag (all base64 encoded)
    const combined = `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`;

    return {
      encrypted: combined,
      keyId: this.keyId!
    };
  }

  /**
   * Decrypt an encrypted value
   */
  decrypt(encryptedValue: string): DecryptionResult {
    if (!this.masterKey) {
      return { decrypted: '', success: false, error: 'Encryption service not initialized' };
    }

    try {
      const parts = encryptedValue.split(':');
      if (parts.length !== 3) {
        return { decrypted: '', success: false, error: 'Invalid encrypted format' };
      }

      const [ivBase64, ciphertextBase64, authTagBase64] = parts;
      const iv = Buffer.from(ivBase64, 'base64');
      const ciphertext = Buffer.from(ciphertextBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      const decipher = createDecipheriv(this.algorithm, this.masterKey, iv, {
        authTagLength: this.authTagLength
      });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return {
        decrypted: decrypted.toString('utf8'),
        success: true
      };
    } catch (error) {
      return {
        decrypted: '',
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  }

  /**
   * Encrypt an object (serialized to JSON)
   */
  encryptObject<T extends object>(obj: T): EncryptionResult {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt to an object
   */
  decryptObject<T extends object>(encryptedValue: string): { data: T | null; success: boolean; error?: string } {
    const result = this.decrypt(encryptedValue);
    if (!result.success) {
      return { data: null, success: false, error: result.error };
    }

    try {
      const data = JSON.parse(result.decrypted) as T;
      return { data, success: true };
    } catch {
      return { data: null, success: false, error: 'Failed to parse decrypted JSON' };
    }
  }

  /**
   * Encrypt credentials (username/password pair)
   */
  encryptCredentials(username: string, password: string): {
    encryptedUsername: string;
    encryptedPassword: string;
    keyId: string;
  } {
    const usernameResult = this.encrypt(username);
    const passwordResult = this.encrypt(password);

    return {
      encryptedUsername: usernameResult.encrypted,
      encryptedPassword: passwordResult.encrypted,
      keyId: usernameResult.keyId
    };
  }

  /**
   * Decrypt credentials
   */
  decryptCredentials(encryptedUsername: string, encryptedPassword: string): {
    username: string | null;
    password: string | null;
    success: boolean;
    error?: string;
  } {
    const usernameResult = this.decrypt(encryptedUsername);
    if (!usernameResult.success) {
      return { username: null, password: null, success: false, error: usernameResult.error };
    }

    const passwordResult = this.decrypt(encryptedPassword);
    if (!passwordResult.success) {
      return { username: null, password: null, success: false, error: passwordResult.error };
    }

    return {
      username: usernameResult.decrypted,
      password: passwordResult.decrypted,
      success: true
    };
  }

  /**
   * Re-encrypt data with a new key (for key rotation)
   */
  reEncrypt(
    encryptedValue: string,
    oldKey: Buffer,
    newKey: Buffer
  ): EncryptionResult | null {
    // Temporarily use old key to decrypt
    const originalKey = this.masterKey;
    const originalKeyId = this.keyId;

    try {
      this.masterKey = oldKey;
      const decrypted = this.decrypt(encryptedValue);
      
      if (!decrypted.success) {
        return null;
      }

      // Re-encrypt with new key
      this.masterKey = newKey;
      this.keyId = this.generateKeyId(newKey);
      
      return this.encrypt(decrypted.decrypted);
    } finally {
      // Restore original key
      this.masterKey = originalKey;
      this.keyId = originalKeyId;
    }
  }

  /**
   * Verify encryption key matches expected key ID
   */
  verifyKeyId(expectedKeyId: string): boolean {
    return this.keyId === expectedKeyId;
  }

  /**
   * Generate a new random encryption key
   */
  static generateKey(): Buffer {
    return randomBytes(32);
  }

  /**
   * Clear the master key from memory (call on app shutdown)
   */
  destroy(): void {
    if (this.masterKey) {
      // Overwrite key in memory before clearing
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.keyId = null;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
