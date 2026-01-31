/**
 * Migration 004: Performance Indexes
 * SQL for adding missing indexes to improve query performance
 */

export const MIGRATION_004_SQL = `
-- Migration: 004_add_performance_indexes
-- Description: Add missing indexes for query performance optimization

-- 1. Index on search_tasks(proxy_id)
-- Improves: JOIN queries between search_tasks and proxies
CREATE INDEX IF NOT EXISTS idx_search_tasks_proxy_id 
  ON search_tasks(proxy_id);

-- 2. Composite index on proxy_usage_stats(proxy_id, timestamp)
-- Improves: Time-range queries filtered by proxy
CREATE INDEX IF NOT EXISTS idx_proxy_usage_composite 
  ON proxy_usage_stats(proxy_id, time_bucket);

-- 3. Composite index on rotation_events(config_id, timestamp)
-- Improves: Fetching rotation history for a specific config
CREATE INDEX IF NOT EXISTS idx_rotation_events_composite 
  ON rotation_events(config_id, timestamp DESC);

-- 4. Composite index on activity_logs(session_id, timestamp)
-- Improves: Session-based log queries with time filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_composite 
  ON activity_logs(session_id, timestamp DESC);

-- 5. Covering index on sticky_session_mappings for domain lookup
-- Improves: Domain-to-proxy resolution queries
CREATE INDEX IF NOT EXISTS idx_sticky_sessions_domain_lookup 
  ON sticky_session_mappings(domain, proxy_id, expires_at);

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('004', 'add_performance_indexes', 'initial');
`;
