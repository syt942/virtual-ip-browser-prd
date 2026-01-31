-- Migration: 004_add_performance_indexes
-- Description: Add missing indexes for query performance optimization
-- Created: 2024
-- Backwards Compatible: Yes (additive changes only)

-- ============================================================
-- PERFORMANCE INDEXES
-- These indexes address identified query performance bottlenecks
-- ============================================================

-- 1. Index on search_tasks(proxy_id)
-- Improves: JOIN queries between search_tasks and proxies
-- Use case: Finding all search tasks for a specific proxy
CREATE INDEX IF NOT EXISTS idx_search_tasks_proxy_id 
  ON search_tasks(proxy_id);

-- 2. Composite index on proxy_usage_stats(proxy_id, timestamp)
-- Improves: Time-range queries filtered by proxy
-- Use case: Analytics dashboards, usage reports
-- Note: Replaces separate indexes for better composite query performance
CREATE INDEX IF NOT EXISTS idx_proxy_usage_composite 
  ON proxy_usage_stats(proxy_id, time_bucket);

-- 3. Composite index on rotation_events(config_id, timestamp)
-- Improves: Fetching rotation history for a specific config
-- Use case: Config performance analysis, audit logs
CREATE INDEX IF NOT EXISTS idx_rotation_events_composite 
  ON rotation_events(config_id, timestamp DESC);

-- 4. Composite index on activity_logs(session_id, timestamp)
-- Improves: Session-based log queries with time filtering
-- Use case: Session debugging, activity timeline views
CREATE INDEX IF NOT EXISTS idx_activity_logs_composite 
  ON activity_logs(session_id, timestamp DESC);

-- 5. Index on sticky_session_mappings(domain) for pattern matching
-- Note: The table uses 'domain' column, not 'domain_pattern'
-- Improves: Domain lookup queries in sticky session strategy
-- Use case: Fast domain-to-proxy resolution
-- Already exists as idx_sticky_mappings_domain, adding covering index
CREATE INDEX IF NOT EXISTS idx_sticky_sessions_domain_lookup 
  ON sticky_session_mappings(domain, proxy_id, expires_at);

-- ============================================================
-- RECORD MIGRATION
-- ============================================================
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('004', 'add_performance_indexes', 'initial');
