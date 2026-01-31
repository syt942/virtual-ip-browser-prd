# Virtual IP Browser - Packaging Guide

This document provides comprehensive instructions for building and packaging Virtual IP Browser for Linux distributions, with a focus on `.deb` packages for Debian/Ubuntu-based systems.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Build Configuration](#build-configuration)
- [Building Packages](#building-packages)
- [Package Formats](#package-formats)
- [Icon Requirements](#icon-requirements)
- [Testing Packages](#testing-packages)
- [Troubleshooting](#troubleshooting)
- [Distribution](#distribution)

---

## Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Operating System**: Linux (for building Linux packages)
- **Disk Space**: At least 2GB free space

### Required Tools

```bash
# Install Node.js (if not present)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials (required for native modules)
sudo apt-get install -y build-essential

# Install packaging tools
sudo apt-get install -y rpm         # For RPM packages
sudo apt-get install -y fakeroot    # For .deb packages
sudo apt-get install -y dpkg        # Debian package tools

# Optional: Icon generation tools
sudo apt-get install -y imagemagick icnsutils
```

### Install Project Dependencies

```bash
cd virtual-ip-browser
npm install
```

---

## Quick Start

Build a `.deb` package in three steps:

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Create Linux packages
npm run package:linux
```

Output files will be in the `release/` directory.

---

## Build Configuration

The electron-builder configuration is defined in `package.json` under the `build` key.

### Application Metadata

```json
{
  "build": {
    "appId": "com.virtualipbrowser.app",
    "productName": "Virtual IP Browser",
    "copyright": "Copyright © 2024-2026 Virtual IP Browser Development Team"
  }
}
```

| Field | Description | Current Value |
|-------|-------------|---------------|
| `appId` | Unique application identifier (reverse domain) | `com.virtualipbrowser.app` |
| `productName` | Display name shown to users | `Virtual IP Browser` |
| `copyright` | Copyright notice | `Copyright © 2024-2026...` |

### Linux-Specific Configuration

```json
{
  "linux": {
    "target": ["AppImage", "deb", "rpm"],
    "category": "Network;WebBrowser;Utility;Security",
    "icon": "resources/icons",
    "maintainer": "Virtual IP Browser Development Team <dev@virtualipbrowser.com>",
    "vendor": "Virtual IP Browser Development Team",
    "synopsis": "Privacy-Focused Browser with Proxy Management",
    "description": "Virtual IP Browser is an enhanced privacy-focused browser...",
    "executableName": "virtual-ip-browser",
    "desktop": {
      "Name": "Virtual IP Browser",
      "GenericName": "Privacy Browser",
      "Categories": "Network;WebBrowser;Utility;Security",
      "Keywords": "browser;privacy;proxy;vpn;fingerprint;security",
      "StartupWMClass": "virtual-ip-browser",
      "MimeType": "text/html;text/xml;application/xhtml+xml;..."
    }
  }
}
```

### Debian Package Configuration

```json
{
  "deb": {
    "priority": "optional",
    "compression": "xz",
    "depends": [
      "libgtk-3-0",
      "libnotify4",
      "libnss3",
      "libxss1",
      "libxtst6",
      "xdg-utils",
      "libatspi2.0-0",
      "libuuid1",
      "libsecret-1-0",
      "libgbm1",
      "libasound2"
    ],
    "recommends": ["libappindicator3-1"],
    "afterInstall": "scripts/linux/postinst.sh",
    "afterRemove": "scripts/linux/postrm.sh"
  }
}
```

### Dependencies Explained

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
| `libappindicator3-1` | System tray support (recommended) |

---

## Building Packages

### Development Build

For testing during development:

```bash
# Build the application
npm run build

# Run in development mode
npm run dev
```

### Production Build

#### All Linux Formats

```bash
npm run package:linux
```

This creates:
- `release/virtual-ip-browser_X.X.X_amd64.deb`
- `release/Virtual IP Browser-X.X.X-x86_64.AppImage`
- `release/virtual-ip-browser-X.X.X.x86_64.rpm`

#### Specific Format Only

```bash
# .deb only
npx electron-builder --linux deb

# AppImage only
npx electron-builder --linux AppImage

# RPM only
npx electron-builder --linux rpm
```

#### Cross-Platform Builds

```bash
# Windows (from Linux/macOS)
npm run package:win

# macOS (requires macOS)
npm run package:mac

# All platforms
npm run package
```

### Build Options

```bash
# Build with specific architecture
npx electron-builder --linux --x64
npx electron-builder --linux --arm64

# Build without code signing
npx electron-builder --linux -c.mac.identity=null

# Verbose output
DEBUG=electron-builder npx electron-builder --linux
```

---

## Package Formats

### AppImage

Self-contained executable that runs on most Linux distributions.

**Pros:**
- No installation required
- Works across distributions
- Easy to distribute

**Cons:**
- Larger file size
- No system integration by default
- Requires FUSE

**Usage:**
```bash
chmod +x Virtual\ IP\ Browser-*.AppImage
./Virtual\ IP\ Browser-*.AppImage
```

### .deb (Debian Package)

Native package format for Debian/Ubuntu-based distributions.

**Pros:**
- System integration (menus, file associations)
- Dependency management
- Clean installation/uninstallation
- Automatic updates via APT

**Cons:**
- Debian/Ubuntu only
- Requires root for installation

**Installation:**
```bash
sudo dpkg -i virtual-ip-browser_*.deb
sudo apt-get install -f  # Fix dependencies if needed
```

### .rpm (Red Hat Package)

Native package format for Fedora/RHEL/CentOS/openSUSE.

**Pros:**
- Native integration on RPM-based systems
- Dependency management

**Cons:**
- RPM-based distributions only

**Installation:**
```bash
# Fedora/RHEL
sudo dnf install virtual-ip-browser-*.rpm

# openSUSE
sudo zypper install virtual-ip-browser-*.rpm
```

---

## Icon Requirements

Icons must be placed in `resources/icons/` before building.

### Required Files

| File | Size | Platform |
|------|------|----------|
| `16x16.png` | 16×16 | Linux |
| `24x24.png` | 24×24 | Linux |
| `32x32.png` | 32×32 | Linux |
| `48x48.png` | 48×48 | Linux |
| `64x64.png` | 64×64 | Linux |
| `128x128.png` | 128×128 | Linux |
| `256x256.png` | 256×256 | Linux |
| `512x512.png` | 512×512 | Linux |
| `icon.ico` | Multi-res | Windows |
| `icon.icns` | Multi-res | macOS |

### Generate Icons

Using ImageMagick from a high-resolution source:

```bash
# From a 1024x1024 source image
SOURCE="resources/icons/source/icon-1024.png"

for SIZE in 16 24 32 48 64 128 256 512; do
    convert "$SOURCE" -resize ${SIZE}x${SIZE} "resources/icons/${SIZE}x${SIZE}.png"
done

# Generate Windows ICO
convert resources/icons/16x16.png \
        resources/icons/32x32.png \
        resources/icons/48x48.png \
        resources/icons/256x256.png \
        resources/icons/icon.ico
```

See `resources/icons/README.md` for detailed instructions.

---

## Testing Packages

### Verify .deb Package

```bash
# View package info
dpkg-deb --info release/virtual-ip-browser_*.deb

# List contents
dpkg-deb --contents release/virtual-ip-browser_*.deb

# Extract without installing
dpkg-deb --extract release/virtual-ip-browser_*.deb /tmp/vib-test
```

### Test Installation

```bash
# Install
sudo dpkg -i release/virtual-ip-browser_*.deb

# Verify installation
dpkg -l | grep virtual-ip-browser
which virtual-ip-browser

# Test launch
virtual-ip-browser --version

# Check desktop integration
ls -la /usr/share/applications/virtual-ip-browser.desktop
ls -la /usr/share/icons/hicolor/*/apps/virtual-ip-browser.png

# Uninstall
sudo apt-get remove virtual-ip-browser

# Purge (remove config)
sudo apt-get purge virtual-ip-browser
```

### Test AppImage

```bash
# Make executable
chmod +x release/Virtual\ IP\ Browser-*.AppImage

# Run
./release/Virtual\ IP\ Browser-*.AppImage

# Run with sandbox disabled (if needed)
./release/Virtual\ IP\ Browser-*.AppImage --no-sandbox
```

### Docker Testing

Test in a clean environment:

```bash
# Ubuntu 22.04
docker run -it --rm -v $(pwd)/release:/packages ubuntu:22.04 bash
apt-get update && apt-get install -y /packages/virtual-ip-browser_*.deb

# Debian 12
docker run -it --rm -v $(pwd)/release:/packages debian:12 bash
apt-get update && apt-get install -y /packages/virtual-ip-browser_*.deb
```

---

## Troubleshooting

### Common Issues

#### 1. Missing Dependencies

```
dpkg: dependency problems prevent configuration
```

**Solution:**
```bash
sudo apt-get install -f
```

#### 2. Native Module Errors

```
Error: Cannot find module 'better-sqlite3'
```

**Solution:**
```bash
npm run build
npx electron-rebuild
npm run package:linux
```

#### 3. Icon Not Found

```
Error: Cannot find icon
```

**Solution:**
Ensure PNG icons exist in `resources/icons/` with correct names.

#### 4. Sandbox Errors

```
FATAL:setuid_sandbox_host.cc - The SUID sandbox helper binary was found...
```

**Solution:**
```bash
# Fix chrome-sandbox permissions
sudo chown root:root /opt/Virtual\ IP\ Browser/chrome-sandbox
sudo chmod 4755 /opt/Virtual\ IP\ Browser/chrome-sandbox

# Or run without sandbox (not recommended for production)
virtual-ip-browser --no-sandbox
```

#### 5. Build Fails on ARM

```
Error: Unsupported platform
```

**Solution:**
```bash
# Specify architecture explicitly
npx electron-builder --linux --arm64
```

### Debug Mode

```bash
# Enable verbose logging
DEBUG=electron-builder npm run package:linux

# Check electron-builder version
npx electron-builder --version
```

---

## Distribution

### GitHub Releases

The build configuration includes GitHub release publishing:

```bash
# Build and publish to GitHub Releases
GH_TOKEN=your_github_token npx electron-builder --linux -p always
```

### APT Repository

Host packages in a custom APT repository:

```bash
# Directory structure
apt-repo/
├── pool/
│   └── main/
│       └── v/
│           └── virtual-ip-browser/
│               └── virtual-ip-browser_1.2.1_amd64.deb
├── dists/
│   └── stable/
│       └── main/
│           └── binary-amd64/
│               ├── Packages
│               ├── Packages.gz
│               └── Release
└── Release.gpg

# Generate repository metadata
dpkg-scanpackages pool/ > dists/stable/main/binary-amd64/Packages
gzip -k dists/stable/main/binary-amd64/Packages
```

### User Installation

```bash
# Direct .deb installation
wget https://releases.example.com/virtual-ip-browser_1.2.1_amd64.deb
sudo dpkg -i virtual-ip-browser_1.2.1_amd64.deb
sudo apt-get install -f

# From APT repository
echo "deb https://apt.example.com stable main" | sudo tee /etc/apt/sources.list.d/virtual-ip-browser.list
wget -qO - https://apt.example.com/key.gpg | sudo apt-key add -
sudo apt-get update
sudo apt-get install virtual-ip-browser
```

---

## Build Checklist

Before releasing a new version:

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Ensure all icons are present in `resources/icons/`
- [ ] Run tests: `npm test`
- [ ] Build application: `npm run build`
- [ ] Build packages: `npm run package:linux`
- [ ] Test .deb installation on clean system
- [ ] Test AppImage on different distributions
- [ ] Verify desktop integration works
- [ ] Check all dependencies are satisfied
- [ ] Sign packages (if applicable)
- [ ] Upload to distribution channels

---

## Supported Distributions

### .deb Package

| Distribution | Minimum Version |
|--------------|-----------------|
| Ubuntu | 20.04 LTS |
| Debian | 11 (Bullseye) |
| Linux Mint | 20 |
| Pop!_OS | 20.04 |
| Elementary OS | 6 |
| Zorin OS | 16 |

### .rpm Package

| Distribution | Minimum Version |
|--------------|-----------------|
| Fedora | 35 |
| RHEL/CentOS | 8 |
| openSUSE | Leap 15.3 |
| Rocky Linux | 8 |
| AlmaLinux | 8 |

### AppImage

Works on most Linux distributions with:
- glibc >= 2.31
- FUSE support

---

## File Structure

```
virtual-ip-browser/
├── package.json              # Build configuration
├── electron.vite.config.ts   # Vite configuration
├── resources/
│   └── icons/
│       ├── README.md         # Icon requirements
│       ├── 16x16.png         # Linux icons
│       ├── 32x32.png
│       ├── 48x48.png
│       ├── 64x64.png
│       ├── 128x128.png
│       ├── 256x256.png
│       ├── 512x512.png
│       ├── icon.ico          # Windows
│       └── icon.icns         # macOS
├── scripts/
│   └── linux/
│       ├── postinst.sh       # Post-install script
│       └── postrm.sh         # Post-remove script
├── out/                      # Built application
│   ├── main/
│   ├── preload/
│   └── renderer/
└── release/                  # Package output
    ├── virtual-ip-browser_X.X.X_amd64.deb
    ├── Virtual IP Browser-X.X.X-x86_64.AppImage
    └── virtual-ip-browser-X.X.X.x86_64.rpm
```

---

## References

- [electron-builder Documentation](https://www.electron.build/)
- [Debian Policy Manual](https://www.debian.org/doc/debian-policy/)
- [FreeDesktop.org Specifications](https://specifications.freedesktop.org/)
- [AppImage Documentation](https://docs.appimage.org/)

---

**Last Updated**: January 2025  
**Version**: 1.2.1
