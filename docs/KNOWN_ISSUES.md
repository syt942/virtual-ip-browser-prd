# Virtual IP Browser v1.3.0 - Known Issues

**Version:** 1.3.0  
**Last Updated:** January 2025

---

## 📋 Overview

This document lists known issues in Virtual IP Browser v1.3.0 and their workarounds. Issues are categorized by severity and area.

---

## 🔴 Critical Issues

**None** - All critical issues have been resolved in v1.3.0.

---

## 🟠 High Priority Issues

### 1. Linux: Secret Service Required for Full Encryption

**ID:** KI-001  
**Severity:** High  
**Affected:** Linux without gnome-keyring or kwallet

**Description:**  
On Linux systems without a Secret Service implementation, the OS keychain encryption falls back to less secure storage.

**Impact:**  
Proxy credentials are still encrypted but not protected by OS keychain.

**Workaround:**
```bash
# Install gnome-keyring
sudo apt install gnome-keyring libsecret-1-0

# Or for KDE
sudo apt install kwalletmanager
```

**Status:** By design - Linux requires Secret Service for keychain

---

## 🟡 Medium Priority Issues

### 2. Build-Time Vulnerabilities in electron-builder

**ID:** KI-002  
**Severity:** Medium (build-time only)  
**Affected:** Development/build environment

**Description:**  
9 vulnerabilities exist in electron-builder and related build dependencies.

**Impact:**  
- Does NOT affect runtime security
- Does NOT affect end users
- Only affects developers building from source

**Workaround:**  
No action needed for end users. Developers should use isolated build environments.

**Status:** Waiting for upstream fixes in electron-builder

---

### 3. E2E Tests Require Display Server

**ID:** KI-003  
**Severity:** Medium  
**Affected:** CI/CD pipelines, headless systems

**Description:**  
End-to-end tests using Playwright require a display server (X11 or Wayland).

**Impact:**  
E2E tests fail on headless systems without Xvfb.

**Workaround:**
```bash
# Install and use Xvfb
sudo apt install xvfb
xvfb-run npm run test:e2e

# Or use Playwright's built-in headless mode
npm run test:e2e -- --headed=false
```

**Status:** Known limitation of Electron testing

---

### 4. High Memory Usage with Many Tabs

**ID:** KI-004  
**Severity:** Medium  
**Affected:** All platforms with 20+ tabs

**Description:**  
Memory usage increases significantly with many open tabs, typical of Chromium-based browsers.

**Impact:**  
Performance degradation with 20+ tabs open.

**Workaround:**
1. Keep tabs under 20 for optimal performance
2. Close unused tabs
3. Restart application periodically
4. Disable animations to reduce overhead

**Status:** Inherent to Chromium architecture

---

## 🟢 Low Priority Issues

### 5. AppImage Size Larger Than Other Formats

**ID:** KI-005  
**Severity:** Low  
**Affected:** Linux AppImage users

**Description:**  
AppImage is ~123MB compared to ~94MB for DEB.

**Impact:**  
Longer download time, more disk space for AppImage.

**Workaround:**  
Use DEB or RPM packages if size is a concern.

**Status:** Expected - AppImage bundles all dependencies

---

### 6. Animation Jank on Lower-End Hardware

**ID:** KI-006  
**Severity:** Low  
**Affected:** Systems with older GPUs or integrated graphics

**Description:**  
Magic UI animations may cause stuttering on lower-end hardware.

**Impact:**  
Visual experience degraded on older systems.

**Workaround:**
1. Settings → Appearance → Enable Animations: Off
2. Or set Particle Density: Off
3. Or enable Reduced Motion

**Status:** Cosmetic only, workaround available

---

### 7. Proxy Validation Timeout on Slow Networks

**ID:** KI-007  
**Severity:** Low  
**Affected:** Users with high-latency networks

**Description:**  
Default 10-second proxy validation timeout may be insufficient for slow networks.

**Impact:**  
Valid proxies may be marked as failed.

**Workaround:**
1. Settings → Proxy → Validation Timeout
2. Increase to 20-30 seconds

**Status:** Configurable by user

---

### 8. Some Fingerprint Tests May Detect Spoofing

**ID:** KI-008  
**Severity:** Low  
**Affected:** Advanced fingerprinting detection sites

**Description:**  
Some sophisticated fingerprinting detection may identify that values are spoofed.

**Impact:**  
Not a privacy leak, but detection that fingerprinting protection is active.

**Workaround:**  
This is acceptable behavior - the goal is to prevent unique identification, not hide protection entirely.

**Status:** Known limitation of fingerprint spoofing

---

## 📊 Issue Statistics

| Severity | Count | Fixed in v1.3.0 |
|----------|-------|-----------------|
| Critical | 0 | 4 (P0 fixes) |
| High | 1 | - |
| Medium | 3 | - |
| Low | 4 | - |
| **Total** | **8** | **4** |

---

## 🔄 Recently Resolved Issues

The following issues were resolved in v1.3.0:

| ID | Description | Resolution |
|----|-------------|------------|
| P0-001 | Static encryption key | OS keychain via safeStorage |
| P0-002 | ReDoS in tracker blocker | Bloom filter pattern matching |
| P0-003 | WebRTC protection bypass | Complete ICE/SDP blocking |
| P0-004 | Session URL validation gap | Mandatory re-validation |

---

## 📝 Reporting New Issues

If you encounter an issue not listed here:

1. **Search existing issues:** https://github.com/virtualipbrowser/virtual-ip-browser/issues

2. **Create new issue** with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - System information
   - Logs/screenshots

3. **Use issue template** for consistent reporting

---

## 🔜 Planned Fixes

| Issue | Target Version |
|-------|----------------|
| KI-004 High memory | v1.4.0 (tab hibernation) |
| KI-006 Animation jank | v1.3.1 (optimization) |

---

*Known Issues Document Version: 1.0*  
*For: Virtual IP Browser v1.3.0*  
*Last Updated: January 2025*
