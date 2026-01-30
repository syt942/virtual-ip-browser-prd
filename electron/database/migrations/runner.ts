/**
 * Database Migration Runner
 * Handles applying and tracking database migrations with rollback support
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import type { SchemaMigration } from './types';
import { EMBEDDED_MIGRATIONS, type EmbeddedMigration } from './embedded-sql';

export interface MigrationResult {
  success: boolean;
  version: string;
  name: string;
  error?: string;
  duration: number;
}

export interface MigrationStatus {
  pending: string[];
  applied: SchemaMigration[];
  current: string | null;
}

export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database, _migrationsDir?: string) {
    this.db = db;
  }

  /**
   * Initialize migration tracking table
   */
  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      )
    `);
  }

  /**
   * Get list of all available migrations (from embedded migrations)
   */
  private getAvailableMigrations(): EmbeddedMigration[] {
    return [...EMBEDDED_MIGRATIONS].sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Get applied migrations from database
   */
  getAppliedMigrations(): SchemaMigration[] {
    this.ensureMigrationsTable();
    const stmt = this.db.prepare(`
      SELECT id, version, name, applied_at, checksum 
      FROM schema_migrations 
      ORDER BY version ASC
    `);
    return stmt.all() as SchemaMigration[];
  }

  /**
   * Calculate checksum for migration file
   */
  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get migration status
   */
  getStatus(): MigrationStatus {
    const available = this.getAvailableMigrations();
    const applied = this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));

    const pending = available
      .filter(m => !appliedVersions.has(m.version))
      .map(m => `${m.version}_${m.name}`);

    const current = applied.length > 0 
      ? applied[applied.length - 1].version 
      : null;

    return { pending, applied, current };
  }

  /**
   * Run all pending migrations
   */
  runAll(): MigrationResult[] {
    const results: MigrationResult[] = [];
    const available = this.getAvailableMigrations();
    const applied = this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));

    for (const migration of available) {
      if (!appliedVersions.has(migration.version)) {
        const result = this.runMigration(migration.version, migration.name, migration.sql);
        results.push(result);
        
        if (!result.success) {
          // Stop on first failure
          break;
        }
      }
    }

    return results;
  }

  /**
   * Run a specific migration
   */
  private runMigration(version: string, name: string, sql: string): MigrationResult {
    const startTime = Date.now();

    try {
      const checksum = this.calculateChecksum(sql);

      // Run migration in transaction
      const transaction = this.db.transaction(() => {
        // Execute migration SQL
        this.db.exec(sql);

        // Record migration (if not already recorded by the migration itself)
        const existing = this.db.prepare(
          'SELECT version FROM schema_migrations WHERE version = ?'
        ).get(version);

        if (!existing) {
          this.db.prepare(`
            INSERT INTO schema_migrations (version, name, checksum)
            VALUES (?, ?, ?)
          `).run(version, name, checksum);
        }
      });

      transaction();

      return {
        success: true,
        version,
        name,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        version,
        name,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Run migrations up to a specific version
   */
  runTo(targetVersion: string): MigrationResult[] {
    const results: MigrationResult[] = [];
    const available = this.getAvailableMigrations();
    const applied = this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));

    for (const migration of available) {
      if (migration.version > targetVersion) {
        break;
      }
      
      if (!appliedVersions.has(migration.version)) {
        const result = this.runMigration(migration.version, migration.name, migration.sql);
        results.push(result);
        
        if (!result.success) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Verify migration checksums match
   */
  verifyChecksums(): { valid: boolean; mismatches: string[] } {
    const available = this.getAvailableMigrations();
    const applied = this.getAppliedMigrations();
    const mismatches: string[] = [];

    for (const appliedMigration of applied) {
      const migration = available.find(m => m.version === appliedMigration.version);
      if (migration && appliedMigration.checksum) {
        const currentChecksum = this.calculateChecksum(migration.sql);
        
        if (currentChecksum !== appliedMigration.checksum) {
          mismatches.push(`${appliedMigration.version}_${appliedMigration.name}`);
        }
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches
    };
  }

  /**
   * Check if database needs migrations
   */
  needsMigration(): boolean {
    const status = this.getStatus();
    return status.pending.length > 0;
  }

  /**
   * Safe migration runner with backup recommendation
   */
  async runWithBackup(backupPath?: string): Promise<{
    results: MigrationResult[];
    backupCreated: boolean;
  }> {
    let backupCreated = false;

    // Create backup if path provided and migrations pending
    if (backupPath && this.needsMigration()) {
      try {
        this.db.backup(backupPath);
        backupCreated = true;
        console.log(`Database backup created at: ${backupPath}`);
      } catch (error) {
        console.warn('Failed to create backup:', error);
      }
    }

    const results = this.runAll();

    return { results, backupCreated };
  }
}

/**
 * Helper function to run migrations on database initialization
 */
export function runMigrationsOnInit(db: Database.Database): MigrationResult[] {
  const runner = new MigrationRunner(db);
  
  if (!runner.needsMigration()) {
    console.log('Database schema is up to date');
    return [];
  }

  console.log('Running pending database migrations...');
  const results = runner.runAll();

  for (const result of results) {
    if (result.success) {
      console.log(`✓ Applied migration ${result.version}_${result.name} (${result.duration}ms)`);
    } else {
      console.error(`✗ Failed migration ${result.version}_${result.name}: ${result.error}`);
    }
  }

  return results;
}
