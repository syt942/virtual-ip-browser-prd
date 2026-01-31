# Virtual IP Browser v1.3.0 - Comprehensive Deployment Strategy

**Version:** 1.3.0  
**Document Version:** 1.0  
**Created:** January 2025  
**Status:** Ready for Production Deployment

---

## Executive Summary

This document outlines the comprehensive deployment strategy for Virtual IP Browser v1.3.0, a security and performance release addressing 4 critical (P0) vulnerabilities with 2,444 tests passing (100% pass rate) and security audit approval.

### Release Readiness Checklist ✅

| Gate | Status | Details |
|------|--------|---------|
| Quality Gates | ✅ PASSED | All checks green |
| Test Coverage | ✅ 88%+ | 2,444 tests passing |
| Security Audit | ✅ GO | P0 vulnerabilities fixed |
| Documentation | ✅ Complete | All docs updated |
| Linux Packages | ✅ Built | AppImage, .deb, .rpm verified |
| Windows/macOS | ⏳ CI Build | Triggered on tag push |

---

## Table of Contents

1. [Release Channels](#1-release-channels)
2. [Phased Rollout Strategy](#2-phased-rollout-strategy)
3. [Distribution Platforms](#3-distribution-platforms)
4. [Update Mechanism](#4-update-mechanism)
5. [Release Artifacts](#5-release-artifacts)
6. [GitHub Release Process](#6-github-release-process)
7. [Communication Plan](#7-communication-plan)
8. [Monitoring Plan](#8-monitoring-plan)
9. [Support Plan](#9-support-plan)
10. [Success Metrics](#10-success-metrics)
11. [Timeline](#11-timeline)
12. [Risk Mitigation](#12-risk-mitigation)
13. [Rollback Triggers & Procedures](#13-rollback-triggers--procedures)
14. [Checklists](#14-checklists)

---

## 1. Release Channels

### Channel Definitions

| Channel | Tag Pattern | Purpose | Audience | Auto-Update |
|---------|-------------|---------|----------|-------------|
| **Stable** | `v1.3.0` | Production release | All users (default) | Yes |
| **Beta** | `v1.3.0-beta.X` | Early adopter testing | Opt-in testers | Yes (beta channel) |
| **Alpha/Canary** | `v1.3.0-alpha.X` | Internal testing | Developers only | No |

### Channel Configuration

```yaml
# Stable Channel (Default)
channel: stable
updateUrl: https://github.com/virtualipbrowser/virtual-ip-browser/releases/latest
autoUpdate: true
updateCheckInterval: 24h

# Beta Channel
channel: beta
updateUrl: https://github.com/virtualipbrowser/virtual-ip-browser/releases
includePrerelease: true
autoUpdate: true
updateCheckInterval: 12h

# Alpha/Canary Channel
channel: alpha
updateUrl: internal
autoUpdate: false
manualDownloadOnly: true
```

### Channel Selection Logic

```typescript
// In electron main process
function getUpdateChannel(): string {
  const userPreference = store.get('updateChannel', 'stable');
  const validChannels = ['stable', 'beta', 'alpha'];
  return validChannels.includes(userPreference) ? userPreference : 'stable';
}
```

---

## 2. Phased Rollout Strategy

### Recommendation: **Option C - Beta Testing Period (1-2 weeks) before Stable**

#### Justification

| Factor | Analysis |
|--------|----------|
| **Security Changes** | P0 encryption key migration requires careful monitoring |
| **Data Migration** | Automatic migration to OS keychain needs validation |
| **New Components** | Magic UI components need real-world testing |
| **Risk Level** | Medium-High due to encryption changes |
| **User Impact** | Breaking changes if migration fails |

#### Why Not Option A (Full Release)?
- Too risky given encryption key migration
- No opportunity to catch edge cases before wide rollout

#### Why Not Option B (Percentage Rollout)?
- GitHub Releases doesn't support percentage-based rollout natively
- Would require custom update server infrastructure
- Overkill for current user base size

### Recommended Phased Rollout Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    v1.3.0 PHASED ROLLOUT TIMELINE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: Alpha Testing (Days 1-3)                                          │
│  ═══════════════════════════════════                                        │
│  ├─ Audience: Internal development team (5-10 users)                        │
│  ├─ Tag: v1.3.0-alpha.1                                                     │
│  ├─ Focus: Migration testing, smoke tests                                   │
│  └─ Go/No-Go: 0 critical bugs, migration success rate 100%                  │
│                                                                             │
│  PHASE 2: Beta Release (Days 4-10)                                          │
│  ═══════════════════════════════════                                        │
│  ├─ Audience: Volunteer beta testers (50-100 users)                         │
│  ├─ Tag: v1.3.0-beta.1                                                      │
│  ├─ Focus: Real-world usage, diverse environments                           │
│  ├─ Feedback: GitHub Discussions, issue tracking                            │
│  └─ Go/No-Go: <2% critical bug rate, migration success >98%                 │
│                                                                             │
│  PHASE 3: Release Candidate (Days 11-14)                                    │
│  ═══════════════════════════════════════                                    │
│  ├─ Audience: Expanded beta + early adopters (200-500 users)                │
│  ├─ Tag: v1.3.0-rc.1                                                        │
│  ├─ Focus: Final validation, documentation verification                     │
│  └─ Go/No-Go: 0 blockers, security audit final sign-off                     │
│                                                                             │
│  PHASE 4: Stable Release (Day 15+)                                          │
│  ═══════════════════════════════════                                        │
│  ├─ Audience: All users                                                     │
│  ├─ Tag: v1.3.0                                                             │
│  ├─ Focus: Monitor adoption, issue response                                 │
│  └─ Success: <1% critical issue rate in first week                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Exit Criteria

| Phase | Exit Criteria | Responsible |
|-------|---------------|-------------|
| Alpha → Beta | All smoke tests pass, 0 blockers, team sign-off | Dev Lead |
| Beta → RC | <2% critical bug rate, migration >98% success | QA Lead |
| RC → Stable | 0 blockers, security sign-off, docs complete | Release Manager |

---

## 3. Distribution Platforms

### Current Distribution (v1.3.0)

#### Linux Distribution

| Platform | Package | Status | Priority |
|----------|---------|--------|----------|
| **GitHub Releases** | AppImage, .deb, .rpm | ✅ Primary | P0 |
| **Direct Download** | All formats | ✅ Ready | P0 |
| Snap Store | .snap | 📋 Future (v1.4.0) | P2 |
| Flathub | .flatpak | 📋 Future (v1.4.0) | P2 |
| AUR (Arch) | PKGBUILD | 📋 Future (v1.4.0) | P2 |

**Linux Package Details:**
```
release/
├── Virtual IP Browser-1.3.0-x86_64.AppImage  (~123 MB)
├── virtual-ip-browser_1.3.0_amd64.deb        (~94 MB)
└── virtual-ip-browser-1.3.0.x86_64.rpm       (~82 MB)
```

#### Windows Distribution

| Platform | Package | Status | Priority |
|----------|---------|--------|----------|
| **GitHub Releases** | NSIS Installer, Portable | ✅ Primary | P0 |
| **Direct Download** | All formats | ✅ Ready | P0 |
| Microsoft Store | MSIX | 📋 Future (v1.5.0) | P3 |
| Chocolatey | .nupkg | 📋 Future (v1.4.0) | P2 |
| winget | manifest | 📋 Future (v1.4.0) | P2 |

**Windows Package Details:**
```
release/
├── Virtual IP Browser Setup 1.3.0.exe        (~95 MB)
└── Virtual IP Browser 1.3.0 Portable.exe     (~120 MB)
```

#### macOS Distribution

| Platform | Package | Status | Priority |
|----------|---------|--------|----------|
| **GitHub Releases** | DMG, ZIP | ✅ Primary | P0 |
| **Direct Download** | All formats | ✅ Ready | P0 |
| Homebrew Cask | Formula | 📋 Future (v1.4.0) | P2 |
| Mac App Store | .app | 📋 Future (v2.0.0) | P3 |

**macOS Package Details:**
```
release/
├── Virtual IP Browser-1.3.0.dmg              (~110 MB)
├── Virtual IP Browser-1.3.0-arm64.dmg        (~105 MB)
└── Virtual IP Browser-1.3.0-mac.zip          (~108 MB)
```

### Future Distribution Roadmap

```
v1.3.0 (Current)     v1.4.0 (Q2 2025)      v1.5.0 (Q3 2025)
─────────────────    ─────────────────     ─────────────────
GitHub Releases      + Snap Store          + Microsoft Store
Direct Download      + Flathub             + Mac App Store
                     + AUR                 
                     + Chocolatey          
                     + Homebrew Cask       
                     + winget              
```

---

## 4. Update Mechanism

### Electron autoUpdater Configuration

The application uses `electron-builder`'s built-in auto-update with GitHub Releases as the update server.

#### Current Configuration (package.json)

```json
{
  "publish": {
    "provider": "github",
    "owner": "virtualipbrowser",
    "repo": "virtual-ip-browser",
    "releaseType": "release"
  }
}
```

#### Update Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTO-UPDATE FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. APPLICATION STARTUP                                                     │
│     ├─► Check update settings (enabled/disabled)                            │
│     ├─► Determine update channel (stable/beta/alpha)                        │
│     └─► Schedule update check (immediate or delayed)                        │
│                                                                             │
│  2. UPDATE CHECK                                                            │
│     ├─► Query GitHub Releases API                                           │
│     ├─► Compare current version vs latest release                           │
│     ├─► Filter by channel (prerelease flag)                                 │
│     └─► Determine if update available                                       │
│                                                                             │
│  3. UPDATE AVAILABLE                                                        │
│     ├─► Show notification to user                                           │
│     ├─► Display release notes summary                                       │
│     ├─► Offer "Download Now" or "Later" options                             │
│     └─► Begin background download if auto-download enabled                  │
│                                                                             │
│  4. DOWNLOAD UPDATE                                                         │
│     ├─► Download platform-specific package                                  │
│     ├─► Verify SHA256 checksum                                              │
│     ├─► Show download progress                                              │
│     └─► Store in temp directory                                             │
│                                                                             │
│  5. INSTALL UPDATE                                                          │
│     ├─► Prompt user to restart                                              │
│     ├─► Close application gracefully                                        │
│     ├─► Run installer/apply update                                          │
│     └─► Relaunch updated application                                        │
│                                                                             │
│  6. POST-UPDATE (v1.3.0 specific)                                           │
│     ├─► Detect version upgrade from v1.2.x                                  │
│     ├─► Create backup of existing config                                    │
│     ├─► Run encryption key migration                                        │
│     ├─► Apply database migration 004                                        │
│     └─► Verify migration success                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Update Settings UI

```typescript
// Settings panel options for users
interface UpdateSettings {
  autoCheckUpdates: boolean;      // Default: true
  autoDownloadUpdates: boolean;   // Default: true
  updateChannel: 'stable' | 'beta'; // Default: 'stable'
  checkIntervalHours: number;     // Default: 24
  showReleaseNotes: boolean;      // Default: true
}
```

#### Update Server Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Update manifest | `latest.yml`, `latest-mac.yml`, `latest-linux.yml` | ✅ Auto-generated |
| Artifact hosting | GitHub Releases | ✅ Ready |
| HTTPS | GitHub provides | ✅ Ready |
| Version comparison | Semver-based | ✅ Built-in |
| Delta updates | Not supported (full download) | ℹ️ Future |

---

## 5. Release Artifacts

### Artifact Matrix

| Platform | Format | Filename | Size | Checksum |
|----------|--------|----------|------|----------|
| **Linux** | AppImage | `Virtual IP Browser-1.3.0-x86_64.AppImage` | ~123 MB | SHA256 |
| **Linux** | Debian | `virtual-ip-browser_1.3.0_amd64.deb` | ~94 MB | SHA256 |
| **Linux** | RPM | `virtual-ip-browser-1.3.0.x86_64.rpm` | ~82 MB | SHA256 |
| **Windows** | NSIS | `Virtual IP Browser Setup 1.3.0.exe` | ~95 MB | SHA256 |
| **Windows** | Portable | `Virtual IP Browser 1.3.0 Portable.exe` | ~120 MB | SHA256 |
| **macOS** | DMG (Intel) | `Virtual IP Browser-1.3.0.dmg` | ~110 MB | SHA256 |
| **macOS** | DMG (ARM) | `Virtual IP Browser-1.3.0-arm64.dmg` | ~105 MB | SHA256 |
| **macOS** | ZIP | `Virtual IP Browser-1.3.0-mac.zip` | ~108 MB | SHA256 |

### Required Artifacts per Release

```
release/
├── Packages/
│   ├── Virtual IP Browser-1.3.0-x86_64.AppImage
│   ├── virtual-ip-browser_1.3.0_amd64.deb
│   ├── virtual-ip-browser-1.3.0.x86_64.rpm
│   ├── Virtual IP Browser Setup 1.3.0.exe
│   ├── Virtual IP Browser 1.3.0 Portable.exe
│   ├── Virtual IP Browser-1.3.0.dmg
│   ├── Virtual IP Browser-1.3.0-arm64.dmg
│   └── Virtual IP Browser-1.3.0-mac.zip
│
├── Checksums/
│   └── SHA256SUMS.txt
│
├── Signatures/ (Recommended - Future)
│   ├── SHA256SUMS.txt.asc (GPG signature)
│   └── SHA256SUMS.txt.sig (GPG detached signature)
│
└── Metadata/
    ├── latest.yml          (Windows auto-update manifest)
    ├── latest-mac.yml      (macOS auto-update manifest)
    └── latest-linux.yml    (Linux auto-update manifest)
```

### SHA256 Checksum Generation

```bash
# Generate checksums (run in release directory)
sha256sum *.AppImage *.deb *.rpm *.exe *.dmg *.zip > SHA256SUMS.txt

# Verify checksums
sha256sum -c SHA256SUMS.txt
```

### GPG Signing (Recommended for Future)

```bash
# Sign the checksum file
gpg --armor --detach-sign SHA256SUMS.txt

# Verify signature
gpg --verify SHA256SUMS.txt.asc SHA256SUMS.txt
```

---

## 6. GitHub Release Process

### Step-by-Step Release Procedure

#### Step 1: Pre-Release Verification

```bash
# 1.1 Ensure all tests pass
npm test -- --run
npm run test:e2e

# 1.2 Verify version in package.json
cat package.json | grep '"version"'
# Expected: "version": "1.3.0"

# 1.3 Verify changelog is updated
head -50 CHANGELOG.md

# 1.4 Run final build
npm run build
```

#### Step 2: Create Git Tag

```bash
# 2.1 Ensure on main branch with latest changes
git checkout main
git pull origin main

# 2.2 Create annotated tag
git tag -a v1.3.0 -m "Release v1.3.0 - Security & Performance Release

Highlights:
- 4 P0 security vulnerabilities fixed
- OS keychain encryption (safeStorage API)
- 8.54x database performance improvement
- 88%+ test coverage (2,444 tests)
- 5 new Magic UI components

See RELEASE_NOTES.md for full details."

# 2.3 Verify tag
git show v1.3.0
```

#### Step 3: Push Tag (Triggers CI)

```bash
# 3.1 Push tag to origin
git push origin v1.3.0

# 3.2 Monitor CI workflow
# Go to: https://github.com/virtualipbrowser/virtual-ip-browser/actions
# Workflow: "Build and Release v1.3.0"
```

#### Step 4: CI Build Process

The `.github/workflows/release.yml` workflow automatically:

1. **Validates** - TypeScript, ESLint, unit tests
2. **Builds Linux** - AppImage, .deb, .rpm on `ubuntu-latest`
3. **Builds Windows** - NSIS, Portable on `windows-latest`
4. **Builds macOS** - DMG, ZIP on `macos-latest`
5. **Generates checksums** - SHA256 for all artifacts
6. **Creates draft release** - Uploads all artifacts

#### Step 5: Review Draft Release

```markdown
1. Go to: https://github.com/virtualipbrowser/virtual-ip-browser/releases
2. Find draft release "Virtual IP Browser v1.3.0"
3. Verify:
   - [ ] All 8 artifacts uploaded
   - [ ] SHA256SUMS.txt present
   - [ ] Release notes render correctly
   - [ ] Version number correct in title
```

#### Step 6: Test Downloaded Artifacts

```bash
# 6.1 Download and verify checksums
wget https://github.com/.../SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt

# 6.2 Test installation on each platform
# Linux: Run AppImage, install .deb
# Windows: Run installer, test portable
# macOS: Mount DMG, verify app launches
```

#### Step 7: Publish Release

```markdown
1. Edit release if needed
2. Uncheck "This is a pre-release" (for stable)
3. Check "Set as the latest release"
4. Click "Publish release"
```

### Release Naming Convention

| Release Type | Tag | GitHub Release Title |
|--------------|-----|----------------------|
| Stable | `v1.3.0` | `Virtual IP Browser v1.3.0` |
| Beta | `v1.3.0-beta.1` | `Virtual IP Browser v1.3.0 Beta 1` |
| RC | `v1.3.0-rc.1` | `Virtual IP Browser v1.3.0 Release Candidate 1` |
| Hotfix | `v1.3.1` | `Virtual IP Browser v1.3.1 (Hotfix)` |

---

## 7. Communication Plan

### Communication Timeline

| Phase | Timing | Channel | Audience | Message Type |
|-------|--------|---------|----------|--------------|
| Pre-Release | Day -7 | GitHub Discussions | Beta testers | Beta announcement |
| Pre-Release | Day -3 | README badge | Developers | "Coming Soon" |
| Release Day | Day 0 | GitHub Release | All users | Release announcement |
| Release Day | Day 0 | Project website | All visitors | Download page update |
| Post-Release | Day +1 | Social media | Community | Feature highlights |
| Post-Release | Day +7 | Email (if list) | Subscribers | Release summary |

### Communication Templates

#### GitHub Release Announcement

See `docs/GITHUB_RELEASE_DRAFT.md` for the complete release description template.

#### Beta Tester Announcement (GitHub Discussions)

```markdown
## 🧪 Virtual IP Browser v1.3.0 Beta Testing

We're preparing to release v1.3.0, our biggest security and performance update yet!

### What's New
- 🔐 OS-level encryption for credentials (Windows DPAPI, macOS Keychain, Linux Secret Service)
- ⚡ 8.54x faster database operations
- 🎨 New Magic UI components with animations
- 🛡️ 4 critical security fixes

### How to Participate
1. Download the beta from [Releases](link) (look for v1.3.0-beta.1)
2. Install and test your normal workflow
3. Report issues in this thread or create new issues

### Focus Areas
- [ ] Encryption migration from v1.2.x
- [ ] Proxy authentication still works
- [ ] Performance feels snappy
- [ ] No crashes or data loss

Thank you for helping us make v1.3.0 rock-solid! 🙏
```

#### Social Media Announcement

```markdown
🚀 Virtual IP Browser v1.3.0 Released!

Major security & performance update:
✅ OS-level credential encryption
✅ 8.54x faster database
✅ 88%+ test coverage
✅ Beautiful new UI animations

Download: [link]
Release notes: [link]

#privacy #security #electron #opensource
```

#### README Badge Update

```markdown
<!-- Before release -->
[![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](releases)

<!-- After release -->
[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](releases)
[![Security](https://img.shields.io/badge/security-hardened-green.svg)](SECURITY.md)
```

### Post-Release Communication

| Trigger | Response | Channel | SLA |
|---------|----------|---------|-----|
| Critical bug reported | Acknowledge + investigate | GitHub Issue | 4 hours |
| Migration failure | Provide recovery steps | GitHub Issue | 2 hours |
| Security issue | Private disclosure process | Email | 1 hour |
| Feature question | Answer or link to docs | GitHub Discussions | 24 hours |

---

## 8. Monitoring Plan

### Monitoring Dashboard Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    POST-RELEASE MONITORING DASHBOARD                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  DOWNLOADS      │  │  ISSUES         │  │  MIGRATION      │              │
│  │  ───────────    │  │  ───────────    │  │  ───────────    │              │
│  │  Day 1: ___     │  │  Open: ___      │  │  Success: ___%  │              │
│  │  Week 1: ___    │  │  Critical: ___  │  │  Failed: ___%   │              │
│  │  Month 1: ___   │  │  Closed: ___    │  │  Pending: ___%  │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  PLATFORMS      │  │  UPDATE RATE    │  │  FEEDBACK       │              │
│  │  ───────────    │  │  ───────────    │  │  ───────────    │              │
│  │  Linux: ___%    │  │  Auto: ___%     │  │  Positive: ___  │              │
│  │  Windows: ___%  │  │  Manual: ___%   │  │  Negative: ___  │              │
│  │  macOS: ___%    │  │  Skipped: ___%  │  │  Neutral: ___   │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Metrics to Track

| Metric | Source | Target | Alert Threshold |
|--------|--------|--------|-----------------|
| **Download Count** | GitHub API | 500 week 1 | N/A |
| **Critical Issues** | GitHub Issues | 0 | >3 triggers review |
| **Migration Success** | User reports | >98% | <95% triggers halt |
| **Crash Reports** | GitHub Issues | <1% | >5% triggers rollback |
| **Update Adoption** | GitHub API | 50% week 1 | <20% investigate |

### GitHub Issue Monitoring

```bash
# Query for v1.3.0 related issues
# Use GitHub CLI or API

# Critical issues
gh issue list --label "critical" --label "v1.3.0"

# Migration issues
gh issue list --label "migration" --label "v1.3.0"

# All v1.3.0 issues
gh issue list --search "v1.3.0 in:title,body"
```

### Issue Labels for v1.3.0

| Label | Color | Description |
|-------|-------|-------------|
| `v1.3.0` | `#0052CC` | Affects v1.3.0 |
| `migration` | `#FBCA04` | Migration-related |
| `encryption` | `#D93F0B` | Encryption issues |
| `critical` | `#B60205` | Critical/blocking |
| `regression` | `#E99695` | Regression from v1.2.x |

### Monitoring Schedule

| Period | Frequency | Focus |
|--------|-----------|-------|
| Day 1-3 | Every 2 hours | Critical issues, migration failures |
| Day 4-7 | Every 6 hours | Issue trends, user feedback |
| Week 2 | Daily | Adoption rate, lingering issues |
| Week 3-4 | Every 2 days | Long-term stability |
| Month 2+ | Weekly | Maintenance mode |

### Analytics (Future Implementation)

```typescript
// Optional: Anonymous usage analytics
interface UsageMetrics {
  version: string;
  platform: string;
  migrationStatus: 'success' | 'failed' | 'skipped';
  encryptionBackend: 'safeStorage' | 'fallback';
  featuresUsed: string[];
  sessionDuration: number;
}

// Privacy-first: Opt-in only, no PII
```

---

## 9. Support Plan

### Support Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| **GitHub Discussions** | `/discussions` | Q&A, feature requests |
| **GitHub Issues** | `/issues` | Bug reports |
| **Documentation** | `/docs/` | Self-service help |
| **Migration Guide** | `MIGRATION_GUIDE.md` | v1.2.x → v1.3.0 |
| **Security** | `SECURITY.md` | Vulnerability reporting |

### Issue Templates

#### Bug Report Template

```markdown
---
name: Bug Report
about: Report a bug in v1.3.0
labels: bug, v1.3.0, needs-triage
---

**Version:** 1.3.0
**Platform:** [Linux/Windows/macOS]
**Upgraded from:** [v1.2.1/Fresh install]

**Describe the bug:**
<!-- Clear description -->

**Steps to reproduce:**
1. 
2. 
3. 

**Expected behavior:**
<!-- What should happen -->

**Screenshots/Logs:**
<!-- Attach if applicable -->

**Migration status:**
- [ ] Migration completed successfully
- [ ] Migration failed (describe error)
- [ ] Fresh install (no migration)
```

#### Migration Issue Template

```markdown
---
name: Migration Issue
about: Report problems upgrading to v1.3.0
labels: migration, v1.3.0, high-priority
---

**Previous version:** 
**Current version:** 1.3.0
**Platform:** [Linux/Windows/macOS]

**Migration error:**
<!-- Exact error message -->

**Backup location:**
<!-- Path to backup folder -->

**Proxy credentials affected:**
- [ ] Yes, cannot authenticate
- [ ] No, working fine
- [ ] Not using proxy authentication

**Steps tried:**
<!-- What you've attempted -->
```

### Support Tiers

| Tier | Response Time | Resolution Time | Escalation |
|------|---------------|-----------------|------------|
| **Critical** (data loss, security) | 2 hours | 24 hours | Immediate dev team |
| **High** (app won't start, migration fail) | 4 hours | 48 hours | Dev team within 4h |
| **Medium** (feature broken) | 24 hours | 1 week | Standard triage |
| **Low** (cosmetic, enhancement) | 48 hours | Best effort | Backlog |

### Troubleshooting Guide

#### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Proxy auth fails after upgrade** | Re-enter credentials in Proxy Panel |
| **Migration error on Linux** | Install `gnome-keyring` or `kwallet` |
| **App won't start** | Delete `~/.config/virtual-ip-browser/` and reinstall |
| **Slow performance** | Clear activity logs via Settings |
| **UI animations laggy** | Disable animations in Settings → Animation |

### Escalation Path

```
User Report
    │
    ▼
GitHub Issue Created
    │
    ▼
Triage (within 24h)
    │
    ├─► Low/Medium → Backlog
    │
    ├─► High → Developer assignment (48h)
    │
    └─► Critical → Immediate dev attention
                   │
                   ├─► Hotfix release (if widespread)
                   │
                   └─► Rollback (if catastrophic)
```

---

## 10. Success Metrics

### Download Targets

| Timeframe | Target | Stretch Goal |
|-----------|--------|--------------|
| **Day 1** | 50 downloads | 100 downloads |
| **Week 1** | 500 downloads | 1,000 downloads |
| **Month 1** | 2,000 downloads | 5,000 downloads |
| **Quarter 1** | 10,000 downloads | 20,000 downloads |

### Quality Metrics

| Metric | Target | Acceptable | Failure |
|--------|--------|------------|---------|
| **Critical Bug Rate** | 0% | <1% | >5% |
| **Migration Success** | >99% | >95% | <90% |
| **Crash Rate** | <0.5% | <2% | >5% |
| **1-Star Reviews** | 0 | <5% | >10% |

### Adoption Metrics

| Metric | Week 1 | Month 1 | Quarter 1 |
|--------|--------|---------|-----------|
| **Update Adoption** | 30% | 70% | 95% |
| **New User Ratio** | 20% | 30% | 40% |
| **Platform Distribution** | Baseline | Monitor | Analyze |

### User Satisfaction Metrics

| Source | Metric | Target |
|--------|--------|--------|
| GitHub Stars | Net new stars | +50/month |
| GitHub Issues | Issue resolution time | <7 days avg |
| GitHub Discussions | Response rate | >90% |
| User Feedback | Positive sentiment | >80% |

### Performance Metrics

| Metric | v1.2.1 Baseline | v1.3.0 Target | Measured |
|--------|-----------------|---------------|----------|
| Cold start time | <3s | <3s | TBD |
| Memory usage (10 tabs) | <500MB | <500MB | TBD |
| DB query time (1000 rows) | 850ms | <150ms | 99ms ✅ |
| Pattern matching | 120ms | <50ms | TBD |

### Success Criteria Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       v1.3.0 SUCCESS CRITERIA                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ MUST ACHIEVE (Release blockers if not met)                              │
│  ─────────────────────────────────────────────                              │
│  □ Migration success rate >95%                                              │
│  □ Zero critical security issues                                            │
│  □ All platforms buildable and installable                                  │
│  □ Core functionality working (proxy, privacy, tabs)                        │
│                                                                             │
│  🎯 SHOULD ACHIEVE (Target metrics)                                         │
│  ─────────────────────────────────────                                      │
│  □ 500+ downloads in week 1                                                 │
│  □ <1% critical bug rate                                                    │
│  □ 50%+ update adoption in month 1                                          │
│  □ Positive user feedback >80%                                              │
│                                                                             │
│  🌟 NICE TO ACHIEVE (Stretch goals)                                         │
│  ──────────────────────────────────                                         │
│  □ 1,000+ downloads in week 1                                               │
│  □ Featured in tech blogs/newsletters                                       │
│  □ Community contributions increase                                         │
│  □ 100+ new GitHub stars                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Timeline

### Master Release Schedule

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    v1.3.0 RELEASE TIMELINE (22 DAYS)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: PREPARATION (Days 1-3)                                            │
│  ═══════════════════════════════                                            │
│  Day 1  │ Final code freeze, version verification                           │
│  Day 2  │ Windows/macOS build validation, code signing setup                │
│  Day 3  │ Alpha build (v1.3.0-alpha.1), internal testing                    │
│                                                                             │
│  PHASE 2: ALPHA TESTING (Days 4-6)                                          │
│  ═══════════════════════════════                                            │
│  Day 4  │ Internal team testing (5-10 users)                                │
│  Day 5  │ Migration testing from v1.2.1 and v1.2.0                          │
│  Day 6  │ Bug fixes, alpha sign-off                                         │
│                                                                             │
│  PHASE 3: BETA RELEASE (Days 7-13)                                          │
│  ════════════════════════════════                                           │
│  Day 7  │ 🚀 v1.3.0-beta.1 release                                          │
│  Day 8  │ Beta tester recruitment, monitoring begins                        │
│  Day 9  │ Collect initial feedback                                          │
│  Day 10 │ Address critical beta issues                                      │
│  Day 11 │ v1.3.0-beta.2 if needed                                           │
│  Day 12 │ Expanded beta testing                                             │
│  Day 13 │ Beta assessment, Go/No-Go for RC                                  │
│                                                                             │
│  PHASE 4: RELEASE CANDIDATE (Days 14-18)                                    │
│  ═══════════════════════════════════════                                    │
│  Day 14 │ 🚀 v1.3.0-rc.1 release                                            │
│  Day 15 │ Final security audit sign-off                                     │
│  Day 16 │ Documentation finalization                                        │
│  Day 17 │ Final bug fixes                                                   │
│  Day 18 │ Release preparation, Go/No-Go for stable                          │
│                                                                             │
│  PHASE 5: STABLE RELEASE (Days 19-22)                                       │
│  ═════════════════════════════════════                                      │
│  Day 19 │ 🎉 v1.3.0 STABLE RELEASE                                          │
│  Day 20 │ Intensive monitoring (every 2 hours)                              │
│  Day 21 │ Address any critical issues                                       │
│  Day 22 │ Post-release review meeting                                       │
│                                                                             │
│  POST-RELEASE (Days 23-30)                                                  │
│  ═════════════════════════                                                  │
│  Day 23-26 │ Monitor adoption, respond to issues                            │
│  Day 27-28 │ Hotfix v1.3.1 if needed                                        │
│  Day 29-30 │ Post-release documentation, retrospective                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Milestone Checklist

| Milestone | Target Day | Success Criteria | Owner |
|-----------|------------|------------------|-------|
| **M1: Code Freeze** | Day 1 | All features merged, tests passing | Dev Lead |
| **M2: Builds Ready** | Day 3 | All platform builds successful | DevOps |
| **M3: Alpha Sign-off** | Day 6 | 0 blockers, migration works | QA Lead |
| **M4: Beta Released** | Day 7 | v1.3.0-beta.1 published | Release Mgr |
| **M5: Beta Validated** | Day 13 | <2% critical bug rate | QA Lead |
| **M6: RC Released** | Day 14 | v1.3.0-rc.1 published | Release Mgr |
| **M7: Security Sign-off** | Day 15 | Final audit approval | Security Lead |
| **M8: Stable Released** | Day 19 | v1.3.0 published | Release Mgr |
| **M9: Post-Release Stable** | Day 22 | <1% critical issue rate | Team |

### Daily Tasks by Phase

#### Phase 1: Preparation (Days 1-3)

| Day | Task | Owner | Duration |
|-----|------|-------|----------|
| 1 | Verify `package.json` version is 1.3.0 | Dev | 5 min |
| 1 | Final CHANGELOG.md review | Dev | 30 min |
| 1 | Run full test suite | CI | 15 min |
| 2 | Trigger Windows CI build | DevOps | 1 hr |
| 2 | Trigger macOS CI build | DevOps | 1 hr |
| 2 | Configure code signing secrets | DevOps | 2 hrs |
| 3 | Create alpha tag `v1.3.0-alpha.1` | Dev Lead | 15 min |
| 3 | Build alpha packages | CI | 30 min |
| 3 | Distribute to internal team | Dev Lead | 15 min |

#### Phase 2: Alpha Testing (Days 4-6)

| Day | Task | Owner | Duration |
|-----|------|-------|----------|
| 4 | Smoke test: Linux AppImage | Tester 1 | 1 hr |
| 4 | Smoke test: Windows installer | Tester 2 | 1 hr |
| 4 | Smoke test: macOS DMG | Tester 3 | 1 hr |
| 5 | Migration test: v1.2.1 → v1.3.0 | QA | 2 hrs |
| 5 | Migration test: v1.2.0 → v1.3.0 | QA | 2 hrs |
| 5 | Encryption verification | Security | 1 hr |
| 6 | Fix alpha blockers | Dev | As needed |
| 6 | Alpha sign-off meeting | Team | 30 min |

#### Phase 3: Beta Release (Days 7-13)

| Day | Task | Owner | Duration |
|-----|------|-------|----------|
| 7 | Create beta tag `v1.3.0-beta.1` | Release Mgr | 15 min |
| 7 | Publish beta to GitHub Releases | Release Mgr | 30 min |
| 7 | Post beta announcement | Release Mgr | 30 min |
| 8-12 | Monitor GitHub issues | Team | Ongoing |
| 8-12 | Respond to beta feedback | Support | Ongoing |
| 10 | Fix critical beta issues | Dev | As needed |
| 11 | Release beta.2 if needed | Release Mgr | 2 hrs |
| 13 | Beta assessment meeting | Team | 1 hr |

---

## 12. Risk Mitigation

### Risk Assessment Matrix

| ID | Risk | Probability | Impact | Severity | Mitigation |
|----|------|-------------|--------|----------|------------|
| **R1** | Encryption migration fails | Low (10%) | Critical | 🔴 HIGH | Auto-backup, rollback procedure |
| **R2** | safeStorage unavailable (Linux) | Medium (25%) | High | 🔴 HIGH | Fallback encryption, docs |
| **R3** | Windows/macOS build fails | Medium (20%) | High | 🟠 MEDIUM | Early CI testing, fallback |
| **R4** | Performance regression | Low (10%) | Medium | 🟡 MEDIUM | Benchmarks, monitoring |
| **R5** | Database migration fails | Very Low (5%) | High | 🟡 MEDIUM | Transactions, backup |
| **R6** | Auto-update breaks | Low (15%) | Medium | 🟡 MEDIUM | Manual download option |
| **R7** | Poor user adoption | Medium (30%) | Low | 🟢 LOW | Communication, incentives |
| **R8** | Security vuln discovered post-release | Low (5%) | Critical | 🔴 HIGH | Rapid response process |

### Detailed Mitigation Strategies

#### R1: Encryption Migration Fails (HIGH RISK)

**Scenario:** User's encrypted credentials become inaccessible after migration.

**Prevention:**
- Automatic backup before any migration (`backup-v1.2.x/`)
- Verification step: decrypt → re-encrypt → verify before commit
- Legacy format supported for 1 release cycle

**Detection:**
- Migration status logged to console and file
- Error dialog shown to user on failure
- Security events emitted for monitoring

**Response:**
1. User restores from automatic backup
2. User downgrades to v1.2.1 if needed
3. Support team assists via GitHub issue
4. Hotfix released if pattern identified

#### R2: safeStorage Unavailable on Linux (HIGH RISK)

**Scenario:** Linux systems without keyring service can't use OS encryption.

**Prevention:**
- Fallback to machine-derived encryption key
- Clear documentation of prerequisites
- `allowPlaintextFallback` config option for advanced users

**Detection:**
- Check `safeStorage.isEncryptionAvailable()` on startup
- Warning logged and shown to user

**Response:**
1. Display warning about reduced security
2. Guide user to install keyring (`gnome-keyring` or `kwallet`)
3. Document Docker/container-specific guidance

#### R3: Windows/macOS Build Fails (MEDIUM RISK)

**Scenario:** Platform-specific issues prevent builds.

**Prevention:**
- CI builds on all platforms before release
- Code signing certificates pre-configured
- Early platform testing in alpha phase

**Response:**
1. Fix platform-specific issues
2. Release Linux first if urgent (partial release)
3. Delay full release until all platforms ready

#### R8: Security Vulnerability Discovered Post-Release (HIGH RISK)

**Scenario:** Critical security issue found after stable release.

**Prevention:**
- Comprehensive security testing (42 security tests)
- Final security audit before release
- Dependency vulnerability scanning

**Response (Security Incident Response):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SECURITY INCIDENT RESPONSE FLOW                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DISCOVERY (0-1 hour)                                                    │
│     ├─► Assess severity (Critical/High/Medium/Low)                          │
│     ├─► Determine scope (affected versions, users)                          │
│     └─► Notify security lead immediately                                    │
│                                                                             │
│  2. CONTAINMENT (1-4 hours)                                                 │
│     ├─► If Critical: Consider rollback or emergency fix                     │
│     ├─► Mark release as pre-release to stop auto-updates                    │
│     └─► Post security advisory (draft, not public)                          │
│                                                                             │
│  3. FIX DEVELOPMENT (4-24 hours)                                            │
│     ├─► Develop and test fix                                                │
│     ├─► Security review of fix                                              │
│     └─► Prepare hotfix release                                              │
│                                                                             │
│  4. RELEASE & DISCLOSURE (24-48 hours)                                      │
│     ├─► Release hotfix (v1.3.1)                                             │
│     ├─► Publish security advisory                                           │
│     ├─► Notify users via GitHub and email                                   │
│     └─► Request CVE if applicable                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Rollback Triggers & Procedures

### Rollback Decision Matrix

| Condition | Severity | Action | Timeline |
|-----------|----------|--------|----------|
| Migration fails >5% of users | Critical | Immediate rollback | <2 hours |
| Data loss reported | Critical | Immediate rollback | <1 hour |
| Security vulnerability (exploited) | Critical | Immediate rollback + advisory | <1 hour |
| App won't start (>10% users) | High | Rollback within 4 hours | <4 hours |
| Core feature broken | High | Hotfix or rollback | <24 hours |
| Security vulnerability (theoretical) | High | Hotfix within 48 hours | <48 hours |
| Performance >50% degraded | Medium | Investigate, hotfix if needed | <1 week |
| Minor bugs | Low | Fix in v1.3.1 | Scheduled |

### Rollback Procedure

#### Step 1: Decision to Rollback

```markdown
**Rollback Authorization:**
- Critical issues: Any team member can initiate
- High issues: Requires Release Manager approval
- Medium issues: Requires Team consensus

**Document the decision:**
- Issue ID(s) triggering rollback
- Number of affected users (estimated)
- Severity assessment
- Alternatives considered
```

#### Step 2: Execute Rollback

```bash
# 2.1 Mark v1.3.0 as pre-release (stops auto-updates)
# GitHub UI: Edit release → Check "This is a pre-release"

# 2.2 Update latest.yml to point to v1.2.1
# This file controls auto-update for existing users
cat > latest.yml << EOF
version: 1.2.1
releaseDate: '2025-01-XX'
EOF

# 2.3 Update GitHub release notes
# Add warning banner to v1.3.0 release
```

#### Step 3: User Communication

```markdown
## ⚠️ Important Notice: v1.3.0 Temporarily Unavailable

We've identified an issue affecting some users and have temporarily 
pulled v1.3.0 while we investigate.

**If you're on v1.3.0:**
1. Your data is safe (automatic backup was created)
2. You can continue using v1.3.0 or downgrade to v1.2.1
3. [Download v1.2.1 here](link)

**To restore from backup:**
```bash
# Linux/macOS
cp -r ~/.config/virtual-ip-browser/backup-v1.2.x/* ~/.config/virtual-ip-browser/
```

**We apologize for the inconvenience and will release a fixed version soon.**
```

#### Step 4: Restore Procedures for Users

**Linux/macOS:**
```bash
# Close the application
pkill virtual-ip-browser

# Restore backup
cp -r ~/.config/virtual-ip-browser/backup-v1.2.x/* ~/.config/virtual-ip-browser/

# Download and install v1.2.1
wget https://github.com/.../virtual-ip-browser_1.2.1_amd64.deb
sudo dpkg -i virtual-ip-browser_1.2.1_amd64.deb
```

**Windows:**
```powershell
# Close the application via Task Manager

# Restore backup
Copy-Item -Recurse "$env:APPDATA\virtual-ip-browser\backup-v1.2.x\*" "$env:APPDATA\virtual-ip-browser\"

# Download and run v1.2.1 installer
```

#### Step 5: Post-Rollback Actions

```markdown
- [ ] Root cause analysis started
- [ ] Fix identified and tested
- [ ] New release timeline communicated
- [ ] All affected users contacted
- [ ] Retrospective scheduled
```

---

## 14. Checklists

### 14.1 Pre-Release Checklist

#### Code Quality ✅

- [x] All tests passing (2,444/2,444)
- [x] Test coverage ≥80% (achieved 88%+)
- [x] No ESLint errors or warnings
- [x] TypeScript compilation clean
- [x] No `console.log` statements in production code
- [x] Security tests passing (42 tests)
- [x] E2E tests passing (100% PRD coverage)

#### Documentation ✅

- [x] CHANGELOG.md updated with v1.3.0 entry
- [x] README.md version references current
- [x] RELEASE_NOTES.md created
- [x] MIGRATION_GUIDE.md created
- [x] docs/GITHUB_RELEASE_DRAFT.md prepared
- [x] SECURITY.md current
- [x] API documentation current

#### Security ✅

- [x] Security audit completed (GO status)
- [x] P0 vulnerabilities fixed (4/4)
- [x] WebRTC leak protection verified
- [x] Fingerprint protection verified
- [x] SSRF protection verified
- [x] ReDoS protection verified
- [x] Encryption migration tested
- [x] No hardcoded secrets in codebase

#### Build & Package

- [x] `package.json` version set to `1.3.0`
- [x] Linux builds validated (AppImage, deb, rpm)
- [ ] Windows builds validated (NSIS, portable)
- [ ] macOS builds validated (dmg, zip)
- [ ] Code signing configured (Windows)
- [ ] Code signing configured (macOS)
- [ ] macOS notarization configured
- [ ] All packages under 150MB

### 14.2 Release Day Checklist

#### Pre-Release Morning

```markdown
- [ ] Team availability confirmed
- [ ] Communication channels ready
- [ ] Monitoring dashboard set up
- [ ] Final CI build green
- [ ] Release notes finalized
- [ ] All checksums generated
```

#### Release Execution

```markdown
- [ ] Git tag created: `git tag -a v1.3.0 -m "..."`
- [ ] Tag pushed: `git push origin v1.3.0`
- [ ] CI workflow completed successfully
- [ ] All 8 artifacts uploaded to draft release
- [ ] SHA256SUMS.txt present
- [ ] Release notes render correctly
- [ ] Download links tested (each platform)
- [ ] Release published (not draft)
```

#### Post-Release Immediate (First 4 hours)

```markdown
- [ ] GitHub release accessible
- [ ] Download counts increasing
- [ ] Auto-update working (test on each platform)
- [ ] Website download page updated
- [ ] Announcement posted
- [ ] GitHub Discussions updated
- [ ] No critical issues reported
```

#### Post-Release Day 1

```markdown
- [ ] Check GitHub issues (v1.3.0 label)
- [ ] Review user feedback
- [ ] Monitor error reports
- [ ] Respond to questions
- [ ] Track download statistics
- [ ] Migration success reports
```

### 14.3 Platform Smoke Test Checklist

#### All Platforms

```markdown
- [ ] Application launches without errors
- [ ] Main window displays correctly
- [ ] All panels accessible:
    - [ ] Proxy Panel
    - [ ] Privacy Panel
    - [ ] Automation Panel
    - [ ] Creator Support Panel
    - [ ] Stats Panel
    - [ ] Settings Panel
- [ ] Can add/edit/delete proxy
- [ ] Can create new tab
- [ ] Can navigate to website
- [ ] Privacy protection active (browserleaks.com)
- [ ] WebRTC blocked (ipleak.net)
- [ ] Session save/restore works
- [ ] Animation settings panel functional
- [ ] Database operations work (check logs)
```

#### Linux-Specific

```markdown
- [ ] AppImage runs (with/without FUSE)
- [ ] .deb installs via `sudo dpkg -i`
- [ ] .rpm installs via `sudo dnf install`
- [ ] Desktop entry created
- [ ] Application icon in launcher
- [ ] File associations work
- [ ] safeStorage works (with keyring)
- [ ] Fallback encryption works (without keyring)
```

#### Windows-Specific

```markdown
- [ ] NSIS installer completes
- [ ] Start menu shortcut created
- [ ] Desktop shortcut created (if selected)
- [ ] Uninstaller works
- [ ] No SmartScreen warning (if signed)
- [ ] Portable version runs
- [ ] Windows DPAPI encryption works
```

#### macOS-Specific

```markdown
- [ ] DMG mounts correctly
- [ ] App moves to /Applications
- [ ] No Gatekeeper warning (if notarized)
- [ ] Runs on Intel Mac
- [ ] Runs on Apple Silicon Mac
- [ ] Dock icon displays correctly
- [ ] Keychain encryption works
```

### 14.4 Migration Test Checklist

#### Fresh Install

```markdown
- [ ] Install completes successfully
- [ ] First launch creates config directory
- [ ] Database initialized correctly
- [ ] No migration dialogs shown
- [ ] Can add and use proxy
```

#### Upgrade from v1.2.1

```markdown
- [ ] Upgrade completes successfully
- [ ] Backup created at backup-v1.2.x/
- [ ] Migration dialog shown (if applicable)
- [ ] Encryption key migrated
- [ ] Existing proxies preserved
- [ ] Proxy credentials still work
- [ ] Sessions restore correctly
- [ ] Settings preserved
- [ ] Database migration 004 applied
- [ ] No data loss
```

#### Upgrade from v1.2.0

```markdown
- [ ] Upgrade completes successfully
- [ ] All v1.2.1 migration steps pass
- [ ] Additional v1.2.0 migrations apply
```

### 14.5 Rollback Checklist

```markdown
If rollback is needed:

- [ ] Decision documented with reason
- [ ] Team notified
- [ ] GitHub release marked as pre-release
- [ ] Auto-update manifest updated to v1.2.1
- [ ] Website download links updated
- [ ] Rollback announcement posted
- [ ] Affected users identified and contacted
- [ ] Support team briefed on recovery steps
- [ ] Hotfix branch created
- [ ] Root cause analysis started
- [ ] Retrospective scheduled
```

### 14.6 Post-Release Review Checklist (Day 30)

```markdown
**Metrics Review:**
- [ ] Total downloads achieved vs target
- [ ] Critical bug count
- [ ] Migration success rate
- [ ] Update adoption rate
- [ ] User feedback sentiment

**Process Review:**
- [ ] What went well?
- [ ] What could be improved?
- [ ] Timeline accuracy
- [ ] Communication effectiveness
- [ ] Support response times

**Documentation:**
- [ ] Lessons learned documented
- [ ] Process improvements identified
- [ ] v1.4.0 planning informed
```

---

## Appendix A: Quick Reference Commands

### Git Commands

```bash
# Create release tag
git tag -a v1.3.0 -m "Release v1.3.0"
git push origin v1.3.0

# Create beta tag
git tag -a v1.3.0-beta.1 -m "Beta 1 for v1.3.0"
git push origin v1.3.0-beta.1

# Delete tag (if needed)
git tag -d v1.3.0
git push origin :refs/tags/v1.3.0
```

### Build Commands

```bash
# Full validation
npm run typecheck && npm run lint && npm test -- --run

# Build application
npm run build

# Package for platforms
npm run package:linux
npm run package:win
npm run package:mac
```

### Checksum Commands

```bash
# Generate checksums
sha256sum release/* > SHA256SUMS.txt

# Verify checksums
sha256sum -c SHA256SUMS.txt
```

### GitHub CLI Commands

```bash
# List releases
gh release list

# Create release
gh release create v1.3.0 --title "Virtual IP Browser v1.3.0" --notes-file RELEASE_NOTES.md

# Upload assets
gh release upload v1.3.0 release/*

# Edit release
gh release edit v1.3.0 --prerelease  # Mark as pre-release
```

---

## Appendix B: Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| Release Manager | TBD | Business hours |
| Dev Lead | TBD | Business hours |
| Security Lead | security@virtualipbrowser.com | On-call |
| Support | GitHub Issues | 24/7 (async) |

---

## Appendix C: Related Documents

| Document | Path | Purpose |
|----------|------|---------|
| Release Notes | `RELEASE_NOTES.md` | User-facing release summary |
| Migration Guide | `MIGRATION_GUIDE.md` | Upgrade instructions |
| GitHub Release Draft | `docs/GITHUB_RELEASE_DRAFT.md` | Release description template |
| Release Plan | `docs/RELEASE_PLAN_V1.3.0.md` | Detailed release planning |
| Security Audit | `SECURITY_AUDIT_REPORT_v1.3.0.md` | Security validation |
| Distribution Guide | `docs/DISTRIBUTION.md` | Platform distribution details |

---

**Document Control:**
- Version: 1.0
- Created: January 2025
- Last Updated: January 2025
- Author: Release Team
- Status: Approved for v1.3.0 deployment

