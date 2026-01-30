/**
 * Database Test Helpers
 * Utilities for setting up in-memory SQLite databases for testing
 */

import Database from 'better-sqlite3';

// Embedded database schema (copied from db.ts to avoid electron dependencies)
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
  weight REAL DEFAULT 1.0,
  rotation_group TEXT,
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- Schema Migrations Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT
);

-- Rotation Configs Table
CREATE TABLE IF NOT EXISTS rotation_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL CHECK (strategy IN ('round-robin', 'random', 'weighted', 'least-used', 'fastest', 'geographic', 'sticky-session', 'time-based', 'failure-aware', 'custom-rules')),
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

CREATE INDEX IF NOT EXISTS idx_rotation_configs_strategy ON rotation_configs(strategy);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_active ON rotation_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_target_group ON rotation_configs(target_group);

-- Proxy Usage Stats Table
CREATE TABLE IF NOT EXISTS proxy_usage_stats (
  id TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  time_bucket DATETIME NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_latency_ms REAL,
  min_latency_ms REAL,
  max_latency_ms REAL,
  p95_latency_ms REAL,
  bytes_sent INTEGER DEFAULT 0,
  bytes_received INTEGER DEFAULT 0,
  rotation_count INTEGER DEFAULT 0,
  rotation_reasons TEXT,
  error_counts TEXT,
  last_error TEXT,
  last_error_at DATETIME,
  target_countries TEXT,
  unique_domains INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proxy_id, time_bucket)
);

CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy ON proxy_usage_stats(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_time ON proxy_usage_stats(time_bucket);

-- Encrypted Credentials Table
CREATE TABLE IF NOT EXISTS encrypted_credentials (
  id TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('basic', 'api_key', 'oauth', 'certificate')),
  encrypted_data TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT DEFAULT 'aes-256-gcm',
  access_level TEXT DEFAULT 'standard' CHECK (access_level IN ('standard', 'premium', 'enterprise')),
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_proxy ON encrypted_credentials(proxy_id);

-- Sticky Session Mappings Table
CREATE TABLE IF NOT EXISTS sticky_session_mappings (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  is_wildcard INTEGER DEFAULT 0,
  proxy_id TEXT NOT NULL,
  config_id TEXT,
  ttl_seconds INTEGER,
  expires_at DATETIME,
  request_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain, config_id),
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sticky_session_domain ON sticky_session_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_sticky_session_proxy ON sticky_session_mappings(proxy_id);
CREATE INDEX IF NOT EXISTS idx_sticky_session_config ON sticky_session_mappings(config_id);

-- Rotation Events Table
CREATE TABLE IF NOT EXISTS rotation_events (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  config_id TEXT,
  previous_proxy_id TEXT,
  new_proxy_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('scheduled', 'failure', 'rate_limit', 'geographic', 'manual', 'load_balance', 'health_check', 'session_expired', 'rule_triggered')),
  domain TEXT,
  url TEXT,
  tab_id TEXT,
  session_id TEXT,
  metadata TEXT,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rotation_events_timestamp ON rotation_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_rotation_events_config ON rotation_events(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_events_reason ON rotation_events(reason);

-- Rotation Rules Table
CREATE TABLE IF NOT EXISTS rotation_rules (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('domain', 'url_pattern', 'time_of_day', 'request_count', 'error_rate', 'latency', 'geographic', 'custom')),
  condition_value TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('rotate', 'stick', 'exclude', 'prefer', 'fallback')),
  action_value TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_rules_config ON rotation_rules(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_rules_condition ON rotation_rules(condition_type);

-- Creator Support History Table
CREATE TABLE IF NOT EXISTS creator_support_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('click', 'scroll', 'visit')),
  target_url TEXT,
  timestamp INTEGER NOT NULL,
  session_id TEXT,
  proxy_id INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  metadata TEXT,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_support_history_creator ON creator_support_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_support_history_timestamp ON creator_support_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_creator_support_history_action ON creator_support_history(action_type);

-- Execution Logs Table
CREATE TABLE IF NOT EXISTS execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('search', 'creator_support', 'scheduled')),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  keywords_processed INTEGER,
  results_found INTEGER,
  creators_visited INTEGER,
  proxy_rotations INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details TEXT,
  resource_usage TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_type ON execution_logs(execution_type);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_start_time ON execution_logs(start_time);

-- Circuit Breakers Table
CREATE TABLE IF NOT EXISTS circuit_breakers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('proxy', 'search', 'api', 'translation', 'external')),
  service_id TEXT,
  state TEXT NOT NULL DEFAULT 'CLOSED' CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  half_open_successes INTEGER DEFAULT 0,
  last_failure DATETIME,
  last_success DATETIME,
  last_state_change DATETIME,
  time_in_closed INTEGER DEFAULT 0,
  time_in_open INTEGER DEFAULT 0,
  time_in_half_open INTEGER DEFAULT 0,
  average_response_time REAL DEFAULT 0,
  config TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_circuit_breakers_service_type ON circuit_breakers(service_type);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_state ON circuit_breakers(state);
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_service_id ON circuit_breakers(service_id);

-- Views
CREATE VIEW IF NOT EXISTS v_proxy_current_stats AS
SELECT 
  proxy_id,
  SUM(total_requests) as total_requests,
  SUM(successful_requests) as successful_requests,
  SUM(failed_requests) as failed_requests,
  AVG(avg_latency_ms) as avg_latency_ms,
  SUM(bytes_sent) as bytes_sent,
  SUM(bytes_received) as bytes_received,
  SUM(rotation_count) as rotation_count
FROM proxy_usage_stats
WHERE time_bucket >= datetime('now', '-24 hours')
GROUP BY proxy_id;

CREATE VIEW IF NOT EXISTS v_rotation_configs_summary AS
SELECT 
  rc.id,
  rc.name,
  rc.strategy,
  rc.is_active,
  rc.enabled,
  rc.priority,
  rc.target_group,
  (SELECT COUNT(*) FROM rotation_rules WHERE config_id = rc.id) as rule_count,
  (SELECT COUNT(*) FROM rotation_events WHERE config_id = rc.id) as event_count,
  rc.created_at,
  rc.updated_at
FROM rotation_configs rc;
`;

/**
 * Creates an in-memory SQLite database with schema for testing
 */
export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  
  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON');
  
  // Execute schema
  db.exec(DATABASE_SCHEMA);
  
  return db;
}

/**
 * Seed data for testing proxies
 */
export interface TestProxyData {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status: string;
  weight?: number;
  rotationGroup?: string;
  region?: string;
}

export function seedTestProxies(db: Database.Database, proxies: TestProxyData[]): void {
  const stmt = db.prepare(`
    INSERT INTO proxies (id, name, host, port, protocol, status, weight, rotation_group, region)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const proxy of proxies) {
    stmt.run(
      proxy.id,
      proxy.name,
      proxy.host,
      proxy.port,
      proxy.protocol,
      proxy.status,
      proxy.weight ?? 1.0,
      proxy.rotationGroup ?? null,
      proxy.region ?? null
    );
  }
}

/**
 * Seed data for testing creators
 */
export interface TestCreatorData {
  id?: number;
  name: string;
  url: string;
  platform: string;
  enabled?: number;
}

export function seedTestCreators(db: Database.Database, creators: TestCreatorData[]): number[] {
  const stmt = db.prepare(`
    INSERT INTO creators (name, url, platform, enabled)
    VALUES (?, ?, ?, ?)
  `);
  
  const ids: number[] = [];
  for (const creator of creators) {
    const result = stmt.run(
      creator.name,
      creator.url,
      creator.platform,
      creator.enabled ?? 1
    );
    ids.push(Number(result.lastInsertRowid));
  }
  return ids;
}

/**
 * Default test proxies for consistent testing
 */
export const DEFAULT_TEST_PROXIES: TestProxyData[] = [
  {
    id: 'proxy-1',
    name: 'US Proxy 1',
    host: '192.168.1.1',
    port: 8080,
    protocol: 'http',
    status: 'active',
    weight: 10,
    rotationGroup: 'us-east',
    region: 'US'
  },
  {
    id: 'proxy-2',
    name: 'US Proxy 2',
    host: '192.168.1.2',
    port: 8080,
    protocol: 'http',
    status: 'active',
    weight: 20,
    rotationGroup: 'us-east',
    region: 'US'
  },
  {
    id: 'proxy-3',
    name: 'EU Proxy 1',
    host: '192.168.2.1',
    port: 8080,
    protocol: 'socks5',
    status: 'active',
    weight: 15,
    rotationGroup: 'eu-west',
    region: 'EU'
  },
  {
    id: 'proxy-4',
    name: 'Disabled Proxy',
    host: '192.168.3.1',
    port: 8080,
    protocol: 'http',
    status: 'disabled',
    weight: 5
  },
  {
    id: 'proxy-5',
    name: 'Failed Proxy',
    host: '192.168.4.1',
    port: 8080,
    protocol: 'http',
    status: 'failed',
    weight: 0
  }
];

/**
 * Default test creators for consistent testing
 */
export const DEFAULT_TEST_CREATORS: TestCreatorData[] = [
  {
    name: 'Test Creator 1',
    url: 'https://youtube.com/creator1',
    platform: 'youtube',
    enabled: 1
  },
  {
    name: 'Test Creator 2',
    url: 'https://twitch.tv/creator2',
    platform: 'twitch',
    enabled: 1
  },
  {
    name: 'Disabled Creator',
    url: 'https://youtube.com/disabled',
    platform: 'youtube',
    enabled: 0
  }
];

/**
 * Utility to wait for a specified time (for timestamp-based tests)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get current Unix timestamp
 */
export function getUnixTimestamp(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Get Unix timestamp for N hours ago
 */
export function getTimestampHoursAgo(hours: number): number {
  return getUnixTimestamp(new Date(Date.now() - hours * 60 * 60 * 1000));
}
