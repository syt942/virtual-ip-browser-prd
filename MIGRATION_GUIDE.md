# Virtual IP Browser v1.3.0 Migration Guide

**From:** v1.2.1  
**To:** v1.3.0  
**Migration Type:** Automatic with manual fallback

---

## Table of Contents

1. [Overview](#overview)
2. [Automatic Migration](#automatic-migration)
3. [Encryption Key Migration](#encryption-key-migration)
4. [Database Migration 004](#database-migration-004)
5. [Breaking Changes](#breaking-changes)
6. [Rollback Procedure](#rollback-procedure)
7. [Troubleshooting](#troubleshooting)
8. [Verification Steps](#verification-steps)

---

## Overview

Virtual IP Browser v1.3.0 includes automatic migration for:

| Migration | Description | Impact |
|-----------|-------------|--------|
| Encryption Key | Migrates from static to OS-protected key | **Security Critical** |
| Database 004 | Adds performance indexes | Performance improvement |
| Config Schema | Updates configuration format | Transparent |

**Important:** Back up your data before upgrading. While migrations are designed to be safe, backups ensure you can recover if anything goes wrong.

### Backup Your Data

```bash
# Create a backup of your configuration
cp -r ~/.config/virtual-ip-browser ~/.config/virtual-ip-browser-backup-v1.2.1

# Verify backup
ls -la ~/.config/virtual-ip-browser-backup-v1.2.1/
```

---

## Automatic Migration

### What Happens on First Launch

When you first launch v1.3.0, the following migrations occur automatically:

1. **Detection Phase** (~1 second)
   - Application detects v1.2.1 configuration
   - Checks for existing encryption key
   - Verifies database schema version

2. **Encryption Migration** (~2-3 seconds)
   - Legacy encryption key is decrypted using old method
   - Key is re-encrypted using OS keychain
   - Backup of legacy key is created
   - Legacy key storage is cleared

3. **Database Migration** (~2-5 seconds)
   - Migration 004 is applied
   - Performance indexes are created
   - ANALYZE is run on affected tables
   - Migration is recorded in schema_migrations

4. **Verification** (~1 second)
   - All credentials are tested for accessibility
   - Database integrity is verified
   - Migration status is logged

### Migration Log

Migration progress is logged to:
```
~/.config/virtual-ip-browser/migration.log
```

Example successful migration log:
```
[2025-01-XX 10:00:00] Migration started: v1.2.1 → v1.3.0
[2025-01-XX 10:00:01] Encryption: Detected legacy key format
[2025-01-XX 10:00:02] Encryption: OS keychain available (gnome_libsecret)
[2025-01-XX 10:00:03] Encryption: Key migrated successfully
[2025-01-XX 10:00:03] Encryption: Backup created at secure-config-backup
[2025-01-XX 10:00:03] Database: Running migration 004
[2025-01-XX 10:00:05] Database: Created 5 indexes
[2025-01-XX 10:00:06] Database: ANALYZE completed
[2025-01-XX 10:00:06] Verification: All checks passed
[2025-01-XX 10:00:06] Migration completed successfully
```

---

## Encryption Key Migration

### Background

In v1.2.1, the encryption key was derived from a static string:
```typescript
// OLD (v1.2.1) - INSECURE
storeEncryptionKey = 'vip-browser-config-encryption-key-v1'
```

In v1.3.0, the encryption key is protected by the OS:
```typescript
// NEW (v1.3.0) - SECURE
// Uses Electron safeStorage API → OS Keychain
```

### Platform-Specific Key Storage

| Platform | Backend | Location |
|----------|---------|----------|
| Windows | DPAPI | Windows Credential Manager |
| macOS | Keychain | macOS Keychain Access |
| Linux (GNOME) | Secret Service | GNOME Keyring |
| Linux (KDE) | Secret Service | KWallet |
| Linux (Other) | Fallback | Machine-derived key |

### Migration Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION MIGRATION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Detect Legacy Key                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Check for 'masterKeyLegacy' in electron-store              │ │
│  │ Validate key format (64 hex characters)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  Step 2: Initialize Safe Storage                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Check safeStorage.isEncryptionAvailable()                  │ │
│  │ Determine storage backend                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  Step 3: Migrate Key                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Encrypt legacy key with safeStorage                        │ │
│  │ Store in new format with version tag                       │ │
│  │ Create backup of legacy key                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  Step 4: Verify & Cleanup                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Decrypt and verify new key matches original                │ │
│  │ Test credential decryption                                 │ │
│  │ Delete legacy key storage                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Linux Requirements

For full encryption support on Linux, you need a Secret Service implementation:

**GNOME-based (Ubuntu, Fedora GNOME):**
```bash
# Usually pre-installed, but verify:
sudo apt install gnome-keyring  # Debian/Ubuntu
sudo dnf install gnome-keyring  # Fedora
```

**KDE-based (Kubuntu, Fedora KDE):**
```bash
sudo apt install kwalletmanager  # Debian/Ubuntu
sudo dnf install kwalletmanager  # Fedora
```

**Headless/Server:**
```bash
# Install and configure gnome-keyring for headless use
sudo apt install gnome-keyring libsecret-1-0

# Start the keyring daemon
eval $(gnome-keyring-daemon --start --components=secrets)
export GNOME_KEYRING_CONTROL
```

### Fallback Mode

If no Secret Service is available, v1.3.0 uses a machine-derived fallback key:

```typescript
// Fallback key derivation (simplified)
const machineId = getMachineId();  // Hardware-based ID
const fallbackKey = deriveKey(machineId, 'vip-browser-v1.3');
```

**Note:** The fallback is more secure than v1.2.1's static key, but less secure than OS keychain. We recommend installing a Secret Service implementation.

---

## Database Migration 004

### What's Added

Migration 004 creates the following indexes for performance optimization:

```sql
-- 1. Search tasks proxy lookup
CREATE INDEX idx_search_tasks_proxy_id ON search_tasks(proxy_id);

-- 2. Proxy usage time-series queries
CREATE INDEX idx_proxy_usage_composite ON proxy_usage_stats(proxy_id, time_bucket);

-- 3. Rotation event history
CREATE INDEX idx_rotation_events_composite ON rotation_events(config_id, timestamp DESC);

-- 4. Activity log queries
CREATE INDEX idx_activity_logs_composite ON activity_logs(session_id, timestamp DESC);

-- 5. Sticky session domain lookup
CREATE INDEX idx_sticky_sessions_domain_lookup ON sticky_session_mappings(domain, proxy_id, expires_at);
```

### Performance Impact

| Query | Before (ms) | After (ms) | Improvement |
|-------|-------------|------------|-------------|
| Get proxy usage stats | 85 | 10 | 8.54x |
| List rotation events | 120 | 15 | 8.0x |
| Filter activity logs | 95 | 12 | 7.9x |
| Resolve sticky session | 45 | 8 | 5.6x |
| Search task by proxy | 60 | 9 | 6.7x |

### Migration Duration

The migration duration depends on your data size:

| Database Size | Records | Duration |
|---------------|---------|----------|
| Small | < 10,000 | ~2 seconds |
| Medium | 10,000 - 100,000 | ~5 seconds |
| Large | > 100,000 | ~15 seconds |

### Verification

After migration, verify indexes exist:

```bash
# Open SQLite database
sqlite3 ~/.config/virtual-ip-browser/browser.db

# List indexes
.indexes

# Verify specific index
SELECT * FROM sqlite_master WHERE type='index' AND name='idx_proxy_usage_composite';
```

---

## Breaking Changes

### API Changes

**None.** All public APIs remain backward compatible.

### Configuration Changes

| Setting | v1.2.1 | v1.3.0 | Migration |
|---------|--------|--------|-----------|
| `masterKey` | Plaintext in store | Encrypted in OS keychain | Automatic |
| `encryptionVersion` | N/A | Added (value: 2) | Automatic |
| `migratedAt` | N/A | Added (timestamp) | Automatic |

### File Location Changes

| File | v1.2.1 | v1.3.0 |
|------|--------|--------|
| Config store | `secure-config.json` | `secure-config.json` (unchanged) |
| Key backup | N/A | `secure-config-backup.json` (new) |
| Migration log | N/A | `migration.log` (new) |

---

## Rollback Procedure

### Before Rollback

1. **Understand the implications:**
   - Rolling back loses v1.3.0 security improvements
   - Database indexes will remain (harmless)
   - Encryption key format must be manually reverted

2. **Only rollback if:**
   - Migration failed and data is inaccessible
   - Critical bug in v1.3.0 affecting your workflow
   - Directed by support team

### Rollback Steps

**Step 1: Stop the application**
```bash
pkill virtual-ip-browser
```

**Step 2: Restore backup**
```bash
# Restore configuration backup
cp -r ~/.config/virtual-ip-browser-backup-v1.2.1/* ~/.config/virtual-ip-browser/
```

**Step 3: Reinstall v1.2.1**
```bash
# Download v1.2.1
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb

# Downgrade
sudo apt install ./virtual-ip-browser_1.2.1_amd64.deb --allow-downgrades
```

**Step 4: Verify**
```bash
virtual-ip-browser --version
# Should show: 1.2.1
```

### Database Rollback (Optional)

If you need to remove the indexes (not recommended):

```bash
sqlite3 ~/.config/virtual-ip-browser/browser.db

-- Remove indexes
DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
DROP INDEX IF EXISTS idx_proxy_usage_composite;
DROP INDEX IF EXISTS idx_rotation_events_composite;
DROP INDEX IF EXISTS idx_activity_logs_composite;
DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '004';
```

---

## Troubleshooting

### Migration Fails to Start

**Symptom:** Application starts but migration doesn't run

**Solution:**
```bash
# Check migration status
cat ~/.config/virtual-ip-browser/migration.log

# Force migration
virtual-ip-browser --force-migrate
```

### Encryption Key Migration Fails

**Symptom:** "Failed to migrate encryption key" error

**Causes & Solutions:**

1. **No Secret Service available (Linux)**
   ```bash
   # Install gnome-keyring
   sudo apt install gnome-keyring
   
   # Start keyring daemon
   gnome-keyring-daemon --start --components=secrets
   ```

2. **Keyring locked**
   ```bash
   # Unlock keyring
   gnome-keyring-daemon --unlock
   ```

3. **Corrupted legacy key**
   ```bash
   # Check legacy key format
   cat ~/.config/virtual-ip-browser/secure-config.json | jq '.masterKeyLegacy'
   
   # If corrupted, restore from backup or generate new
   ```

### Database Migration Fails

**Symptom:** "Migration 004 failed" error

**Solutions:**

1. **Disk full**
   ```bash
   df -h ~/.config/virtual-ip-browser/
   # Free up space if needed
   ```

2. **Database locked**
   ```bash
   # Stop all instances
   pkill -9 virtual-ip-browser
   
   # Remove lock file
   rm ~/.config/virtual-ip-browser/browser.db-wal
   rm ~/.config/virtual-ip-browser/browser.db-shm
   ```

3. **Corrupted database**
   ```bash
   # Check integrity
   sqlite3 ~/.config/virtual-ip-browser/browser.db "PRAGMA integrity_check;"
   
   # If corrupted, restore from backup
   ```

### Credentials Not Accessible

**Symptom:** "Failed to decrypt credentials" after migration

**Solution:**
```bash
# Check if backup exists
ls ~/.config/virtual-ip-browser/secure-config-backup.json

# Restore from backup
cp ~/.config/virtual-ip-browser/secure-config-backup.json \
   ~/.config/virtual-ip-browser/secure-config.json

# Re-run migration
virtual-ip-browser --force-migrate
```

### Performance Not Improved

**Symptom:** Queries still slow after migration

**Solution:**
```bash
# Manually run ANALYZE
sqlite3 ~/.config/virtual-ip-browser/browser.db "ANALYZE;"

# Verify indexes exist
sqlite3 ~/.config/virtual-ip-browser/browser.db ".indexes"
```

---

## Verification Steps

### Post-Migration Checklist

Run through this checklist after upgrading:

- [ ] Application starts without errors
- [ ] Migration log shows "completed successfully"
- [ ] Existing proxies are listed
- [ ] Proxy credentials work (test connection)
- [ ] Automation tasks are preserved
- [ ] Privacy settings are maintained
- [ ] Database queries feel faster
- [ ] No errors in application logs

### Automated Verification

```bash
# Run built-in verification
virtual-ip-browser --verify-migration

# Expected output:
# ✓ Encryption: Key accessible
# ✓ Encryption: Credentials decryptable
# ✓ Database: Schema version 004
# ✓ Database: All indexes present
# ✓ Config: Migration flag set
# Migration verification: PASSED
```

### Manual Verification

**Check encryption:**
```bash
# Verify key is in OS keychain (Linux with Secret Service)
secret-tool search xdg:schema org.freedesktop.Secret.Generic
```

**Check database:**
```bash
sqlite3 ~/.config/virtual-ip-browser/browser.db

-- Check schema version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;
-- Should show version '004'

-- Verify indexes
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
-- Should list 5+ indexes
```

---

## Support

If you encounter issues not covered here:

1. **Check logs:** `~/.config/virtual-ip-browser/logs/`
2. **Migration log:** `~/.config/virtual-ip-browser/migration.log`
3. **GitHub Issues:** [Report an issue](https://github.com/virtualipbrowser/virtual-ip-browser/issues)
4. **Email:** support@virtualipbrowser.com

When reporting issues, please include:
- Operating system and version
- Output of `virtual-ip-browser --version`
- Contents of `migration.log`
- Any error messages

---

*Last Updated: January 2025*  
*Document Version: 1.0*
