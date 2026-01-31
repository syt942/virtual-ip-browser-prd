/**
 * Migration 004 Performance Indexes Tests
 * Tests for the new performance indexes migration
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '../../../electron/database/migrations/runner';

// Base schema needed for migrations to work
const BASE_SCHEMA = `
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  protocol TEXT NOT NULL,
  status TEXT DEFAULT 'checking',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL,
  status TEXT NOT NULL,
  proxy_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  session_id TEXT,
  tab_id TEXT,
  proxy_id TEXT
);
`;

describe('Migration 004: Performance Indexes', () => {
  let db: Database.Database;
  let runner: MigrationRunner;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(BASE_SCHEMA);
    runner = new MigrationRunner(db);
  });

  afterEach(() => {
    db.close();
  });

  // ============================================================
  // MIGRATION APPLICATION TESTS
  // ============================================================
  describe('migration application', () => {
    it('should apply migration 004 successfully', () => {
      // Act
      const results = runner.runAll();

      // Assert
      const migration004 = results.find(r => r.version === '004');
      expect(migration004).toBeDefined();
      expect(migration004?.success).toBe(true);
    });

    it('should record migration 004 in schema_migrations', () => {
      // Act
      runner.runAll();

      // Assert
      const applied = runner.getAppliedMigrations();
      expect(applied.some(m => m.version === '004')).toBe(true);
    });

    it('should be idempotent', () => {
      // Act
      runner.runAll();
      const secondRun = runner.runAll();

      // Assert
      expect(secondRun).toHaveLength(0);
    });
  });

  // ============================================================
  // INDEX CREATION TESTS
  // ============================================================
  describe('index creation', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should create idx_search_tasks_proxy_id index', () => {
      // Assert
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_search_tasks_proxy_id'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should create idx_proxy_usage_composite index', () => {
      // Assert
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_proxy_usage_composite'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should create idx_rotation_events_composite index', () => {
      // Assert
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_rotation_events_composite'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should create idx_activity_logs_composite index', () => {
      // Assert
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_activity_logs_composite'"
      ).all();
      expect(indexes).toHaveLength(1);
    });

    it('should create idx_sticky_sessions_domain_lookup index', () => {
      // Assert
      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sticky_sessions_domain_lookup'"
      ).all();
      expect(indexes).toHaveLength(1);
    });
  });

  // ============================================================
  // INDEX STRUCTURE VERIFICATION
  // ============================================================
  describe('index structure', () => {
    beforeEach(() => {
      runner.runAll();
    });

    it('should have correct columns for idx_search_tasks_proxy_id', () => {
      // Act
      const indexInfo = db.prepare(
        "SELECT * FROM pragma_index_info('idx_search_tasks_proxy_id')"
      ).all() as { name: string }[];

      // Assert
      expect(indexInfo.length).toBeGreaterThan(0);
      expect(indexInfo.some(col => col.name === 'proxy_id')).toBe(true);
    });

    it('should have correct columns for idx_activity_logs_composite', () => {
      // Act
      const indexInfo = db.prepare(
        "SELECT * FROM pragma_index_info('idx_activity_logs_composite')"
      ).all() as { name: string }[];

      // Assert
      expect(indexInfo.length).toBe(2);
      const columnNames = indexInfo.map(col => col.name);
      expect(columnNames).toContain('session_id');
      expect(columnNames).toContain('timestamp');
    });
  });

  // ============================================================
  // QUERY PERFORMANCE TESTS
  // ============================================================
  describe('query performance', () => {
    beforeEach(() => {
      runner.runAll();

      // Insert test data for search_tasks
      const insertProxy = db.prepare(
        'INSERT INTO proxies (id, name, host, port, protocol) VALUES (?, ?, ?, ?, ?)'
      );
      const insertTask = db.prepare(
        'INSERT INTO search_tasks (id, session_id, keyword, engine, status, proxy_id) VALUES (?, ?, ?, ?, ?, ?)'
      );

      insertProxy.run('proxy-1', 'Test Proxy', '127.0.0.1', 8080, 'http');
      
      for (let i = 0; i < 100; i++) {
        insertTask.run(
          `task-${i}`,
          `session-${i % 10}`,
          `keyword-${i}`,
          'google',
          'completed',
          'proxy-1'
        );
      }
    });

    it('should use index for search_tasks proxy_id queries', () => {
      // Act
      const explain = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM search_tasks WHERE proxy_id = 'proxy-1'"
      ).all() as { detail: string }[];

      // Assert - Should use index, not full table scan
      const planDetails = explain.map(row => row.detail).join(' ');
      expect(planDetails).toMatch(/USING INDEX|SEARCH/i);
    });

    it('should use index for activity_logs composite queries', () => {
      // Insert test activity logs
      const insertLog = db.prepare(
        'INSERT INTO activity_logs (id, level, category, message, session_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
      );

      for (let i = 0; i < 50; i++) {
        insertLog.run(
          `log-${i}`,
          'info',
          'test',
          `message-${i}`,
          `session-${i % 5}`,
          new Date(Date.now() - i * 1000).toISOString()
        );
      }

      // Act
      const explain = db.prepare(
        "EXPLAIN QUERY PLAN SELECT * FROM activity_logs WHERE session_id = 'session-1' ORDER BY timestamp DESC"
      ).all() as { detail: string }[];

      // Assert
      const planDetails = explain.map(row => row.detail).join(' ');
      expect(planDetails).toMatch(/USING INDEX|SEARCH|COVERING/i);
    });
  });

  // ============================================================
  // ROLLBACK CAPABILITY TESTS
  // ============================================================
  describe('rollback capability', () => {
    it('should provide rollback SQL that removes indexes', () => {
      // Arrange
      runner.runAll();

      // Verify indexes exist
      let indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      ).all() as { name: string }[];
      const indexCount = indexes.length;
      expect(indexCount).toBeGreaterThan(0);

      // Act - Apply rollback SQL manually
      db.exec(`
        DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
        DROP INDEX IF EXISTS idx_proxy_usage_composite;
        DROP INDEX IF EXISTS idx_rotation_events_composite;
        DROP INDEX IF EXISTS idx_activity_logs_composite;
        DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;
        DELETE FROM schema_migrations WHERE version = '004';
      `);

      // Assert - Migration 004 indexes should be removed
      indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_search_tasks_proxy_id', 'idx_proxy_usage_composite', 'idx_rotation_events_composite', 'idx_activity_logs_composite', 'idx_sticky_sessions_domain_lookup')"
      ).all() as { name: string }[];
      expect(indexes).toHaveLength(0);

      // Migration record should be removed
      const migrations = runner.getAppliedMigrations();
      expect(migrations.some(m => m.version === '004')).toBe(false);
    });
  });

  // ============================================================
  // BACKWARD COMPATIBILITY TESTS
  // ============================================================
  describe('backward compatibility', () => {
    it('should not break existing queries after migration', () => {
      // Arrange
      runner.runAll();

      // Insert test data
      db.prepare(
        'INSERT INTO proxies (id, name, host, port, protocol) VALUES (?, ?, ?, ?, ?)'
      ).run('proxy-1', 'Test', '127.0.0.1', 8080, 'http');

      db.prepare(
        'INSERT INTO search_tasks (id, session_id, keyword, engine, status, proxy_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run('task-1', 'session-1', 'test', 'google', 'completed', 'proxy-1');

      // Act & Assert - Existing queries should still work
      const tasks = db.prepare('SELECT * FROM search_tasks WHERE proxy_id = ?').all('proxy-1');
      expect(tasks).toHaveLength(1);

      const logs = db.prepare('SELECT * FROM activity_logs WHERE session_id = ? ORDER BY timestamp DESC').all('session-1');
      expect(logs).toHaveLength(0); // No logs inserted
    });

    it('should preserve existing data after migration', () => {
      // Arrange - Insert data before migration
      runner.runTo('002'); // Run migrations up to 002

      db.prepare(
        'INSERT INTO proxies (id, name, host, port, protocol) VALUES (?, ?, ?, ?, ?)'
      ).run('proxy-pre', 'Pre-migration Proxy', '127.0.0.1', 8080, 'http');

      // Act - Run remaining migrations
      runner.runAll();

      // Assert - Data should still exist
      const proxy = db.prepare('SELECT * FROM proxies WHERE id = ?').get('proxy-pre');
      expect(proxy).toBeDefined();
    });
  });
});
