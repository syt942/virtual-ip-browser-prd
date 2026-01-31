/**
 * Enhanced Test Helpers
 * Utility functions for testing across the Virtual IP Browser application
 */

import { vi } from 'vitest';
import Database from 'better-sqlite3';

// ============================================================================
// DATABASE TEST HELPERS
// ============================================================================

/**
 * Create an in-memory SQLite database for testing
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

/**
 * Create a test database with basic schema
 */
export function createTestDatabaseWithSchema(): Database.Database {
  const db = createTestDatabase();
  
  // Basic tables needed for most tests
  db.exec(`
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
      weight REAL DEFAULT 1.0,
      rotation_group TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(host, port, protocol)
    );

    CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
    CREATE INDEX IF NOT EXISTS idx_proxies_region ON proxies(region);

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT
    );

    CREATE TABLE IF NOT EXISTS rotation_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      strategy TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      common_config TEXT DEFAULT '{}',
      strategy_config TEXT DEFAULT '{}',
      target_group TEXT,
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS encrypted_credentials (
      id TEXT PRIMARY KEY,
      proxy_id TEXT,
      credential_name TEXT NOT NULL,
      credential_type TEXT NOT NULL CHECK (credential_type IN ('basic', 'api_key', 'oauth', 'certificate')),
      encrypted_username TEXT,
      encrypted_password TEXT,
      encrypted_data TEXT,
      encryption_version INTEGER DEFAULT 1,
      key_id TEXT,
      algorithm TEXT DEFAULT 'aes-256-gcm',
      provider TEXT,
      expires_at DATETIME,
      last_rotated_at DATETIME,
      rotation_required INTEGER DEFAULT 0,
      access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'team', 'organization')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at DATETIME,
      access_count INTEGER DEFAULT 0,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS sticky_sessions (
      id TEXT PRIMARY KEY,
      session_key TEXT NOT NULL UNIQUE,
      proxy_id TEXT NOT NULL,
      domain TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      request_count INTEGER DEFAULT 0,
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rotation_events (
      id TEXT PRIMARY KEY,
      config_id TEXT,
      event_type TEXT NOT NULL,
      from_proxy_id TEXT,
      to_proxy_id TEXT,
      reason TEXT,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proxy_usage_stats (
      id TEXT PRIMARY KEY,
      proxy_id TEXT NOT NULL,
      date TEXT NOT NULL,
      requests INTEGER DEFAULT 0,
      successes INTEGER DEFAULT 0,
      failures INTEGER DEFAULT 0,
      total_latency INTEGER DEFAULT 0,
      bytes_transferred INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(proxy_id, date),
      FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
    );
  `);

  return db;
}

/**
 * Clean up database connection
 */
export function cleanupDatabase(db: Database.Database | null): void {
  if (db) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
  }
}

// Counter for unique proxy generation
let proxyCounter = 0;

/**
 * Insert test proxy into database
 */
export function insertTestProxy(
  db: Database.Database,
  overrides: Partial<{
    id: string;
    name: string;
    host: string;
    port: number;
    protocol: string;
    status: string;
    weight: number;
    rotation_group: string | null;
  }> = {}
): string {
  const counter = proxyCounter++;
  const id = overrides.id || `proxy-${Date.now()}-${counter}-${Math.random().toString(36).slice(2)}`;
  
  // Generate unique host if not provided to avoid UNIQUE constraint violations
  const host = overrides.host || `test-${counter}.proxy.com`;
  const port = overrides.port || (8080 + counter);
  
  db.prepare(`
    INSERT INTO proxies (id, name, host, port, protocol, status, weight, rotation_group)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.name || 'Test Proxy',
    host,
    port,
    overrides.protocol || 'https',
    overrides.status || 'active',
    overrides.weight ?? 1.0,
    overrides.rotation_group ?? null
  );
  
  return id;
}

/**
 * Reset proxy counter (call in beforeEach if needed)
 */
export function resetProxyCounter(): void {
  proxyCounter = 0;
}

// ============================================================================
// ASYNC TEST HELPERS
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock function that tracks calls and returns specified values
 */
export function createTrackingMock<T extends (...args: unknown[]) => unknown>(
  implementation?: T
) {
  const calls: Parameters<T>[] = [];
  
  const mock = vi.fn((...args: Parameters<T>) => {
    calls.push(args);
    return implementation?.(...args);
  });
  
  return {
    mock,
    calls,
    getCalls: () => calls,
    getLastCall: () => calls[calls.length - 1],
    reset: () => {
      calls.length = 0;
      mock.mockReset();
    },
  };
}

// ============================================================================
// UUID HELPERS
// ============================================================================

let uuidCounter = 0;

/**
 * Generate a valid UUID for testing
 */
export function generateTestUUID(): string {
  const hex = (uuidCounter++).toString(16).padStart(12, '0');
  return `00000000-0000-4000-a000-${hex}`;
}

/**
 * Reset UUID counter (call in beforeEach)
 */
export function resetUUIDCounter(): void {
  uuidCounter = 0;
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Create a date offset from now
 */
export function dateFromNow(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

/**
 * Create a date in the past
 */
export function pastDate(daysAgo: number): Date {
  return dateFromNow(-daysAgo * 24 * 60 * 60 * 1000);
}

/**
 * Create a date in the future
 */
export function futureDate(daysAhead: number): Date {
  return dateFromNow(daysAhead * 24 * 60 * 60 * 1000);
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a value is defined and return it typed
 */
export function assertDefined<T>(value: T | undefined | null, message?: string): T {
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to be defined');
  }
  return value;
}

/**
 * Assert that an array has a specific length
 */
export function assertArrayLength<T>(arr: T[], length: number, message?: string): void {
  if (arr.length !== length) {
    throw new Error(message || `Expected array length ${length}, got ${arr.length}`);
  }
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

/**
 * Capture and return an error from an async function
 */
export async function captureError(fn: () => Promise<unknown>): Promise<Error | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Capture and return an error from a sync function
 */
export function captureErrorSync(fn: () => unknown): Error | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}
