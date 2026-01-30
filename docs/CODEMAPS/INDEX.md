# Virtual IP Browser - Architecture Codemaps

**Last Updated:** 2025-01-30  
**Version:** 1.2.0

## Overview

This directory contains detailed architectural codemaps for the Virtual IP Browser project. Each codemap documents a specific subsystem, its components, data flows, and integration points.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VIRTUAL IP BROWSER v1.2.0                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         MAIN PROCESS (Electron)                      │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │ Proxy Engine │ │  Automation  │ │   Privacy    │ │Translation │  │   │
│  │  │  - Manager   │ │  - Domain    │ │  - Fingerprint│ │  - 30+ Lang│  │   │
│  │  │  - Rotation  │ │    Targeting │ │  - WebRTC    │ │  - Caching │  │   │
│  │  │  - 10 Strats │ │  - Scheduler │ │  - Trackers  │ │  - Detect  │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │Creator Support│ │Tab Manager  │ │  Resilience  │ │  Database  │  │   │
│  │  │  - YouTube   │ │  - Isolation │ │  - Circuit   │ │  - SQLite  │  │   │
│  │  │  - Twitch    │ │  - Lifecycle │ │    Breaker   │ │  - Encrypt │  │   │
│  │  │  - Medium    │ │  - BrowserView│ │  - Registry │ │  - Migrate │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │                    SECURITY LAYER (v1.2.0)                    │   │   │
│  │  │  Zod │ Rate Limit │ SSRF │ ReDoS │ Sandbox │ Native Masking  │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │ IPC (contextBridge + Whitelist)        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       RENDERER PROCESS (React)                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐  │   │
│  │  │   Magic UI   │ │   Panels     │ │   Browser    │ │   Stores   │  │   │
│  │  │ - NumberTick │ │ - Proxy      │ │ - TabBar     │ │ - Zustand  │  │   │
│  │  │ - BorderBeam │ │ - Privacy    │ │ - AddressBar │ │ - Tab/Proxy│  │   │
│  │  │ - PulseBtn   │ │ - Automation │ │ - Enhanced   │ │ - Privacy  │  │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Codemap Index

| Codemap | Description | Key Components | Lines of Code |
|---------|-------------|----------------|---------------|
| [proxy-engine.md](./proxy-engine.md) | Proxy management & 10 rotation strategies | Manager, Rotation, Validator, Credentials | ~1200 |
| [automation.md](./automation.md) | Web automation, scheduling, captcha detection | Domain Targeting, Scheduler, Captcha Detector | ~1800 |
| [creator-support.md](./creator-support.md) | Creator monetization support (EP-007) | Platform Detection, Ad Viewer, Support Tracker | ~800 |
| [translation.md](./translation.md) | Multi-language translation (EP-008) | Translator, Language Detector, Cache | ~500 |
| [frontend.md](./frontend.md) | React UI & Magic UI components | Components, Stores, Hooks | ~1500 |
| [database.md](./database.md) | Data persistence layer | 11 Repositories, Migrations, Encryption | ~1200 |
| [security.md](./security.md) | Security layer (v1.2.0) | Validation, Rate Limiting, SSRF/ReDoS, Sandbox | ~600 |
| [api-reference.md](./api-reference.md) | Complete API documentation | IPC Channels, Schemas, Events | N/A |

### New in v1.2.0

| Module | Description | Key Components |
|--------|-------------|----------------|
| **Resilience Layer** | Fault tolerance patterns | Circuit Breaker, Registry, State Persistence |
| **Cron Scheduler** | Task scheduling system | Cron Parser, Scheduler, Timezone Support |
| **Captcha Detection** | Multi-provider detection | reCAPTCHA, hCaptcha, Cloudflare, Arkose |

## Module Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODULE DEPENDENCY GRAPH                             │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────┐
                         │  Main Process   │
                         │   Entry Point   │
                         └────────┬────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
    │ Proxy Engine  │    │  Tab Manager  │    │Privacy Manager│
    │               │◄───│               │───►│               │
    └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                         ┌───────┴───────┐
                         │    Session    │
                         │    Manager    │
                         └───────┬───────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
    │  Automation   │    │Creator Support│    │  Translation  │
    │   (EP-005)    │───►│   (EP-007)    │◄───│   (EP-008)    │
    └───────┬───────┘    └───────┬───────┘    └───────┬───────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                         ┌───────┴───────┐
                         │   Database    │
                         │    Layer      │
                         └───────────────┘

Legend:
  ───► Direct dependency
  ◄─── Reverse dependency (event-based)
```

## Data Flow Overview

### 1. Proxy Selection Flow
```
Request → Rotation Strategy → Proxy Selection → Validation → Connection
               │
               ├── Geographic (region-based)
               ├── Sticky-Session (domain mapping)
               ├── Time-Based (scheduled rotation)
               └── Custom Rules (conditional logic)
```

### 2. Automation Flow
```
Task → Domain Targeting → Search Engine → Page Interaction → Behavior Simulation
           │                    │                │
           ├── Filters          ├── Results      └── Human-like actions
           └── Bounce Rate      └── Click        
```

### 3. Creator Support Flow
```
URL → Platform Detection → Ad Detection → Watch Simulation → Metrics Tracking
        │                      │               │
        ├── YouTube            ├── Video       └── Engagement Actions
        ├── Twitch             ├── Banner
        └── Medium             └── Overlay
```

### 4. Translation Flow
```
Text → Language Detection → Cache Check → Translation API → Result
           │                    │              │
           └── 30+ languages    └── LRU Cache  └── Fallback Dictionary
```

### 5. Security Flow (v1.1.0)
```
IPC Request → Whitelist Check → Rate Limit → Zod Validation → Handler
                  │                 │              │
                  └── Reject        └── Throttle   └── Type-safe processing
```

## File Organization

```
electron/
├── main/
│   ├── index.ts              # Entry point
│   ├── preload.ts            # IPC bridge + whitelist
│   └── config-manager.ts     # Configuration
├── core/
│   ├── proxy-engine/         # [proxy-engine.md]
│   │   ├── manager.ts        # Proxy lifecycle
│   │   ├── rotation.ts       # 10 strategies
│   │   ├── validator.ts      # Health checking
│   │   └── credential-store.ts
│   ├── automation/           # [automation.md]
│   │   ├── manager.ts        # Orchestration
│   │   ├── domain-targeting.ts
│   │   ├── behavior-simulator.ts
│   │   ├── page-interaction.ts
│   │   └── search-engine.ts
│   ├── creator-support/      # [creator-support.md]
│   │   ├── platform-detection.ts
│   │   ├── ad-viewer.ts
│   │   └── support-tracker.ts
│   ├── translation/          # [translation.md]
│   │   ├── translator.ts
│   │   ├── language-detector.ts
│   │   └── translation-cache.ts
│   ├── privacy/
│   │   ├── manager.ts
│   │   ├── fingerprint/      # Canvas, WebGL, Audio, Navigator, Timezone
│   │   ├── webrtc.ts
│   │   └── tracker-blocker.ts
│   ├── session/
│   │   └── manager.ts
│   └── tabs/
│       └── manager.ts
├── database/                 # [database.md]
│   ├── index.ts
│   ├── migrations/
│   ├── repositories/         # 8 repositories
│   └── services/
│       └── encryption.service.ts
├── ipc/                      # [security.md]
│   ├── channels.ts
│   ├── handlers/
│   ├── rate-limiter.ts
│   ├── validation.ts
│   └── schemas/
│       └── index.ts
└── utils/
    ├── logger.ts
    └── security.ts           # SSRF, ReDoS, CSS protection

src/                          # [frontend.md]
├── components/
│   ├── browser/              # TabBar, AddressBar
│   ├── panels/               # Config panels
│   ├── dashboard/            # Analytics
│   └── ui/                   # Magic UI components
├── stores/                   # Zustand stores
├── hooks/                    # Custom hooks
└── utils/
    ├── sanitization.ts
    └── cn.ts
```

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Desktop Framework | Electron | 34.x | Cross-platform desktop app |
| Frontend | React | 19.x | User interface |
| Language | TypeScript | 5.6.x | Type safety |
| State Management | Zustand | 5.x | Client-side state |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Animation | Framer Motion | 12.x | UI animations |
| Database | better-sqlite3 | 11.x | Local data persistence |
| Validation | Zod | 4.x | Schema validation |
| Testing | Vitest | 1.x | Unit testing |
| E2E Testing | Playwright | 1.x | End-to-end testing |
| Build | electron-vite | 2.x | Development & bundling |

## Test Coverage by Module

| Module | Statements | Branches | Functions | Test Files |
|--------|------------|----------|-----------|------------|
| Proxy Engine | 59% | 41% | 59% | proxy-manager.test.ts, rotation-*.test.ts |
| Automation | 50% | - | - | automation-manager.test.ts, domain-targeting.test.ts |
| Creator Support | ~60% | - | - | creator-support.test.ts |
| Translation | ~70% | - | - | translation.test.ts |
| Privacy | ~55% | - | - | privacy-manager.test.ts |
| Security | 100% | - | - | security-*.test.ts (3 files) |
| Database | ~45% | - | - | - |

## Quick Links

### Documentation
- [Architecture Overview](../ARCHITECTURE.md)
- [Security Documentation](../SECURITY_CONSOLIDATED.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Changelog](../../CHANGELOG.md)

### Guides
- [Getting Started](../GETTING_STARTED.md)
- [User Guide](../../USER_GUIDE.md)
- [Testing Guide](../../TESTING_GUIDE.md)

### Development
- [README](../../README.md)
- [Setup Instructions](../../SETUP_INSTRUCTIONS.md)

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-30 | 1.1.0 | Added security layer codemap, updated architecture |
| 2025-01-28 | 1.0.0 | Initial codemaps for all modules |

---

*For detailed implementation of each module, see the individual codemap files.*
