/**
 * Migration 001: Proxy Rotation System
 * SQL for adding proxy rotation system tables and enhancements
 */

export const MIGRATION_001_SQL = `
-- Migration: 001_proxy_rotation_system
-- Description: Add proxy rotation system tables and enhancements

-- Create migrations table if not exists
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT
);

-- Add weight column to proxies
ALTER TABLE proxies ADD COLUMN weight REAL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 100);

-- Add rotation_group column to proxies
ALTER TABLE proxies ADD COLUMN rotation_group TEXT;

CREATE INDEX IF NOT EXISTS idx_proxies_rotation_group ON proxies(rotation_group);
CREATE INDEX IF NOT EXISTS idx_proxies_status_weight ON proxies(status, weight DESC);

-- ROTATION_CONFIGS TABLE
CREATE TABLE IF NOT EXISTS rotation_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  strategy TEXT NOT NULL CHECK (strategy IN (
    'round-robin', 'random', 'least-used', 'fastest', 
    'sticky-session', 'geographic', 'failure-aware', 
    'time-based', 'weighted', 'custom'
  )),
  is_active INTEGER DEFAULT 0,
  common_config TEXT DEFAULT '{}',
  strategy_config TEXT DEFAULT '{}',
  target_group TEXT,
  priority INTEGER DEFAULT 0,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  UNIQUE(is_active, target_group)
);

CREATE INDEX IF NOT EXISTS idx_rotation_configs_strategy ON rotation_configs(strategy);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_active ON rotation_configs(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_rotation_configs_enabled ON rotation_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_target_group ON rotation_configs(target_group);

-- PROXY_USAGE_STATS TABLE
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
  UNIQUE(proxy_id, time_bucket),
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_time ON proxy_usage_stats(time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy ON proxy_usage_stats(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy_time ON proxy_usage_stats(proxy_id, time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_requests ON proxy_usage_stats(proxy_id, total_requests, successful_requests);

-- ENCRYPTED_CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS encrypted_credentials (
  id TEXT PRIMARY KEY,
  proxy_id TEXT,
  credential_name TEXT NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'proxy_auth', 'api_key', 'oauth_token', 'certificate', 'ssh_key'
  )),
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
  access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME,
  access_count INTEGER DEFAULT 0,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_proxy ON encrypted_credentials(proxy_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_type ON encrypted_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_provider ON encrypted_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_expires ON encrypted_credentials(expires_at) WHERE expires_at IS NOT NULL;

-- STICKY_SESSION_MAPPINGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_sticky_mappings_domain ON sticky_session_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_sticky_mappings_proxy ON sticky_session_mappings(proxy_id);
CREATE INDEX IF NOT EXISTS idx_sticky_mappings_expires ON sticky_session_mappings(expires_at);

-- PROXY_ROTATION_RULES TABLE
CREATE TABLE IF NOT EXISTS proxy_rotation_rules (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  conditions TEXT NOT NULL DEFAULT '[]',
  condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
  actions TEXT NOT NULL DEFAULT '[]',
  stop_on_match INTEGER DEFAULT 1,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_rules_config ON proxy_rotation_rules(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_rules_priority ON proxy_rotation_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_rules_enabled ON proxy_rotation_rules(enabled);

-- ROTATION_EVENTS TABLE
CREATE TABLE IF NOT EXISTS rotation_events (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  config_id TEXT,
  previous_proxy_id TEXT,
  new_proxy_id TEXT,
  reason TEXT NOT NULL CHECK (reason IN (
    'scheduled', 'failure', 'manual', 'startup', 'rule_triggered', 'ttl_expired', 'cooldown'
  )),
  domain TEXT,
  url TEXT,
  tab_id TEXT,
  session_id TEXT,
  metadata TEXT,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE SET NULL,
  FOREIGN KEY (previous_proxy_id) REFERENCES proxies(id) ON DELETE SET NULL,
  FOREIGN KEY (new_proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rotation_events_timestamp ON rotation_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_events_config ON rotation_events(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_events_reason ON rotation_events(reason);

-- HELPER VIEWS
CREATE VIEW IF NOT EXISTS v_proxy_current_stats AS
SELECT 
  p.id, p.name, p.host, p.port, p.protocol, p.status, p.weight,
  p.rotation_group, p.region, p.latency, p.success_rate,
  COALESCE(SUM(s.total_requests), 0) as requests_24h,
  COALESCE(SUM(s.successful_requests), 0) as success_24h,
  COALESCE(AVG(s.avg_latency_ms), p.latency) as avg_latency_24h,
  COALESCE(SUM(s.rotation_count), 0) as rotations_24h
FROM proxies p
LEFT JOIN proxy_usage_stats s ON p.id = s.proxy_id 
  AND s.time_bucket >= datetime('now', '-24 hours')
GROUP BY p.id;

CREATE VIEW IF NOT EXISTS v_rotation_configs_summary AS
SELECT 
  rc.id, rc.name, rc.strategy, rc.is_active, rc.enabled,
  rc.target_group, rc.priority,
  COUNT(DISTINCT prr.id) as rule_count,
  COUNT(DISTINCT ssm.id) as sticky_mapping_count,
  rc.created_at, rc.updated_at
FROM rotation_configs rc
LEFT JOIN proxy_rotation_rules prr ON rc.id = prr.config_id
LEFT JOIN sticky_session_mappings ssm ON rc.id = ssm.config_id
GROUP BY rc.id;

-- TRIGGERS
CREATE TRIGGER IF NOT EXISTS trg_rotation_configs_updated_at
AFTER UPDATE ON rotation_configs FOR EACH ROW
BEGIN UPDATE rotation_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_proxy_usage_stats_updated_at
AFTER UPDATE ON proxy_usage_stats FOR EACH ROW
BEGIN UPDATE proxy_usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_encrypted_credentials_updated_at
AFTER UPDATE ON encrypted_credentials FOR EACH ROW
BEGIN UPDATE encrypted_credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_sticky_mappings_updated_at
AFTER UPDATE ON sticky_session_mappings FOR EACH ROW
BEGIN UPDATE sticky_session_mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_rotation_rules_updated_at
AFTER UPDATE ON proxy_rotation_rules FOR EACH ROW
BEGIN UPDATE proxy_rotation_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; END;

CREATE TRIGGER IF NOT EXISTS trg_rotation_configs_single_active
BEFORE UPDATE OF is_active ON rotation_configs WHEN NEW.is_active = 1
BEGIN
  UPDATE rotation_configs SET is_active = 0 
  WHERE is_active = 1 AND id != NEW.id 
    AND (target_group = NEW.target_group OR (target_group IS NULL AND NEW.target_group IS NULL));
END;

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('001', 'proxy_rotation_system', 'initial');
`;
