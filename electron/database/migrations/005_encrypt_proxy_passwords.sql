-- Migration: 005_encrypt_proxy_passwords
-- Description: Migrate plaintext proxy passwords to encrypted_credentials table
-- Created: 2025-01-27
-- Security: HIGH PRIORITY - Eliminates plaintext credential storage
-- Backwards Compatible: Yes (data migration with soft deprecation)

-- ============================================================
-- SECURITY MIGRATION: PROXY PASSWORD ENCRYPTION
-- ============================================================
-- This migration moves plaintext passwords from the proxies table
-- to the encrypted_credentials table using AES-256-GCM encryption.
--
-- The actual encryption is performed by the application layer
-- (EncryptionService) as SQLite cannot perform AES-GCM encryption.
-- This SQL file sets up the necessary schema changes and markers.
--
-- Migration Steps (performed by application):
-- 1. SELECT all proxies with non-null password
-- 2. For each proxy: encrypt password using EncryptionService
-- 3. INSERT encrypted data into encrypted_credentials table
-- 4. UPDATE proxies to add credential_id reference and NULL password
-- 5. Commit transaction (rollback on any failure)
-- ============================================================

-- Add credential_id column to proxies table for referencing encrypted credentials
-- This column will reference the encrypted_credentials table
ALTER TABLE proxies ADD COLUMN credential_id TEXT REFERENCES encrypted_credentials(id) ON DELETE SET NULL;

-- Create index for efficient credential lookups
CREATE INDEX IF NOT EXISTS idx_proxies_credential_id ON proxies(credential_id);

-- Create a migration marker table to track password migration status
-- This allows resumable migration in case of interruption
CREATE TABLE IF NOT EXISTS password_migration_status (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton row
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

-- ============================================================
-- RECORD MIGRATION
-- ============================================================
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('005', 'encrypt_proxy_passwords', 'security_migration');
