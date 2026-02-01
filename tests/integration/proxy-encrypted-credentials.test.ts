/**
 * Integration Tests: Proxy Encrypted Credentials
 * 
 * Tests the full flow of proxy operations with encrypted credential storage
 * including database persistence, encryption/decryption, and IPC communication.
 * 
 * REC-001: Migrate proxy passwords from plaintext to encrypted_credentials table
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '../../electron/database/migrations/runner';
import { ProxyRepository, type AddProxyInput, type ProxyWithDecryptedCredentials } from '../../electron/database/repositories/proxy.repository';
import { EncryptedCredentialsRepository } from '../../electron/database/repositories/encrypted-credentials.repository';
import { encryptionService } from '../../electron/database/services/encryption.service';
import { PasswordMigrationService } from '../../electron/database/services/password-migration.service';

// Test constants
const TEST_MASTER_PASSWORD = 'integration-test-master-password';
const TEST_SALT = 'integration-test-salt-value';

// Base schema for testing
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  username TEXT,
  password TEXT,
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
`;

describe('Proxy Encrypted Credentials Integration', () => {
  let db: Database.Database;
  let proxyRepo: ProxyRepository;
  let credentialsRepo: EncryptedCredentialsRepository;
  let migrationService: PasswordMigrationService;

  beforeEach(() => {
    // Setup database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.pragma('journal_mode = WAL');
    db.exec(BASE_SCHEMA);

    // Initialize encryption
    encryptionService.initialize(TEST_MASTER_PASSWORD, TEST_SALT);

    // Run all migrations
    const runner = new MigrationRunner(db);
    runner.runAll();

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
  // FULL LIFECYCLE TESTS
  // ============================================================
  describe('proxy credential lifecycle', () => {
    it('should complete full CRUD cycle with encrypted credentials', () => {
      // CREATE
      const input: AddProxyInput = {
        name: 'Lifecycle Test Proxy',
        host: 'lifecycle.proxy.com',
        port: 8080,
        protocol: 'https',
        username: 'lifecycle_user',
        password: 'lifecycle_password_123'
      };

      const created = proxyRepo.addProxy(input);
      expect(created.id).toBeDefined();
      expect(created.hasCredentials).toBe(true);
      expect(created.password).toBeUndefined();

      // READ (without credentials)
      const found = proxyRepo.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Lifecycle Test Proxy');
      expect(found?.hasCredentials).toBe(true);
      expect(found?.password).toBeUndefined();

      // READ (with credentials)
      const withCreds = proxyRepo.getProxyWithCredentials(created.id);
      expect(withCreds).toBeDefined();
      expect(withCreds?.decryptedUsername).toBe('lifecycle_user');
      expect(withCreds?.decryptedPassword).toBe('lifecycle_password_123');

      // UPDATE
      const updated = proxyRepo.updateProxy({
        id: created.id,
        name: 'Updated Lifecycle Proxy',
        username: 'new_user',
        password: 'new_password_456'
      });
      expect(updated?.name).toBe('Updated Lifecycle Proxy');

      const updatedWithCreds = proxyRepo.getProxyWithCredentials(created.id);
      expect(updatedWithCreds?.decryptedUsername).toBe('new_user');
      expect(updatedWithCreds?.decryptedPassword).toBe('new_password_456');

      // DELETE
      const deleted = proxyRepo.deleteProxy(created.id);
      expect(deleted).toBe(true);
      expect(proxyRepo.findById(created.id)).toBeNull();

      // Verify credential is also deleted
      const remainingCreds = credentialsRepo.findByProxyId(created.id);
      expect(remainingCreds).toHaveLength(0);
    });

    it('should handle proxy without credentials', () => {
      // CREATE without password
      const created = proxyRepo.addProxy({
        name: 'No Auth Proxy',
        host: 'noauth.proxy.com',
        port: 3128,
        protocol: 'http'
      });

      expect(created.hasCredentials).toBe(false);
      expect(created.credentialId).toBeUndefined();

      // READ with credentials should return empty
      const withCreds = proxyRepo.getProxyWithCredentials(created.id);
      expect(withCreds).toBeDefined();
      expect(withCreds?.decryptedUsername).toBeUndefined();
      expect(withCreds?.decryptedPassword).toBeUndefined();
    });

    it('should add credentials to existing proxy without credentials', () => {
      // Create proxy without credentials
      const created = proxyRepo.addProxy({
        name: 'Initially No Auth',
        host: 'addauth.proxy.com',
        port: 8080,
        protocol: 'http'
      });

      expect(created.hasCredentials).toBe(false);

      // Update to add credentials
      const updated = proxyRepo.updateProxy({
        id: created.id,
        username: 'added_user',
        password: 'added_password'
      });

      expect(updated?.hasCredentials).toBe(true);
      expect(updated?.credentialId).toBeDefined();

      // Verify credentials
      const withCreds = proxyRepo.getProxyWithCredentials(created.id);
      expect(withCreds?.decryptedUsername).toBe('added_user');
      expect(withCreds?.decryptedPassword).toBe('added_password');
    });
  });

  // ============================================================
  // MIGRATION INTEGRATION TESTS
  // ============================================================
  describe('plaintext to encrypted migration', () => {
    it('should migrate existing plaintext passwords successfully', async () => {
      // Insert legacy data with plaintext passwords
      const legacyProxies = [
        { id: 'aaaaaaaa-1111-2222-3333-444444444444', name: 'Legacy 1', host: 'legacy1.com', password: 'legacy_pass_1', username: 'user1' },
        { id: 'bbbbbbbb-1111-2222-3333-444444444444', name: 'Legacy 2', host: 'legacy2.com', password: 'legacy_pass_2', username: 'user2' },
        { id: 'cccccccc-1111-2222-3333-444444444444', name: 'Legacy 3', host: 'legacy3.com', password: 'legacy_pass_3', username: null },
      ];

      for (const proxy of legacyProxies) {
        db.prepare(`
          INSERT INTO proxies (id, name, host, port, protocol, username, password)
          VALUES (?, ?, ?, 8080, 'http', ?, ?)
        `).run(proxy.id, proxy.name, proxy.host, proxy.username, proxy.password);
      }

      // Verify plaintext exists
      expect(migrationService.needsMigration()).toBe(true);

      // Run migration
      const result = await migrationService.runMigration();

      // Verify migration success
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(3);

      // Verify no plaintext remains
      expect(migrationService.needsMigration()).toBe(false);

      // Verify credentials can be retrieved
      for (const proxy of legacyProxies) {
        const withCreds = proxyRepo.getProxyWithCredentials(proxy.id);
        expect(withCreds?.decryptedPassword).toBe(proxy.password);
        if (proxy.username) {
          expect(withCreds?.decryptedUsername).toBe(proxy.username);
        }
      }
    });

    it('should preserve other proxy data during migration', async () => {
      // Insert proxy with all fields populated
      const proxyId = 'dddddddd-1111-2222-3333-444444444444';
      db.prepare(`
        INSERT INTO proxies (
          id, name, host, port, protocol, username, password,
          status, latency, region, tags, weight, rotation_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        proxyId, 'Full Proxy', 'full.proxy.com', 3128, 'socks5',
        'fulluser', 'fullpass',
        'active', 150, 'US-East', '["premium","fast"]', 2.5, 'primary'
      );

      // Run migration
      await migrationService.runMigration();

      // Verify all data preserved
      const proxy = proxyRepo.findById(proxyId);
      expect(proxy).toBeDefined();
      expect(proxy?.name).toBe('Full Proxy');
      expect(proxy?.host).toBe('full.proxy.com');
      expect(proxy?.port).toBe(3128);
      expect(proxy?.protocol).toBe('socks5');
      expect(proxy?.status).toBe('active');
      expect(proxy?.latency).toBe(150);
      expect(proxy?.region).toBe('US-East');
      expect(proxy?.weight).toBe(2.5);
      expect(proxy?.rotationGroup).toBe('primary');
    });
  });

  // ============================================================
  // PROXY CONNECTION SIMULATION
  // ============================================================
  describe('proxy connection with encrypted credentials', () => {
    it('should build connection URL with decrypted credentials', () => {
      // Create proxy with special characters in password
      const created = proxyRepo.addProxy({
        name: 'Special Chars Proxy',
        host: 'special.proxy.com',
        port: 8080,
        protocol: 'http',
        username: 'user@domain.com',
        password: 'p@ss:word/with?special=chars&more!'
      });

      // Get credentials for connection
      const proxy = proxyRepo.getProxyWithCredentials(created.id);
      expect(proxy).toBeDefined();

      // Build connection URL (simulating what proxy-engine would do)
      const { decryptedUsername, decryptedPassword, host, port, protocol } = proxy!;
      
      // Verify credentials are correct
      expect(decryptedUsername).toBe('user@domain.com');
      expect(decryptedPassword).toBe('p@ss:word/with?special=chars&more!');

      // URL encoding would happen in buildSecureProxyUrl
      const encodedUser = encodeURIComponent(decryptedUsername!);
      const encodedPass = encodeURIComponent(decryptedPassword!);
      const proxyUrl = `${protocol}://${encodedUser}:${encodedPass}@${host}:${port}`;

      expect(proxyUrl).toContain('special.proxy.com:8080');
      expect(proxyUrl).toContain('%40'); // Encoded @
    });

    it('should track credential access', () => {
      // Create proxy
      const created = proxyRepo.addProxy({
        name: 'Access Track Proxy',
        host: 'track.proxy.com',
        port: 8080,
        protocol: 'http',
        password: 'trackpass'
      });

      // Access credentials multiple times
      for (let i = 0; i < 5; i++) {
        proxyRepo.getProxyWithCredentials(created.id);
      }

      // Verify access count
      const credential = credentialsRepo.findByProxyId(created.id)[0];
      expect(credential).toBeDefined();
      expect(credential.accessCount).toBe(5);
      expect(credential.lastAccessedAt).toBeDefined();
    });
  });

  // ============================================================
  // ERROR SCENARIOS
  // ============================================================
  describe('error handling', () => {
    it('should handle decryption with wrong key gracefully', () => {
      // Create proxy with current key
      const created = proxyRepo.addProxy({
        name: 'Key Test Proxy',
        host: 'key.proxy.com',
        port: 8080,
        protocol: 'http',
        password: 'keypass'
      });

      // Destroy and reinitialize with different key
      encryptionService.destroy();
      encryptionService.initialize('different-password', 'different-salt');

      // Try to get credentials (should fail gracefully)
      const proxy = proxyRepo.getProxyWithCredentials(created.id);
      expect(proxy).toBeDefined();
      expect(proxy?.decryptedPassword).toBeUndefined(); // Decryption fails but doesn't throw

      // Reinitialize with correct key for cleanup
      encryptionService.destroy();
      encryptionService.initialize(TEST_MASTER_PASSWORD, TEST_SALT);
    });

    it('should handle missing credential reference gracefully', () => {
      // Create proxy with credentials
      const created = proxyRepo.addProxy({
        name: 'Missing Ref Proxy',
        host: 'missing.proxy.com',
        port: 8080,
        protocol: 'http',
        password: 'misspass'
      });

      // Manually delete credential (simulating data corruption)
      db.prepare('DELETE FROM encrypted_credentials WHERE proxy_id = ?').run(created.id);

      // Should return proxy but without decrypted credentials
      const proxy = proxyRepo.getProxyWithCredentials(created.id);
      expect(proxy).toBeDefined();
      expect(proxy?.decryptedPassword).toBeUndefined();
    });
  });

  // ============================================================
  // CONCURRENT ACCESS
  // ============================================================
  describe('concurrent database access', () => {
    it('should handle multiple simultaneous credential reads', async () => {
      // Create several proxies
      const proxies: string[] = [];
      for (let i = 0; i < 10; i++) {
        const p = proxyRepo.addProxy({
          name: `Concurrent ${i}`,
          host: `concurrent${i}.com`,
          port: 8080 + i,
          protocol: 'http',
          password: `pass${i}`
        });
        proxies.push(p.id);
      }

      // Read all credentials concurrently
      const results = await Promise.all(
        proxies.map(id => 
          new Promise<ProxyWithDecryptedCredentials | null>((resolve) => {
            resolve(proxyRepo.getProxyWithCredentials(id));
          })
        )
      );

      // All should succeed
      expect(results.filter(r => r !== null)).toHaveLength(10);
      expect(results.every(r => r?.decryptedPassword)).toBe(true);
    });
  });
});
