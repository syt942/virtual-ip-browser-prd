# Virtual IP Browser

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/user/virtual-ip-browser)
[![Tests](https://img.shields.io/badge/tests-2850%2B-green.svg)](./TESTING.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

A privacy-focused Electron browser with advanced proxy management, fingerprint spoofing, and web automation capabilities.

## ✨ Features

### 🔒 Privacy Protection
- **WebRTC Leak Prevention**: 4 configurable policies (disable, disable_non_proxied, proxy_only, default)
- **Fingerprint Spoofing**: 6 vectors (Canvas, WebGL, Audio, Navigator, Timezone, Fonts)
- **Tracker Blocking**: Category-based blocking with 50K+ domain blocklist
- **Tab Isolation**: Complete session partitioning per tab

### 🌐 Proxy Management
- **11 Rotation Strategies**: Round-robin, Random, Weighted, Fastest, Least-used, Geographic, Sticky-session, Failover, Time-based, Failure-aware, Custom rules
- **Per-Tab Proxy Assignment**: Different proxy per tab with no cross-contamination
- **Health Monitoring**: Real-time validation with latency tracking
- **Protocol Support**: HTTP, HTTPS, SOCKS4, SOCKS5 with authentication

### 🤖 Automation Engine
- **Search Automation**: Multi-engine support (Google, Bing, DuckDuckGo, Yahoo, Brave)
- **Domain Targeting**: Automated click-through with position tracking
- **Human-Like Behavior**: Randomized timing, natural mouse movements, smart scrolling
- **Self-Healing**: Automatic error recovery with circuit breaker pattern
- **Scheduling**: One-time, recurring, continuous, and cron-based schedules

### 🎨 Magic UI Components
- **Particles**: Interactive background effects
- **Confetti**: Success celebration animations
- **Shimmer Buttons**: Loading state indicators
- **Border Beam**: Active status animations
- **Neon Gradient Cards**: Modern card styling
- **Number Ticker**: Animated statistics

### 🔐 Security
- **CSP Headers**: Strict Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **IPC Rate Limiting**: DoS protection with per-channel limits
- **Input Validation**: Zod schemas with SSRF/XSS protection
- **Credential Encryption**: AES-256-GCM with OS keychain integration
- **Process Isolation**: Sandbox and context isolation enabled

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/user/virtual-ip-browser.git
cd virtual-ip-browser

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration (optional)
```

### Build for Production

```bash
# Build application
npm run build

# Package for distribution
npm run package           # Current platform
npm run package:win       # Windows
npm run package:mac       # macOS
npm run package:linux     # Linux
```

## 📁 Project Structure

```
virtual-ip-browser/
├── electron/                 # Main process
│   ├── main/                # App entry point
│   ├── core/                # Core modules
│   │   ├── proxy-engine/    # Proxy management
│   │   ├── privacy/         # Privacy protection
│   │   ├── automation/      # Automation engine
│   │   ├── resilience/      # Circuit breakers
│   │   ├── tabs/            # Tab management
│   │   ├── session/         # Session management
│   │   ├── translation/     # Translation service
│   │   └── creator-support/ # Creator support
│   ├── ipc/                 # IPC handlers & validation
│   ├── database/            # SQLite database
│   └── utils/               # Utilities
├── src/                     # Renderer process
│   ├── components/          # React components
│   │   ├── browser/         # Browser UI
│   │   ├── dashboard/       # Dashboard
│   │   ├── panels/          # Side panels
│   │   └── ui/              # Magic UI
│   ├── stores/              # Zustand stores
│   └── utils/               # Frontend utilities
├── tests/                   # Test suites
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests
└── docs/                    # Documentation
    └── CODEMAPS/            # Architecture maps
```

## 🧪 Testing

```bash
# Run all tests
npm run test:all

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# With coverage report
npm run test:coverage

# Interactive E2E
npm run test:e2e:ui
```

### Test Coverage

| Type | Count | Coverage |
|------|-------|----------|
| Unit Tests | ~2,000 | 80%+ |
| Integration Tests | ~300 | Core flows |
| E2E Tests | ~550 | Critical paths |
| **Total** | **2,850+** | - |

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System architecture and design |
| [API Reference](./docs/CODEMAPS/api-reference.md) | IPC API documentation |
| [Security](./docs/SECURITY.md) | Security controls and practices |
| [Testing](./TESTING.md) | Test strategy and organization |
| [Development Guide](./DEVELOPMENT_GUIDE.md) | Developer workflow |
| [Codemaps](./docs/CODEMAPS/INDEX.md) | Module architecture maps |

## 🔧 Configuration

### Proxy Rotation Strategies

| Strategy | Description |
|----------|-------------|
| `round-robin` | Sequential rotation through proxy list |
| `random` | Random proxy selection |
| `weighted` | Priority-based selection |
| `fastest` | Lowest latency preferred |
| `least-used` | Load balancing by usage count |
| `geographic` | Region-based rotation |
| `sticky-session` | Domain-to-proxy affinity |
| `failover` | Automatic fallback on failure |
| `time-based` | Rotate every N minutes |
| `failure-aware` | Avoid recently failed proxies |
| `custom` | User-defined rules |

### Privacy Settings

| Setting | Options | Default |
|---------|---------|---------|
| WebRTC Policy | disable, disable_non_proxied, proxy_only, default | disable_non_proxied |
| Canvas Spoofing | true/false | true |
| WebGL Spoofing | true/false | true |
| Audio Spoofing | true/false | true |
| Navigator Spoofing | true/false | true |
| Tracker Blocking | true/false | true |

## 🛡️ Security

### Security Headers

All responses include:
- `Content-Security-Policy`: Strict CSP with no unsafe-eval
- `Strict-Transport-Security`: 1 year max-age
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: 1; mode=block

### IPC Security

- **Validation**: All inputs validated with Zod schemas
- **Rate Limiting**: Per-channel limits (5-120 requests/minute)
- **SSRF Protection**: Private IP and metadata endpoint blocking
- **XSS Prevention**: Input sanitization and encoding

### Credential Security

- **Encryption**: AES-256-GCM for sensitive data
- **Key Storage**: OS keychain (Keychain on macOS, Credential Manager on Windows)
- **Memory Safety**: Keys cleared on app close

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm run test:all`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [Changelog](./CHANGELOG.md)
- [Release Notes](./RELEASE_NOTES.md)
- [Security Policy](./SECURITY.md)
- [Issue Tracker](https://github.com/user/virtual-ip-browser/issues)

---

**Version:** 1.3.0 | **Last Updated:** 2025-02-01
