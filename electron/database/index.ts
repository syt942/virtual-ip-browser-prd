/**
 * Database Manager
 * SQLite database initialization and management with migration support
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { runMigrationsOnInit, MigrationRunner } from './migrations';
import {
  RotationConfigRepository,
  ProxyUsageStatsRepository,
  EncryptedCredentialsRepository,
  StickySessionRepository,
  RotationEventsRepository,
  RotationRulesRepository,
  CreatorSupportHistoryRepository,
  ExecutionLogsRepository,
  CircuitBreakerRepository
} from './repositories';
import { ProxyRepository } from './repositories/proxy.repository';
import { encryptionService } from './services/encryption.service';

// Embedded database schema (to avoid file system issues in packaged app)
const DATABASE_SCHEMA = `
-- Virtual IP Browser Database Schema
-- SQLite Database for storing proxy configs, sessions, and activity logs

-- Proxies Table
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
CREATE INDEX IF NOT EXISTS idx_proxies_region ON proxies(region);

-- Search Tasks Table
CREATE TABLE IF NOT EXISTS search_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  proxy_id TEXT,
  tab_id TEXT,
  position INTEGER,
  results TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_search_tasks_session ON search_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_search_tasks_status ON search_tasks(status);
CREATE INDEX IF NOT EXISTS idx_search_tasks_keyword ON search_tasks(keyword);

-- Target Domains Table
CREATE TABLE IF NOT EXISTS target_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_visited DATETIME,
  visit_count INTEGER DEFAULT 0,
  avg_position REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_target_domains_enabled ON target_domains(enabled);
CREATE INDEX IF NOT EXISTS idx_target_domains_priority ON target_domains(priority DESC);

-- Creators Table
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'blog', 'website')),
  thumbnail_url TEXT,
  support_methods TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_supported DATETIME,
  total_supports INTEGER DEFAULT 0,
  total_ads_viewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creators_enabled ON creators(enabled);
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'success')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  session_id TEXT,
  tab_id TEXT,
  proxy_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tabs TEXT,
  window_bounds TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('one-time', 'recurring', 'continuous', 'custom')),
  task_config TEXT NOT NULL,
  start_time DATETIME,
  end_time DATETIME,
  interval_minutes INTEGER,
  days_of_week TEXT,
  cron_expression TEXT,
  enabled INTEGER DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  run_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run);
`;

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  
  // Repositories
  private _rotationConfigs: RotationConfigRepository | null = null;
  private _proxyUsageStats: ProxyUsageStatsRepository | null = null;
  private _encryptedCredentials: EncryptedCredentialsRepository | null = null;
  private _stickySession: StickySessionRepository | null = null;
  private _rotationEvents: RotationEventsRepository | null = null;
  private _rotationRules: RotationRulesRepository | null = null;
  private _proxies: ProxyRepository | null = null;
  private _creatorSupportHistory: CreatorSupportHistoryRepository | null = null;
  private _executionLogs: ExecutionLogsRepository | null = null;
  private _circuitBreakers: CircuitBreakerRepository | null = null;

  constructor() {
    this.dbPath = join(app.getPath('userData'), 'virtual-ip-browser.db');
  }

  /**
   * Initialize database with schema and migrations
   */
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    
    // Execute embedded schema
    this.db.exec(DATABASE_SCHEMA);
    
    // Run migrations (using embedded migrations)
    const migrationResults = runMigrationsOnInit(this.db);
    if (migrationResults.some(r => !r.success)) {
      const failed = migrationResults.find(r => !r.success);
      throw new Error(`Migration failed: ${failed?.error}`);
    }
    
    // Initialize repositories
    this._rotationConfigs = new RotationConfigRepository(this.db);
    this._proxyUsageStats = new ProxyUsageStatsRepository(this.db);
    this._encryptedCredentials = new EncryptedCredentialsRepository(this.db);
    this._stickySession = new StickySessionRepository(this.db);
    this._rotationEvents = new RotationEventsRepository(this.db);
    this._rotationRules = new RotationRulesRepository(this.db);
    this._proxies = new ProxyRepository(this.db);
    this._creatorSupportHistory = new CreatorSupportHistoryRepository(this.db);
    this._executionLogs = new ExecutionLogsRepository(this.db);
    this._circuitBreakers = new CircuitBreakerRepository(this.db);
    
    console.log('Database initialized at:', this.dbPath);
  }

  /**
   * Get database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // ============================================================
  // Repository Accessors
  // ============================================================

  get rotationConfigs(): RotationConfigRepository {
    if (!this._rotationConfigs) {throw new Error('Database not initialized');}
    return this._rotationConfigs;
  }

  get proxyUsageStats(): ProxyUsageStatsRepository {
    if (!this._proxyUsageStats) {throw new Error('Database not initialized');}
    return this._proxyUsageStats;
  }

  get encryptedCredentials(): EncryptedCredentialsRepository {
    if (!this._encryptedCredentials) {throw new Error('Database not initialized');}
    return this._encryptedCredentials;
  }

  get stickySession(): StickySessionRepository {
    if (!this._stickySession) {throw new Error('Database not initialized');}
    return this._stickySession;
  }

  get rotationEvents(): RotationEventsRepository {
    if (!this._rotationEvents) {throw new Error('Database not initialized');}
    return this._rotationEvents;
  }

  get rotationRules(): RotationRulesRepository {
    if (!this._rotationRules) {throw new Error('Database not initialized');}
    return this._rotationRules;
  }

  get proxies(): ProxyRepository {
    if (!this._proxies) {throw new Error('Database not initialized');}
    return this._proxies;
  }

  get creatorSupportHistory(): CreatorSupportHistoryRepository {
    if (!this._creatorSupportHistory) {throw new Error('Database not initialized');}
    return this._creatorSupportHistory;
  }

  get executionLogs(): ExecutionLogsRepository {
    if (!this._executionLogs) {throw new Error('Database not initialized');}
    return this._executionLogs;
  }

  get circuitBreakers(): CircuitBreakerRepository {
    if (!this._circuitBreakers) {throw new Error('Database not initialized');}
    return this._circuitBreakers;
  }

  // ============================================================
  // Migration Management
  // ============================================================

  /**
   * Get migration runner for advanced migration operations
   */
  getMigrationRunner(): MigrationRunner {
    if (!this.db) {throw new Error('Database not initialized');}
    return new MigrationRunner(this.db, join(__dirname, 'migrations'));
  }

  /**
   * Check if migrations are pending
   */
  hasPendingMigrations(): boolean {
    return this.getMigrationRunner().needsMigration();
  }

  /**
   * Get migration status
   */
  getMigrationStatus() {
    return this.getMigrationRunner().getStatus();
  }

  // ============================================================
  // Core Database Operations
  // ============================================================

  /**
   * Close database connection
   */
  close(): void {
    // Cleanup encryption service
    encryptionService.destroy();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    // Clear repository references
    this._rotationConfigs = null;
    this._proxyUsageStats = null;
    this._encryptedCredentials = null;
    this._stickySession = null;
    this._rotationEvents = null;
    this._rotationRules = null;
    this._proxies = null;
    this._creatorSupportHistory = null;
    this._executionLogs = null;
    this._circuitBreakers = null;
  }

  /**
   * Execute a query
   * @template T - The expected row type
   * @param sql - SQL query string
   * @param params - Array of parameters to bind (string, number, bigint, Buffer, null, or undefined)
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    if (!this.db) {throw new Error('Database not initialized');}
    const stmt = this.db.prepare(sql);
    return stmt.all(params) as T[];
  }

  /**
   * Execute a single row query
   * @template T - The expected row type
   * @param sql - SQL query string
   * @param params - Array of parameters to bind
   */
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
    if (!this.db) {throw new Error('Database not initialized');}
    const stmt = this.db.prepare(sql);
    return stmt.get(params) as T | undefined;
  }

  /**
   * Execute an insert/update/delete
   * @param sql - SQL statement string
   * @param params - Array of parameters to bind
   */
  execute(sql: string, params?: unknown[]): Database.RunResult {
    if (!this.db) {throw new Error('Database not initialized');}
    const stmt = this.db.prepare(sql);
    return stmt.run(params);
  }

  /**
   * Begin transaction
   */
  beginTransaction(): Database.Transaction {
    if (!this.db) {throw new Error('Database not initialized');}
    return this.db.transaction((callback: Function) => callback());
  }

  /**
   * Run operations in a transaction
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {throw new Error('Database not initialized');}
    const txn = this.db.transaction(fn);
    return txn();
  }

  /**
   * Create a database backup
   */
  backup(backupPath: string): void {
    if (!this.db) {throw new Error('Database not initialized');}
    this.db.backup(backupPath);
  }

  /**
   * Run periodic maintenance (vacuum, cleanup old data)
   */
  async runMaintenance(options?: {
    statsRetentionDays?: number;
    eventsRetentionDays?: number;
    vacuum?: boolean;
  }): Promise<{
    statsDeleted: number;
    eventsDeleted: number;
    expiredMappingsDeleted: number;
  }> {
    const statsRetention = options?.statsRetentionDays ?? 30;
    const eventsRetention = options?.eventsRetentionDays ?? 30;

    const statsDeleted = this.proxyUsageStats.cleanup(statsRetention);
    const eventsDeleted = this.rotationEvents.cleanup(eventsRetention);
    const expiredMappingsDeleted = this.stickySession.cleanupExpired();

    if (options?.vacuum && this.db) {
      this.db.exec('VACUUM');
    }

    return { statsDeleted, eventsDeleted, expiredMappingsDeleted };
  }
}

// Singleton instance
export const db = new DatabaseManager();

// Re-export types and services
export * from './repositories';
export * from './migrations';
export { encryptionService, EncryptionService } from './services/encryption.service';
