# Changelog

All notable changes to the Virtual IP Browser project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned (P2 Features)
- Cloud sync for sessions
- Plugin system architecture
- Advanced analytics dashboard
- Browser extension support
- Mobile emulation mode

---

## [1.2.0] - 2025-01-30

### Major Release: P1 Feature Complete

This release marks the completion of all P1 features with comprehensive test coverage (85%+).

### Added

#### P1 Features

##### Cron Scheduler
- **Full cron expression support**: Standard 5-field syntax (minute, hour, day, month, weekday)
- **Human-readable parsing**: Natural language expressions like "every 5 minutes", "daily at 9am"
- **Timezone-aware scheduling**: Execute tasks in local timezone
- **Recurring task management**: Create, update, pause, resume scheduled tasks
- **Implementation**: `electron/core/automation/cron-parser.ts`, `scheduler.ts`

##### Circuit Breaker Pattern
- **Fault tolerance**: Automatic failure detection and service protection
- **Three-state model**: CLOSED → OPEN → HALF_OPEN state machine
- **Per-service breakers**: Separate circuit breakers for proxy, search, API, translation
- **Configurable thresholds**: Failure count, failure rate, reset timeout
- **Registry management**: Central management of multiple circuit breakers
- **Database persistence**: State survives application restarts
- **Metrics & monitoring**: Failure rates, trip counts, recovery tracking
- **Implementation**: `electron/core/resilience/`

##### Captcha Detection
- **Multi-provider detection**: reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, Arkose Labs
- **Visual analysis**: Image-based captcha element detection
- **Behavioral analysis**: Mouse movement and interaction pattern analysis
- **DOM inspection**: Provider-specific element and script detection
- **Challenge classification**: Invisible, checkbox, image selection, puzzle types
- **Configurable handling**: Pause, retry, skip, or alert on detection
- **Implementation**: `electron/core/automation/captcha-detector.ts`

#### Security Enhancements
- **Native property masking**: Fingerprint properties use proper descriptors to avoid detection
- **Sandbox mode enabled**: Renderer process sandboxing for enhanced security
- **Enhanced canvas protection**: Improved noise injection with detection resistance
- **WebGL vendor/renderer hiding**: Better masking of GPU fingerprint data

#### Test Coverage (85%+ Achieved)
- **54 test files** total across unit, integration, and E2E
- **Unit tests**: 32 files covering all core modules
- **Database tests**: 12 files for all repositories
- **Privacy tests**: 11 files for fingerprint protection
- **Resilience tests**: 2 files for circuit breaker
- **E2E tests**: 11 files with 100% PRD coverage
- **Page Object Models**: Reusable test patterns

#### New Test Files Added
- `tests/unit/captcha-detector.test.ts`
- `tests/unit/cron-parser.test.ts`
- `tests/unit/cron-scheduler.test.ts`
- `tests/unit/resilience/circuit-breaker.test.ts`
- `tests/unit/resilience/circuit-breaker-registry.test.ts`
- `tests/unit/database/circuit-breaker.repository.test.ts`
- `tests/unit/database/creator-support-history.repository.test.ts`
- `tests/unit/database/execution-logs.repository.test.ts`
- `tests/unit/privacy/detection-vectors.test.ts`
- `tests/e2e/captcha-detection.spec.ts`
- `tests/e2e/circuit-breaker.spec.ts`
- `tests/e2e/scheduling-system.spec.ts`

#### Documentation
- **TESTING.md**: Comprehensive testing documentation
- **FINAL_PROJECT_STATUS.md**: Project completion summary
- **Updated CODEMAPS**: Architecture documentation for new modules
- **Updated ARCHITECTURE.md**: Circuit breaker and resilience layer documentation

### Changed
- **Version bump**: 1.1.0 → 1.2.0
- **Electron upgrade**: 34.x → 35.x
- **Coverage target**: Increased from 44% to 85%+
- **README.md**: Updated with new features, statistics, and coverage
- **IMPLEMENTATION_PLAN.md**: Marked all P1 items as complete

### Fixed
- **Fingerprint detection resistance**: Native property descriptors now properly masked
- **Canvas noise consistency**: Improved per-session noise seeding
- **WebRTC ICE filtering**: Better handling of TURN/STUN candidates
- **Rate limiter edge cases**: Fixed sliding window boundary conditions

### Security
- All security controls from v1.1.0 maintained and enhanced
- No new vulnerabilities introduced
- Build-time vulnerabilities in electron-builder documented (does not affect runtime)

---

## [1.1.0] - 2025-01-30

### Security Release

This release focuses on enterprise-grade security controls based on comprehensive security audits.

### Added

#### Security Features
- **Zod Input Validation**: Type-safe validation on all 15+ IPC handlers
  - `ProxyConfigSchema` for proxy management
  - `AutomationConfigSchema` for automation tasks
  - `NavigationSchema` for URL navigation
  - `FingerprintSchema` for privacy settings
- **Rate Limiting**: Sliding window rate limiter
  - Per-channel configurable limits
  - Default: 100 requests/minute
  - Sensitive operations: 10-50 requests/minute
- **SSRF Protection**: Server-Side Request Forgery prevention
  - Private IP range blocking (10.x, 172.16-31.x, 192.168.x)
  - Localhost/loopback blocking
  - Cloud metadata endpoint blocking (169.254.169.254)
- **ReDoS Protection**: Regular Expression Denial of Service prevention
  - Pattern complexity detection
  - Input length limits (default: 1000 chars)
  - Dangerous pattern rejection
- **CSS Sanitization**: Injection prevention for CSS selectors
  - JavaScript URL blocking
  - Expression removal
  - Length limits (500 chars)
- **IPC Channel Whitelist**: Explicit channel allowlisting in preload

#### Documentation
- `docs/SECURITY_CONSOLIDATED.md` - Unified security documentation
- `CONTRIBUTING.md` - Comprehensive contribution guidelines
- Updated `docs/ARCHITECTURE.md` - Full system architecture
- `docs/CODEMAPS/security.md` - Security layer codemap

### Changed
- Updated Zod to v4.3.6
- Enhanced preload script with channel whitelist
- Improved error messages (sanitized for security)

### Security Fixes
- **HIGH**: Added input validation to all IPC handlers
- **HIGH**: Implemented rate limiting to prevent DoS
- **HIGH**: Added SSRF protection on navigation
- **MEDIUM**: Fixed ReDoS vulnerability in domain patterns
- **MEDIUM**: Added CSS selector sanitization
- **MEDIUM**: Encrypted credential storage (AES-256-GCM)
- **MEDIUM**: IPC channel whitelisting

### PRD Compliance
| Requirement | Status | Notes |
|------------|--------|-------|
| Input validation | ✅ Complete | All IPC channels |
| Rate limiting | ✅ Complete | Per-channel limits |
| Secure credentials | ✅ Complete | AES-256-GCM |
| Context isolation | ✅ Complete | Electron security |

---

## [1.0.0] - 2025-01-28

### Major Release - Full PRD Implementation

This release completes all PRD requirements including core features, automation, and enhancement packages.

### Added

#### Core Browser Features
- **Multi-tab Browsing**: Full tab lifecycle management with BrowserView
- **Proxy Engine**: HTTP/HTTPS/SOCKS4/SOCKS5 support
- **10 Rotation Strategies**:
  1. `round-robin` - Sequential rotation
  2. `random` - Random selection
  3. `least-used` - Load balancing by usage count
  4. `fastest` - Lowest latency preferred
  5. `failure-aware` - Avoid failed proxies
  6. `weighted` - Priority-based selection
  7. `geographic` - Region-based rotation (NEW)
  8. `sticky-session` - Domain-consistent mapping (NEW)
  9. `time-based` - Scheduled rotation (NEW)
  10. `custom-rules` - Conditional logic (NEW)

#### Privacy Protection
- **Fingerprint Spoofing**:
  - Canvas fingerprint randomization
  - WebGL parameter spoofing
  - Audio context noise injection
  - Navigator property customization
  - Timezone manipulation
- **WebRTC Protection**: IP leak prevention
- **Tracker Blocking**: EasyList/EasyPrivacy support

#### EP-005: Domain Targeting & Behavior Simulation
- Domain filtering (allowlist, blocklist, regex patterns)
- Bounce rate control (configurable target percentage)
- Human-like interaction:
  - Bezier curve mouse paths
  - Gaussian distribution for reading times
  - Natural scrolling patterns
- Search engine automation with result targeting
- Page interaction engine (dwell time, internal links)

#### EP-007: Creator Support
- Platform detection (YouTube, Twitch, Medium)
- Creator ID extraction from URLs
- Ad viewing automation:
  - Platform-specific ad selector detection
  - Engagement simulation
  - Watch time tracking
- Support session scheduling:
  - One-time, daily, weekly, recurring
  - Time-of-day configuration
- Analytics and metrics tracking

#### EP-008: Translation Integration
- 30+ language support
- Automatic language detection
- Geographic mapping:
  - Timezone to language inference
  - Country code to language mapping
- LRU caching (10,000 entries)
- Cache hit rate tracking
- Search keyword translation

#### Magic UI Components
- `NumberTicker` - Animated counters with spring physics
- `BorderBeam` - Gradient animated borders
- `PulsatingButton` - Pulse animation buttons
- `ShimmerButton` - Shimmer effect buttons
- `Toast` - Notification system

#### Database Layer
- SQLite persistence with better-sqlite3
- Repository pattern implementation:
  - `ProxyRepository`
  - `EncryptedCredentialsRepository`
  - `ProxyUsageStatsRepository`
  - `RotationConfigRepository`
  - `RotationRulesRepository`
  - `RotationEventsRepository`
  - `StickySessionRepository`
- Migration system with versioned SQL files
- Encryption service (AES-256-GCM)

#### Testing Infrastructure
- Unit tests with Vitest (17 test files)
- Integration tests for IPC communication
- E2E tests with Playwright (4 test files)
- Test coverage reporting

### PRD Compliance Summary

| PRD Section | Requirement | Status |
|-------------|-------------|--------|
| **Core** | Multi-tab browsing | ✅ Complete |
| **Core** | Proxy management | ✅ Complete |
| **Core** | 10 rotation strategies | ✅ Complete |
| **Privacy** | Fingerprint spoofing | ✅ Complete |
| **Privacy** | WebRTC protection | ✅ Complete |
| **Privacy** | Tracker blocking | ✅ Complete |
| **EP-005** | Domain targeting | ✅ Complete |
| **EP-005** | Behavior simulation | ✅ Complete |
| **EP-005** | Bounce rate control | ✅ Complete |
| **EP-007** | Creator support | ✅ Complete |
| **EP-007** | Ad viewing | ✅ Complete |
| **EP-007** | Multi-platform | ✅ Complete |
| **EP-008** | Translation | ✅ Complete |
| **EP-008** | 30+ languages | ✅ Complete |
| **EP-008** | Auto-detection | ✅ Complete |
| **UI** | Magic UI components | ✅ Complete |
| **Data** | SQLite persistence | ✅ Complete |
| **Data** | Encrypted storage | ✅ Complete |

---

## [0.9.0] - 2025-01-20

### Beta Release

### Added
- Basic browser functionality
- Initial proxy management (6 strategies)
- Privacy protection foundation
- React UI with Tailwind CSS
- Zustand state management

### Changed
- Migrated to electron-vite build system
- Updated to React 19

---

## [0.1.0] - 2025-01-10

### Initial Development

### Added
- Project scaffolding
- Electron + React + TypeScript setup
- Basic window management
- Development tooling configuration

---

## Version Comparison

| Feature | v0.1.0 | v0.9.0 | v1.0.0 | v1.1.0 |
|---------|--------|--------|--------|--------|
| Multi-tab | ❌ | ✅ | ✅ | ✅ |
| Proxy Strategies | 0 | 6 | 10 | 10 |
| Fingerprint Spoofing | ❌ | Basic | Full | Full |
| Domain Targeting | ❌ | ❌ | ✅ | ✅ |
| Creator Support | ❌ | ❌ | ✅ | ✅ |
| Translation | ❌ | ❌ | ✅ | ✅ |
| Security Controls | ❌ | ❌ | Basic | Enterprise |
| Test Coverage | 0% | ~30% | ~45% | ~45% |

---

## Migration Notes

### Upgrading to v1.1.0

1. **Database Migration**: Run automatically on first start
2. **Environment Variables**: No changes required
3. **Configuration**: Existing configs are compatible
4. **Breaking Changes**: None

### Upgrading to v1.0.0

1. **Database**: New tables for rotation system
2. **Dependencies**: Run `npm install` for new packages
3. **Config**: Update rotation strategy names if using custom

---

## Links

- [README](README.md)
- [Contributing](CONTRIBUTING.md)
- [Security](docs/SECURITY_CONSOLIDATED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/CODEMAPS/api-reference.md)

---

*For detailed commit history, see the git log.*
