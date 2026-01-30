# Virtual IP Browser

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/virtualipbrowser/virtual-ip-browser)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-54_files-brightgreen.svg)](./TESTING.md)
[![Coverage](https://img.shields.io/badge/coverage-85%25+-brightgreen.svg)](./coverage/index.html)
[![Security](https://img.shields.io/badge/security-hardened-brightgreen.svg)](./docs/SECURITY_CONSOLIDATED.md)

**Enhanced Privacy-Focused Browser with Proxy Management and Fingerprint Spoofing**

A next-generation, privacy-focused Electron-based desktop browser designed to provide users with unprecedented control over their online identity and browsing privacy.

![Electron](https://img.shields.io/badge/electron-35.x-green)
![React](https://img.shields.io/badge/react-19.x-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)
![Security](https://img.shields.io/badge/security-enterprise--grade-brightgreen)

## ✨ Key Features

### 🔒 Advanced Proxy Management
- **10 Rotation Strategies** including round-robin, random, fastest, failure-aware, weighted, and 4 advanced strategies
- **Geographic Rotation** - Select proxies by country/region with exclusion lists
- **Sticky-Session** - Maintain consistent proxy-domain mappings with TTL
- **Time-Based Rotation** - Scheduled proxy rotation with configurable jitter
- **Custom Rules** - Conditional proxy selection based on domain, time, and more
- Support for HTTP, HTTPS, SOCKS4, SOCKS5 protocols
- Encrypted credential storage (AES-256-GCM)

### 🎭 Fingerprint Spoofing
- Canvas fingerprint randomization with native property masking
- WebGL parameter spoofing with vendor/renderer hiding
- Audio context noise injection
- Navigator property customization
- Timezone manipulation with Intl API spoofing

### 🛡️ Privacy Protection
- WebRTC leak prevention (ICE candidate filtering)
- Comprehensive tracker blocking (EasyList, EasyPrivacy)
- Per-tab session isolation with partition separation
- Cookie management and fingerprint detection resistance

### 🤖 Web Automation (Domain Targeting)
- **Domain Filtering** - Allowlist, blocklist, and regex pattern matching
- **Bounce Rate Control** - Maintain realistic visit patterns
- **Human-Like Interaction** - Bezier mouse paths, Gaussian reading times
- **Behavior Simulation** - Realistic scrolling, clicking, and navigation
- Search engine automation with result targeting

### ⏰ Cron Scheduler (P1 Feature)
- **Full Cron Expression Support** - Standard 5-field cron syntax
- **Human-Readable Parsing** - "every 5 minutes", "daily at 9am"
- **Timezone-Aware Scheduling** - Execute tasks in local timezone
- **Recurring Task Management** - Automation task scheduling

### 🔄 Circuit Breaker (P1 Feature)
- **Fault Tolerance** - Automatic failure detection and recovery
- **Three-State Model** - CLOSED → OPEN → HALF_OPEN state machine
- **Per-Service Breakers** - Separate breakers for proxy, search, API calls
- **Metrics & Monitoring** - Failure rates, trip counts, recovery tracking
- **Database Persistence** - State survives application restarts

### 🔍 Captcha Detection (P1 Feature)
- **Multi-Provider Detection** - reCAPTCHA v2/v3, hCaptcha, Cloudflare, Arkose
- **Visual & Behavioral Analysis** - Image analysis, DOM inspection, behavioral patterns
- **Challenge Classification** - Invisible, checkbox, image selection types
- **Automated Response** - Configurable handling strategies

### 🎬 Creator Support (EP-007)
- **Multi-Platform Support** - YouTube, Twitch, Medium
- **Ad Detection & Viewing** - Platform-specific ad selector detection
- **Engagement Simulation** - Human-like ad interaction patterns
- **Creator Tracking** - Monitor support sessions and analytics
- **Scheduling** - Recurring, daily, weekly, or one-time support

### 🌍 Translation Integration (EP-008)
- **30+ Languages** - Comprehensive language support
- **Auto-Detection** - Automatic source language detection
- **Geographic Mapping** - Timezone and country to language inference
- **LRU Caching** - 10,000 entry cache with hit rate tracking
- **Search Keyword Translation** - Localized search automation

### ✨ Magic UI Components
- **NumberTicker** - Animated number counters with spring physics
- **BorderBeam** - Gradient animated border effects
- **PulsatingButton** - Buttons with pulse animation
- **ShimmerButton** - Shimmer/shine button effects

### 🔐 Security Features (v1.2.0)

Virtual IP Browser implements enterprise-grade security controls:

| Security Control | Description | Status |
|-----------------|-------------|--------|
| **Zod Validation** | Type-safe input validation on all IPC handlers | ✅ Implemented |
| **Rate Limiting** | Per-channel sliding window rate limiting | ✅ Implemented |
| **ReDoS Protection** | Pattern detection for regex denial-of-service | ✅ Implemented |
| **SSRF Prevention** | Blocks private IPs, localhost, cloud metadata | ✅ Implemented |
| **CSS Sanitization** | Injection prevention for CSS selectors | ✅ Implemented |
| **IPC Whitelist** | Explicit channel allowlisting | ✅ Implemented |
| **AES-256-GCM** | Encrypted credential storage | ✅ Implemented |
| **Context Isolation** | Secure Electron IPC via contextBridge | ✅ Implemented |
| **Sandbox Mode** | Renderer process sandboxing enabled | ✅ Implemented |
| **Native Masking** | Fingerprint property descriptor protection | ✅ Implemented |

For detailed security documentation, see [docs/SECURITY_CONSOLIDATED.md](./docs/SECURITY_CONSOLIDATED.md).

---

## 📊 Test Coverage

| Metric | Coverage | Target | Status |
|--------|----------|--------|--------|
| **Overall** | 85%+ | 80% | ✅ Exceeded |
| **Tab Manager** | 90% | 90% | ✅ Met |
| **Database** | 90% | 90% | ✅ Met |
| **Privacy** | 95% | 95% | ✅ Met |
| **E2E PRD Coverage** | 100% | 100% | ✅ Met |

### Test Suites

| Category | Files | Tests | Status |
|----------|-------|-------|--------|
| Unit Tests | 32 files | 200+ | ✅ Passing |
| Database Tests | 12 files | 80+ | ✅ Passing |
| Privacy Tests | 11 files | 60+ | ✅ Passing |
| Resilience Tests | 2 files | 25+ | ✅ Passing |
| Integration Tests | 1 file | 15+ | ✅ Passing |
| E2E Tests | 11 files | 50+ | ✅ Passing |
| **Total** | **54 files** | **400+** | ✅ **All Passing** |

Run tests with: `npm test` or `npm run test:e2e`

For detailed testing documentation, see [TESTING.md](./TESTING.md).

---

## ⚠️ Known Issues

Based on code review and security audit findings:

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Build-time vulnerabilities in electron-builder | Low | Known | Does not affect runtime security |
| E2E tests require display server | Low | Known | Use Xvfb on headless systems |
| Some P2 features pending | Low | Planned | See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/virtual-ip-browser.git
cd virtual-ip-browser

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory (optional):

```env
# Database
DATABASE_PATH=./data/browser.db

# Encryption (auto-generated if not provided)
ENCRYPTION_KEY=your-32-byte-hex-key

# Logging
LOG_LEVEL=info
```

### Verify Installation

```bash
# Run setup verification
./verify-setup.sh

# Check TypeScript compilation
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test
```

---

## 📁 Project Structure

```
virtual-ip-browser/
├── electron/                    # Main process code (104 TypeScript files)
│   ├── core/
│   │   ├── proxy-engine/       # Proxy management & rotation (10 strategies)
│   │   │   └── strategies/     # 11 rotation strategy implementations
│   │   ├── automation/         # Domain targeting & behavior simulation
│   │   │   ├── captcha-detector.ts  # P1: Captcha detection
│   │   │   ├── cron-parser.ts       # P1: Cron expression parser
│   │   │   ├── scheduler.ts         # P1: Task scheduling
│   │   │   └── search/              # Search engine modules
│   │   ├── resilience/         # P1: Fault tolerance layer
│   │   │   ├── circuit-breaker.ts   # Circuit breaker pattern
│   │   │   └── circuit-breaker-registry.ts
│   │   ├── creator-support/    # Creator monetization (EP-007)
│   │   ├── translation/        # Multi-language support (EP-008)
│   │   ├── privacy/            # Fingerprint & tracker blocking
│   │   │   └── fingerprint/    # 5 fingerprint spoofing modules
│   │   ├── session/            # Session management
│   │   └── tabs/               # Tab management
│   ├── database/               # SQLite persistence layer
│   │   ├── repositories/       # 11 data access repositories
│   │   ├── migrations/         # Schema migrations with embedded SQL
│   │   └── services/           # Encryption service (AES-256-GCM)
│   ├── ipc/                    # IPC handlers & validation
│   │   ├── handlers/           # Channel handlers with Zod validation
│   │   ├── schemas/            # Zod validation schemas
│   │   └── rate-limiter.ts     # Per-channel rate limiting
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Security utilities
│   └── main/                   # Electron entry point
├── src/                        # Renderer process (React)
│   ├── components/
│   │   ├── browser/            # Browser chrome components
│   │   ├── panels/             # Configuration panels
│   │   ├── dashboard/          # Analytics dashboard
│   │   └── ui/                 # Magic UI components
│   ├── stores/                 # Zustand state management
│   ├── hooks/                  # Custom React hooks
│   └── utils/                  # Utility functions
├── docs/                       # Documentation
│   ├── CODEMAPS/              # 9 architecture codemaps
│   ├── ARCHITECTURE.md        # System architecture
│   └── SECURITY_CONSOLIDATED.md # Security documentation
├── tests/                      # Test suites (54 test files)
│   ├── unit/                  # Unit tests (32 files)
│   │   ├── database/          # Database repository tests (12 files)
│   │   ├── privacy/           # Privacy module tests (11 files)
│   │   └── resilience/        # Circuit breaker tests (2 files)
│   ├── integration/           # Integration tests (1 file)
│   └── e2e/                   # End-to-end tests (11 files)
│       └── pages/             # Page object models
└── coverage/                   # Test coverage reports
```

### Project Statistics

| Metric | Count |
|--------|-------|
| **Total TypeScript Files** | 203 |
| **Electron Main Process** | 104 files |
| **React Renderer** | 45 files |
| **Test Files** | 54 files |
| **Documentation Files** | 30+ files |
| **Lines of Code** | ~25,000+ |

---

## 🔧 Configuration

### Proxy Rotation Strategies

```typescript
// Geographic rotation - select by region
{
  strategy: 'geographic',
  excludeCountries: ['CN', 'RU'],
  preferredRegions: ['US-CA', 'US-NY']
}

// Sticky-session - consistent domain mapping
{
  strategy: 'sticky-session',
  stickySessionTTL: 3600000,  // 1 hour
  stickyHashAlgorithm: 'consistent'
}

// Time-based - scheduled rotation
{
  strategy: 'time-based',
  interval: 300000,  // 5 minutes
  jitterPercent: 20,
  scheduleWindows: [{ startHour: 9, endHour: 17, daysOfWeek: [1,2,3,4,5] }]
}

// Custom rules - conditional logic
{
  strategy: 'custom',
  rules: [{
    name: 'Banking sites use US proxy',
    conditions: [{ field: 'domain', operator: 'contains', value: 'bank' }],
    actions: [{ action: 'use_country', params: { country: 'US' } }]
  }]
}
```

### Domain Targeting

```typescript
// Configure domain filters
const targeting = new DomainTargeting({
  bounceRateTarget: 40,      // 40% bounce rate
  minReadingTime: 30,        // 30 seconds minimum
  maxReadingTime: 120,       // 2 minutes maximum
  journeyPagesMin: 2,        // Visit 2-3 pages
  journeyPagesMax: 3
});

targeting.setFilters({
  allowlist: ['example.com', 'target.org'],
  blocklist: ['competitor.com'],
  regexPatterns: ['^blog\\..*\\.com$']
});
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📦 Building

```bash
# Build for development
npm run build

# Package for distribution
npm run package

# Platform-specific builds
npm run package:win    # Windows (NSIS, Portable)
npm run package:mac    # macOS (DMG, ZIP)
npm run package:linux  # Linux (AppImage, DEB)
```

---

## 📚 Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture, multi-process model |
| [Security](docs/SECURITY_CONSOLIDATED.md) | Security controls & audit findings |
| [Testing](TESTING.md) | Test coverage, strategy, and how to run tests |
| [API Reference](docs/CODEMAPS/api-reference.md) | Complete IPC API documentation |
| [Contributing](CONTRIBUTING.md) | Development guidelines, PR process |
| [Changelog](CHANGELOG.md) | Version history |
| [User Guide](USER_GUIDE.md) | End-user documentation |

### Project Status

| Document | Description |
|----------|-------------|
| [Final Project Status](FINAL_PROJECT_STATUS.md) | P1 completion summary, metrics |
| [Implementation Plan](IMPLEMENTATION_PLAN.md) | Feature roadmap (all P1 complete) |
| [Database Schema](DATABASE_SCHEMA.md) | SQLite schema documentation |

### Codemaps (Architecture Documentation)

| Module | Codemap |
|--------|---------|
| Overview | [docs/CODEMAPS/INDEX.md](docs/CODEMAPS/INDEX.md) |
| Proxy Engine | [docs/CODEMAPS/proxy-engine.md](docs/CODEMAPS/proxy-engine.md) |
| Automation | [docs/CODEMAPS/automation.md](docs/CODEMAPS/automation.md) |
| Creator Support | [docs/CODEMAPS/creator-support.md](docs/CODEMAPS/creator-support.md) |
| Translation | [docs/CODEMAPS/translation.md](docs/CODEMAPS/translation.md) |
| Frontend | [docs/CODEMAPS/frontend.md](docs/CODEMAPS/frontend.md) |
| Database | [docs/CODEMAPS/database.md](docs/CODEMAPS/database.md) |
| Security | [docs/CODEMAPS/security.md](docs/CODEMAPS/security.md) |

### Implementation Reports

| Document | Description |
|----------|-------------|
| [Security Fixes](SECURITY_FIXES.md) | Security improvements made |
| [Cleanup Log](CLEANUP_LOG.md) | Code cleanup record |
| [Refactoring Log](docs/REFACTORING_LOG.md) | Refactoring changes |
| [Captcha Handling](docs/CAPTCHA_HANDLING.md) | Captcha detection documentation |

---

## 🛠️ Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Desktop Framework | Electron | 34.x |
| Frontend | React | 19.x |
| Language | TypeScript | 5.6.x |
| State Management | Zustand | 5.x |
| Styling | Tailwind CSS | 3.4.x |
| Animation | Framer Motion | 12.x |
| Database | better-sqlite3 | 11.x |
| Validation | Zod | 4.x |
| Testing | Vitest | 1.x |
| E2E Testing | Playwright | 1.x |
| Build Tool | electron-vite | 2.x |

---

## 🗺️ Roadmap

### Completed ✅
- [x] Core browser functionality
- [x] Proxy management with 10 rotation strategies
- [x] Privacy protection (fingerprint, WebRTC, trackers)
- [x] Web automation foundation
- [x] **EP-005**: Domain targeting & behavior simulation
- [x] **EP-007**: Creator support (YouTube, Twitch, Medium)
- [x] **EP-008**: Translation integration (30+ languages)
- [x] **Magic UI**: Enhanced UI components
- [x] **Security**: Enterprise-grade security controls (v1.1.0)

### Planned 📋
- [ ] Improve test coverage to 80%+
- [ ] Cloud sync for sessions
- [ ] Plugin system
- [ ] Advanced analytics dashboard
- [ ] Browser extension support

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Requirements
- All code must pass TypeScript strict checks
- Minimum 80% test coverage for new features
- Follow coding standards in CONTRIBUTING.md
- Security review required for IPC changes

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop application framework
- [React](https://react.dev/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Magic UI](https://magicui.design/) - UI component inspiration
- [Radix UI](https://www.radix-ui.com/) - Accessible UI primitives
- [Zod](https://zod.dev/) - TypeScript-first schema validation

---

**Virtual IP Browser** - Take control of your online privacy.

*Last Updated: 2025-01-30*
