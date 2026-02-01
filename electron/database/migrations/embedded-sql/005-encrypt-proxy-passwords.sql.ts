/**
 * Migration 005: Encrypt Proxy Passwords
 * Embedded SQL for proxy password encryption migration
 * 
 * SECURITY: HIGH PRIORITY
 * Migrates plaintext passwords to encrypted_credentials table
 */

export const MIGRATION_005_SQL = `
-- Migration: 005_encrypt_proxy_passwords
-- Description: Migrate plaintext proxy passwords to encrypted_credentials table
-- Created: 2025-01-27
-- Security: HIGH PRIORITY - Eliminates plaintext credential storage

-- Create a migration marker table to track password migration status
CREATE TABLE IF NOT EXISTS password_migration_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at DATETIME,
  completed_at DATETIME,
  total_proxies INTEGER DEFAULT 0,
  migrated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  last_processed_proxy_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message TEXT
);

-- Initialize migration status (singleton pattern)
INSERT OR IGNORE INTO password_migration_status (id, status) VALUES (1, 'pending');

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('005', 'encrypt_proxy_passwords', 'security_migration');
`;
