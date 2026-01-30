# Virtual IP Browser - Quick Start Guide

**Version:** 1.2.1 | **Last Updated:** January 2026

A quick reference card for downloading, installing, launching, and configuring Virtual IP Browser.

---

## 📥 1. Download

### Get the Package

| Your System | Download Command |
|-------------|------------------|
| **Ubuntu/Debian** | `wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb` |
| **Fedora/RHEL** | `wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser-1.2.1.x86_64.rpm` |
| **Any Linux** | `wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/Virtual-IP-Browser-1.2.1-x86_64.AppImage` |

Or download directly from: **https://github.com/virtualipbrowser/virtual-ip-browser/releases**

---

## 📦 2. Install

### Ubuntu / Debian / Linux Mint

```bash
# Install with apt (recommended)
sudo apt install ./virtual-ip-browser_1.2.1_amd64.deb
```

### Fedora / RHEL / CentOS

```bash
# Install with dnf
sudo dnf install ./virtual-ip-browser-1.2.1.x86_64.rpm
```

### openSUSE

```bash
# Install with zypper
sudo zypper install ./virtual-ip-browser-1.2.1.x86_64.rpm
```

### AppImage (No Installation Required)

```bash
# Make executable and run
chmod +x Virtual-IP-Browser-1.2.1-x86_64.AppImage
./Virtual-IP-Browser-1.2.1-x86_64.AppImage
```

---

## 🚀 3. Launch

### Method 1: Application Menu (Recommended)

1. Open your desktop's application menu/launcher
2. Search for **"Virtual IP Browser"**
3. Click to launch

### Method 2: Command Line

```bash
virtual-ip-browser
```

### Method 3: AppImage

```bash
./Virtual-IP-Browser-1.2.1-x86_64.AppImage
```

> ⚠️ **Important**: Always run as a **regular user**, not as root.

---

## ⚙️ 4. Configure

### First-Time Setup

On first launch, the application automatically:
- Creates configuration directory at `~/.config/virtual-ip-browser/`
- Initializes the SQLite database
- Sets up default privacy protections (all enabled)

### Quick Configuration Steps

#### Step 1: Add a Proxy

1. Click **"Proxy"** button in the bottom toolbar
2. Click **"Add Proxy"** button
3. Enter proxy details:
   - **Name**: Give it a friendly name
   - **Host**: Proxy server address
   - **Port**: Proxy port number
   - **Protocol**: HTTP, HTTPS, SOCKS4, or SOCKS5
   - **Username/Password**: If required
4. Click **Save**
5. The proxy is automatically validated

#### Step 2: Verify Privacy Settings

1. Click **"Privacy"** button in the bottom toolbar
2. Confirm all protections are enabled:
   - ✅ Canvas Fingerprint Protection
   - ✅ WebGL Fingerprint Protection
   - ✅ Audio Fingerprint Protection
   - ✅ Navigator Spoofing
   - ✅ Timezone Spoofing
   - ✅ WebRTC Leak Prevention
   - ✅ Tracker Blocking

#### Step 3: Configure Automation (Optional)

1. Click **"Automation"** button in the bottom toolbar
2. Select search engine (Google, Bing, DuckDuckGo, etc.)
3. Add keywords to search
4. Add target domains (optional)
5. Click **"Start"** to begin

---

## 📍 5. Installation Locations

| Item | Location |
|------|----------|
| **Application** | `/opt/Virtual IP Browser/` |
| **Executable** | `/usr/bin/virtual-ip-browser` |
| **Desktop Entry** | `/usr/share/applications/virtual-ip-browser.desktop` |
| **Icons** | `/usr/share/icons/hicolor/*/apps/virtual-ip-browser.png` |
| **User Config** | `~/.config/virtual-ip-browser/` |
| **User Cache** | `~/.cache/virtual-ip-browser/` |
| **Database** | `~/.config/virtual-ip-browser/browser.db` |
| **Logs** | `~/.config/virtual-ip-browser/logs/` |

---

## 🔧 6. Troubleshooting Quick Fixes

### "Running as root" Error

```bash
# Run as regular user instead
su - yourusername
virtual-ip-browser
```

### Dependency Errors

```bash
# Fix missing dependencies
sudo apt-get install -f
```

### AppImage Won't Run

```bash
# Install FUSE library
sudo apt install libfuse2
```

### Application Not in Menu

```bash
# Update desktop database
sudo update-desktop-database
```

### Reset Configuration

```bash
# Backup and reset
mv ~/.config/virtual-ip-browser ~/.config/virtual-ip-browser.backup
virtual-ip-browser  # Creates fresh config
```

---

## ⌨️ 7. Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+R` | Reload page |
| `Ctrl+L` | Focus address bar |
| `F11` | Toggle fullscreen |

### Command Line Options

```bash
# Show version
virtual-ip-browser --version

# Enable debug logging
virtual-ip-browser --enable-logging --v=1

# Disable GPU (for troubleshooting)
virtual-ip-browser --disable-gpu
```

---

## 🗑️ 8. Uninstall

### Ubuntu / Debian

```bash
sudo apt remove virtual-ip-browser
# Optional: Remove user data
rm -rf ~/.config/virtual-ip-browser ~/.cache/virtual-ip-browser
```

### Fedora / RHEL

```bash
sudo dnf remove virtual-ip-browser
```

### AppImage

```bash
# Just delete the file
rm Virtual-IP-Browser-1.2.1-x86_64.AppImage
```

---

## 📚 More Information

| Resource | Link |
|----------|------|
| Full Documentation | [docs/CODEMAPS/INDEX.md](docs/CODEMAPS/INDEX.md) |
| Distribution Guide | [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) |
| Packaging Guide | [docs/PACKAGING.md](docs/PACKAGING.md) |
| User Guide | [USER_GUIDE.md](USER_GUIDE.md) |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| GitHub Issues | https://github.com/virtualipbrowser/virtual-ip-browser/issues |

---

## ✅ Checklist

- [ ] Downloaded the correct package for your system
- [ ] Installed the package
- [ ] Launched the application (as non-root user)
- [ ] Added at least one proxy
- [ ] Verified privacy settings are enabled
- [ ] Tested browsing with privacy protection

---

**You're all set! Enjoy private browsing with Virtual IP Browser.** 🔒

