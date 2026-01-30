# Virtual IP Browser - Quick Start Guide

Get up and running with Virtual IP Browser in 5 minutes!

---

## 🚀 Installation

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** for cloning
- **Terminal** (bash, zsh, or PowerShell)

### Step 1: Clone and Install

```bash
# Navigate to the project
cd virtual-ip-browser

# Install dependencies
npm install

# This will install:
# - Electron 34.5.8
# - React 19.2.3
# - All required dependencies
```

### Step 2: Environment Setup (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit .env if needed (optional for local development)
```

---

## 🎮 Running the Application

### Development Mode

```bash
# Start the development server
npm run dev

# This will:
# 1. Start Vite dev server for React (port 5173)
# 2. Launch Electron with hot-reload enabled
# 3. Open DevTools automatically
```

You should see:
```
[Vite] Dev server running at http://localhost:5173
[Database] Database initialized
[Proxy Manager] Initialized
[Privacy Manager] Initialized
[Automation Manager] Initialized
[IPC Handlers] Registered successfully
```

---

## 📋 Basic Usage

### 1. Add a Proxy

**UI Method**:
1. Click the **"Proxy"** button in the bottom toolbar
2. Click **"Add Proxy"** (shimmer button)
3. Fill in proxy details:
   - Name: "My First Proxy"
   - Host: "proxy.example.com"
   - Port: 8080
   - Protocol: HTTP/HTTPS/SOCKS4/SOCKS5
   - Username/Password (if required)
4. Click "Save"

**The proxy will be automatically validated!**

**Console Method** (for testing):
```javascript
// In DevTools Console
window.api.proxy.add({
  name: 'Test Proxy',
  host: 'proxy.example.com',
  port: 8080,
  protocol: 'https',
  username: 'user',
  password: 'pass'
});
```

### 2. Configure Privacy Settings

1. Click **"Privacy"** in the bottom toolbar
2. Toggle protection features:
   - ✅ Canvas Fingerprint
   - ✅ WebGL Fingerprint  
   - ✅ Audio Fingerprint
   - ✅ Navigator Spoofing
   - ✅ Timezone Spoofing
   - ✅ WebRTC Block
   - ✅ Tracker Blocking

**All protections are enabled by default!**

### 3. Start Automation

1. Click **"Automation"** in the bottom toolbar
2. Select search engine (Google, Bing, DuckDuckGo, Yahoo, Brave)
3. Add keywords:
   - Type keyword in input
   - Press Enter or click "+"
   - Repeat for multiple keywords
4. Add target domains (optional):
   - Type domain (e.g., "example.com")
   - Press Enter or click "+"
5. Click **"Start"** button

**Watch automation in real-time!**

---

## 🔍 Features Overview

### ✅ Implemented Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Proxy Management** | ✅ Complete | Add, validate, rotate proxies |
| **6 Rotation Strategies** | ✅ Complete | Round-robin, random, fastest, etc. |
| **Privacy Protection** | ✅ Complete | 7 fingerprint protections |
| **Search Automation** | ✅ Complete | 5 search engines supported |
| **Human Behavior** | ✅ Complete | Random delays, scrolling |
| **Session Management** | ✅ Complete | Save/restore sessions |
| **Activity Logging** | ✅ Complete | Database-persisted logs |
| **Modern UI** | ✅ Complete | Magic UI animations |

---

## 📊 Understanding the UI

### Main Window Layout

```
┌─────────────────────────────────────────────────┐
│  [Tab 1] [Tab 2] [Tab 3] [+]         [≡]      │ ← Tab Bar
├─────────────────────────────────────────────────┤
│  [←] [→] [⟳]  [🔒 example.com        ]  🟢    │ ← Address Bar
├─────────────────────────────────────────────────┤
│                                         ┌───────┤
│   Browser Content Area                  │ Proxy │
│   (Isolated BrowserView)                │ Panel │
│                                         │       │
│                                         │  or   │
│                                         │       │
│                                         │Privacy│
│                                         │ Panel │
│                                         │       │
│                                         │  or   │
│                                         │       │
│                                         │Autom. │
│                                         │ Panel │
├─────────────────────────────────────────┴───────┤
│ [Proxy] [Privacy] [Automation]                  │ ← Bottom Bar
└─────────────────────────────────────────────────┘
```

### Proxy Panel

- **Status Indicators**:
  - 🟢 Green = Active
  - 🔴 Red = Failed
  - 🟡 Yellow = Checking

- **Statistics**:
  - Latency (ms)
  - Success rate (%)
  - Total requests

- **Actions**:
  - Validate: Test proxy connection
  - Remove: Delete proxy

### Automation Panel

- **Session Statistics**:
  - Completed tasks
  - Failed tasks
  - Success rate
  - Average duration

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm test -- --watch

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Manual Testing Checklist

- [ ] Add proxy and validate
- [ ] Create new tab
- [ ] Toggle privacy protections
- [ ] Add keywords to automation
- [ ] Start automation session
- [ ] Monitor activity logs
- [ ] Save session
- [ ] Restore session

---

## 📦 Building for Production

### Create Production Build

```bash
# Build application
npm run build

# Package for your platform
npm run package          # Current platform
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux
```

Output location: `release/` directory

### Installation Files

- **Windows**: `Virtual IP Browser Setup.exe` (NSIS installer)
- **macOS**: `Virtual IP Browser.dmg`
- **Linux**: `Virtual IP Browser.AppImage`

---

## 🐛 Troubleshooting

### Application Won't Start

**Problem**: Electron window doesn't open

**Solution**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Proxies Not Working

**Problem**: All proxies show as "Failed"

**Solution**:
1. Verify proxy credentials are correct
2. Test proxy manually: `curl -x http://proxy:port https://api.ipify.org`
3. Check firewall isn't blocking connections
4. Verify proxy supports the protocol (HTTP/HTTPS/SOCKS)

### Search Automation Not Finding Results

**Problem**: Tasks complete but no results found

**Solution**:
1. Search engines may have changed HTML structure
2. Check DevTools console for errors
3. Try different search engine
4. Verify internet connection is working

### Privacy Protections Not Applied

**Problem**: Fingerprint still detectable

**Solution**:
1. Verify protections are toggled ON in Privacy panel
2. Create new tab AFTER enabling protections
3. Test on: https://browserleaks.com/canvas
4. Some advanced fingerprinting may still detect anomalies

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `electron/main/index.ts` | Main process entry point |
| `electron/database/schema.sql` | Database structure |
| `src/App.tsx` | React app root |
| `src/stores/*.ts` | State management |
| `electron/core/*` | Core functionality |

---

## 💡 Tips & Tricks

### 1. Keyboard Shortcuts (Coming Soon)

- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab
- `Ctrl+Shift+P` - Toggle proxy panel
- `Ctrl+R` - Reload page

### 2. Proxy Best Practices

- ✅ Use residential proxies for best success rate
- ✅ Validate proxies before using
- ✅ Rotate proxies frequently
- ✅ Monitor success rates
- ❌ Don't use free public proxies (often detected)

### 3. Automation Best Practices

- ✅ Add delays between requests (3-5 seconds)
- ✅ Use human behavior simulation
- ✅ Rotate proxies for each search
- ✅ Monitor for captchas
- ❌ Don't run too many concurrent sessions

### 4. Performance Tips

- Keep total proxies under 100 for best performance
- Close unused tabs to free memory
- Clear activity logs monthly
- Use fastest proxies for time-critical tasks

---

## 🆘 Getting Help

### Resources

- 📖 [Full Documentation](./docs/)
- 🏗️ [Architecture Guide](./docs/ARCHITECTURE.md)
- 📝 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- 🐛 [GitHub Issues](https://github.com/yourusername/virtual-ip-browser/issues)

### Report Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Screenshots/videos
4. Console errors (DevTools)
5. System info (OS, Node version)

### Feature Requests

Open a GitHub issue with:
- Clear description of feature
- Use case / why it's needed
- Example of how it would work

---

## 🎓 Next Steps

### For Users
1. ✅ Complete this Quick Start
2. ⏭️ Read [Architecture Guide](./docs/ARCHITECTURE.md)
3. ⏭️ Explore advanced features
4. ⏭️ Join community discussions

### For Developers
1. ✅ Set up development environment
2. ⏭️ Read [Contributing Guide](./CONTRIBUTING.md)
3. ⏭️ Write tests for new features
4. ⏭️ Submit pull requests

---

## 🎉 You're Ready!

The Virtual IP Browser is now running and ready to use. Start by adding a proxy and exploring the features!

**Happy browsing with privacy! 🔒**

---

*Last Updated: 2026-01-28*
