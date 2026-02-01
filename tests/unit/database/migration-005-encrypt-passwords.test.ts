/**
 * Migration 005: Encrypt Proxy Passwords - Unit Tests
 * 
 * Tests for REC-001: Migrate proxy passwords from plaintext to encrypted_credentials table
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 * 
 * Test Coverage:
 * - Migration script execution
 * - Password encryption and storage
 * - ProxyRepository encrypted credential operations
 * - Transaction safety and rollback
 * - Concurrent write scenarios
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '../../../electron/database/migrations/runner';
import { ProxyRepository, type AddProxyInput } from '../../../electron/database/repositories/proxy.repository';
import { EncryptedCredentialsRepository } from '../../../electron/database/repositories/encrypted-credentials.repository';
import { EncryptionService, encryptionService } from '../../../electron/database/services/encryption.service';
import { PasswordMigrationService } from '../../../electron/database/services/password-migration.service';

// Test master key (32 bytes as hex)
const TEST_MASTER_KEY = 'a'.repeat(64);
const TEST_MASTER_PASSWORD = 'test-master-password-for-encryption';
const TEST_SALT = 'test-salt-value-for-key-derivation';

// Base schema needed for migrations (includes credential_id column)
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  username TEXT,
  password TEXT,
  credential_id TEXT,
  status TEXT DEFAULT 'checking' CHECK (status IN ('active', 'failed', 'checking', 'disabled')),
  latency INTEGER,
  last_checked DATETIME,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  region TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(host, port, protocol)
);

CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_credential_id ON proxies(credential_id);
`;

describe('Migration 005: Encrypt Proxy Passwords', () => {
  let db: Database.Database;
  let runner: MigrationRunner;
  let proxyRepo: ProxyRepository;
  let credentialsRepo: EncryptedCredentialsRepository;
  let migrationService: PasswordMigrationService;

  beforeEach(() => {
    // Create fresh in-memory database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.exec(BASE_SCHEMA);
    
    // Initialize encryption service
    encryptionService.initialize(TEST_MASTER_PASSWORD, TEST_SALT);
    
    // Create runner and run previous migrations first
    runner = new MigrationRunner(db);
    runner.runTo('004'); // Run up to migration 004
    
    // Initialize repositories
    proxyRepo = new ProxyRepository(db);
    credentialsRepo = new EncryptedCredentialsRepository(db);
    migrationService = new PasswordMigrationService(db);
  });

  afterEach(() => {
    encryptionService.destroy();
    db.close();
  });

  // ============================================================
  // SCHEMA MIGRATION TESTS
  // ============================================================
  describe('schema migration', () => {
    it('should create password_migration_status table', () => {
      // Act
      runner.runAll();

      // Assert
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='password_migration_status'"
      ).all();
      expect(tables).toHaveLength(1);
    });

    it('should have credential_id column in proxies table (base schema)', () => {
      // Assert - credential_id is now part of base schema
      const columns = db.prepare("PRAGMA table_info(proxies)").all() as any[];
      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('credential_id');
    });

    it('should have index on credential_id (base schema)', () => {
      // Assert - index is now part of base schema
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_proxies_credential_id'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should be idempotent (run multiple times without error)', () => {
      // Act
      const firstRun = runner.runAll();
      const secondRun = runner.runAll();

      // Assert - first run should include migration 005
      const migration005InFirst = firstRun.find(r => r.version === '005');
      expect(migration005InFirst).toBeDefined();
      expect(migration005InFirst?.success).toBe(true);
      
      // Second run should not include 005 (already applied)
      expect(secondRun.filter(r => r.version === '005')).toHaveLength(0);
    });

    it('should record migration in schema_migrations', () => {
      // Act
      runner.runAll();

      // Assert
      const migration = db.prepare(
        "SELECT * FROM schema_migrations WHERE version = '005'"
      ).get() as any;
      expect(migration).toBeDefined();
      expect(migration.name).toBe('encrypt_proxy_passwords');
    });
  });

  // ============================================================
  // PASSWORD MIGRATION TESTS
  // ============================================================
  describe('password migration service', () => {
    beforeEach(() => {
      // Run all migrations including 005
      runner.runAll();
    });

    it('should detect proxies with plaintext passwords', () => {
      // Arrange - Insert proxy with plaintext password
      db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, username, password)
        VALUES ('test-id-1234-5678-90ab-cdef12345678', 'Test Proxy', 'proxy.test.com', 8080, 'http', 'user1', 'secret123')
      `).run();

      // Act
      const needsMigration = migrationService.needsMigration();

      // Assert
      expect(needsMigration).toBe(true);
    });

    it('should not require migration when no plaintext passwords exist', () => {
      // Arrange - Insert proxy without password
      db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol)
        VALUES ('test-id-1234-5678-90ab-cdef12345678', 'Test Proxy', 'proxy.test.com', 8080, 'http')
      `).run();

      // Act
      const needsMigration = migrationService.needsMigration();

      // Assert
      expect(needsMigration).toBe(false);
    });

    it('should migrate plaintext password to encrypted_credentials', async () => {
      // Arrange
      const proxyId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, username, password)
        VALUES (?, 'Test Proxy', 'proxy.test.com', 8080, 'http', 'testuser', 'testpass123')
      `).run(proxyId);

      // Act
      const result = await migrationService.runMigration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Verify plaintext password is removed
      const proxy = db.prepare('SELECT password, credential_id FROM proxies WHERE id = ?').get(proxyId) as any;
      expect(proxy.password).toBeNull();
      expect(proxy.credential_id).toBeDefined();

      // Verify encrypted credential exists
      const credential = db.prepare('SELECT * FROM encrypted_credentials WHERE proxy_id = ?').get(proxyId) as any;
      expect(credential).toBeDefined();
      expect(credential.encrypted_password).toBeDefined();
      expect(credential.credential_type).toBe('proxy_auth');
    });

    it('should migrate multiple proxies in batch', async () => {
      // Arrange - Insert 10 proxies with passwords
      const proxyIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const id = `${i}0000000-0000-0000-0000-000000000000`.substring(0, 36);
        proxyIds.push(id);
        db.prepare(`
          INSERT INTO proxies (id, name, host, port, protocol, username, password)
          VALUES (?, ?, ?, ?, 'http', ?, ?)
        `).run(id, `Proxy ${i}`, `proxy${i}.test.com`, 8080 + i, `user${i}`, `pass${i}`);
      }

      // Act
      const result = await migrationService.runMigration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(10);
      expect(result.totalProxies).toBe(10);

      // Verify all passwords are encrypted
      const plaintextCount = db.prepare(
        "SELECT COUNT(*) as count FROM proxies WHERE password IS NOT NULL AND password != ''"
      ).get() as { count: number };
      expect(plaintextCount.count).toBe(0);
    });

    it('should complete migration for 1000 proxies in under 1 second', async () => {
      // Arrange - Insert 1000 proxies
      const insertStmt = db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, username, password)
        VALUES (?, ?, ?, ?, 'http', ?, ?)
      `);

      const insertMany = db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          const id = `${String(i).padStart(8, '0')}-0000-0000-0000-000000000000`;
          insertStmt.run(id, `Proxy ${i}`, `proxy${i}.test.com`, 8080, `user${i}`, `pass${i}`);
        }
      });
      insertMany();

      // Act
      const startTime = Date.now();
      const result = await migrationService.runMigration();
      const duration = Date.now() - startTime;

      // Assert
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1000);
      expect(duration).toBeLessThan(1000); // Under 1 second
      console.log(`Migration of 1000 proxies completed in ${duration}ms`);
    });

    it('should verify migration integrity', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, username, password)
        VALUES ('11111111-2222-3333-4444-555555555555', 'Test', 'test.com', 8080, 'http', 'user', 'pass')
      `).run();

      // Act
      await migrationService.runMigration();
      const verification = migrationService.verifyMigration();

      // Assert
      expect(verification.valid).toBe(true);
      expect(verification.plaintextCount).toBe(0);
      expect(verification.encryptedCount).toBeGreaterThan(0);
      expect(verification.errors).toHaveLength(0);
    });

    it('should track migration status', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, password)
        VALUES ('11111111-2222-3333-4444-555555555555', 'Test', 'test.com', 8080, 'http', 'pass')
      `).run();

      // Act
      await migrationService.runMigration();
      const status = migrationService.getStatus();

      // Assert
      expect(status).toBeDefined();
      expect(status?.status).toBe('completed');
      expect(status?.migrated_count).toBe(1);
    });
  });

  // ============================================================
  // PROXY REPOSITORY ENCRYPTED CREDENTIAL TESTS
  // ============================================================
  describe('ProxyRepository with encrypted credentials', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should add proxy with encrypted credentials', () => {
      // Arrange
      const input: AddProxyInput = {
        name: 'Secure Proxy',
        host: 'secure.proxy.com',
        port: 8080,
        protocol: 'https',
        username: 'secureuser',
        password: 'secretpassword123'
      };

      // Act
      const proxy = proxyRepo.addProxy(input);

      // Assert
      expect(proxy.id).toBeDefined();
      expect(proxy.hasCredentials).toBe(true);
      expect(proxy.credentialId).toBeDefined();
      // Password should not be in the returned object
      expect(proxy.password).toBeUndefined();

      // Verify no plaintext in database
      const dbRow = db.prepare('SELECT password FROM proxies WHERE id = ?').get(proxy.id) as any;
      expect(dbRow.password).toBeNull();
    });

    it('should retrieve proxy with decrypted credentials', () => {
      // Arrange
      const input: AddProxyInput = {
        name: 'Test Proxy',
        host: 'test.proxy.com',
        port: 3128,
        protocol: 'http',
        username: 'myuser',
        password: 'mypassword'
      };
      const created = proxyRepo.addProxy(input);

      // Act
      const proxyWithCreds = proxyRepo.getProxyWithCredentials(created.id);

      // Assert
      expect(proxyWithCreds).toBeDefined();
      expect(proxyWithCreds?.decryptedUsername).toBe('myuser');
      expect(proxyWithCreds?.decryptedPassword).toBe('mypassword');
    });

    it('should update proxy credentials', () => {
      // Arrange
      const created = proxyRepo.addProxy({
        name: 'Update Test',
        host: 'update.test.com',
        port: 8080,
        protocol: 'http',
        username: 'olduser',
        password: 'oldpass'
      });

      // Act
      const updated = proxyRepo.updateProxy({
        id: created.id,
        username: 'newuser',
        password: 'newpass'
      });

      // Assert
      expect(updated).toBeDefined();
      const withCreds = proxyRepo.getProxyWithCredentials(updated!.id);
      expect(withCreds?.decryptedUsername).toBe('newuser');
      expect(withCreds?.decryptedPassword).toBe('newpass');
    });

    it('should delete proxy and associated credentials', () => {
      // Arrange
      const created = proxyRepo.addProxy({
        name: 'Delete Test',
        host: 'delete.test.com',
        port: 8080,
        protocol: 'http',
        password: 'deletepass'
      });
      const credentialId = created.credentialId;

      // Act
      const deleted = proxyRepo.deleteProxy(created.id);

      // Assert
      expect(deleted).toBe(true);
      expect(proxyRepo.findById(created.id)).toBeNull();
      
      // Verify credential is also deleted
      const credential = db.prepare('SELECT * FROM encrypted_credentials WHERE id = ?').get(credentialId);
      expect(credential).toBeUndefined();
    });

    it('should check if proxy has credentials', () => {
      // Arrange
      const withPassword = proxyRepo.addProxy({
        name: 'With Pass',
        host: 'withpass.com',
        port: 8080,
        protocol: 'http',
        password: 'secret'
      });

      const withoutPassword = proxyRepo.addProxy({
        name: 'No Pass',
        host: 'nopass.com',
        port: 8080,
        protocol: 'http'
      });

      // Act & Assert
      expect(proxyRepo.hasCredentials(withPassword.id)).toBe(true);
      expect(proxyRepo.hasCredentials(withoutPassword.id)).toBe(false);
    });

    it('should validate proxy ID format', () => {
      // Act & Assert
      expect(proxyRepo.findById('invalid-id')).toBeNull();
      expect(proxyRepo.getProxyWithCredentials('not-a-uuid')).toBeNull();
      expect(proxyRepo.deleteProxy('')).toBe(false);
    });

    it('should not expose credentials in findAll()', () => {
      // Arrange
      proxyRepo.addProxy({
        name: 'Test',
        host: 'test.com',
        port: 8080,
        protocol: 'http',
        username: 'user',
        password: 'secret'
      });

      // Act
      const proxies = proxyRepo.findAll();

      // Assert
      expect(proxies).toHaveLength(1);
      expect(proxies[0].password).toBeUndefined();
      expect(proxies[0].username).toBeUndefined();
      expect(proxies[0].hasCredentials).toBe(true);
    });
  });

  // ============================================================
  // TRANSACTION SAFETY TESTS
  // ============================================================
  describe('transaction safety', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should rollback on encryption failure', () => {
      // Arrange - Destroy encryption service to cause failure
      encryptionService.destroy();

      // Act & Assert
      expect(() => {
        proxyRepo.addProxy({
          name: 'Should Fail',
          host: 'fail.com',
          port: 8080,
          protocol: 'http',
          password: 'willnotencrypt'
        });
      }).toThrow('Encryption service not initialized');

      // Verify no partial data
      const proxies = db.prepare('SELECT * FROM proxies WHERE name = ?').all('Should Fail');
      expect(proxies).toHaveLength(0);

      // Re-initialize for cleanup
      encryptionService.initialize(TEST_MASTER_PASSWORD, TEST_SALT);
    });

    it('should maintain data integrity on update failure', () => {
      // Arrange
      const created = proxyRepo.addProxy({
        name: 'Original',
        host: 'original.com',
        port: 8080,
        protocol: 'http',
        password: 'originalpass'
      });

      // Act - Try update with destroyed encryption
      encryptionService.destroy();

      expect(() => {
        proxyRepo.updateProxy({
          id: created.id,
          password: 'newpass'
        });
      }).toThrow();

      // Re-initialize
      encryptionService.initialize(TEST_MASTER_PASSWORD, TEST_SALT);

      // Assert - Original data should be intact
      const proxy = proxyRepo.getProxyWithCredentials(created.id);
      expect(proxy?.decryptedPassword).toBe('originalpass');
    });
  });

  // ============================================================
  // CONCURRENT WRITE TESTS
  // ============================================================
  describe('concurrent write scenarios', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should handle concurrent proxy additions', async () => {
      // Arrange
      const addProxyPromise = (index: number) => {
        return new Promise<void>((resolve, reject) => {
          try {
            proxyRepo.addProxy({
              name: `Concurrent Proxy ${index}`,
              host: `concurrent${index}.com`,
              port: 8080 + index,
              protocol: 'http',
              password: `pass${index}`
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      };

      // Act - Add 20 proxies concurrently
      const promises = Array.from({ length: 20 }, (_, i) => addProxyPromise(i));
      await Promise.all(promises);

      // Assert
      const proxies = proxyRepo.findAll();
      expect(proxies).toHaveLength(20);

      // All should have credentials
      const withCreds = proxies.filter(p => p.hasCredentials);
      expect(withCreds).toHaveLength(20);
    });

    it('should handle concurrent reads during migration', async () => {
      // Arrange - Insert proxies with plaintext passwords
      for (let i = 0; i < 50; i++) {
        const id = `${String(i).padStart(8, '0')}-1111-2222-3333-444444444444`;
        db.prepare(`
          INSERT INTO proxies (id, name, host, port, protocol, password)
          VALUES (?, ?, ?, ?, 'http', ?)
        `).run(id, `Proxy ${i}`, `proxy${i}.com`, 8080, `pass${i}`);
      }

      // Act - Run migration and concurrent reads
      const migrationPromise = migrationService.runMigration();
      const readPromises = Array.from({ length: 10 }, () => 
        new Promise<void>((resolve) => {
          proxyRepo.findAll();
          resolve();
        })
      );

      const [migrationResult] = await Promise.all([
        migrationPromise,
        ...readPromises
      ]);

      // Assert
      expect(migrationResult.success).toBe(true);
    });

    it('should use busy_timeout for lock contention', () => {
      // Verify busy_timeout is set
      const timeout = db.pragma('busy_timeout') as { busy_timeout: number }[];
      expect(timeout[0].busy_timeout).toBe(5000);
    });
  });

  // ============================================================
  // SECURITY VALIDATION TESTS
  // ============================================================
  describe('security validation', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should not log credentials', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log');

      // Act
      proxyRepo.addProxy({
        name: 'Secret Proxy',
        host: 'secret.com',
        port: 8080,
        protocol: 'http',
        username: 'secretuser',
        password: 'topsecretpassword123'
      });

      // Assert - No log should contain the password
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('topsecretpassword123');
      expect(logCalls).not.toContain('secretuser');

      consoleSpy.mockRestore();
    });

    it('should validate input with Zod schemas', () => {
      // Act & Assert - Invalid port
      expect(() => {
        proxyRepo.addProxy({
          name: 'Invalid',
          host: 'test.com',
          port: 70000, // Invalid
          protocol: 'http'
        });
      }).toThrow();

      // Invalid protocol
      expect(() => {
        proxyRepo.addProxy({
          name: 'Invalid',
          host: 'test.com',
          port: 8080,
          protocol: 'ftp' as any // Invalid
        });
      }).toThrow();

      // Empty name
      expect(() => {
        proxyRepo.addProxy({
          name: '',
          host: 'test.com',
          port: 8080,
          protocol: 'http'
        });
      }).toThrow();
    });

    it('should use parameterized queries (SQL injection prevention)', () => {
      // Arrange - Attempt SQL injection
      const maliciousInput: AddProxyInput = {
        name: "'; DROP TABLE proxies; --",
        host: 'injection.com',
        port: 8080,
        protocol: 'http',
        password: "' OR '1'='1"
      };

      // Act
      const proxy = proxyRepo.addProxy(maliciousInput);

      // Assert - Should succeed without executing injection
      expect(proxy).toBeDefined();
      
      // Tables should still exist
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='proxies'"
      ).all();
      expect(tables).toHaveLength(1);

      // Name should be stored as-is (sanitized by application layer)
      const stored = proxyRepo.findById(proxy.id);
      expect(stored?.name).toContain('DROP TABLE');
    });

    it('should encrypt credentials with AES-256-GCM', () => {
      // Arrange
      const proxy = proxyRepo.addProxy({
        name: 'AES Test',
        host: 'aes.com',
        port: 8080,
        protocol: 'http',
        password: 'testpassword'
      });

      // Act - Get encrypted data directly
      const credential = db.prepare(`
        SELECT encrypted_password, algorithm FROM encrypted_credentials WHERE proxy_id = ?
      `).get(proxy.id) as any;

      // Assert
      expect(credential.algorithm).toBe('aes-256-gcm');
      expect(credential.encrypted_password).toBeDefined();
      // Should be base64 encoded with IV:ciphertext:authTag format
      expect(credential.encrypted_password.split(':')).toHaveLength(3);
    });

    it('should handle encryption errors gracefully', () => {
      // Arrange - Create proxy first
      const proxy = proxyRepo.addProxy({
        name: 'Error Test',
        host: 'error.com',
        port: 8080,
        protocol: 'http',
        password: 'testpass'
      });

      // Corrupt the encrypted data
      db.prepare(`
        UPDATE encrypted_credentials SET encrypted_password = 'corrupted-data' WHERE proxy_id = ?
      `).run(proxy.id);

      // Act - Try to decrypt
      const result = proxyRepo.getProxyWithCredentials(proxy.id);

      // Assert - Should return proxy without decrypted password (graceful failure)
      expect(result).toBeDefined();
      expect(result?.decryptedPassword).toBeUndefined();
    });
  });

  // ============================================================
  // ZERO PLAINTEXT VERIFICATION
  // ============================================================
  describe('zero plaintext credentials verification', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should have zero plaintext passwords after adding proxy', () => {
      // Act
      proxyRepo.addProxy({
        name: 'Test',
        host: 'test.com',
        port: 8080,
        protocol: 'http',
        password: 'shouldnotbeplaintext'
      });

      // Assert
      const plaintext = db.prepare(`
        SELECT COUNT(*) as count FROM proxies 
        WHERE password IS NOT NULL AND password != ''
      `).get() as { count: number };
      
      expect(plaintext.count).toBe(0);
    });

    it('should have zero plaintext passwords after migration', async () => {
      // Arrange - Add plaintext passwords directly
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO proxies (id, name, host, port, protocol, password)
          VALUES (?, ?, ?, ?, 'http', ?)
        `).run(
          `${i}0000000-0000-0000-0000-000000000000`.substring(0, 36),
          `Proxy ${i}`,
          `proxy${i}.com`,
          8080,
          `plaintext${i}`
        );
      }

      // Act
      await migrationService.runMigration();

      // Assert
      const plaintext = db.prepare(`
        SELECT COUNT(*) as count FROM proxies 
        WHERE password IS NOT NULL AND password != ''
      `).get() as { count: number };
      
      expect(plaintext.count).toBe(0);
    });
  });
});
