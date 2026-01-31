# Virtual IP Browser - Frequently Asked Questions

**Version:** 1.3.0  
**Last Updated:** January 2025

---

## 📋 Table of Contents

- [General Questions](#general-questions)
- [Installation & Setup](#installation--setup)
- [Privacy & Security](#privacy--security)
- [Proxy Management](#proxy-management)
- [Automation Features](#automation-features)
- [v1.3.0 Specific Questions](#v130-specific-questions)

---

## General Questions

### What is Virtual IP Browser?

Virtual IP Browser is a privacy-focused desktop browser built with Electron that provides:
- **Proxy management** with 10 rotation strategies
- **Fingerprint spoofing** to prevent tracking
- **WebRTC leak protection**
- **Web automation** for research and testing
- **Creator support tools**

### What platforms are supported?

| Platform | Formats | Status |
|----------|---------|--------|
| Linux | AppImage, DEB, RPM | ✅ Full support |
| Windows | NSIS Installer, Portable | ✅ Full support |
| macOS | DMG, ZIP | ✅ Full support |

### Is Virtual IP Browser free?

Yes, Virtual IP Browser is open-source software released under the MIT License.

### What are the system requirements?

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | 64-bit Linux/Windows/macOS | Latest stable release |
| RAM | 2 GB | 4 GB |
| Disk | 500 MB | 1 GB |
| CPU | Dual-core | Quad-core |

---

## Installation & Setup

### How do I install on Ubuntu/Debian?

```bash
# Download
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.3.0/virtual-ip-browser_1.3.0_amd64.deb

# Install
sudo apt install ./virtual-ip-browser_1.3.0_amd64.deb

# Launch
virtual-ip-browser
```

### How do I install on Fedora/RHEL?

```bash
sudo dnf install ./virtual-ip-browser-1.3.0.x86_64.rpm
```

### How do I use the AppImage?

```bash
chmod +x "Virtual IP Browser-1.3.0-x86_64.AppImage"
./Virtual\ IP\ Browser-1.3.0-x86_64.AppImage
```

### Where is my data stored?

| Platform | Location |
|----------|----------|
| Linux | `~/.config/virtual-ip-browser/` |
| Windows | `%APPDATA%/virtual-ip-browser/` |
| macOS | `~/Library/Application Support/virtual-ip-browser/` |

### How do I completely uninstall?

```bash
# Uninstall application (Linux DEB)
sudo apt remove virtual-ip-browser

# Remove data (optional)
rm -rf ~/.config/virtual-ip-browser/
```

---

## Privacy & Security

### Does Virtual IP Browser protect against WebRTC leaks?

**Yes!** As of v1.3.0, Virtual IP Browser has comprehensive WebRTC protection:
- RTCPeerConnection blocking
- ICE candidate filtering
- SDP sanitization
- Stats API filtering
- getUserMedia blocking

### Are my proxy credentials secure?

**Yes.** In v1.3.0, credentials are protected by your operating system's native encryption:
- **Windows:** DPAPI (Data Protection API)
- **macOS:** Keychain
- **Linux:** Secret Service (gnome-keyring or kwallet)

### What fingerprint spoofing is included?

- Canvas fingerprint randomization
- WebGL parameter spoofing
- Audio context noise injection
- Navigator property customization
- Timezone manipulation
- Screen resolution spoofing

### Is tracker blocking included?

Yes, Virtual IP Browser includes tracker blocking with:
- EasyList and EasyPrivacy rules
- Custom blocklist support
- Bloom filter optimization (v1.3.0)

### How do I report a security vulnerability?

- **Email:** security@virtualipbrowser.com
- **GitHub:** Create a private security advisory
- **Do NOT** create public issues for security vulnerabilities

---

## Proxy Management

### What proxy protocols are supported?

- HTTP
- HTTPS
- SOCKS4
- SOCKS5

### What rotation strategies are available?

| Strategy | Description |
|----------|-------------|
| Round Robin | Sequential proxy selection |
| Random | Random proxy selection |
| Fastest | Select proxy with lowest latency |
| Failure-Aware | Avoid recently failed proxies |
| Weighted | Prioritize by custom weights |
| Geographic | Select by country/region |
| Sticky-Session | Consistent domain mapping |
| Time-Based | Scheduled rotation |
| Least-Used | Balance usage across proxies |
| Custom Rules | Conditional logic |

### How do I add proxies?

1. Go to **Settings → Proxy**
2. Click **Add Proxy**
3. Enter proxy details:
   - Protocol (HTTP, HTTPS, SOCKS4, SOCKS5)
   - Host and Port
   - Username/Password (optional)
   - Country/Region (optional)
4. Click **Save**

### How do I bulk import proxies?

1. Go to **Settings → Proxy**
2. Click **Import**
3. Paste proxies in format: `protocol://user:pass@host:port`
4. One proxy per line
5. Click **Import**

### Why do my proxies keep failing?

Common causes:
1. **Proxy is down** - Test manually with curl
2. **Credentials wrong** - Double-check username/password
3. **IP blocked** - Try different proxy
4. **Timeout too short** - Increase in settings
5. **Circuit breaker tripped** - Wait for reset

---

## Automation Features

### What automation features are included?

- **Domain Targeting:** Allowlist, blocklist, regex patterns
- **Search Automation:** Keyword-based search with result targeting
- **Human-Like Behavior:** Realistic mouse movements, scroll patterns
- **Scheduling:** Cron expressions and natural language scheduling
- **Creator Support:** YouTube, Twitch, Medium support tools

### How do I set up domain targeting?

1. Go to **Automation → Domain Targeting**
2. Configure filters:
   - **Allowlist:** Domains to target
   - **Blocklist:** Domains to avoid
   - **Regex:** Pattern matching
3. Set behavior parameters:
   - Bounce rate target
   - Reading time range
   - Pages per visit
4. Start automation

### Can I schedule automation tasks?

Yes! Virtual IP Browser supports:

**Cron expressions:**
```
*/5 * * * *     # Every 5 minutes
0 9 * * 1-5     # 9 AM weekdays
0 */2 * * *     # Every 2 hours
```

**Natural language:**
- "every 5 minutes"
- "daily at 9am"
- "every monday at 10:30"

### What is the circuit breaker?

The circuit breaker protects against cascading failures:
- **CLOSED:** Normal operation
- **OPEN:** Stops requests after too many failures
- **HALF_OPEN:** Tests recovery with limited requests

This prevents hammering broken services and allows recovery.

---

## v1.3.0 Specific Questions

### What's new in v1.3.0?

**Security Fixes (P0):**
1. OS keychain encryption for credentials
2. ReDoS vulnerability fixed in tracker blocker
3. Complete WebRTC protection
4. Session URL validation against SSRF

**Performance:**
- 8.54x faster database queries
- New performance indexes
- Optimized pattern matching

**Features:**
- Magic UI components (AnimatedList, Particles, etc.)
- Animation settings panel
- Enhanced UI/UX

### Do I need to do anything to upgrade?

**No!** The upgrade is automatic:
1. Download and install v1.3.0
2. Your data is preserved
3. Encryption keys are automatically migrated
4. Database indexes are automatically created

### My credentials disappeared after upgrading!

This is rare but can happen if:
1. OS keychain service isn't available
2. Migration was interrupted

**Solution:**
1. Check backup: `~/.config/virtual-ip-browser/secure-config-backup.json`
2. Re-enter credentials manually
3. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details

### How do I disable the new animations?

1. Go to **Settings → Appearance**
2. Set **Enable Animations:** Off
3. Or set **Particle Density:** Off for just background effects

### Is v1.3.0 backwards compatible?

Yes, with automatic migrations:
- Encryption keys migrate to OS keychain
- Database migration 004 adds indexes
- All settings are preserved

### Can I rollback to v1.2.1?

Yes, but not recommended due to security fixes:
```bash
# Download v1.2.1
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb

# Install (will downgrade)
sudo apt install ./virtual-ip-browser_1.2.1_amd64.deb
```

**Note:** Credentials encrypted with v1.3.0's OS keychain won't be accessible in v1.2.1.

---

## 🔗 Additional Resources

- **Documentation:** [README.md](../README.md)
- **User Guide:** [USER_GUIDE.md](../USER_GUIDE.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md)
- **Security:** [SECURITY.md](../SECURITY.md)
- **GitHub Issues:** https://github.com/virtualipbrowser/virtual-ip-browser/issues

---

## 📞 Still Have Questions?

- **GitHub Discussions:** Ask the community
- **GitHub Issues:** Report bugs or request features
- **Email:** support@virtualipbrowser.com

---

*FAQ Version: 1.3.0*  
*Last Updated: January 2025*
