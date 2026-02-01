-- Rollback: 005_encrypt_proxy_passwords
-- WARNING: This rollback will NOT restore plaintext passwords (security by design)
-- Credentials remain encrypted in encrypted_credentials table

-- Remove credential_id column from proxies (SQLite requires table rebuild)
-- Note: In SQLite, we cannot simply DROP COLUMN, so we document this limitation

-- Drop the migration status tracking table
DROP TABLE IF EXISTS password_migration_status;

-- Drop the index
DROP INDEX IF EXISTS idx_proxies_credential_id;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '005';

-- NOTE: To fully rollback, you would need to:
-- 1. Create a new proxies table without credential_id
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table
-- This is intentionally NOT automated to prevent accidental data loss
