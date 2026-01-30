-- Migration: 001_proxy_rotation_system
-- Description: Add proxy rotation system tables and enhancements
-- Created: 2024
-- Backwards Compatible: Yes (additive changes only)

-- ============================================================
-- SCHEMA VERSION TRACKING
-- ============================================================
-- Create migrations table if not exists (for tracking applied migrations)
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT
);

-- ============================================================
-- 1. ALTER PROXIES TABLE - Add weight and rotation_group columns
-- ============================================================
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check pragmatically
-- These columns support weighted rotation and grouping proxies for rotation strategies

-- Add weight column (default 1.0 for equal weighting)
-- Higher weight = higher probability of selection in weighted strategy
ALTER TABLE proxies ADD COLUMN weight REAL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 100);

-- Add rotation_group column for organizing proxies into logical groups
-- Groups can be used for geographic regions, tiers (premium/standard), or custom groupings
ALTER TABLE proxies ADD COLUMN rotation_group TEXT;

-- Add index for rotation_group lookups (used in group-based selection)
CREATE INDEX IF NOT EXISTS idx_proxies_rotation_group ON proxies(rotation_group);

-- Add composite index for weighted selection queries
CREATE INDEX IF NOT EXISTS idx_proxies_status_weight ON proxies(status, weight DESC);

-- ============================================================
-- 2. ROTATION_CONFIGS TABLE
-- Stores persistent rotation strategy configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS rotation_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Strategy type: geographic, sticky-session, time-based, custom, round-robin, random, etc.
  strategy TEXT NOT NULL CHECK (strategy IN (
    'round-robin', 'random', 'least-used', 'fastest', 
    'sticky-session', 'geographic', 'failure-aware', 
    'time-based', 'weighted', 'custom'
  )),
  
  -- Is this the currently active configuration?
  is_active INTEGER DEFAULT 0,
  
  -- Common rotation settings (stored as JSON for flexibility)
  -- Contains: interval, maxRequestsPerProxy, failureThreshold, cooldownPeriod
  common_config TEXT DEFAULT '{}',
  
  -- Strategy-specific configuration (JSON)
  -- Geographic: { geographicPreferences, excludeCountries, preferredRegions }
  -- Sticky-session: { stickySessionTTL, stickyHashAlgorithm, stickyFallbackOnFailure }
  -- Time-based: { jitterPercent, minInterval, maxInterval, rotateOnFailure, scheduleWindows }
  -- Weighted: { weights }
  -- Custom: { rules }
  strategy_config TEXT DEFAULT '{}',
  
  -- Proxy group this config applies to (NULL = all proxies)
  target_group TEXT,
  
  -- Priority for config selection (higher = preferred)
  priority INTEGER DEFAULT 0,
  
  -- Enable/disable without deleting
  enabled INTEGER DEFAULT 1,
  
  -- Audit fields
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  
  -- Ensure only one active config per group (or global)
  UNIQUE(is_active, target_group) -- SQLite treats NULL as distinct, so this works for our case
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rotation_configs_strategy ON rotation_configs(strategy);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_active ON rotation_configs(is_active) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_rotation_configs_enabled ON rotation_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_rotation_configs_target_group ON rotation_configs(target_group);

-- ============================================================
-- 3. PROXY_USAGE_STATS TABLE
-- Analytics and usage tracking for proxy rotation
-- ============================================================
CREATE TABLE IF NOT EXISTS proxy_usage_stats (
  id TEXT PRIMARY KEY,
  proxy_id TEXT NOT NULL,
  
  -- Time bucket for aggregation (hourly granularity)
  time_bucket DATETIME NOT NULL,
  
  -- Request statistics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_latency_ms REAL,
  min_latency_ms REAL,
  max_latency_ms REAL,
  p95_latency_ms REAL,
  
  -- Bandwidth tracking (bytes)
  bytes_sent INTEGER DEFAULT 0,
  bytes_received INTEGER DEFAULT 0,
  
  -- Rotation events
  rotation_count INTEGER DEFAULT 0,
  rotation_reasons TEXT, -- JSON array of rotation reasons
  
  -- Error tracking
  error_counts TEXT, -- JSON: { "timeout": 5, "connection_refused": 2, ... }
  last_error TEXT,
  last_error_at DATETIME,
  
  -- Geographic distribution (for analytics)
  target_countries TEXT, -- JSON array of countries accessed via this proxy
  
  -- Session info
  unique_domains INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint for time-series data
  UNIQUE(proxy_id, time_bucket),
  
  -- Foreign key with cascade delete (stats removed when proxy deleted)
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

-- Indexes optimized for analytics queries
-- BRIN-like index simulation for time-series (SQLite uses B-tree, but ordered by time_bucket)
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_time ON proxy_usage_stats(time_bucket DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy ON proxy_usage_stats(proxy_id);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_proxy_time ON proxy_usage_stats(proxy_id, time_bucket DESC);

-- Composite index for common analytics queries (success rate calculation)
CREATE INDEX IF NOT EXISTS idx_proxy_usage_stats_requests ON proxy_usage_stats(proxy_id, total_requests, successful_requests);

-- ============================================================
-- 4. ENCRYPTED_CREDENTIALS TABLE
-- Secure storage for proxy authentication credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS encrypted_credentials (
  id TEXT PRIMARY KEY,
  
  -- Reference to proxy (nullable for shared/pool credentials)
  proxy_id TEXT,
  
  -- Credential identification
  credential_name TEXT NOT NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'proxy_auth',      -- Proxy username/password
    'api_key',         -- API key for proxy provider
    'oauth_token',     -- OAuth tokens
    'certificate',     -- Client certificates
    'ssh_key'          -- SSH keys for SOCKS proxies
  )),
  
  -- Encrypted data (using application-level encryption)
  -- Format: base64(iv:encrypted_data:auth_tag) for AES-256-GCM
  encrypted_username TEXT,
  encrypted_password TEXT,
  encrypted_data TEXT, -- For additional credential data (tokens, certs, etc.)
  
  -- Encryption metadata
  encryption_version INTEGER DEFAULT 1, -- For key rotation support
  key_id TEXT, -- Reference to encryption key used
  algorithm TEXT DEFAULT 'aes-256-gcm',
  
  -- Credential metadata (unencrypted)
  provider TEXT, -- Proxy provider name
  expires_at DATETIME, -- For tokens with expiration
  last_rotated_at DATETIME,
  rotation_required INTEGER DEFAULT 0,
  
  -- Access control
  access_level TEXT DEFAULT 'private' CHECK (access_level IN ('private', 'shared', 'admin')),
  
  -- Audit fields
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at DATETIME,
  access_count INTEGER DEFAULT 0,
  
  -- Foreign key (nullable for shared credentials)
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE
);

-- Indexes for credential lookups
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_proxy ON encrypted_credentials(proxy_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_type ON encrypted_credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_provider ON encrypted_credentials(provider);
CREATE INDEX IF NOT EXISTS idx_encrypted_credentials_expires ON encrypted_credentials(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================
-- 5. STICKY_SESSION_MAPPINGS TABLE
-- Persistent domain-to-proxy mappings for sticky-session strategy
-- ============================================================
CREATE TABLE IF NOT EXISTS sticky_session_mappings (
  id TEXT PRIMARY KEY,
  
  -- Domain pattern (can include wildcards like *.example.com)
  domain TEXT NOT NULL,
  is_wildcard INTEGER DEFAULT 0,
  
  -- Assigned proxy
  proxy_id TEXT NOT NULL,
  
  -- Session configuration
  config_id TEXT, -- Reference to rotation config
  ttl_seconds INTEGER, -- Time-to-live for this mapping
  expires_at DATETIME,
  
  -- Usage tracking
  request_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique domain mapping per config
  UNIQUE(domain, config_id),
  
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE CASCADE,
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sticky_mappings_domain ON sticky_session_mappings(domain);
CREATE INDEX IF NOT EXISTS idx_sticky_mappings_proxy ON sticky_session_mappings(proxy_id);
CREATE INDEX IF NOT EXISTS idx_sticky_mappings_expires ON sticky_session_mappings(expires_at);

-- ============================================================
-- 6. PROXY_ROTATION_RULES TABLE
-- Custom rules for rule-based proxy rotation
-- ============================================================
CREATE TABLE IF NOT EXISTS proxy_rotation_rules (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL, -- Parent rotation config
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rule priority (higher = evaluated first)
  priority INTEGER DEFAULT 0,
  
  -- Rule conditions (JSON array of RuleCondition objects)
  -- Format: [{ "field": "domain", "operator": "contains", "value": "google" }]
  conditions TEXT NOT NULL DEFAULT '[]',
  
  -- Logic for combining conditions
  condition_logic TEXT DEFAULT 'AND' CHECK (condition_logic IN ('AND', 'OR')),
  
  -- Actions to execute when rule matches (JSON array of RuleActionConfig)
  -- Format: [{ "action": "use_country", "params": { "country": "US" }}]
  actions TEXT NOT NULL DEFAULT '[]',
  
  -- Stop evaluating further rules if this one matches
  stop_on_match INTEGER DEFAULT 1,
  
  -- Enable/disable
  enabled INTEGER DEFAULT 1,
  
  -- Audit
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rotation_rules_config ON proxy_rotation_rules(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_rules_priority ON proxy_rotation_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_rules_enabled ON proxy_rotation_rules(enabled);

-- ============================================================
-- 7. ROTATION_EVENTS TABLE
-- Audit log for rotation events
-- ============================================================
CREATE TABLE IF NOT EXISTS rotation_events (
  id TEXT PRIMARY KEY,
  
  -- Event details
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  config_id TEXT,
  
  -- Rotation info
  previous_proxy_id TEXT,
  new_proxy_id TEXT,
  
  -- Reason for rotation
  reason TEXT NOT NULL CHECK (reason IN (
    'scheduled',      -- Regular interval rotation
    'failure',        -- Proxy failed health check
    'manual',         -- User-initiated rotation
    'startup',        -- Initial proxy selection
    'rule_triggered', -- Custom rule triggered rotation
    'ttl_expired',    -- Sticky session TTL expired
    'cooldown'        -- Proxy entered cooldown period
  )),
  
  -- Context
  domain TEXT,
  url TEXT,
  tab_id TEXT,
  session_id TEXT,
  
  -- Additional metadata
  metadata TEXT, -- JSON for extra context
  
  FOREIGN KEY (config_id) REFERENCES rotation_configs(id) ON DELETE SET NULL,
  FOREIGN KEY (previous_proxy_id) REFERENCES proxies(id) ON DELETE SET NULL,
  FOREIGN KEY (new_proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rotation_events_timestamp ON rotation_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rotation_events_config ON rotation_events(config_id);
CREATE INDEX IF NOT EXISTS idx_rotation_events_reason ON rotation_events(reason);

-- ============================================================
-- 8. HELPER VIEWS
-- ============================================================

-- View: Active proxies with their current stats (last 24 hours)
CREATE VIEW IF NOT EXISTS v_proxy_current_stats AS
SELECT 
  p.id,
  p.name,
  p.host,
  p.port,
  p.protocol,
  p.status,
  p.weight,
  p.rotation_group,
  p.region,
  p.latency,
  p.success_rate,
  COALESCE(SUM(s.total_requests), 0) as requests_24h,
  COALESCE(SUM(s.successful_requests), 0) as success_24h,
  COALESCE(AVG(s.avg_latency_ms), p.latency) as avg_latency_24h,
  COALESCE(SUM(s.rotation_count), 0) as rotations_24h
FROM proxies p
LEFT JOIN proxy_usage_stats s ON p.id = s.proxy_id 
  AND s.time_bucket >= datetime('now', '-24 hours')
GROUP BY p.id;

-- View: Rotation config with rule count
CREATE VIEW IF NOT EXISTS v_rotation_configs_summary AS
SELECT 
  rc.id,
  rc.name,
  rc.strategy,
  rc.is_active,
  rc.enabled,
  rc.target_group,
  rc.priority,
  COUNT(DISTINCT prr.id) as rule_count,
  COUNT(DISTINCT ssm.id) as sticky_mapping_count,
  rc.created_at,
  rc.updated_at
FROM rotation_configs rc
LEFT JOIN proxy_rotation_rules prr ON rc.id = prr.config_id
LEFT JOIN sticky_session_mappings ssm ON rc.id = ssm.config_id
GROUP BY rc.id;

-- ============================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================================

-- Trigger: Update rotation_configs.updated_at
CREATE TRIGGER IF NOT EXISTS trg_rotation_configs_updated_at
AFTER UPDATE ON rotation_configs
FOR EACH ROW
BEGIN
  UPDATE rotation_configs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Update proxy_usage_stats.updated_at
CREATE TRIGGER IF NOT EXISTS trg_proxy_usage_stats_updated_at
AFTER UPDATE ON proxy_usage_stats
FOR EACH ROW
BEGIN
  UPDATE proxy_usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Update encrypted_credentials.updated_at and last_accessed_at
CREATE TRIGGER IF NOT EXISTS trg_encrypted_credentials_updated_at
AFTER UPDATE ON encrypted_credentials
FOR EACH ROW
BEGIN
  UPDATE encrypted_credentials SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Update sticky_session_mappings.updated_at
CREATE TRIGGER IF NOT EXISTS trg_sticky_mappings_updated_at
AFTER UPDATE ON sticky_session_mappings
FOR EACH ROW
BEGIN
  UPDATE sticky_session_mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Update proxy_rotation_rules.updated_at
CREATE TRIGGER IF NOT EXISTS trg_rotation_rules_updated_at
AFTER UPDATE ON proxy_rotation_rules
FOR EACH ROW
BEGIN
  UPDATE proxy_rotation_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger: Ensure only one active rotation config per target_group
CREATE TRIGGER IF NOT EXISTS trg_rotation_configs_single_active
BEFORE UPDATE OF is_active ON rotation_configs
WHEN NEW.is_active = 1
BEGIN
  UPDATE rotation_configs 
  SET is_active = 0 
  WHERE is_active = 1 
    AND id != NEW.id 
    AND (target_group = NEW.target_group OR (target_group IS NULL AND NEW.target_group IS NULL));
END;

-- ============================================================
-- 10. RECORD MIGRATION
-- ============================================================
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('001', 'proxy_rotation_system', 'initial');
