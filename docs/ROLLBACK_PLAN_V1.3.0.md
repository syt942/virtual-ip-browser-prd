# Virtual IP Browser v1.3.0 Rollback Plan

**Document Version:** 1.0  
**Created:** 2025-01-30  
**Last Updated:** 2025-01-30  
**Status:** Active  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Rollback Scenarios](#rollback-scenarios)
3. [Decision Matrix](#decision-matrix)
4. [Rollback Procedures](#rollback-procedures)
5. [Database Rollback](#database-rollback)
6. [Encryption Key Rollback](#encryption-key-rollback)
7. [Communication Plan](#communication-plan)
8. [Post-Rollback Analysis](#post-rollback-analysis)
9. [Prevention Measures](#prevention-measures)
10. [Checklists](#checklists)
11. [Contacts & Escalation](#contacts--escalation)

---

## Executive Summary

This document provides comprehensive rollback procedures for Virtual IP Browser v1.3.0. The release includes critical security fixes and database migrations that require careful rollback planning.

### Key Changes in v1.3.0 Requiring Rollback Consideration

| Change | Impact | Rollback Complexity |
|--------|--------|---------------------|
| Encryption key migration (safeStorage) | High | Medium |
| Database migration 004 (performance indexes) | Low | Low |
| WebRTC blocking enhancements | Medium | Low |
| Bloom filter pattern matching | Low | Low |
| Magic UI components | Low | Low |

### Rollback Goals

- **RTO (Recovery Time Objective):** < 4 hours for critical issues
- **RPO (Recovery Point Objective):** No data loss
- **User Impact:** Minimal downtime, clear communication

---

## Rollback Scenarios

### Scenario 1: Critical Security Vulnerability

| Attribute | Value |
|-----------|-------|
| **Trigger** | CVE discovered in v1.3.0 |
| **Severity** | 🔴 Critical |
| **Action** | Immediate rollback required |
| **Timeline** | < 1 hour |
| **Decision Authority** | Security Lead or Release Lead |

**Indicators:**
- Security researcher reports exploitable vulnerability
- Automated security scan detects critical issue
- Active exploitation observed in the wild

**Immediate Actions:**
1. Pull v1.3.0 release from GitHub
2. Issue security advisory
3. Notify users via all channels
4. Begin hotfix development

---

### Scenario 2: Data Corruption

| Attribute | Value |
|-----------|-------|
| **Trigger** | Database migration 004 causes data loss |
| **Severity** | 🔴 Critical |
| **Action** | Immediate rollback + data recovery |
| **Timeline** | < 2 hours |
| **Decision Authority** | Release Lead |

**Indicators:**
- Users report missing proxies or credentials
- Database integrity check failures
- Migration logs show errors

**Immediate Actions:**
1. Halt all v1.3.0 downloads
2. Publish data recovery guide
3. Provide database restore scripts
4. Assist affected users with recovery

---

### Scenario 3: Application Crashes

| Attribute | Value |
|-----------|-------|
| **Trigger** | >10% users reporting crashes |
| **Severity** | 🟠 High |
| **Action** | Rollback within 24 hours |
| **Timeline** | < 24 hours |
| **Decision Authority** | Release Lead |

**Indicators:**
- Crash reports spike post-release
- GitHub issues flooding in
- Application fails to start for significant user percentage

**Immediate Actions:**
1. Collect crash logs and stack traces
2. Identify affected platforms/configurations
3. Assess if hotfix is feasible vs rollback
4. Communicate status to users

---

### Scenario 4: Feature Regression

| Attribute | Value |
|-----------|-------|
| **Trigger** | Core features broken (proxy, privacy, automation) |
| **Severity** | 🟠 High |
| **Action** | Rollback or hotfix decision |
| **Timeline** | < 48 hours |
| **Decision Authority** | Release Lead + Dev Team |

**Core Features:**
- Proxy connection and rotation
- Privacy protection (WebRTC, fingerprinting)
- Tab management and sessions
- Automation workflows

**Decision Criteria:**
- If >25% users affected → Rollback
- If <25% and fix identified → Hotfix
- If platform-specific → Platform rollback only

---

### Scenario 5: Performance Degradation

| Attribute | Value |
|-----------|-------|
| **Trigger** | >50% slower than v1.2.1 |
| **Severity** | 🟡 Medium |
| **Action** | Investigate before rollback |
| **Timeline** | 48-72 hours |
| **Decision Authority** | Dev Team |

**Metrics to Monitor:**
- Application startup time (target: <3s)
- Tab creation time (target: <200ms)
- Proxy switch time (target: <500ms)
- Memory usage with 10 tabs (target: <500MB)

**Investigation Steps:**
1. Profile application performance
2. Compare metrics to v1.2.1 baseline
3. Identify bottleneck (UI, DB, network)
4. Determine if optimization is feasible

---

### Scenario 6: Compatibility Issues

| Attribute | Value |
|-----------|-------|
| **Trigger** | Doesn't work on major platforms |
| **Severity** | 🟠 High |
| **Action** | Platform-specific rollback |
| **Timeline** | < 24 hours per platform |
| **Decision Authority** | Release Lead |

**Platforms:**
- Linux (Ubuntu 22.04+, Fedora 39+)
- Windows (10, 11)
- macOS (Ventura, Sonoma, Intel/Apple Silicon)

**Platform-Specific Issues:**
- **Linux:** safeStorage requires keyring (GNOME Keyring, KWallet)
- **Windows:** Code signing, SmartScreen warnings
- **macOS:** Notarization, Gatekeeper, ARM compatibility

---

## Decision Matrix

### Rollback Decision Framework

| Issue Type | Severity | Affected Users | Decision | Max Timeline |
|------------|----------|----------------|----------|--------------|
| Security Vulnerability | Critical | Any % | **Rollback** | Immediate |
| Data Loss/Corruption | Critical | >1% | **Rollback** | Immediate |
| Data Loss/Corruption | Critical | <1% | Assess + Recovery | 4 hours |
| Application Crashes | High | >10% | **Rollback** | 24 hours |
| Application Crashes | High | 5-10% | Hotfix preferred | 48 hours |
| Core Feature Broken | High | >25% | **Rollback** | 48 hours |
| Core Feature Broken | High | <25% | Hotfix preferred | 72 hours |
| Performance Regression | Medium | >50% | Investigate first | 72 hours |
| Minor Bug | Low | Any % | Hotfix in next release | Next release |
| UI/UX Issue | Low | Any % | Hotfix in next release | Next release |

### Severity Definitions

| Severity | Definition | Response Time |
|----------|------------|---------------|
| 🔴 **Critical** | Security breach, data loss, complete failure | < 1 hour |
| 🟠 **High** | Major functionality broken, significant user impact | < 24 hours |
| 🟡 **Medium** | Degraded experience, workaround available | < 72 hours |
| 🟢 **Low** | Minor issues, cosmetic problems | Next release |

---

## Rollback Procedures

### Procedure 1: GitHub Release Rollback

**Time Estimate:** 15 minutes  
**Required Access:** GitHub repository admin

#### Steps

```bash
# Step 1: Mark v1.3.0 as pre-release (do NOT delete)
# Go to: https://github.com/virtualipbrowser/virtual-ip-browser/releases/tag/v1.3.0
# Click "Edit" → Check "This is a pre-release" → Save

# Step 2: Create hotfix release from v1.2.1
git checkout v1.2.1
git checkout -b release/v1.2.1-hotfix
git tag -s v1.2.1-hotfix -m "Hotfix release - rollback from v1.3.0"
git push origin v1.2.1-hotfix
git push origin --tags

# Step 3: Create new GitHub release for v1.2.1-hotfix
# - Mark as "Latest release"
# - Upload all v1.2.1 artifacts (or reference existing)
# - Add rollback notice to release notes
```

#### Auto-Update Configuration

Update `latest.yml` (Windows), `latest-mac.yml` (macOS), `latest-linux.yml` (Linux):

```yaml
version: 1.2.1-hotfix
files:
  - url: Virtual-IP-Browser-1.2.1-hotfix-x86_64.AppImage
    sha512: [checksum]
    size: [size]
path: Virtual-IP-Browser-1.2.1-hotfix-x86_64.AppImage
sha512: [checksum]
releaseDate: [date]
```

#### Verification

- [ ] v1.3.0 no longer shows as "Latest release"
- [ ] v1.2.1-hotfix shows as "Latest release"
- [ ] Auto-update points to v1.2.1-hotfix
- [ ] Download links functional

---

### Procedure 2: User Self-Service Rollback

**Time Estimate:** 5-10 minutes per user  
**Prerequisites:** User has internet access

#### Linux Users

```bash
# Step 1: Close the application
pkill -f virtual-ip-browser || killall virtual-ip-browser

# Step 2: Restore backup (if migration occurred)
BACKUP_DIR="$HOME/.config/virtual-ip-browser/backup-v1.2.x"
CONFIG_DIR="$HOME/.config/virtual-ip-browser"

if [ -d "$BACKUP_DIR" ]; then
    echo "Restoring from backup..."
    cp -r "$BACKUP_DIR"/* "$CONFIG_DIR"/
    echo "Backup restored successfully"
else
    echo "No backup found - credentials may need to be re-entered"
fi

# Step 3: Download and install v1.2.1
# AppImage:
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/Virtual-IP-Browser-1.2.1-x86_64.AppImage
chmod +x Virtual-IP-Browser-1.2.1-x86_64.AppImage
./Virtual-IP-Browser-1.2.1-x86_64.AppImage

# OR Debian/Ubuntu (.deb):
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb
sudo dpkg -i virtual-ip-browser_1.2.1_amd64.deb

# OR Fedora/RHEL (.rpm):
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser-1.2.1.x86_64.rpm
sudo dnf install ./virtual-ip-browser-1.2.1.x86_64.rpm
```

#### Windows Users

```powershell
# Step 1: Close the application
Stop-Process -Name "Virtual IP Browser" -Force -ErrorAction SilentlyContinue

# Step 2: Restore backup (if migration occurred)
$BackupDir = "$env:APPDATA\virtual-ip-browser\backup-v1.2.x"
$ConfigDir = "$env:APPDATA\virtual-ip-browser"

if (Test-Path $BackupDir) {
    Write-Host "Restoring from backup..."
    Copy-Item -Path "$BackupDir\*" -Destination $ConfigDir -Recurse -Force
    Write-Host "Backup restored successfully"
} else {
    Write-Host "No backup found - credentials may need to be re-entered"
}

# Step 3: Download v1.2.1 from GitHub releases
# https://github.com/virtualipbrowser/virtual-ip-browser/releases/tag/v1.2.1
# Run the installer: "Virtual IP Browser Setup 1.2.1.exe"
```

#### macOS Users

```bash
# Step 1: Close the application
osascript -e 'quit app "Virtual IP Browser"' 2>/dev/null
pkill -f "Virtual IP Browser" 2>/dev/null

# Step 2: Restore backup (if migration occurred)
BACKUP_DIR="$HOME/Library/Application Support/virtual-ip-browser/backup-v1.2.x"
CONFIG_DIR="$HOME/Library/Application Support/virtual-ip-browser"

if [ -d "$BACKUP_DIR" ]; then
    echo "Restoring from backup..."
    cp -r "$BACKUP_DIR"/* "$CONFIG_DIR"/
    echo "Backup restored successfully"
else
    echo "No backup found - credentials may need to be re-entered"
fi

# Step 3: Download v1.2.1 DMG from GitHub releases
# https://github.com/virtualipbrowser/virtual-ip-browser/releases/tag/v1.2.1
# Open DMG and drag to Applications (replace existing)
```

---

### Procedure 3: Automated Rollback Script

Save as `rollback-v1.3.0.sh` (Linux/macOS) or `rollback-v1.3.0.ps1` (Windows):

#### Linux/macOS Script

```bash
#!/bin/bash
set -e

echo "=========================================="
echo "Virtual IP Browser v1.3.0 Rollback Script"
echo "=========================================="

# Configuration
RELEASE_URL="https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1"
PLATFORM=$(uname -s)

# Detect config directory
if [ "$PLATFORM" = "Darwin" ]; then
    CONFIG_DIR="$HOME/Library/Application Support/virtual-ip-browser"
else
    CONFIG_DIR="$HOME/.config/virtual-ip-browser"
fi

BACKUP_DIR="$CONFIG_DIR/backup-v1.2.x"

echo ""
echo "Step 1: Closing application..."
pkill -f virtual-ip-browser 2>/dev/null || true
sleep 2

echo ""
echo "Step 2: Checking for backup..."
if [ -d "$BACKUP_DIR" ]; then
    echo "✓ Backup found at: $BACKUP_DIR"
    echo "  Restoring backup..."
    cp -r "$BACKUP_DIR"/* "$CONFIG_DIR"/
    echo "✓ Backup restored"
else
    echo "⚠ No backup found"
    echo "  Proxy credentials may need to be re-entered after rollback"
fi

echo ""
echo "Step 3: Download v1.2.1..."
if [ "$PLATFORM" = "Darwin" ]; then
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        DOWNLOAD_FILE="Virtual-IP-Browser-1.2.1-arm64.dmg"
    else
        DOWNLOAD_FILE="Virtual-IP-Browser-1.2.1.dmg"
    fi
else
    DOWNLOAD_FILE="Virtual-IP-Browser-1.2.1-x86_64.AppImage"
fi

echo "  Downloading: $DOWNLOAD_FILE"
curl -L -o "/tmp/$DOWNLOAD_FILE" "$RELEASE_URL/$DOWNLOAD_FILE"
echo "✓ Download complete"

echo ""
echo "Step 4: Installation instructions"
if [ "$PLATFORM" = "Darwin" ]; then
    echo "  1. Open /tmp/$DOWNLOAD_FILE"
    echo "  2. Drag 'Virtual IP Browser' to Applications (replace existing)"
    echo "  3. Launch the application"
    open "/tmp/$DOWNLOAD_FILE"
else
    chmod +x "/tmp/$DOWNLOAD_FILE"
    echo "  AppImage saved to: /tmp/$DOWNLOAD_FILE"
    echo "  Run with: /tmp/$DOWNLOAD_FILE"
fi

echo ""
echo "=========================================="
echo "Rollback preparation complete!"
echo "=========================================="
```

#### Windows PowerShell Script

```powershell
# Virtual IP Browser v1.3.0 Rollback Script
# Run as Administrator recommended

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Virtual IP Browser v1.3.0 Rollback Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ReleaseUrl = "https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1"
$ConfigDir = "$env:APPDATA\virtual-ip-browser"
$BackupDir = "$ConfigDir\backup-v1.2.x"
$DownloadFile = "Virtual IP Browser Setup 1.2.1.exe"

Write-Host ""
Write-Host "Step 1: Closing application..." -ForegroundColor Yellow
Stop-Process -Name "Virtual IP Browser" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Step 2: Checking for backup..." -ForegroundColor Yellow
if (Test-Path $BackupDir) {
    Write-Host "✓ Backup found at: $BackupDir" -ForegroundColor Green
    Write-Host "  Restoring backup..."
    Copy-Item -Path "$BackupDir\*" -Destination $ConfigDir -Recurse -Force
    Write-Host "✓ Backup restored" -ForegroundColor Green
} else {
    Write-Host "⚠ No backup found" -ForegroundColor Yellow
    Write-Host "  Proxy credentials may need to be re-entered after rollback"
}

Write-Host ""
Write-Host "Step 3: Downloading v1.2.1..." -ForegroundColor Yellow
$DownloadPath = "$env:TEMP\$DownloadFile"
Invoke-WebRequest -Uri "$ReleaseUrl/$DownloadFile" -OutFile $DownloadPath
Write-Host "✓ Download complete: $DownloadPath" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Starting installer..." -ForegroundColor Yellow
Start-Process -FilePath $DownloadPath -Wait

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Rollback complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
```

---

### Procedure 4: Hotfix Development

**When to Use:** Issues can be fixed quickly without full rollback

#### Hotfix from v1.3.0 (Fix Forward)

```bash
# Create hotfix branch from v1.3.0
git checkout v1.3.0
git checkout -b hotfix/1.3.1

# Make fixes
# ... edit files ...

# Run tests
npm test
npm run test:e2e

# Commit with conventional commit format
git commit -m "fix: [description of the fix]

Fixes #[issue-number]

- [Detailed change 1]
- [Detailed change 2]"

# Tag and release
git tag -s v1.3.1 -m "Hotfix release v1.3.1"
git push origin hotfix/1.3.1
git push origin v1.3.1
```

#### Hotfix from v1.2.1 (Emergency Patch)

```bash
# Create hotfix branch from v1.2.1
git checkout v1.2.1
git checkout -b hotfix/1.2.2

# Cherry-pick critical fixes only (if applicable)
# git cherry-pick <commit-hash>

# OR make targeted fixes
# ... edit files ...

# Minimal testing (critical path only)
npm test -- --grep "critical"
npm run test:e2e -- --grep "proxy|privacy"

# Tag and release
git tag -s v1.2.2 -m "Emergency hotfix release v1.2.2"
git push origin hotfix/1.2.2
git push origin v1.2.2
```

#### Fast-Track Testing for Hotfixes

```bash
# Critical path tests only
npm test -- tests/unit/security-fixes.test.ts
npm test -- tests/unit/database/migration-004-performance-indexes.test.ts
npm test -- tests/unit/database/safe-storage.service.test.ts

# E2E smoke tests
npm run test:e2e -- tests/e2e/navigation.spec.ts
npm run test:e2e -- tests/e2e/proxy-management.spec.ts

# Platform-specific validation
npm run build
npm run package:linux  # or package:win / package:mac
```

---

## Database Rollback

### Migration 004: Performance Indexes

Migration 004 adds performance indexes and is **fully reversible** with no data loss.

#### What Migration 004 Does

```sql
-- Indexes added by migration 004:
CREATE INDEX idx_search_tasks_proxy_id ON search_tasks(proxy_id);
CREATE INDEX idx_proxy_usage_composite ON proxy_usage_stats(proxy_id, time_bucket);
CREATE INDEX idx_rotation_events_composite ON rotation_events(config_id, timestamp DESC);
CREATE INDEX idx_activity_logs_composite ON activity_logs(session_id, timestamp DESC);
CREATE INDEX idx_sticky_sessions_domain_lookup ON sticky_session_mappings(domain, proxy_id, expires_at);
```

#### Rollback SQL

The rollback script is located at: `electron/database/migrations/004_rollback.sql`

```sql
-- Run this to rollback migration 004
-- Location: electron/database/migrations/004_rollback.sql

-- Drop all indexes added by migration 004
DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
DROP INDEX IF EXISTS idx_proxy_usage_composite;
DROP INDEX IF EXISTS idx_rotation_events_composite;
DROP INDEX IF EXISTS idx_activity_logs_composite;
DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '004';
```

#### How to Execute Database Rollback

**Option 1: Using SQLite CLI**

```bash
# Linux/macOS
sqlite3 ~/.config/virtual-ip-browser/virtual-ip-browser.db < electron/database/migrations/004_rollback.sql

# Windows (PowerShell)
sqlite3 "$env:APPDATA\virtual-ip-browser\virtual-ip-browser.db" ".read electron\database\migrations\004_rollback.sql"
```

**Option 2: Using Application Debug Console**

```javascript
// In Electron DevTools console (Ctrl+Shift+I / Cmd+Option+I)
const db = require('better-sqlite3')('/path/to/virtual-ip-browser.db');
db.exec(`
  DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
  DROP INDEX IF EXISTS idx_proxy_usage_composite;
  DROP INDEX IF EXISTS idx_rotation_events_composite;
  DROP INDEX IF EXISTS idx_activity_logs_composite;
  DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;
  DELETE FROM schema_migrations WHERE version = '004';
`);
console.log('Migration 004 rolled back successfully');
```

**Option 3: Using Node.js Script**

```javascript
// save as rollback-migration-004.js
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Determine config directory
const configDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library/Application Support/virtual-ip-browser')
  : path.join(os.homedir(), '.config/virtual-ip-browser');

const dbPath = path.join(configDir, 'virtual-ip-browser.db');

console.log(`Opening database: ${dbPath}`);
const db = new Database(dbPath);

try {
  db.exec(`
    DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
    DROP INDEX IF EXISTS idx_proxy_usage_composite;
    DROP INDEX IF EXISTS idx_rotation_events_composite;
    DROP INDEX IF EXISTS idx_activity_logs_composite;
    DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;
    DELETE FROM schema_migrations WHERE version = '004';
  `);
  console.log('✓ Migration 004 rolled back successfully');
} catch (error) {
  console.error('✗ Rollback failed:', error.message);
} finally {
  db.close();
}
```

#### Verify Database Rollback

```sql
-- Check indexes were removed
SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%';

-- Check migration record was removed
SELECT * FROM schema_migrations WHERE version = '004';
-- Should return empty result
```

#### Database Backup Locations

| Platform | Backup Location |
|----------|-----------------|
| Linux | `~/.config/virtual-ip-browser/backup-v1.2.x/virtual-ip-browser.db` |
| macOS | `~/Library/Application Support/virtual-ip-browser/backup-v1.2.x/virtual-ip-browser.db` |
| Windows | `%APPDATA%\virtual-ip-browser\backup-v1.2.x\virtual-ip-browser.db` |

#### Full Database Restore

```bash
# Linux/macOS - Full database restore from backup
cp ~/.config/virtual-ip-browser/backup-v1.2.x/virtual-ip-browser.db \
   ~/.config/virtual-ip-browser/virtual-ip-browser.db

# Windows (PowerShell)
Copy-Item "$env:APPDATA\virtual-ip-browser\backup-v1.2.x\virtual-ip-browser.db" `
          "$env:APPDATA\virtual-ip-browser\virtual-ip-browser.db" -Force
```

---

## Encryption Key Rollback

### Understanding the Encryption Migration

v1.3.0 migrates encryption keys from a hardcoded key to OS-native secure storage:

| Platform | Storage Backend |
|----------|-----------------|
| Windows | DPAPI (Data Protection API) |
| macOS | Keychain |
| Linux | libsecret (GNOME Keyring / KWallet) |

### Fallback Behavior

The `SafeStorageService` automatically falls back to machine-derived encryption when OS-native storage is unavailable:

```typescript
// From electron/database/services/safe-storage.service.ts
if (!safeStorage.isEncryptionAvailable()) {
  // Uses machine-derived key (hostname, platform, arch, CPU, userData path)
  this.initializeFallback();
}
```

### Encryption Rollback Scenarios

#### Scenario A: safeStorage Migration Succeeded

**Symptoms:** Application works fine, credentials accessible

**Rollback:** Not typically needed, but if required:

1. Restore backup config files
2. Install v1.2.1
3. Credentials will decrypt with old hardcoded key

#### Scenario B: safeStorage Unavailable (Linux)

**Symptoms:** Warning about fallback encryption, credentials still work

**Resolution:**

```bash
# Install keyring service
# Ubuntu/Debian:
sudo apt install gnome-keyring libsecret-1-0

# Fedora:
sudo dnf install gnome-keyring libsecret

# Arch Linux:
sudo pacman -S gnome-keyring libsecret

# Restart application
```

#### Scenario C: Credentials Lost After Migration

**Symptoms:** Proxy authentication fails, passwords not decrypting

**Recovery Steps:**

1. **Check for backup:**
   ```bash
   ls ~/.config/virtual-ip-browser/backup-v1.2.x/
   ```

2. **If backup exists, restore and use v1.2.1:**
   ```bash
   cp -r ~/.config/virtual-ip-browser/backup-v1.2.x/* ~/.config/virtual-ip-browser/
   # Then install v1.2.1
   ```

3. **If no backup, re-enter credentials:**
   - Open Proxy Panel
   - Edit each proxy
   - Re-enter username and password
   - Save and test

#### Scenario D: Migration Partially Completed

**Symptoms:** Some credentials work, others don't

**Diagnosis:**

```javascript
// Check encryption method in config
const fs = require('fs');
const configPath = '~/.config/virtual-ip-browser/config.json';
const config = JSON.parse(fs.readFileSync(configPath));

// Look for mixed encryption methods
console.log('Encryption methods in use:');
Object.keys(config.proxies || {}).forEach(id => {
  const proxy = config.proxies[id];
  if (proxy.credentials?.method) {
    console.log(`  ${id}: ${proxy.credentials.method}`);
  }
});
```

**Resolution:**
- Re-encrypt all credentials with current method
- Or restore from backup and retry migration

### Manual Credential Recovery Tool

```javascript
// save as recover-credentials.js
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const os = require('os');

// v1.2.x hardcoded key (for recovery only!)
const LEGACY_KEY = Buffer.from('your-legacy-key-here', 'hex');

const configDir = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library/Application Support/virtual-ip-browser')
  : path.join(os.homedir(), '.config/virtual-ip-browser');

const backupDb = path.join(configDir, 'backup-v1.2.x', 'virtual-ip-browser.db');

console.log('Attempting to recover credentials from backup...');

try {
  const db = new Database(backupDb, { readonly: true });
  const credentials = db.prepare('SELECT * FROM encrypted_credentials').all();
  
  console.log(`Found ${credentials.length} encrypted credentials`);
  
  credentials.forEach((cred, i) => {
    console.log(`\nCredential ${i + 1}:`);
    console.log(`  Proxy ID: ${cred.proxy_id}`);
    console.log(`  Username: ${cred.username}`);
    // Password would need decryption with legacy key
    console.log(`  Password: [encrypted - manual decryption needed]`);
  });
  
  db.close();
} catch (error) {
  console.error('Recovery failed:', error.message);
}
```

---

## Communication Plan

### Communication Templates

#### Template 1: Immediate Rollback Notice

```markdown
## ⚠️ Important: v1.3.0 Rollback Notice

**Date:** [YYYY-MM-DD HH:MM UTC]  
**Status:** v1.3.0 temporarily withdrawn

### What Happened

We've identified a [critical issue/security vulnerability/data corruption issue] in v1.3.0 
that affects [description of who is affected].

### Issue Details

- **Type:** [Security/Data Loss/Crash/Performance]
- **Severity:** [Critical/High]
- **Affected:** [All users / Linux users / Users who upgraded from v1.2.x]

### What You Should Do

**If you haven't installed v1.3.0:**
- Do NOT install v1.3.0
- Continue using your current version

**If you already installed v1.3.0:**
1. Download v1.2.1 from: [link]
2. Follow the rollback guide: [link to rollback guide]
3. Your data backup is at: `[backup location]`

### Timeline

| Time | Event |
|------|-------|
| [Time] | Issue discovered |
| [Time] | Investigation started |
| [Time] | Rollback decision made |
| [Time] | v1.2.1-hotfix published |
| [ETA] | Fix expected (v1.3.1) |

### Getting Help

- **Recovery Guide:** [link]
- **GitHub Issues:** [link]
- **Security Issues:** security@virtualipbrowser.com

We sincerely apologize for the inconvenience. We take the stability and security of 
Virtual IP Browser very seriously and are working to resolve this as quickly as possible.

---
*This notice will be updated as the situation develops.*
```

#### Template 2: GitHub Issue (Pinned)

```markdown
# 🚨 v1.3.0 Known Issue - Rollback Available

## Status: Under Investigation

We've identified an issue with v1.3.0 and are providing a rollback path.

### Affected Versions
- v1.3.0 ❌
- v1.2.1 ✅ (recommended)

### Issue Summary
[Brief description of the issue]

### Symptoms
- [ ] [Symptom 1]
- [ ] [Symptom 2]
- [ ] [Symptom 3]

### Workaround
Rollback to v1.2.1 following [this guide](link).

### Are You Affected?
Please react to this issue:
- 👍 if you ARE affected
- 👎 if you are NOT affected
- 🎉 if rollback resolved your issue

### Timeline
- [ ] Issue identified
- [ ] Root cause found
- [ ] Fix developed
- [ ] Fix tested
- [ ] v1.3.1 released

### Updates
| Date | Update |
|------|--------|
| [Date] | Issue discovered, investigation started |
| [Date] | ... |

---
**DO NOT** post sensitive information (passwords, API keys) in this thread.
```

#### Template 3: Post-Resolution Notice

```markdown
## ✅ v1.3.0 Issue Resolved - v1.3.1 Now Available

**Date:** [YYYY-MM-DD]

### Summary

The issue affecting v1.3.0 has been resolved. v1.3.1 is now available with the fix.

### What Was Fixed

[Description of the fix]

### Upgrade Path

**From v1.2.1 (if you rolled back):**
- Download v1.3.1 directly
- No special steps needed
- Migration will run automatically

**From v1.3.0:**
- Auto-update will apply v1.3.1
- Or download manually from releases

### Verification

After updating to v1.3.1, verify:
1. Application starts normally
2. All proxies are accessible
3. Credentials work correctly

### Thank You

We appreciate your patience and the community members who reported this issue 
and helped with testing.

### Lessons Learned

We've updated our testing procedures to prevent similar issues:
- [Improvement 1]
- [Improvement 2]
```

### Communication Channels

| Channel | Action | Responsible | Timeline |
|---------|--------|-------------|----------|
| GitHub Releases | Mark v1.3.0 as pre-release | Release Lead | Immediate |
| GitHub Issues | Create pinned issue | Release Lead | < 15 min |
| README.md | Add rollback notice banner | Dev | < 30 min |
| Website | Update download links | Dev | < 1 hour |
| Social Media | Post rollback notice | Marketing | < 2 hours |
| Email (if applicable) | Notify subscribers | Marketing | < 4 hours |

---

## Post-Rollback Analysis

### Root Cause Analysis Template

Complete this within 72 hours of any rollback:

```markdown
# Post-Rollback Analysis Report

**Incident ID:** VIP-[YYYY]-[NNN]  
**Date of Incident:** [YYYY-MM-DD]  
**Date of Resolution:** [YYYY-MM-DD]  
**Author:** [Name]  
**Reviewers:** [Names]

## Executive Summary

[2-3 sentence summary of what happened and the impact]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| [Time] | First user report received |
| [Time] | Issue confirmed by team |
| [Time] | Rollback decision made |
| [Time] | Rollback completed |
| [Time] | Issue resolved (v1.3.1 released) |

## Impact Assessment

### Users Affected
- **Total users who downloaded v1.3.0:** [Number]
- **Users who experienced the issue:** [Number] ([Percentage]%)
- **Users who required support:** [Number]

### Severity
- **Data Loss:** [Yes/No - details]
- **Security Exposure:** [Yes/No - details]  
- **Downtime:** [Duration]

## Root Cause

### What Happened
[Detailed technical explanation]

### Why It Happened
[5 Whys analysis or similar]

1. Why? [First level]
2. Why? [Second level]
3. Why? [Third level]
4. Why? [Fourth level]
5. Why? [Root cause]

### Contributing Factors
- [ ] Insufficient test coverage for [area]
- [ ] Missing edge case handling for [scenario]
- [ ] Platform-specific behavior not accounted for
- [ ] Other: [describe]

## Detection Gap Analysis

### Why Wasn't It Caught?

| Testing Phase | What Was Tested | What Was Missed |
|---------------|-----------------|-----------------|
| Unit Tests | [Description] | [Gap] |
| Integration Tests | [Description] | [Gap] |
| E2E Tests | [Description] | [Gap] |
| Manual QA | [Description] | [Gap] |
| Beta Testing | [Description] | [Gap] |

## Corrective Actions

### Immediate (< 1 week)
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

### Short-term (< 1 month)
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

### Long-term (< 3 months)
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

## New Tests Added

| Test File | Description | Coverage Area |
|-----------|-------------|---------------|
| [file.test.ts] | [Description] | [Area] |

## Process Improvements

### Release Process Changes
- [ ] [Change 1]
- [ ] [Change 2]

### Monitoring Improvements
- [ ] [Improvement 1]
- [ ] [Improvement 2]

## Lessons Learned

### What Went Well
- [Item 1]
- [Item 2]

### What Went Poorly
- [Item 1]
- [Item 2]

### Key Takeaways
- [Takeaway 1]
- [Takeaway 2]

## Sign-off

| Role | Name | Date |
|------|------|------|
| Release Lead | | |
| Dev Team Lead | | |
| QA Lead | | |
```

### Post-Mortem Meeting Agenda

1. **Introduction** (5 min)
   - Timeline review
   - Impact summary

2. **Technical Deep Dive** (20 min)
   - Root cause explanation
   - Code walkthrough (if applicable)
   - Q&A

3. **Detection Gap Analysis** (15 min)
   - Why testing didn't catch it
   - Missing test scenarios

4. **Corrective Actions** (15 min)
   - Proposed fixes
   - Timeline for implementation
   - Ownership assignment

5. **Process Improvements** (10 min)
   - Release process changes
   - Monitoring enhancements

6. **Action Items & Next Steps** (5 min)
   - Assign owners
   - Set deadlines
   - Schedule follow-up

---

## Prevention Measures

### Already Implemented (v1.3.0)

| Measure | Status | Coverage |
|---------|--------|----------|
| Automated Unit Tests | ✅ 2,444 tests | 82.3% coverage |
| Security Tests | ✅ 42 tests | P0 vulnerabilities |
| E2E Tests (Playwright) | ✅ 109 tests | Critical paths |
| Database Migration Tests | ✅ | Migration 004 |
| Code Quality (ESLint) | ✅ 0 errors | All files |
| TypeScript Strict Mode | ✅ | Compile-time safety |
| Security Audit | ✅ | Full audit report |

### Recommended Enhancements

| Measure | Priority | Effort | Status |
|---------|----------|--------|--------|
| Canary Deployment (5% users first) | High | Medium | 🔲 Planned |
| Feature Flags for gradual rollout | High | Medium | 🔲 Planned |
| Real-time Error Monitoring (Sentry) | High | Low | 🔲 Planned |
| Automated Rollback Triggers | Medium | High | 🔲 Future |
| Performance Monitoring Dashboard | Medium | Medium | 🔲 Planned |
| User Feedback Collection | Low | Low | 🔲 Planned |
| Chaos Engineering Tests | Low | High | 🔲 Future |

### Canary Deployment Strategy (Proposed)

```
Phase 1: Internal (Day 1)
├─► Deploy to development team
├─► 24-hour monitoring period
└─► Go/No-Go for Phase 2

Phase 2: Beta Users (Day 2-3)
├─► Deploy to opt-in beta channel
├─► 5% of user base
├─► 48-hour monitoring period
└─► Go/No-Go for Phase 3

Phase 3: Staged Rollout (Day 4-7)
├─► Day 4: 25% of users
├─► Day 5: 50% of users
├─► Day 6: 75% of users
├─► Day 7: 100% of users
└─► Each stage requires 24h stability

Automatic Rollback Triggers:
├─► Crash rate > 5%
├─► Error rate > 10%
├─► Support tickets spike > 3x normal
└─► Security alert
```

### Feature Flag Implementation (Proposed)

```typescript
// Example feature flag configuration
const featureFlags = {
  'encryption-migration': {
    enabled: true,
    rolloutPercentage: 100,
    allowlist: ['beta-testers'],
    killSwitch: false
  },
  'new-ui-components': {
    enabled: true,
    rolloutPercentage: 50,
    allowlist: [],
    killSwitch: false
  }
};

// Usage in code
if (isFeatureEnabled('encryption-migration')) {
  await migrateToSafeStorage();
} else {
  // Use legacy encryption
}
```

---

## Checklists

### Pre-Release Rollback Readiness Checklist

Complete before releasing v1.3.0:

#### Documentation
- [ ] Rollback plan document complete (this document)
- [ ] User rollback guide published
- [ ] Communication templates ready
- [ ] Recovery scripts tested

#### Technical Preparation
- [ ] Database rollback SQL tested (`004_rollback.sql`)
- [ ] Encryption fallback mechanism verified
- [ ] v1.2.1 packages still available for download
- [ ] Auto-update can be redirected to previous version

#### Team Readiness
- [ ] On-call schedule confirmed for release week
- [ ] Contact information up to date
- [ ] Escalation path documented
- [ ] All team members have repository access

#### Monitoring
- [ ] Error tracking configured
- [ ] Key metrics identified
- [ ] Alert thresholds set
- [ ] Dashboard accessible to team

---

### Rollback Execution Checklist

Use when executing a rollback:

#### Phase 1: Assessment (< 15 min)
- [ ] Confirm the issue and severity
- [ ] Identify affected user percentage
- [ ] Make rollback decision (use Decision Matrix)
- [ ] Document decision rationale
- [ ] Notify team of rollback decision

#### Phase 2: GitHub Actions (< 15 min)
- [ ] Mark v1.3.0 as pre-release on GitHub
- [ ] Create v1.2.1-hotfix tag (if needed)
- [ ] Update auto-update manifest files
- [ ] Verify v1.2.1 artifacts are downloadable

#### Phase 3: Communication (< 30 min)
- [ ] Create pinned GitHub issue
- [ ] Update README with rollback notice
- [ ] Post to social media channels
- [ ] Send email notification (if applicable)
- [ ] Update website download links

#### Phase 4: User Support (Ongoing)
- [ ] Monitor GitHub issues for user reports
- [ ] Respond to support requests
- [ ] Track rollback success rate
- [ ] Document common issues and solutions

#### Phase 5: Fix Forward (< 48 hours)
- [ ] Root cause identified
- [ ] Fix developed and tested
- [ ] v1.3.1 release prepared
- [ ] Post-mortem scheduled

---

### Post-Rollback Checklist

Complete within 72 hours of rollback:

#### Immediate (< 24 hours)
- [ ] All affected users notified
- [ ] Support queue stabilized
- [ ] Root cause identified
- [ ] Fix in development

#### Short-term (< 72 hours)
- [ ] Post-mortem meeting held
- [ ] Post-mortem document completed
- [ ] New tests written for the issue
- [ ] Fix released (v1.3.1)
- [ ] Resolution notice published

#### Follow-up (< 1 week)
- [ ] Process improvements identified
- [ ] Action items assigned and tracked
- [ ] Documentation updated
- [ ] Lessons learned shared with team

---

### Rollback Testing Checklist

Perform before each release to ensure rollback capability:

#### Database Rollback Test
- [ ] Apply migration 004 on test database
- [ ] Execute 004_rollback.sql
- [ ] Verify indexes removed
- [ ] Verify migration record removed
- [ ] Verify application still functions

#### Encryption Rollback Test
- [ ] Create test credentials with v1.3.0
- [ ] Simulate safeStorage failure
- [ ] Verify fallback encryption works
- [ ] Restore v1.2.1 backup
- [ ] Verify credentials accessible with old key

#### Full Application Rollback Test
- [ ] Install v1.3.0 fresh
- [ ] Create test data (proxies, sessions)
- [ ] Rollback to v1.2.1
- [ ] Verify all data accessible
- [ ] Verify application functions normally

#### Auto-Update Rollback Test
- [ ] Configure auto-update to point to v1.2.1-hotfix
- [ ] Trigger update check from v1.3.0
- [ ] Verify downgrade completes successfully
- [ ] Verify data integrity after downgrade

---

## Contacts & Escalation

### Escalation Path

```
Level 1: On-Call Developer
    │
    ▼ (if unresolved in 30 min OR critical severity)
Level 2: Release Lead
    │
    ▼ (if unresolved in 1 hour OR security issue)
Level 3: Security Lead
    │
    ▼ (if organizational escalation needed)
Level 4: Project Lead
```

### Contact Information

| Role | Contact | Availability | Backup |
|------|---------|--------------|--------|
| Release Lead | [TBD] | Business hours + on-call | [TBD] |
| Security Lead | security@virtualipbrowser.com | On-call 24/7 | [TBD] |
| On-Call Developer | [Rotation] | Per schedule | [Rotation] |
| Project Lead | [TBD] | Business hours | [TBD] |

### On-Call Schedule (Release Week)

| Day | Primary | Secondary |
|-----|---------|-----------|
| Release Day | [Name] | [Name] |
| Day +1 | [Name] | [Name] |
| Day +2 | [Name] | [Name] |
| Day +3 | [Name] | [Name] |
| Day +4-7 | Normal rotation | - |

### External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| GitHub Issues | github.com/virtualipbrowser/virtual-ip-browser/issues | Bug reports |
| Security Reports | security@virtualipbrowser.com | CVE reports |
| User Documentation | docs.virtualipbrowser.com | User guides |
| Status Page | status.virtualipbrowser.com | System status |

---

## Appendix

### A. Quick Reference Commands

```bash
# Check current version
cat ~/.config/virtual-ip-browser/config.json | grep version

# Check database migration status
sqlite3 ~/.config/virtual-ip-browser/virtual-ip-browser.db \
  "SELECT * FROM schema_migrations ORDER BY version;"

# Check encryption method
cat ~/.config/virtual-ip-browser/config.json | grep -A5 "encryption"

# View recent logs
tail -100 ~/.config/virtual-ip-browser/logs/main.log

# Backup current config
cp -r ~/.config/virtual-ip-browser ~/.config/virtual-ip-browser-backup-$(date +%Y%m%d)
```

### B. File Locations by Platform

| Item | Linux | macOS | Windows |
|------|-------|-------|---------|
| Config Dir | `~/.config/virtual-ip-browser/` | `~/Library/Application Support/virtual-ip-browser/` | `%APPDATA%\virtual-ip-browser\` |
| Database | `[Config Dir]/virtual-ip-browser.db` | [Config Dir]/virtual-ip-browser.db | [Config Dir]\virtual-ip-browser.db |
| Logs | `[Config Dir]/logs/` | [Config Dir]/logs/ | [Config Dir]\logs\ |
| Backup | `[Config Dir]/backup-v1.2.x/` | [Config Dir]/backup-v1.2.x/ | [Config Dir]\backup-v1.2.x\ |

### C. Version History

| Version | Release Date | Notes |
|---------|--------------|-------|
| v1.3.0 | [TBD] | Security fixes, encryption migration |
| v1.2.1 | [Previous] | Stable release (rollback target) |
| v1.2.0 | [Previous] | Previous stable |

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-30 | Dev Team | Initial document |

---

*This document should be reviewed and updated before each major release.*

