-- Rollback Migration: 004_add_performance_indexes
-- Description: Remove performance indexes added in migration 004
-- Use: Apply this migration to rollback 004_add_performance_indexes
-- WARNING: This will impact query performance for affected queries

-- ============================================================
-- DROP INDEXES
-- ============================================================

-- 1. Remove search_tasks proxy_id index
DROP INDEX IF EXISTS idx_search_tasks_proxy_id;

-- 2. Remove proxy_usage_stats composite index
DROP INDEX IF EXISTS idx_proxy_usage_composite;

-- 3. Remove rotation_events composite index
DROP INDEX IF EXISTS idx_rotation_events_composite;

-- 4. Remove activity_logs composite index
DROP INDEX IF EXISTS idx_activity_logs_composite;

-- 5. Remove sticky_sessions domain lookup index
DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;

-- ============================================================
-- REMOVE MIGRATION RECORD
-- ============================================================
DELETE FROM schema_migrations WHERE version = '004';
