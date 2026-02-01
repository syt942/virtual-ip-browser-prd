# Virtual IP Browser - Architecture Codemaps

**Last Updated:** 2025-02-01  
**Version:** 1.3.0  
**Total Test Count:** 2,850+ tests (2,823 it blocks + 298 test blocks across 92 test files)

## Overview

This directory contains architectural codemaps for the Virtual IP Browser project. Each codemap documents a specific module or subsystem, providing:

- File structure and organization
- Key classes and their responsibilities
- Data flow diagrams
- Integration points
- API specifications

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN PROCESS                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Core Modules                                 │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │    │
│  │  │ ProxyEngine  │ │   Privacy    │ │  Automation  │ │ Resilience │ │    │
│  │  │  - Manager   │ │  - Manager   │ │  - Manager   │ │ - Circuit  │ │    │
│  │  │  - Rotation  │ │  - Fingerprint│ │  - Scheduler │ │   Breaker  │ │    │
│  │  │  - Validator │ │  - WebRTC    │ │  - Executor  │ │ - Registry │ │    │
│  │  │  - Strategies│ │  - Tracker   │ │  - Search    │ │            │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │    │
│  │  │    Tabs      │ │  Translation │ │   Creator    │ │  Session   │ │    │
│  │  │  - Manager   │ │  - Translator│ │   Support    │ │  - Manager │ │    │
│  │  │  - Types     │ │  - Detector  │ │  - Tracker   │ │            │ │    │
│  │  │              │ │  - Cache     │ │  - AdViewer  │ │            │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      IPC Layer (Secure)                              │    │
│  │  - Zod Validation  - Rate Limiting  - Channel Whitelist             │    │
│  │  - SSRF Protection - XSS Prevention - ReDoS Protection              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Database Layer                                  │    │
│  │  - SQLite (better-sqlite3)  - Migrations  - Repositories            │    │
│  │  - Encryption Service       - Safe Storage                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↕ IPC Bridge (contextBridge)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RENDERER PROCESS                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      React Application                               │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │    │
│  │  │   Browser    │ │   Dashboard  │ │    Panels    │ │  Magic UI  │ │    │
│  │  │  - TabBar    │ │ - ActivityLog│ │  - Privacy   │ │ - Particles│ │    │
│  │  │  - AddressBar│ │ - StatsPanel │ │  - Settings  │ │ - Confetti │ │    │
│  │  │  - Automation│ │              │ │  - Creator   │ │ - Shimmer  │ │    │
│  │  │  - Proxy     │ │              │ │  - Activity  │ │ - Neon     │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Zustand Stores                                  │    │
│  │  proxyStore | privacyStore | automationStore | animationStore       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Codemap Index

| Codemap | Description | Key Files | Lines |
|---------|-------------|-----------|-------|
| [proxy-engine.md](./proxy-engine.md) | Proxy management, rotation strategies, validation | `electron/core/proxy-engine/` | ~1,500 |
| [frontend.md](./frontend.md) | React components, UI, stores | `src/components/`, `src/stores/` | ~3,000 |
| [automation.md](./automation.md) | Search automation, domain targeting, scheduling | `electron/core/automation/` | ~2,500 |
| [security.md](./security.md) | Security utilities, CSP, validation, rate limiting | `electron/utils/`, `electron/ipc/` | ~1,200 |
| [database.md](./database.md) | SQLite schema, migrations, repositories | `electron/database/` | ~2,000 |
| [translation.md](./translation.md) | Translation service, language detection | `electron/core/translation/` | ~800 |
| [creator-support.md](./creator-support.md) | Creator support, ad viewing, platform detection | `electron/core/creator-support/` | ~1,000 |
| [api-reference.md](./api-reference.md) | Complete IPC API documentation | `electron/ipc/` | ~900 |

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dependency Graph                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ProxyEngine ◄───────────── TabManager                          │
│       │                          │                               │
│       ▼                          ▼                               │
│  RotationStrategies        PrivacyManager                       │
│       │                          │                               │
│       └──────────┬───────────────┘                               │
│                  ▼                                               │
│           AutomationManager                                      │
│                  │                                               │
│       ┌──────────┼──────────┐                                   │
│       ▼          ▼          ▼                                   │
│  SearchEngine  Scheduler  DomainTargeting                       │
│       │          │          │                                   │
│       └──────────┴──────────┘                                   │
│                  │                                               │
│                  ▼                                               │
│           SelfHealingEngine ◄──── CircuitBreaker                │
│                  │                                               │
│                  ▼                                               │
│            DatabaseManager                                       │
│                  │                                               │
│       ┌──────────┼──────────┐                                   │
│       ▼          ▼          ▼                                   │
│  Repositories  Migrations  EncryptionService                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Organization

```
virtual-ip-browser/
├── electron/                      # Main process code
│   ├── main/                      # Application entry point
│   │   ├── index.ts              # Main entry, window creation, security headers
│   │   ├── preload.ts            # Preload script for IPC
│   │   └── config-manager.ts     # Configuration and master key management
│   ├── core/                      # Core business logic
│   │   ├── proxy-engine/         # Proxy management (11 strategies)
│   │   │   ├── manager.ts        # ProxyManager class
│   │   │   ├── rotation.ts       # Rotation coordinator
│   │   │   ├── validator.ts      # Proxy health validation
│   │   │   ├── credential-store.ts # Encrypted credential storage
│   │   │   └── strategies/       # 11 rotation strategy implementations
│   │   ├── privacy/              # Privacy protection suite
│   │   │   ├── manager.ts        # PrivacyManager class
│   │   │   ├── webrtc.ts         # WebRTC leak prevention
│   │   │   ├── tracker-blocker.ts # Tracker/ad blocking
│   │   │   ├── pattern-matcher.ts # URL pattern matching
│   │   │   └── fingerprint/      # Fingerprint spoofing (6 vectors)
│   │   ├── automation/           # Automation engine
│   │   │   ├── manager.ts        # AutomationManager class
│   │   │   ├── scheduler.ts      # Task scheduling (cron support)
│   │   │   ├── executor.ts       # Task execution
│   │   │   ├── search-engine.ts  # Search automation
│   │   │   ├── domain-targeting.ts # Domain click simulation
│   │   │   ├── self-healing-engine.ts # Error recovery
│   │   │   ├── behavior-simulator.ts # Human-like behavior
│   │   │   ├── captcha-detector.ts # Captcha detection
│   │   │   └── search/           # Search-specific modules
│   │   ├── resilience/           # Fault tolerance
│   │   │   ├── circuit-breaker.ts # Circuit breaker pattern
│   │   │   └── circuit-breaker-registry.ts # Registry management
│   │   ├── tabs/                 # Tab management
│   │   │   └── manager.ts        # TabManager class
│   │   ├── session/              # Session management
│   │   │   └── manager.ts        # SessionManager class
│   │   ├── translation/          # Translation service
│   │   │   ├── translator.ts     # Translation engine
│   │   │   ├── language-detector.ts # Language detection
│   │   │   └── translation-cache.ts # Caching layer
│   │   └── creator-support/      # Creator support module
│   │       ├── ad-viewer.ts      # Ad viewing automation
│   │       ├── platform-detection.ts # Platform detection
│   │       └── support-tracker.ts # Support statistics
│   ├── ipc/                       # IPC communication
│   │   ├── channels.ts           # Channel definitions
│   │   ├── validation.ts         # Zod validation schemas
│   │   ├── rate-limiter.ts       # Rate limiting
│   │   └── handlers/             # IPC handlers
│   │       ├── index.ts          # Handler setup
│   │       ├── automation.ts     # Automation handlers
│   │       ├── privacy.ts        # Privacy handlers
│   │       ├── navigation.ts     # Navigation handlers
│   │       └── tabs.ts           # Tab handlers
│   ├── database/                  # Database layer
│   │   ├── index.ts              # DatabaseManager
│   │   ├── schema.sql            # Base schema
│   │   ├── migrations/           # Database migrations
│   │   ├── repositories/         # Data access layer (12 repos)
│   │   └── services/             # Database services
│   │       ├── encryption.service.ts # AES-256-GCM encryption
│   │       └── safe-storage.service.ts # OS keychain integration
│   ├── utils/                     # Utilities
│   │   ├── security.ts           # Security utilities (CSP, sanitization)
│   │   ├── validation.ts         # Input validation
│   │   ├── logger.ts             # Logging
│   │   └── error-sanitization.ts # Error sanitization
│   └── types/                     # TypeScript types
├── src/                           # Renderer process code
│   ├── components/                # React components
│   │   ├── browser/              # Browser UI components
│   │   │   ├── TabBar.tsx        # Tab management UI
│   │   │   ├── AddressBar.tsx    # URL bar
│   │   │   ├── EnhancedProxyPanel.tsx # Proxy management UI
│   │   │   └── EnhancedAutomationPanel.tsx # Automation UI
│   │   ├── dashboard/            # Dashboard components
│   │   │   ├── ActivityLog.tsx   # Activity logging
│   │   │   └── EnhancedStatsPanel.tsx # Statistics display
│   │   ├── panels/               # Side panels
│   │   │   ├── PrivacyPanel.tsx  # Privacy settings
│   │   │   ├── SettingsPanel.tsx # App settings
│   │   │   ├── CreatorSupportPanel.tsx # Creator support
│   │   │   └── ActivityLogPanel.tsx # Activity logs
│   │   └── ui/                   # Magic UI components
│   │       ├── particles.tsx     # Particle effects
│   │       ├── confetti.tsx      # Confetti animations
│   │       ├── shimmer-button.tsx # Shimmer effects
│   │       ├── border-beam.tsx   # Border animations
│   │       └── neon-gradient-card.tsx # Neon effects
│   ├── stores/                    # Zustand state stores
│   │   ├── proxyStore.ts         # Proxy state
│   │   ├── privacyStore.ts       # Privacy state
│   │   ├── automationStore.ts    # Automation state
│   │   └── animationStore.ts     # Animation preferences
│   └── utils/                     # Frontend utilities
└── tests/                         # Test suites
    ├── unit/                      # Unit tests (~2,000 tests)
    ├── integration/               # Integration tests (~300 tests)
    └── e2e/                       # E2E tests (~550 tests)
```

## Security Architecture

The application implements defense-in-depth security:

| Layer | Implementation | Location |
|-------|----------------|----------|
| IPC Validation | Zod schemas with SSRF/XSS protection | `electron/ipc/validation.ts` |
| Rate Limiting | Per-channel sliding window | `electron/ipc/rate-limiter.ts` |
| CSP Headers | Strict Content Security Policy | `electron/main/index.ts` |
| TLS Validation | Certificate pinning, HSTS | `electron/main/index.ts` |
| Credential Encryption | AES-256-GCM + OS keychain | `electron/database/services/` |
| Input Sanitization | URL, domain, selector sanitization | `electron/utils/security.ts` |
| ReDoS Protection | Safe regex compilation | `electron/utils/security.ts` |
| Process Isolation | Sandbox, context isolation | `electron/main/index.ts` |

## Recent Changes (v1.3.0)

- **Security Headers**: CSP and HSTS headers applied via `webRequest.onHeadersReceived`
- **TLS Validation**: Certificate validation and insecure content blocking
- **IPC Rate Limiting**: Per-channel rate limits with configurable thresholds
- **Dead Code Removal**: Cleaned up 15+ unused files and functions
- **Test Coverage**: Expanded to 2,850+ tests across all modules
- **Circuit Breaker**: Enhanced resilience with registry pattern
- **Encryption Service**: AES-256-GCM with OS keychain integration

## Cross-References

- **PRD Compliance**: See `FINAL_PROJECT_STATUS.md` for PRD alignment
- **Security Audit**: See `SECURITY_AUDIT_REPORT_COMPREHENSIVE_2025.md`
- **Testing Strategy**: See `TESTING.md` for test organization
- **API Documentation**: See [api-reference.md](./api-reference.md) for IPC APIs

---

**Navigation:**
- [Proxy Engine →](./proxy-engine.md)
- [Frontend →](./frontend.md)
- [Automation →](./automation.md)
- [Security →](./security.md)
- [Database →](./database.md)
