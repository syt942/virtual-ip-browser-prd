# Virtual IP Browser - Hotfix Procedure

**Version:** 1.0  
**Applicable To:** v1.3.0+  
**Last Updated:** January 2025

---

## 📋 Overview

This document outlines the procedure for releasing hotfixes when critical issues are discovered post-release. Hotfixes are emergency patches that address:

- Security vulnerabilities
- Data loss/corruption bugs
- Crashes affecting >5% of users
- Critical functionality failures

---

## 🚨 When to Issue a Hotfix

### Hotfix Required (Immediate Action)

| Severity | Examples | Response Time |
|----------|----------|---------------|
| **Critical** | Security exploit, data loss, universal crash | 24 hours |
| **High** | Major feature broken, >10% crash rate | 48-72 hours |

### Hotfix NOT Required (Next Release)

| Severity | Examples | Timeline |
|----------|----------|----------|
| **Medium** | Minor feature broken, edge case crashes | v1.3.1 or v1.4.0 |
| **Low** | UI issues, performance (non-critical) | Next planned release |

---

## 🔄 Hotfix Versioning

Hotfixes use patch version increments:

| Base Version | First Hotfix | Second Hotfix |
|--------------|--------------|---------------|
| v1.3.0 | v1.3.1 | v1.3.2 |
| v1.4.0 | v1.4.1 | v1.4.2 |

---

## 📝 Hotfix Process

### Phase 1: Triage (0-2 hours)

#### 1.1 Issue Confirmation

```bash
# Reproduce the issue
# Document exact steps
# Identify affected versions
# Determine scope of impact
```

**Checklist:**
- [ ] Issue reproduced
- [ ] Root cause identified
- [ ] Impact assessed
- [ ] Hotfix decision made

#### 1.2 Decision Matrix

| Question | Yes | No |
|----------|-----|-----|
| Security vulnerability? | Hotfix | Evaluate further |
| Data loss possible? | Hotfix | Evaluate further |
| >5% users affected? | Hotfix | Consider v1.3.1 |
| Workaround available? | Maybe defer | Hotfix |

### Phase 2: Development (2-8 hours)

#### 2.1 Create Hotfix Branch

```bash
# Ensure on latest main
git checkout main
git pull origin main

# Create hotfix branch from release tag
git checkout -b hotfix/v1.3.1 v1.3.0

# Or from main if commits are clean
git checkout -b hotfix/v1.3.1 main
```

#### 2.2 Apply Fix

```bash
# Make minimal changes
# Focus only on the critical issue
# Do NOT include other changes

# Commit with clear message
git commit -m "fix: [CRITICAL] description of fix

Fixes #issue-number

Root cause: [brief explanation]
Impact: [who was affected]
Solution: [what was changed]"
```

#### 2.3 Update Version

```bash
# Update package.json
npm version patch -m "Bump version to %s for hotfix"

# Or manually edit package.json
# "version": "1.3.1"
```

#### 2.4 Update Documentation

**Required updates:**
- [ ] CHANGELOG.md - Add hotfix section
- [ ] KNOWN_ISSUES.md - Mark issue resolved

**CHANGELOG.md entry:**
```markdown
## [1.3.1] - YYYY-MM-DD

### Hotfix Release

**Critical Fix:** [Description]

- **Issue:** [What was wrong]
- **Impact:** [Who was affected]
- **Fix:** [What was changed]
- **Related:** #issue-number
```

### Phase 3: Testing (2-4 hours)

#### 3.1 Focused Testing

```bash
# Run affected tests
npm test -- --grep "related test pattern"

# Run full test suite
npm test

# Run E2E tests
npm run test:e2e
```

**Testing Checklist:**
- [ ] Fix verified (issue no longer occurs)
- [ ] No regression (existing tests pass)
- [ ] E2E smoke test passes
- [ ] Manual verification on affected platform

#### 3.2 Build Verification

```bash
# Build all packages
npm run build
npm run package

# Test installation
sudo apt install ./release/virtual-ip-browser_1.3.1_amd64.deb

# Verify fix in installed version
virtual-ip-browser --version  # Should show 1.3.1
```

### Phase 4: Release (1-2 hours)

#### 4.1 Merge and Tag

```bash
# Merge hotfix to main
git checkout main
git merge hotfix/v1.3.1

# Create tag
git tag -a v1.3.1 -m "Hotfix v1.3.1 - [Brief description]

Critical fix for [issue description]
See CHANGELOG.md for details."

# Push
git push origin main
git push origin v1.3.1

# Delete hotfix branch
git branch -d hotfix/v1.3.1
```

#### 4.2 Generate Release Assets

```bash
# Wait for CI to build all platforms
# Or build locally if urgent

cd release/

# Generate checksums
sha256sum *.AppImage *.deb *.rpm *.exe *.dmg > SHA256SUMS.txt
```

#### 4.3 Create GitHub Release

**Title:** `Virtual IP Browser v1.3.1 - Hotfix Release`

**Body:**
```markdown
## 🚨 Hotfix Release

This release addresses a critical issue discovered in v1.3.0.

### Critical Fix

**Issue:** [Clear description of what was wrong]

**Impact:** [Who was affected and how]

**Resolution:** [What was fixed]

### Upgrade Instructions

All users on v1.3.0 should upgrade immediately:

**Debian/Ubuntu:**
```bash
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.3.1/virtual-ip-browser_1.3.1_amd64.deb
sudo apt install ./virtual-ip-browser_1.3.1_amd64.deb
```

### SHA256 Checksums
[checksums from SHA256SUMS.txt]

### Full Changelog
See [CHANGELOG.md](CHANGELOG.md) for details.

---
**Previous Release:** [v1.3.0](link)
```

**Settings:**
- [x] Set as latest release
- [ ] Pre-release (unchecked)

### Phase 5: Communication (0-1 hour)

#### 5.1 Update GitHub Issue

```markdown
## ✅ Resolved in v1.3.1

This issue has been fixed in v1.3.1.

**Download:** https://github.com/.../releases/tag/v1.3.1

**Upgrade instructions:**
[include commands]

Thank you for reporting this issue!
```

#### 5.2 Notify Users

**If security vulnerability:**
- Post security advisory
- Consider direct notification to affected users
- Update SECURITY.md with CVE if applicable

**If widespread issue:**
- Post announcement in Discussions
- Update KNOWN_ISSUES.md

---

## 📊 Hotfix Checklist Summary

### Pre-Release
- [ ] Issue confirmed and reproduced
- [ ] Root cause identified
- [ ] Hotfix branch created
- [ ] Fix implemented (minimal changes)
- [ ] Version bumped to x.y.z+1
- [ ] CHANGELOG.md updated
- [ ] Tests pass
- [ ] Build successful
- [ ] Manual verification complete

### Release
- [ ] Merged to main
- [ ] Tag created and pushed
- [ ] CI builds complete
- [ ] Checksums generated
- [ ] GitHub release created
- [ ] Release marked as latest

### Post-Release
- [ ] Original issue updated
- [ ] Users notified (if applicable)
- [ ] KNOWN_ISSUES.md updated
- [ ] Monitor for regressions

---

## 🔙 Rollback Procedure

If hotfix introduces new issues:

### Immediate Rollback

```bash
# Mark hotfix release as pre-release (hides from "latest")
# On GitHub: Edit release → Check "This is a pre-release"

# Direct users to previous version
# Post in original issue with instructions
```

### User Rollback Instructions

```bash
# Download previous version
wget https://github.com/.../releases/download/v1.3.0/virtual-ip-browser_1.3.0_amd64.deb

# Install (will downgrade)
sudo apt install ./virtual-ip-browser_1.3.0_amd64.deb
```

---

## 📞 Escalation Contacts

| Role | Contact | When to Contact |
|------|---------|-----------------|
| Security Lead | security@virtualipbrowser.com | Security vulnerabilities |
| Dev Lead | dev@virtualipbrowser.com | Critical bugs |
| Release Manager | release@virtualipbrowser.com | Release decisions |

---

## 📝 Post-Mortem Template

After hotfix release, document lessons learned:

```markdown
# Hotfix Post-Mortem: v1.3.1

## Summary
- **Issue:** [Description]
- **Impact:** [Users affected, duration]
- **Resolution:** [How it was fixed]
- **Time to Resolution:** [Hours from report to release]

## Timeline
- HH:MM - Issue reported
- HH:MM - Issue confirmed
- HH:MM - Root cause identified
- HH:MM - Fix developed
- HH:MM - Testing complete
- HH:MM - Hotfix released

## Root Cause Analysis
[Why did this happen?]

## What Went Well
- [Things that worked]

## What Could Improve
- [Things to improve]

## Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]

## Lessons Learned
[Key takeaways]
```

---

*Hotfix Procedure Version: 1.0*  
*Last Updated: January 2025*
