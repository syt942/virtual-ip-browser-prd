/**
 * Password Migration Service
 * Migrates plaintext proxy passwords to encrypted_credentials table
 * 
 * SECURITY: HIGH PRIORITY (REC-001)
 * - Uses AES-256-GCM encryption via EncryptionService
 * - Transaction-safe with rollback on failure
 * - Supports resumable migration for large datasets
 * - Logs security events without exposing credentials
 */

import { randomUUID } from 'crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { encryptionService } from './encryption.service';

// ============================================================
// TYPES AND SCHEMAS
// ============================================================

/** Proxy row with plaintext password (legacy format) */
interface LegacyProxyRow {
  id: string;
  name: string;
  username: string | null;
  password: string | null;
}

/** Migration status row */
interface MigrationStatusRow {
  id: number;
  started_at: string | null;
  completed_at: string | null;
  total_proxies: number;
  migrated_count: number;
  failed_count: number;
  last_processed_proxy_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
}

/** Migration result */
export interface PasswordMigrationResult {
  success: boolean;
  totalProxies: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  durationMs: number;
  error?: string;
}

/** Input validation schema for proxy ID */
const ProxyIdSchema = z.string().uuid();

// ============================================================
// PASSWORD MIGRATION SERVICE
// ============================================================

export class PasswordMigrationService {
  private db: Database.Database;
  private isRunning = false;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    try {
      // Check if there are any proxies with plaintext passwords
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM proxies 
        WHERE password IS NOT NULL AND password != ''
      `).get() as { count: number };

      return result.count > 0;
    } catch (error) {
      // Table might not exist yet
      console.warn('[PasswordMigration] Error checking migration status:', 
        error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Get current migration status
   */
  getStatus(): MigrationStatusRow | null {
    try {
      const status = this.db.prepare(
        'SELECT * FROM password_migration_status WHERE id = 1'
      ).get() as MigrationStatusRow | undefined;

      return status || null;
    } catch {
      return null;
    }
  }

  /**
   * Run the password migration
   * Encrypts all plaintext passwords and stores them in encrypted_credentials
   * 
   * @returns Migration result with statistics
   */
  async runMigration(): Promise<PasswordMigrationResult> {
    const startTime = Date.now();

    // Prevent concurrent migrations
    if (this.isRunning) {
      return {
        success: false,
        totalProxies: 0,
        migratedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        durationMs: 0,
        error: 'Migration already in progress'
      };
    }

    // Ensure encryption service is initialized
    if (!encryptionService.isInitialized()) {
      return {
        success: false,
        totalProxies: 0,
        migratedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        durationMs: Date.now() - startTime,
        error: 'Encryption service not initialized'
      };
    }

    this.isRunning = true;
    let migratedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      // Get all proxies with plaintext passwords
      const proxiesWithPasswords = this.db.prepare(`
        SELECT id, name, username, password 
        FROM proxies 
        WHERE password IS NOT NULL AND password != ''
          AND (credential_id IS NULL OR credential_id = '')
      `).all() as LegacyProxyRow[];

      const totalProxies = proxiesWithPasswords.length;

      console.log(`[PasswordMigration] Starting migration for ${totalProxies} proxies`);

      // Update migration status to in_progress
      this.updateMigrationStatus('in_progress', totalProxies, null);

      // Process each proxy in a transaction
      const migrateProxy = this.db.transaction((proxy: LegacyProxyRow) => {
        // Validate proxy ID
        const parseResult = ProxyIdSchema.safeParse(proxy.id);
        if (!parseResult.success) {
          console.warn(`[PasswordMigration] Invalid proxy ID format: ${proxy.id.substring(0, 8)}...`);
          failedCount++;
          return false;
        }

        // Skip if no password to migrate
        if (!proxy.password) {
          skippedCount++;
          return true;
        }

        try {
          // Encrypt the password (and username if present)
          const credentialId = randomUUID();
          const keyId = encryptionService.getKeyId();

          let encryptedUsername: string | null = null;
          let encryptedPassword: string;

          // Encrypt username if present
          if (proxy.username) {
            const usernameResult = encryptionService.encrypt(proxy.username);
            encryptedUsername = usernameResult.encrypted;
          }

          // Encrypt password
          const passwordResult = encryptionService.encrypt(proxy.password);
          encryptedPassword = passwordResult.encrypted;

          // Insert into encrypted_credentials
          // Using 'proxy_auth' credential_type (defined in migration 001 CHECK constraint)
          this.db.prepare(`
            INSERT INTO encrypted_credentials (
              id, proxy_id, credential_name, credential_type,
              encrypted_username, encrypted_password,
              encryption_version, key_id, algorithm, access_level,
              created_at, updated_at
            ) VALUES (?, ?, ?, 'proxy_auth', ?, ?, 1, ?, 'aes-256-gcm', 'private', 
                      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).run(
            credentialId,
            proxy.id,
            `${proxy.name || 'proxy'}_credentials`,
            encryptedUsername,
            encryptedPassword,
            keyId
          );

          // Update proxy: set credential_id and NULL out plaintext password
          this.db.prepare(`
            UPDATE proxies 
            SET credential_id = ?, 
                password = NULL,
                username = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(credentialId, proxy.id);

          // Log security event (without exposing credentials)
          console.log(`[PasswordMigration] Migrated credentials for proxy: ${proxy.id.substring(0, 8)}...`);

          return true;
        } catch (encryptError) {
          console.error(`[PasswordMigration] Failed to encrypt credentials for proxy ${proxy.id.substring(0, 8)}...:`,
            encryptError instanceof Error ? encryptError.message : 'Encryption error');
          return false;
        }
      });

      // Process each proxy
      for (const proxy of proxiesWithPasswords) {
        try {
          const success = migrateProxy(proxy);
          if (success) {
            migratedCount++;
          } else {
            failedCount++;
          }

          // Update progress
          this.updateMigrationProgress(migratedCount, failedCount, proxy.id);
        } catch (txError) {
          console.error(`[PasswordMigration] Transaction failed for proxy ${proxy.id.substring(0, 8)}...`);
          failedCount++;
        }
      }

      // Update final status
      const finalStatus = failedCount === 0 ? 'completed' : 'failed';
      this.updateMigrationStatus(finalStatus, totalProxies, 
        failedCount > 0 ? `${failedCount} proxies failed to migrate` : null);

      const durationMs = Date.now() - startTime;
      console.log(`[PasswordMigration] Migration completed in ${durationMs}ms: ` +
        `${migratedCount} migrated, ${failedCount} failed, ${skippedCount} skipped`);

      return {
        success: failedCount === 0,
        totalProxies,
        migratedCount,
        failedCount,
        skippedCount,
        durationMs
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PasswordMigration] Migration failed:', errorMessage);

      this.updateMigrationStatus('failed', 0, errorMessage);

      return {
        success: false,
        totalProxies: 0,
        migratedCount,
        failedCount,
        skippedCount,
        durationMs: Date.now() - startTime,
        error: errorMessage
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Verify migration integrity
   * Checks that all passwords are properly encrypted and no plaintext remains
   */
  verifyMigration(): { valid: boolean; plaintextCount: number; encryptedCount: number; errors: string[] } {
    const errors: string[] = [];

    try {
      // Count proxies with plaintext passwords (should be 0)
      const plaintextResult = this.db.prepare(`
        SELECT COUNT(*) as count FROM proxies 
        WHERE password IS NOT NULL AND password != ''
      `).get() as { count: number };

      // Count proxies with encrypted credentials
      const encryptedResult = this.db.prepare(`
        SELECT COUNT(*) as count FROM proxies 
        WHERE credential_id IS NOT NULL
      `).get() as { count: number };

      // Verify encrypted credentials can be decrypted
      const credentials = this.db.prepare(`
        SELECT ec.id, ec.encrypted_password, ec.proxy_id
        FROM encrypted_credentials ec
        WHERE ec.credential_type = 'proxy_auth'
      `).all() as Array<{ id: string; encrypted_password: string; proxy_id: string }>;

      for (const cred of credentials) {
        if (cred.encrypted_password) {
          const decryptResult = encryptionService.decrypt(cred.encrypted_password);
          if (!decryptResult.success) {
            errors.push(`Failed to decrypt credential ${cred.id.substring(0, 8)}...`);
          }
        }
      }

      return {
        valid: plaintextResult.count === 0 && errors.length === 0,
        plaintextCount: plaintextResult.count,
        encryptedCount: encryptedResult.count,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        plaintextCount: -1,
        encryptedCount: -1,
        errors: [error instanceof Error ? error.message : 'Verification failed']
      };
    }
  }

  /**
   * Update migration status in tracking table
   */
  private updateMigrationStatus(
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    totalProxies: number,
    errorMessage: string | null
  ): void {
    try {
      const now = new Date().toISOString();
      const startedAt = status === 'in_progress' ? now : null;
      const completedAt = status === 'completed' || status === 'failed' ? now : null;

      this.db.prepare(`
        UPDATE password_migration_status 
        SET status = ?, 
            total_proxies = ?,
            started_at = COALESCE(started_at, ?),
            completed_at = ?,
            error_message = ?
        WHERE id = 1
      `).run(status, totalProxies, startedAt, completedAt, errorMessage);
    } catch {
      // Non-critical - continue migration
    }
  }

  /**
   * Update migration progress
   */
  private updateMigrationProgress(migratedCount: number, failedCount: number, lastProxyId: string): void {
    try {
      this.db.prepare(`
        UPDATE password_migration_status 
        SET migrated_count = ?,
            failed_count = ?,
            last_processed_proxy_id = ?
        WHERE id = 1
      `).run(migratedCount, failedCount, lastProxyId);
    } catch {
      // Non-critical - continue migration
    }
  }
}

// Factory function for creating migration service
export function createPasswordMigrationService(db: Database.Database): PasswordMigrationService {
  return new PasswordMigrationService(db);
}
