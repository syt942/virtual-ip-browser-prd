# Virtual IP Browser - Troubleshooting Guide

**Version:** 1.3.0  
**Last Updated:** January 2025

---

## 📋 Table of Contents

1. [Installation Issues](#installation-issues)
2. [Startup Problems](#startup-problems)
3. [Encryption & Migration](#encryption--migration)
4. [Proxy Issues](#proxy-issues)
5. [Privacy & Fingerprint](#privacy--fingerprint)
6. [Database Issues](#database-issues)
7. [Performance Problems](#performance-problems)
8. [UI & Animation Issues](#ui--animation-issues)
9. [Automation Issues](#automation-issues)

---

## Installation Issues

### Linux: "dependency not satisfiable" Error

**Symptom:** Installation fails with missing dependencies

**Solution:**
```bash
# Update package lists first
sudo apt update

# Install with dependency resolution
sudo apt install -f ./virtual-ip-browser_1.3.0_amd64.deb

# Or manually install dependencies
sudo apt install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 \
  xdg-utils libatspi2.0-0 libuuid1 libsecret-1-0 libgbm1 libasound2
```

### Linux: AppImage Won't Run

**Symptom:** "Permission denied" or nothing happens

**Solution:**
```bash
# Make executable
chmod +x "Virtual IP Browser-1.3.0-x86_64.AppImage"

# If FUSE is missing (error about libfuse)
sudo apt install libfuse2

# Run with extraction fallback
./Virtual\ IP\ Browser-1.3.0-x86_64.AppImage --appimage-extract-and-run
```

### Linux: Sandbox Error

**Symptom:** "The SUID sandbox helper binary was found..."

**Solution:**
```bash
# Option 1: Run with --no-sandbox (less secure)
virtual-ip-browser --no-sandbox

# Option 2: Fix sandbox permissions (recommended)
sudo chown root:root /opt/virtual-ip-browser/chrome-sandbox
sudo chmod 4755 /opt/virtual-ip-browser/chrome-sandbox
```

### Windows: SmartScreen Warning

**Symptom:** Windows blocks installation

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. This is expected for unsigned builds

---

## Startup Problems

### App Won't Start (Black Screen)

**Symptom:** App launches but shows black/white screen

**Solution:**
```bash
# Clear cache and restart
rm -rf ~/.config/virtual-ip-browser/Cache
rm -rf ~/.config/virtual-ip-browser/GPUCache

# Try disabling GPU acceleration
virtual-ip-browser --disable-gpu

# Check logs for errors
cat ~/.config/virtual-ip-browser/logs/main.log
```

### Crash on Startup

**Symptom:** App crashes immediately after launch

**Solution:**
```bash
# Run from terminal to see errors
virtual-ip-browser

# Try safe mode (no extensions, default settings)
virtual-ip-browser --safe-mode

# Reset configuration
mv ~/.config/virtual-ip-browser ~/.config/virtual-ip-browser.backup
virtual-ip-browser
```

### "Cannot find module" Error

**Symptom:** Module not found error in console

**Solution:**
```bash
# Reinstall the application
sudo apt remove virtual-ip-browser
sudo apt install ./virtual-ip-browser_1.3.0_amd64.deb
```

---

## Encryption & Migration

### Migration Failed Error (v1.3.0)

**Symptom:** "Encryption migration failed" on first launch after upgrade

**Causes & Solutions:**

**1. Secret Service Not Available (Linux)**
```bash
# Install gnome-keyring
sudo apt install gnome-keyring

# Or KWallet for KDE
sudo apt install kwalletmanager

# Start the keyring service
eval $(gnome-keyring-daemon --start)
export SSH_AUTH_SOCK
```

**2. Backup Exists, Manual Recovery**
```bash
# Check for backup
ls ~/.config/virtual-ip-browser/secure-config-backup.json

# Restore from backup if needed
cp ~/.config/virtual-ip-browser/secure-config-backup.json \
   ~/.config/virtual-ip-browser/secure-config.json
```

**3. Force Re-migration**
```bash
# Remove migration marker and restart
rm ~/.config/virtual-ip-browser/.migration-complete
virtual-ip-browser
```

### Cannot Decrypt Stored Credentials

**Symptom:** Proxy credentials lost after upgrade

**Solution:**
```bash
# 1. Check if backup exists
cat ~/.config/virtual-ip-browser/secure-config-backup.json

# 2. If backup has credentials, re-enter them in the app
# The new encryption will protect them with OS keychain

# 3. For complete reset
rm ~/.config/virtual-ip-browser/secure-config.json
# Re-enter all proxy credentials in the app
```

### safeStorage Not Available

**Symptom:** Warning about safeStorage unavailable

**Impact:** Credentials stored with fallback encryption (less secure)

**Solution (Linux):**
```bash
# Install and enable Secret Service
sudo apt install gnome-keyring libsecret-1-0

# Ensure D-Bus is running
dbus-launch --exit-with-session virtual-ip-browser
```

---

## Proxy Issues

### Proxy Connection Failed

**Symptom:** "Connection refused" or timeout

**Diagnostic Steps:**
```bash
# Test proxy manually
curl -x http://user:pass@proxy:port http://httpbin.org/ip

# Check if proxy is reachable
nc -zv proxy.example.com 8080
```

**Common Fixes:**
1. Verify proxy URL format: `protocol://user:pass@host:port`
2. Check firewall isn't blocking
3. Verify credentials are correct
4. Try different rotation strategy

### Proxy Validation Always Fails

**Symptom:** All proxies show as invalid

**Solution:**
1. Go to Settings → Proxy
2. Increase validation timeout (default: 10 seconds)
3. Check network connectivity
4. Verify test URL is accessible

### Rotation Not Working

**Symptom:** Same proxy used repeatedly despite rotation settings

**Checks:**
1. Verify rotation strategy is not "none"
2. Check if proxy pool has multiple proxies
3. Review rotation interval settings
4. Check circuit breaker isn't tripping all proxies

---

## Privacy & Fingerprint

### WebRTC Still Leaking IP (Fixed in v1.3.0)

**Symptom:** IP visible on WebRTC leak test sites

**Solution:**
```bash
# Update to v1.3.0 which has complete WebRTC blocking
sudo apt install ./virtual-ip-browser_1.3.0_amd64.deb

# Verify protection is enabled
# Settings → Privacy → WebRTC Protection: ON
```

### Fingerprint Not Changing

**Symptom:** Same fingerprint across sessions

**Solution:**
1. Enable all fingerprint protections in Settings → Privacy
2. Restart the browser after enabling
3. Check that tab isolation is enabled
4. Try clearing browser data

### Tracker Blocker Slow (Fixed in v1.3.0)

**Symptom:** Pages load slowly with tracker blocker

**Solution:**
```bash
# Update to v1.3.0 with bloom filter optimization
# Performance improved from O(n*m) to O(n)
```

---

## Database Issues

### Database Locked Error

**Symptom:** "SQLITE_BUSY: database is locked"

**Solution:**
```bash
# Close all instances of the app
pkill -f virtual-ip-browser

# Remove lock file if exists
rm ~/.config/virtual-ip-browser/*.db-wal
rm ~/.config/virtual-ip-browser/*.db-shm

# Restart app
virtual-ip-browser
```

### Database Corruption

**Symptom:** "database disk image is malformed"

**Solution:**
```bash
# Backup current database
cp ~/.config/virtual-ip-browser/browser.db \
   ~/.config/virtual-ip-browser/browser.db.corrupted

# Try to recover
sqlite3 ~/.config/virtual-ip-browser/browser.db ".recover" | \
  sqlite3 ~/.config/virtual-ip-browser/browser-recovered.db

# Or reset database (loses data)
rm ~/.config/virtual-ip-browser/browser.db
virtual-ip-browser  # Creates fresh database
```

### Migration 004 Failed

**Symptom:** Performance indexes not created

**Solution:**
```bash
# Check migration status
sqlite3 ~/.config/virtual-ip-browser/browser.db \
  "SELECT * FROM schema_migrations;"

# Manually apply migration
sqlite3 ~/.config/virtual-ip-browser/browser.db < \
  /opt/virtual-ip-browser/resources/migrations/004_add_performance_indexes.sql
```

---

## Performance Problems

### High Memory Usage

**Symptom:** Browser using excessive RAM

**Solutions:**
1. Close unused tabs (keep under 20)
2. Disable particle animations: Settings → Appearance → Particles: Off
3. Clear browsing data periodically
4. Restart the app to clear memory leaks

### Slow Startup

**Symptom:** App takes >5 seconds to start

**Solutions:**
```bash
# Clear cache
rm -rf ~/.config/virtual-ip-browser/Cache

# Disable animations on startup
# Settings → Appearance → Enable Animations: Off

# Check disk space
df -h ~/.config/virtual-ip-browser/
```

### UI Lag/Stuttering

**Symptom:** Interface feels slow or choppy

**Solutions:**
1. Reduce particle density: Settings → Appearance → Low/Off
2. Lower animation speed: Settings → Appearance → 0.5x
3. Enable reduced motion: Settings → Appearance → Reduced Motion: On
4. Check GPU acceleration is working

---

## UI & Animation Issues

### Animations Not Working

**Symptom:** No animations despite being enabled

**Checks:**
1. Settings → Appearance → Enable Animations: On
2. Check system "Reduce Motion" preference
3. Verify browser isn't in power-saving mode

### Particles Causing Performance Issues

**Solution:**
1. Go to Settings → Appearance
2. Set Particle Density to "Low" or "Off"
3. Or enable "Reduced Motion"

### UI Elements Missing

**Symptom:** Buttons or panels not visible

**Solution:**
```bash
# Reset UI state
rm ~/.config/virtual-ip-browser/ui-state.json
virtual-ip-browser
```

---

## Automation Issues

### Automation Not Starting

**Symptom:** Start button doesn't work

**Checks:**
1. Ensure at least one keyword is configured
2. Verify proxies are configured and valid
3. Check automation isn't paused
4. Review activity log for errors

### Search Results Not Found

**Symptom:** Automation reports "no results"

**Solutions:**
1. Try different keywords
2. Check domain filters aren't too restrictive
3. Verify proxy isn't blocked by search engine
4. Increase delay between searches

### Circuit Breaker Tripping

**Symptom:** Automation stops with "circuit open"

**Solution:**
1. Wait for circuit breaker reset (default: 60 seconds)
2. Check proxy health
3. Reduce automation aggressiveness
4. Review Settings → Resilience settings

---

## 🔍 Diagnostic Commands

### Collect Diagnostic Information

```bash
# System info
uname -a

# App version
virtual-ip-browser --version

# Check logs
tail -100 ~/.config/virtual-ip-browser/logs/main.log

# Database status
sqlite3 ~/.config/virtual-ip-browser/browser.db "PRAGMA integrity_check;"

# Config location
ls -la ~/.config/virtual-ip-browser/
```

### Generate Support Bundle

```bash
# Create diagnostic bundle
mkdir ~/vib-diagnostic
cp ~/.config/virtual-ip-browser/logs/*.log ~/vib-diagnostic/
sqlite3 ~/.config/virtual-ip-browser/browser.db ".schema" > ~/vib-diagnostic/schema.txt
cp ~/.config/virtual-ip-browser/settings.json ~/vib-diagnostic/ 2>/dev/null || true

# Remove sensitive data
# IMPORTANT: Review files before sharing!

tar -czf vib-diagnostic.tar.gz ~/vib-diagnostic/
```

---

## 📞 Getting Help

If this guide doesn't resolve your issue:

1. **Search existing issues:** https://github.com/virtualipbrowser/virtual-ip-browser/issues
2. **Create new issue** with:
   - OS and version
   - App version (v1.3.0)
   - Steps to reproduce
   - Error messages/logs
   - Screenshots if applicable
3. **Email support:** support@virtualipbrowser.com

---

*Troubleshooting Guide Version: 1.3.0*  
*Last Updated: January 2025*
