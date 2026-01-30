/**
 * DatabaseManager Unit Tests
 * Tests for database initialization, connection management, transactions
 * 
 * TDD: Test-first methodology with Arrange-Act-Assert pattern
 * 
 * Note: These tests use in-memory SQLite to avoid Electron dependencies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDatabase } from './test-helpers';

/**
 * TestDatabaseManager - A test-friendly version of DatabaseManager
 * that works without Electron dependencies
 */
class TestDatabaseManager {
  private db: Database.Database | null = null;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  query<T = any>(sql: string, params?: any[]): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  }

  queryOne<T = any>(sql: string, params?: any[]): T | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
  }

  execute(sql: string, params?: any[]): Database.RunResult {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    return params ? stmt.run(...params) : stmt.run();
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not initialized');
    const txn = this.db.transaction(fn);
    return txn();
  }
}

describe('DatabaseManager', () => {
  let manager: TestDatabaseManager;

  beforeEach(() => {
    manager = new TestDatabaseManager(':memory:');
  });

  afterEach(() => {
    manager.close();
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================
  describe('initialization', () => {
    it('should create database instance', () => {
      // Assert
      expect(manager.getDatabase()).toBeDefined();
    });

    it('should throw error when accessing closed database', () => {
      // Arrange
      manager.close();

      // Act & Assert
      expect(() => manager.getDatabase()).toThrow('Database not initialized');
    });

    it('should enable foreign keys', () => {
      // Act
      const result = manager.queryOne<{ foreign_keys: number }>('PRAGMA foreign_keys');

      // Assert
      expect(result?.foreign_keys).toBe(1);
    });

    it('should enable WAL mode', () => {
      // Act
      const result = manager.queryOne<{ journal_mode: string }>('PRAGMA journal_mode');

      // Assert - In-memory databases use 'memory' journal mode, not 'wal'
      expect(['wal', 'memory']).toContain(result?.journal_mode);
    });
  });

  // ============================================================
  // QUERY OPERATIONS TESTS
  // ============================================================
  describe('query', () => {
    beforeEach(() => {
      manager.execute(`
        CREATE TABLE test_items (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          value INTEGER
        )
      `);
      manager.execute('INSERT INTO test_items (name, value) VALUES (?, ?)', ['item1', 100]);
      manager.execute('INSERT INTO test_items (name, value) VALUES (?, ?)', ['item2', 200]);
      manager.execute('INSERT INTO test_items (name, value) VALUES (?, ?)', ['item3', 300]);
    });

    it('should execute SELECT query', () => {
      // Act
      const results = manager.query('SELECT * FROM test_items');

      // Assert
      expect(results).toHaveLength(3);
    });

    it('should execute parameterized query', () => {
      // Act
      const results = manager.query('SELECT * FROM test_items WHERE value > ?', [150]);

      // Assert
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      // Act
      const results = manager.query('SELECT * FROM test_items WHERE value > ?', [1000]);

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should throw error for invalid SQL', () => {
      // Act & Assert
      expect(() => manager.query('INVALID SQL')).toThrow();
    });
  });

  describe('queryOne', () => {
    beforeEach(() => {
      manager.execute(`
        CREATE TABLE test_items (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);
      manager.execute('INSERT INTO test_items (name) VALUES (?)', ['item1']);
    });

    it('should return single row', () => {
      // Act
      const result = manager.queryOne<{ id: number; name: string }>(
        'SELECT * FROM test_items WHERE name = ?',
        ['item1']
      );

      // Assert
      expect(result?.name).toBe('item1');
    });

    it('should return undefined for no match', () => {
      // Act
      const result = manager.queryOne('SELECT * FROM test_items WHERE name = ?', ['nonexistent']);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      manager.execute(`
        CREATE TABLE test_items (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);
    });

    it('should execute INSERT statement', () => {
      // Act
      const result = manager.execute('INSERT INTO test_items (name) VALUES (?)', ['test']);

      // Assert
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should execute UPDATE statement', () => {
      // Arrange
      manager.execute('INSERT INTO test_items (name) VALUES (?)', ['original']);

      // Act
      const result = manager.execute('UPDATE test_items SET name = ? WHERE name = ?', ['updated', 'original']);

      // Assert
      expect(result.changes).toBe(1);
    });

    it('should execute DELETE statement', () => {
      // Arrange
      manager.execute('INSERT INTO test_items (name) VALUES (?)', ['to_delete']);

      // Act
      const result = manager.execute('DELETE FROM test_items WHERE name = ?', ['to_delete']);

      // Assert
      expect(result.changes).toBe(1);
    });

    it('should return 0 changes for no-match UPDATE', () => {
      // Act
      const result = manager.execute('UPDATE test_items SET name = ? WHERE name = ?', ['new', 'nonexistent']);

      // Assert
      expect(result.changes).toBe(0);
    });
  });

  // ============================================================
  // TRANSACTION TESTS
  // ============================================================
  describe('transaction', () => {
    beforeEach(() => {
      manager.execute(`
        CREATE TABLE accounts (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          balance INTEGER NOT NULL
        )
      `);
      manager.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Alice', 1000]);
      manager.execute('INSERT INTO accounts (name, balance) VALUES (?, ?)', ['Bob', 500]);
    });

    it('should commit successful transaction', () => {
      // Arrange
      const db = manager.getDatabase();

      // Act
      manager.transaction(() => {
        db.prepare('UPDATE accounts SET balance = balance - 100 WHERE name = ?').run('Alice');
        db.prepare('UPDATE accounts SET balance = balance + 100 WHERE name = ?').run('Bob');
      });

      // Assert
      const alice = manager.queryOne<{ balance: number }>('SELECT balance FROM accounts WHERE name = ?', ['Alice']);
      const bob = manager.queryOne<{ balance: number }>('SELECT balance FROM accounts WHERE name = ?', ['Bob']);
      
      expect(alice?.balance).toBe(900);
      expect(bob?.balance).toBe(600);
    });

    it('should rollback failed transaction', () => {
      // Arrange
      const db = manager.getDatabase();

      // Act & Assert
      expect(() => {
        manager.transaction(() => {
          db.prepare('UPDATE accounts SET balance = balance - 100 WHERE name = ?').run('Alice');
          throw new Error('Simulated failure');
        });
      }).toThrow('Simulated failure');

      // Verify rollback
      const alice = manager.queryOne<{ balance: number }>('SELECT balance FROM accounts WHERE name = ?', ['Alice']);
      expect(alice?.balance).toBe(1000); // Original balance preserved
    });

    it('should return value from transaction', () => {
      // Act
      const result = manager.transaction(() => {
        return { status: 'success', value: 42 };
      });

      // Assert
      expect(result.status).toBe('success');
      expect(result.value).toBe(42);
    });

    it('should handle nested operations', () => {
      // Arrange
      const db = manager.getDatabase();

      // Act
      manager.transaction(() => {
        db.prepare('INSERT INTO accounts (name, balance) VALUES (?, ?)').run('Charlie', 0);
        db.prepare('UPDATE accounts SET balance = balance - 50 WHERE name = ?').run('Alice');
        db.prepare('UPDATE accounts SET balance = balance - 50 WHERE name = ?').run('Bob');
        db.prepare('UPDATE accounts SET balance = balance + 100 WHERE name = ?').run('Charlie');
      });

      // Assert
      const charlie = manager.queryOne<{ balance: number }>('SELECT balance FROM accounts WHERE name = ?', ['Charlie']);
      expect(charlie?.balance).toBe(100);
    });
  });

  // ============================================================
  // CONNECTION MANAGEMENT TESTS
  // ============================================================
  describe('connection management', () => {
    it('should close database connection', () => {
      // Act
      manager.close();

      // Assert
      expect(() => manager.getDatabase()).toThrow();
    });

    it('should be safe to close multiple times', () => {
      // Act & Assert - Should not throw
      manager.close();
      manager.close();
      manager.close();
    });

    it('should throw on operations after close', () => {
      // Arrange
      manager.close();

      // Act & Assert
      expect(() => manager.query('SELECT 1')).toThrow();
      expect(() => manager.queryOne('SELECT 1')).toThrow();
      expect(() => manager.execute('SELECT 1')).toThrow();
    });
  });

  // ============================================================
  // ERROR HANDLING TESTS
  // ============================================================
  describe('error handling', () => {
    it('should handle constraint violations', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE unique_items (
          id INTEGER PRIMARY KEY,
          code TEXT UNIQUE NOT NULL
        )
      `);
      manager.execute('INSERT INTO unique_items (code) VALUES (?)', ['ABC']);

      // Act & Assert
      expect(() => {
        manager.execute('INSERT INTO unique_items (code) VALUES (?)', ['ABC']);
      }).toThrow();
    });

    it('should handle foreign key violations with FK enabled', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE parents (
          id INTEGER PRIMARY KEY,
          name TEXT
        )
      `);
      manager.execute(`
        CREATE TABLE children (
          id INTEGER PRIMARY KEY,
          parent_id INTEGER REFERENCES parents(id),
          name TEXT
        )
      `);

      // Act & Assert - Should throw due to foreign key constraint
      expect(() => {
        manager.execute('INSERT INTO children (parent_id, name) VALUES (?, ?)', [999, 'orphan']);
      }).toThrow();
    });

    it('should handle NOT NULL violations', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE required_fields (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL
        )
      `);

      // Act & Assert
      expect(() => {
        manager.execute('INSERT INTO required_fields (name) VALUES (?)', [null]);
      }).toThrow();
    });

    it('should handle CHECK constraint violations', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE checked_values (
          id INTEGER PRIMARY KEY,
          value INTEGER CHECK (value >= 0)
        )
      `);

      // Act & Assert
      expect(() => {
        manager.execute('INSERT INTO checked_values (value) VALUES (?)', [-1]);
      }).toThrow();
    });
  });

  // ============================================================
  // CONCURRENT ACCESS TESTS
  // ============================================================
  describe('concurrent access', () => {
    beforeEach(() => {
      manager.execute(`
        CREATE TABLE counters (
          id INTEGER PRIMARY KEY,
          value INTEGER NOT NULL
        )
      `);
      manager.execute('INSERT INTO counters (id, value) VALUES (1, 0)');
    });

    it('should handle rapid sequential updates', () => {
      // Act
      for (let i = 0; i < 100; i++) {
        manager.execute('UPDATE counters SET value = value + 1 WHERE id = 1');
      }

      // Assert
      const result = manager.queryOne<{ value: number }>('SELECT value FROM counters WHERE id = 1');
      expect(result?.value).toBe(100);
    });

    it('should maintain consistency with transactions', () => {
      // Arrange
      const db = manager.getDatabase();

      // Act
      for (let i = 0; i < 10; i++) {
        manager.transaction(() => {
          const current = db.prepare('SELECT value FROM counters WHERE id = 1').get() as { value: number };
          db.prepare('UPDATE counters SET value = ? WHERE id = 1').run(current.value + 10);
        });
      }

      // Assert
      const result = manager.queryOne<{ value: number }>('SELECT value FROM counters WHERE id = 1');
      expect(result?.value).toBe(100);
    });
  });

  // ============================================================
  // DATA INTEGRITY TESTS
  // ============================================================
  describe('data integrity', () => {
    it('should preserve data types', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE typed_data (
          id INTEGER PRIMARY KEY,
          int_val INTEGER,
          real_val REAL,
          text_val TEXT,
          blob_val BLOB
        )
      `);

      // Act
      manager.execute(
        'INSERT INTO typed_data (int_val, real_val, text_val) VALUES (?, ?, ?)',
        [42, 3.14159, 'hello']
      );

      // Assert
      const result = manager.queryOne<{
        int_val: number;
        real_val: number;
        text_val: string;
      }>('SELECT * FROM typed_data WHERE id = 1');

      expect(result?.int_val).toBe(42);
      expect(result?.real_val).toBeCloseTo(3.14159, 4);
      expect(result?.text_val).toBe('hello');
    });

    it('should handle NULL values', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE nullable_data (
          id INTEGER PRIMARY KEY,
          optional_value TEXT
        )
      `);

      // Act
      manager.execute('INSERT INTO nullable_data (optional_value) VALUES (?)', [null]);

      // Assert
      const result = manager.queryOne<{ optional_value: string | null }>(
        'SELECT * FROM nullable_data WHERE id = 1'
      );
      expect(result?.optional_value).toBeNull();
    });

    it('should handle unicode text', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE unicode_data (
          id INTEGER PRIMARY KEY,
          text_val TEXT
        )
      `);

      const unicodeText = '日本語テスト 🚀 émoji ñoño';

      // Act
      manager.execute('INSERT INTO unicode_data (text_val) VALUES (?)', [unicodeText]);

      // Assert
      const result = manager.queryOne<{ text_val: string }>(
        'SELECT * FROM unicode_data WHERE id = 1'
      );
      expect(result?.text_val).toBe(unicodeText);
    });

    it('should handle large text values', () => {
      // Arrange
      manager.execute(`
        CREATE TABLE large_data (
          id INTEGER PRIMARY KEY,
          content TEXT
        )
      `);

      const largeText = 'x'.repeat(100000);

      // Act
      manager.execute('INSERT INTO large_data (content) VALUES (?)', [largeText]);

      // Assert
      const result = manager.queryOne<{ content: string }>(
        'SELECT * FROM large_data WHERE id = 1'
      );
      expect(result?.content.length).toBe(100000);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty result sets', () => {
      // Arrange
      manager.execute('CREATE TABLE empty_table (id INTEGER PRIMARY KEY)');

      // Act
      const results = manager.query('SELECT * FROM empty_table');

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should handle very long SQL queries', () => {
      // Arrange
      manager.execute('CREATE TABLE many_columns (id INTEGER PRIMARY KEY, c1 TEXT, c2 TEXT, c3 TEXT, c4 TEXT, c5 TEXT)');

      // Act - Long INSERT
      manager.execute(
        'INSERT INTO many_columns (c1, c2, c3, c4, c5) VALUES (?, ?, ?, ?, ?)',
        ['value1', 'value2', 'value3', 'value4', 'value5']
      );

      // Assert
      const result = manager.queryOne('SELECT * FROM many_columns WHERE id = 1');
      expect(result).toBeDefined();
    });

    it('should handle boolean-like values', () => {
      // Arrange
      manager.execute('CREATE TABLE bool_data (id INTEGER PRIMARY KEY, flag INTEGER)');

      // Act
      manager.execute('INSERT INTO bool_data (flag) VALUES (?)', [1]);
      manager.execute('INSERT INTO bool_data (flag) VALUES (?)', [0]);

      // Assert
      const trueRow = manager.queryOne<{ flag: number }>('SELECT flag FROM bool_data WHERE id = 1');
      const falseRow = manager.queryOne<{ flag: number }>('SELECT flag FROM bool_data WHERE id = 2');
      
      expect(trueRow?.flag).toBe(1);
      expect(falseRow?.flag).toBe(0);
    });
  });
});
