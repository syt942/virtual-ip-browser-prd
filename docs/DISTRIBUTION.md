# Virtual IP Browser - Distribution Guide

**Version:** 1.2.1  
**Last Updated:** January 2026

This document provides comprehensive information about downloading, installing, and distributing Virtual IP Browser across different platforms and package formats.

---

## Table of Contents

- [Available Package Formats](#available-package-formats)
- [System Requirements](#system-requirements)
- [Download Locations](#download-locations)
- [Installation Instructions](#installation-instructions)
- [Verification Steps](#verification-steps)
- [Installation Locations](#installation-locations)
- [Uninstallation](#uninstallation)
- [Troubleshooting](#troubleshooting)

---

## Available Package Formats

Virtual IP Browser is available in the following formats for Linux systems:

| Format | File | Size | Best For |
|--------|------|------|----------|
| **Debian Package** | `virtual-ip-browser_1.2.1_amd64.deb` | ~94 MB | Ubuntu, Debian, Linux Mint, Pop!_OS |
| **AppImage** | `Virtual IP Browser-1.2.1-x86_64.AppImage` | ~123 MB | Any Linux distribution |
| **RPM Package** | `virtual-ip-browser-1.2.1.x86_64.rpm` | ~82 MB | Fedora, RHEL, CentOS, openSUSE |

### Format Comparison

| Feature | .deb | AppImage | .rpm |
|---------|------|----------|------|
| System integration | ✅ Full | ⚠️ Manual | ✅ Full |
| Desktop menu entry | ✅ Auto | ⚠️ Optional | ✅ Auto |
| Dependency management | ✅ APT | ✅ Self-contained | ✅ DNF/Zypper |
| Auto-updates | ✅ Via APT | ⚠️ Manual | ✅ Via package manager |
| Root required | ✅ Yes | ❌ No | ✅ Yes |
| Portable | ❌ No | ✅ Yes | ❌ No |

---

## System Requirements

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | x86_64 (64-bit) | x86_64 (64-bit) |
| **RAM** | 2 GB | 4 GB+ |
| **Disk Space** | 500 MB | 1 GB |
| **Display** | 1280x720 | 1920x1080+ |

### Operating System Requirements

#### Debian Package (.deb)

| Distribution | Minimum Version | Status |
|--------------|-----------------|--------|
| Ubuntu | 20.04 LTS (Focal) | ✅ Supported |
| Ubuntu | 22.04 LTS (Jammy) | ✅ Supported |
| Ubuntu | 24.04 LTS (Noble) | ✅ Supported |
| Debian | 11 (Bullseye) | ✅ Supported |
| Debian | 12 (Bookworm) | ✅ Supported |
| Linux Mint | 20+ | ✅ Supported |
| Pop!_OS | 20.04+ | ✅ Supported |
| Elementary OS | 6+ | ✅ Supported |
| Zorin OS | 16+ | ✅ Supported |

#### RPM Package (.rpm)

| Distribution | Minimum Version | Status |
|--------------|-----------------|--------|
| Fedora | 35+ | ✅ Supported |
| RHEL | 8+ | ✅ Supported |
| CentOS Stream | 8+ | ✅ Supported |
| Rocky Linux | 8+ | ✅ Supported |
| AlmaLinux | 8+ | ✅ Supported |
| openSUSE Leap | 15.3+ | ✅ Supported |
| openSUSE Tumbleweed | Latest | ✅ Supported |

#### AppImage

- Any Linux distribution with:
  - glibc >= 2.31
  - FUSE support enabled
  - X11 or Wayland display server

### Required Dependencies

The .deb and .rpm packages will automatically install these dependencies:

| Dependency | Purpose |
|------------|---------|
| `libgtk-3-0` | GTK+ 3 GUI toolkit |
| `libnotify4` | Desktop notifications |
| `libnss3` | Network Security Services (SSL/TLS) |
| `libxss1` | X11 Screen Saver extension |
| `libxtst6` | X11 Testing extension |
| `xdg-utils` | Desktop integration utilities |
| `libatspi2.0-0` | Accessibility support |
| `libuuid1` | UUID generation |
| `libsecret-1-0` | Secret storage (keyring) |
| `libgbm1` | Generic Buffer Management |
| `libasound2` | ALSA audio support |

**Recommended (optional):**
- `libappindicator3-1` - System tray support

---

## Download Locations

### GitHub Releases (Primary)

**URL:** https://github.com/virtualipbrowser/virtual-ip-browser/releases

Download the latest release:

```bash
# Latest .deb package
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb

# Latest AppImage
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/Virtual-IP-Browser-1.2.1-x86_64.AppImage

# Latest RPM package
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser-1.2.1.x86_64.rpm
```

### Verify Downloads

Each release includes SHA256 checksums:

```bash
# Download checksums
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/SHA256SUMS

# Verify integrity
sha256sum -c SHA256SUMS
```

---

## Installation Instructions

### Debian/Ubuntu (.deb)

#### Method 1: Using apt (Recommended)

```bash
# Download the package
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser_1.2.1_amd64.deb

# Install with apt (handles dependencies automatically)
sudo apt install ./virtual-ip-browser_1.2.1_amd64.deb
```

#### Method 2: Using dpkg

```bash
# Install the package
sudo dpkg -i virtual-ip-browser_1.2.1_amd64.deb

# If dependency errors occur, fix them:
sudo apt-get install -f
```

#### Method 3: Using gdebi (GUI)

```bash
# Install gdebi if not present
sudo apt install gdebi

# Install via GUI
sudo gdebi virtual-ip-browser_1.2.1_amd64.deb
```

### Fedora/RHEL (.rpm)

#### Using dnf (Fedora/RHEL 8+)

```bash
# Download the package
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser-1.2.1.x86_64.rpm

# Install with dnf
sudo dnf install ./virtual-ip-browser-1.2.1.x86_64.rpm
```

#### Using yum (Older systems)

```bash
sudo yum localinstall virtual-ip-browser-1.2.1.x86_64.rpm
```

### openSUSE (.rpm)

```bash
# Download the package
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/virtual-ip-browser-1.2.1.x86_64.rpm

# Install with zypper
sudo zypper install ./virtual-ip-browser-1.2.1.x86_64.rpm
```

### AppImage (Universal)

```bash
# Download the AppImage
wget https://github.com/virtualipbrowser/virtual-ip-browser/releases/download/v1.2.1/Virtual-IP-Browser-1.2.1-x86_64.AppImage

# Make it executable
chmod +x Virtual-IP-Browser-1.2.1-x86_64.AppImage

# Run directly
./Virtual-IP-Browser-1.2.1-x86_64.AppImage
```

#### Optional: Desktop Integration for AppImage

```bash
# Using AppImageLauncher (recommended)
# Install AppImageLauncher from: https://github.com/TheAssassin/AppImageLauncher

# Or manually create desktop entry:
mkdir -p ~/.local/share/applications
cat > ~/.local/share/applications/virtual-ip-browser.desktop << EOF
[Desktop Entry]
Name=Virtual IP Browser
Exec=/path/to/Virtual-IP-Browser-1.2.1-x86_64.AppImage
Icon=virtual-ip-browser
Type=Application
Categories=Network;WebBrowser;
EOF
```

---

## Verification Steps

### Verify Package Installation

#### For .deb packages:

```bash
# Check if installed
dpkg -l | grep virtual-ip-browser

# Expected output:
# ii  virtual-ip-browser  1.2.1  amd64  Privacy-Focused Browser with Proxy Management

# Verify executable
which virtual-ip-browser
# Expected: /usr/bin/virtual-ip-browser

# Check version
virtual-ip-browser --version
```

#### For .rpm packages:

```bash
# Check if installed
rpm -qa | grep virtual-ip-browser

# Verify package info
rpm -qi virtual-ip-browser
```

#### For AppImage:

```bash
# Verify executable
file Virtual-IP-Browser-1.2.1-x86_64.AppImage
# Expected: ELF 64-bit LSB executable...

# Run with version flag
./Virtual-IP-Browser-1.2.1-x86_64.AppImage --version
```

### Verify Desktop Integration

```bash
# Check desktop entry exists (.deb/.rpm only)
ls -la /usr/share/applications/virtual-ip-browser.desktop

# Check icons are installed
ls /usr/share/icons/hicolor/*/apps/virtual-ip-browser.png

# Update desktop database (if app doesn't appear in menu)
sudo update-desktop-database
```

### Verify Application Launch

```bash
# Launch from command line (as non-root user)
virtual-ip-browser

# Or for AppImage
./Virtual-IP-Browser-1.2.1-x86_64.AppImage
```

---

## Installation Locations

### Debian/Ubuntu (.deb) Installation Paths

| Item | Location |
|------|----------|
| **Application files** | `/opt/Virtual IP Browser/` |
| **Main executable** | `/opt/Virtual IP Browser/virtual-ip-browser` |
| **Executable symlink** | `/usr/bin/virtual-ip-browser` |
| **Desktop entry** | `/usr/share/applications/virtual-ip-browser.desktop` |
| **Icons** | `/usr/share/icons/hicolor/{size}/apps/virtual-ip-browser.png` |
| **User configuration** | `~/.config/virtual-ip-browser/` |
| **User cache** | `~/.cache/virtual-ip-browser/` |
| **User data (database)** | `~/.config/virtual-ip-browser/` |
| **Logs** | `~/.config/virtual-ip-browser/logs/` |

### RPM Installation Paths

| Item | Location |
|------|----------|
| **Application files** | `/opt/Virtual IP Browser/` |
| **Executable symlink** | `/usr/bin/virtual-ip-browser` |
| **Desktop entry** | `/usr/share/applications/virtual-ip-browser.desktop` |
| **Icons** | `/usr/share/icons/hicolor/{size}/apps/virtual-ip-browser.png` |
| **User configuration** | `~/.config/virtual-ip-browser/` |

### AppImage Paths

| Item | Location |
|------|----------|
| **AppImage file** | User-chosen location |
| **User configuration** | `~/.config/virtual-ip-browser/` |
| **User cache** | `~/.cache/virtual-ip-browser/` |

### Configuration Files

```bash
# Main configuration directory
~/.config/virtual-ip-browser/
├── config.json          # Application settings
├── proxies.json         # Proxy configurations
├── browser.db           # SQLite database
└── logs/                # Application logs
    └── app.log
```

---

## Uninstallation

### Debian/Ubuntu

```bash
# Remove application (keep configuration)
sudo apt remove virtual-ip-browser

# Remove application and configuration
sudo apt purge virtual-ip-browser

# Clean up user data (optional)
rm -rf ~/.config/virtual-ip-browser
rm -rf ~/.cache/virtual-ip-browser
```

### Fedora/RHEL

```bash
# Remove application
sudo dnf remove virtual-ip-browser

# Clean up user data (optional)
rm -rf ~/.config/virtual-ip-browser
rm -rf ~/.cache/virtual-ip-browser
```

### openSUSE

```bash
# Remove application
sudo zypper remove virtual-ip-browser

# Clean up user data (optional)
rm -rf ~/.config/virtual-ip-browser
rm -rf ~/.cache/virtual-ip-browser
```

### AppImage

```bash
# Simply delete the AppImage file
rm Virtual-IP-Browser-1.2.1-x86_64.AppImage

# Remove desktop entry (if created)
rm ~/.local/share/applications/virtual-ip-browser.desktop

# Clean up user data (optional)
rm -rf ~/.config/virtual-ip-browser
rm -rf ~/.cache/virtual-ip-browser
```

---

## Troubleshooting

### Common Issues

#### 1. "Running as root without --no-sandbox is not supported"

**Cause:** Electron/Chromium apps cannot run as root for security reasons.

**Solution:**
```bash
# Run as regular user (recommended)
su - username
virtual-ip-browser

# Or use --no-sandbox (development only, NOT recommended)
virtual-ip-browser --no-sandbox
```

#### 2. Dependency errors during .deb installation

**Error:**
```
dpkg: dependency problems prevent configuration of virtual-ip-browser
```

**Solution:**
```bash
sudo apt-get install -f
```

#### 3. AppImage won't run - FUSE error

**Error:**
```
dlopen(): error loading libfuse.so.2
```

**Solution:**
```bash
# Install FUSE
sudo apt install libfuse2   # Ubuntu/Debian
sudo dnf install fuse-libs  # Fedora

# Or extract and run without FUSE
./Virtual-IP-Browser-1.2.1-x86_64.AppImage --appimage-extract
./squashfs-root/virtual-ip-browser
```

#### 4. Application doesn't appear in menu

**Solution:**
```bash
# Update desktop database
sudo update-desktop-database

# Update icon cache
sudo gtk-update-icon-cache /usr/share/icons/hicolor
```

#### 5. Sandbox errors

**Error:**
```
FATAL:setuid_sandbox_host.cc - The SUID sandbox helper binary was found...
```

**Solution:**
```bash
# Fix chrome-sandbox permissions
sudo chown root:root /opt/Virtual\ IP\ Browser/chrome-sandbox
sudo chmod 4755 /opt/Virtual\ IP\ Browser/chrome-sandbox
```

#### 6. GPU/Graphics issues

**Solution:**
```bash
# Disable GPU acceleration
virtual-ip-browser --disable-gpu

# Or use software rendering
virtual-ip-browser --disable-gpu --use-gl=swiftshader
```

### Getting Help

- **GitHub Issues:** https://github.com/virtualipbrowser/virtual-ip-browser/issues
- **Documentation:** See `docs/` directory
- **Debug Mode:** Run with `--enable-logging --v=1` for verbose output

---

## Building from Source

For developers who want to build from source:

```bash
# Clone repository
git clone https://github.com/virtualipbrowser/virtual-ip-browser.git
cd virtual-ip-browser

# Install dependencies
npm install

# Build application
npm run build

# Create packages
npm run package:linux    # All Linux formats
npm run package:win      # Windows
npm run package:mac      # macOS
```

See [docs/PACKAGING.md](./PACKAGING.md) for detailed build instructions.

---

## Related Documentation

- [PACKAGING.md](./PACKAGING.md) - Build and packaging guide
- [BUILD_LOG.md](../BUILD_LOG.md) - Build execution log
- [INSTALLATION_VERIFICATION.md](../INSTALLATION_VERIFICATION.md) - Installation verification report
- [QUICK_START.md](../QUICK_START.md) - Quick start guide
- [README.md](../README.md) - Project overview

---

**Virtual IP Browser** - Take control of your online privacy.
