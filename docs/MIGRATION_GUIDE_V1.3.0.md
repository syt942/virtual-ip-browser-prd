# Migration Guide: v1.2.x → v1.3.0

**Target Audience:** Users upgrading from Virtual IP Browser v1.2.0 or v1.2.1  
**Document Version:** 1.0  
**Last Updated:** 2025-01-30

---

## Overview

Virtual IP Browser v1.3.0 includes a **security improvement** that changes how encryption keys are stored. This migration is **automatic** and requires **no user action**.

### What's Changing?

| Aspect | Before (v1.2.x) | After (v1.3.0) |
|--------|-----------------|----------------|
| **Encryption Method** | Hardcoded key in source | OS-level secure storage |
| **Key Uniqueness** | Same key for all users | Unique per-system |
| **Key Storage** | Application config file | OS keychain/keyring |
| **Security Level** | Moderate | High |

### Why This Change?

The previous encryption used a key embedded in the application code. While functional, this meant:
- Anyone with access to the source code could decrypt stored credentials
- All installations used the same encryption key
- Security relied on obscurity rather than proper key management

The new approach uses Electron's `safeStorage` API, which:
- Stores keys in the OS credential manager (GNOME Keyring, macOS Keychain, Windows Credential Manager)
- Each installation has a unique encryption key
- Keys are protected by OS-level security

---

## Migration Process

### Automatic Steps (on first launch of v1.3.0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION SEQUENCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Backup Creation                                        │
│  ├─► Config files backed up                                     │
│  ├─► Database backed up                                         │
│  └─► Location: ~/.config/virtual-ip-browser/backup-v1.2.x/      │
│                                                                 │
│  Step 2: Key Migration                                          │
│  ├─► Detect legacy encryption format                            │
│  ├─► Decrypt master key with old method                         │
│  ├─► Generate new OS-protected key via safeStorage              │
│  └─► Re-encrypt master key with new method                      │
│                                                                 │
│  Step 3: Credential Re-encryption                               │
│  ├─► Decrypt all stored proxy credentials                       │
│  ├─► Re-encrypt with new master key                             │
│  └─► Update database records                                    │
│                                                                 │
│  Step 4: Database Migration                                     │
│  ├─► Apply migration 004 (performance indexes)                  │
│  └─► Verify schema integrity                                    │
│                                                                 │
│  Step 5: Cleanup                                                │
│  ├─► Mark migration as complete                                 │
│  ├─► Legacy key format kept for 1 release cycle                 │
│  └─► Application ready for normal use                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### What Gets Migrated

| Data Type | Action | Risk |
|-----------|--------|------|
| Proxy credentials (passwords) | Re-encrypted | Low |
| Proxy configurations (host, port) | Unchanged | None |
| Session data | Re-validated | None |
| User settings | Unchanged | None |
| Custom tracker rules | Unchanged | None |
| Automation schedules | Unchanged | None |

### Migration Duration

- **Typical:** 2-5 seconds
- **Large datasets (100+ proxies):** Up to 30 seconds
- **Progress:** Shown in splash screen

---

## Post-Migration Verification

After the migration completes, verify everything works:

### 1. Check Proxy Credentials

1. Open the **Proxy Panel**
2. Select an existing proxy
3. Click **Test Connection**
4. Should show "Connection successful"

If test fails:
- Edit the proxy
- Re-enter the password
- Save and test again

### 2. Check Session Restore

1. Go to **File > Load Session**
2. Select a previously saved session
3. Tabs should restore with correct URLs

### 3. Check Logs for Errors

**Linux/macOS:**
```bash
cat ~/.config/virtual-ip-browser/logs/main.log | grep -i "migration"
```

**Windows:**
```powershell
Get-Content "$env:APPDATA\virtual-ip-browser\logs\main.log" | Select-String "migration"
```

**Expected output:**
```
[ConfigManager] Migration complete
[SafeStorage] Using safeStorage encryption
```

**Error indicators:**
```
[ConfigManager] Migration failed: ...
[SafeStorage] Falling back to machine-derived key
```

---

## Troubleshooting

### Issue: Proxy credentials not working after upgrade

**Symptoms:**
- Proxy test shows "Authentication failed"
- Previously working proxies now fail

**Cause:**
- Credential re-encryption may have failed
- Password was not properly migrated

**Solution:**
1. Open **Proxy Panel**
2. Click **Edit** on affected proxy
3. Clear and re-enter the password
4. Click **Save**
5. Click **Test Connection**

### Issue: "Migration failed" error on startup

**Symptoms:**
- Error dialog appears on launch
- Application may not start

**Cause:**
- Backup creation failed (disk full?)
- Legacy data corrupted
- Permissions issue

**Solution:**
1. Close the application
2. Restore from backup:
   ```bash
   # Linux/macOS
   cp -r ~/.config/virtual-ip-browser/backup-v1.2.x/* ~/.config/virtual-ip-browser/
   
   # Windows (PowerShell)
   Copy-Item -Recurse "$env:APPDATA\virtual-ip-browser\backup-v1.2.x\*" "$env:APPDATA\virtual-ip-browser\"
   ```
3. Download and install v1.2.1
4. Report the issue with logs attached

### Issue: "safeStorage not available" warning (Linux)

**Symptoms:**
- Warning about reduced security on startup
- Application works but shows warning

**Cause:**
- No keyring service installed (GNOME Keyring, KWallet)
- Running in headless/server environment

**Solution (Desktop Linux):**
```bash
# Ubuntu/Debian
sudo apt install gnome-keyring libsecret-1-0

# Fedora
sudo dnf install gnome-keyring libsecret

# Arch Linux
sudo pacman -S gnome-keyring libsecret

# Then restart the application
```

**Solution (Server/Docker):**
The application will use a fallback encryption method based on machine identifiers. This is less secure than OS keyring but still functional.

For production server use, consider:
1. Installing a headless keyring service
2. Using the `allowPlaintextFallback` environment variable (not recommended)

### Issue: Application won't start after upgrade

**Symptoms:**
- Application crashes immediately
- No window appears

**Cause:**
- Database corruption
- Incompatible data format

**Solution:**
1. Try resetting the database:
   ```bash
   # Linux/macOS
   mv ~/.config/virtual-ip-browser/virtual-ip-browser.db ~/.config/virtual-ip-browser/virtual-ip-browser.db.corrupt
   
   # Windows (PowerShell)
   Move-Item "$env:APPDATA\virtual-ip-browser\virtual-ip-browser.db" "$env:APPDATA\virtual-ip-browser\virtual-ip-browser.db.corrupt"
   ```
2. Launch the application (creates fresh database)
3. Re-import proxy configurations manually

### Issue: Settings lost after upgrade

**Symptoms:**
- Application settings reset to defaults
- Theme, preferences changed

**Cause:**
- Settings file corrupted during migration

**Solution:**
```bash
# Linux/macOS
cp ~/.config/virtual-ip-browser/backup-v1.2.x/config.json ~/.config/virtual-ip-browser/

# Windows (PowerShell)
Copy-Item "$env:APPDATA\virtual-ip-browser\backup-v1.2.x\config.json" "$env:APPDATA\virtual-ip-browser\"
```

---

## Rollback to v1.2.1

If you need to return to the previous version:

### Step 1: Download v1.2.1

Go to: https://github.com/virtualipbrowser/virtual-ip-browser/releases/tag/v1.2.1

### Step 2: Close v1.3.0

```bash
# Linux
pkill virtual-ip-browser

# Windows: Use Task Manager
# macOS: Use Activity Monitor or Cmd+Q
```

### Step 3: Restore Backup

```bash
# Linux/macOS
cp -r ~/.config/virtual-ip-browser/backup-v1.2.x/* ~/.config/virtual-ip-browser/

# Windows (PowerShell)
Copy-Item -Recurse "$env:APPDATA\virtual-ip-browser\backup-v1.2.x\*" "$env:APPDATA\virtual-ip-browser\" -Force
```

### Step 4: Install v1.2.1

**Linux AppImage:**
```bash
chmod +x Virtual\ IP\ Browser-1.2.1-x86_64.AppImage
./Virtual\ IP\ Browser-1.2.1-x86_64.AppImage
```

**Linux deb:**
```bash
sudo dpkg -i virtual-ip-browser_1.2.1_amd64.deb
```

**Linux rpm:**
```bash
sudo dnf install virtual-ip-browser-1.2.1.x86_64.rpm
```

**Windows:**
Run the installer executable.

**macOS:**
Open the DMG and drag to Applications.

### Step 5: Verify

Launch the application and verify your proxies and settings are restored.

---

## Data Locations

### Linux

| Data | Location |
|------|----------|
| Application data | `~/.config/virtual-ip-browser/` |
| Database | `~/.config/virtual-ip-browser/virtual-ip-browser.db` |
| Logs | `~/.config/virtual-ip-browser/logs/` |
| Backup (v1.3.0) | `~/.config/virtual-ip-browser/backup-v1.2.x/` |

### macOS

| Data | Location |
|------|----------|
| Application data | `~/Library/Application Support/virtual-ip-browser/` |
| Database | `~/Library/Application Support/virtual-ip-browser/virtual-ip-browser.db` |
| Logs | `~/Library/Application Support/virtual-ip-browser/logs/` |
| Backup (v1.3.0) | `~/Library/Application Support/virtual-ip-browser/backup-v1.2.x/` |

### Windows

| Data | Location |
|------|----------|
| Application data | `%APPDATA%\virtual-ip-browser\` |
| Database | `%APPDATA%\virtual-ip-browser\virtual-ip-browser.db` |
| Logs | `%APPDATA%\virtual-ip-browser\logs\` |
| Backup (v1.3.0) | `%APPDATA%\virtual-ip-browser\backup-v1.2.x\` |

---

## FAQ

### Q: Do I need to do anything for the migration?

**A:** No. The migration is fully automatic. Just install v1.3.0 and launch it.

### Q: Will I lose my proxy configurations?

**A:** No. All proxy configurations (host, port, type) are preserved. Only the encrypted passwords are re-encrypted.

### Q: What if I have many proxies?

**A:** The migration handles any number of proxies. It may take slightly longer for large lists (100+), but all will be migrated.

### Q: Is the backup automatic?

**A:** Yes. Before any migration changes, a complete backup is created automatically.

### Q: How long is the backup kept?

**A:** The backup remains until you manually delete it. We recommend keeping it for at least one version cycle (until v1.4.0).

### Q: Can I skip the migration?

**A:** No. The migration is required for v1.3.0 to function. If you don't want to migrate, continue using v1.2.1.

### Q: What about Docker/headless environments?

**A:** The application will work with a fallback encryption method. It's less secure than OS keyring but functional. See the troubleshooting section for details.

### Q: Is my data more secure after migration?

**A:** Yes. Your encryption keys are now protected by your operating system's secure storage, making them significantly harder to extract.

---

## Support

If you encounter issues not covered in this guide:

- **GitHub Issues:** https://github.com/virtualipbrowser/virtual-ip-browser/issues
- **Security Issues:** security@virtualipbrowser.com
- **Documentation:** https://github.com/virtualipbrowser/virtual-ip-browser/tree/main/docs

When reporting issues, please include:
1. Operating system and version
2. Virtual IP Browser version
3. Error messages (from logs)
4. Steps to reproduce

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-30
