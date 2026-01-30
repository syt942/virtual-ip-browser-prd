# Virtual IP Browser - Architecture Documentation

**Last Updated:** 2025-01-30  
**Version:** 1.1.0

## Table of Contents

1. [Overview](#overview)
2. [Electron Multi-Process Model](#electron-multi-process-model)
3. [Session Isolation Strategy](#session-isolation-strategy)
4. [Proxy Routing Flow](#proxy-routing-flow)
5. [Privacy Protection Mechanisms](#privacy-protection-mechanisms)
6. [IPC Communication Patterns](#ipc-communication-patterns)
7. [Data Persistence Layer](#data-persistence-layer)
8. [Module Architecture](#module-architecture)

---

## Overview

Virtual IP Browser is an Electron-based desktop application providing privacy-focused browsing with advanced proxy management and fingerprint spoofing capabilities.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VIRTUAL IP BROWSER v1.1.0                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        MAIN PROCESS (Node.js)                         │ │
│  │                                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │   Proxy     │  │  Privacy    │  │ Automation  │  │ Translation │ │ │
│  │  │   Engine    │  │  Manager    │  │   Engine    │  │   Module    │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │   Session   │  │    Tab      │  │  Creator    │  │  Database   │ │ │
│  │  │   Manager   │  │   Manager   │  │  Support    │  │   Layer     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│                         IPC (contextBridge)                                 │
│                                    │                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                      RENDERER PROCESS (React)                         │ │
│  │                                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │  Zustand    │  │    React    │  │   Magic     │  │   Custom    │ │ │
│  │  │   Stores    │  │  Components │  │     UI      │  │    Hooks    │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     BROWSER VIEWS (Per Tab)                           │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐         │ │
│  │  │  Tab 1    │  │  Tab 2    │  │  Tab 3    │  │  Tab N    │         │ │
│  │  │ Isolated  │  │ Isolated  │  │ Isolated  │  │ Isolated  │         │ │
│  │  │ Session   │  │ Session   │  │ Session   │  │ Session   │         │ │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Electron Multi-Process Model

### Process Architecture

Virtual IP Browser uses Electron's multi-process architecture for security and stability:

```
┌─────────────────┐
│  Main Process   │  Single instance, full Node.js access
│  (electron/     │  - Window management
│   main/index.ts)│  - IPC handling
│                 │  - System APIs
└────────┬────────┘
         │
         │ IPC (contextBridge)
         │
┌────────┴────────┐
│ Renderer Process│  React application, sandboxed
│  (src/App.tsx)  │  - UI rendering
│                 │  - State management
│                 │  - User interaction
└────────┬────────┘
         │
         │ WebContents
         │
┌────────┴────────┐
│  BrowserViews   │  One per tab, fully isolated
│  (Per Tab)      │  - Web content
│                 │  - Separate session partition
│                 │  - Individual proxy settings
└─────────────────┘
```

### Main Process Responsibilities

| Component | File | Responsibility |
|-----------|------|----------------|
| Entry Point | `electron/main/index.ts` | App lifecycle, window creation |
| Preload | `electron/main/preload.ts` | IPC bridge, channel whitelist |
| Config Manager | `electron/main/config-manager.ts` | App configuration |

### Security Configuration

```typescript
// electron/main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // No Node.js in renderer
    contextIsolation: true,      // Isolated contexts
    sandbox: true,               // Chromium sandbox
    webSecurity: true,           // Same-origin policy
    preload: path.join(__dirname, 'preload.js')
  }
});
```

---

## Session Isolation Strategy

### Per-Tab Session Partitions

Each tab operates in an isolated session partition to prevent cross-tab tracking:

```
Tab Creation Flow:
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Create Tab   │────►│ Generate UUID│────►│ Create       │
│ Request      │     │ for Tab      │     │ Partition    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                     ┌──────────────────────────────────────┐
                     │ partition:persist:tab-{uuid}         │
                     │                                      │
                     │ • Isolated cookies                   │
                     │ • Separate localStorage              │
                     │ • Independent cache                  │
                     │ • Unique session storage             │
                     └──────────────────────────────────────┘
```

### Session Manager Implementation

```typescript
// electron/core/session/manager.ts
export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();

  createSession(tabId: string): Session {
    const partitionName = `persist:tab-${tabId}`;
    const session = session.fromPartition(partitionName);
    
    // Configure session
    this.configureProxyForSession(session, tabId);
    this.injectPrivacyProtection(session);
    
    this.sessions.set(tabId, session);
    return session;
  }

  destroySession(tabId: string): void {
    const session = this.sessions.get(tabId);
    if (session) {
      session.clearStorageData();
      this.sessions.delete(tabId);
    }
  }
}
```

### What Gets Isolated Per Tab

| Data Type | Isolation | Storage |
|-----------|-----------|---------|
| Cookies | Per partition | Memory/Disk |
| localStorage | Per partition | Disk |
| sessionStorage | Per partition | Memory |
| Cache | Per partition | Disk |
| IndexedDB | Per partition | Disk |
| Proxy Settings | Per tab | Runtime |
| Fingerprint | Per tab | Runtime |

---

## Proxy Routing Flow

### Request Routing Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         PROXY ROUTING FLOW                                │
└──────────────────────────────────────────────────────────────────────────┘

    Browser View                Proxy Manager              External
    (Tab Request)               (Main Process)             Network
         │                            │                       │
         │  1. HTTP Request           │                       │
         ├───────────────────────────►│                       │
         │                            │                       │
         │                      ┌─────┴─────┐                 │
         │                      │  Rotation │                 │
         │                      │  Strategy │                 │
         │                      └─────┬─────┘                 │
         │                            │                       │
         │                      ┌─────┴─────┐                 │
         │                      │  Select   │                 │
         │                      │   Proxy   │                 │
         │                      └─────┬─────┘                 │
         │                            │                       │
         │                      ┌─────┴─────┐                 │
         │                      │  Validate │                 │
         │                      │   Proxy   │                 │
         │                      └─────┬─────┘                 │
         │                            │                       │
         │                            │  2. Proxied Request   │
         │                            ├──────────────────────►│
         │                            │                       │
         │                            │  3. Response          │
         │                            │◄──────────────────────│
         │                            │                       │
         │  4. Response               │                       │
         │◄───────────────────────────│                       │
         │                            │                       │
```

### 10 Rotation Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `round-robin` | Sequential rotation | Even distribution |
| `random` | Random selection | Unpredictability |
| `least-used` | Least connections | Load balancing |
| `fastest` | Lowest latency | Performance |
| `failure-aware` | Avoid failed proxies | Reliability |
| `weighted` | Priority-based | Preferred proxies |
| `geographic` | Region-based | Geo-targeting |
| `sticky-session` | Domain consistency | Session persistence |
| `time-based` | Scheduled rotation | Time-based patterns |
| `custom-rules` | Conditional logic | Complex requirements |

### Proxy Selection Code Flow

```typescript
// electron/core/proxy-engine/rotation.ts
export class ProxyRotation extends EventEmitter {
  selectProxy(context: SelectionContext): Proxy | null {
    switch (this.config.strategy) {
      case 'geographic':
        return this.selectGeographic(context);
      case 'sticky-session':
        return this.selectStickySession(context);
      case 'time-based':
        return this.selectTimeBased(context);
      case 'custom-rules':
        return this.evaluateCustomRules(context);
      // ... other strategies
    }
  }
}
```

---

## Privacy Protection Mechanisms

### Fingerprint Spoofing Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FINGERPRINT SPOOFING LAYERS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Privacy Manager                               │   │
│  │                   (electron/core/privacy/manager.ts)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │ Canvas Spoofing │    │  WebGL Spoofing │    │ Audio Spoofing  │        │
│  │ (canvas.ts)     │    │  (webgl.ts)     │    │ (audio.ts)      │        │
│  │                 │    │                 │    │                 │        │
│  │ • Noise inject  │    │ • Vendor spoof  │    │ • Context noise │        │
│  │ • Pixel modify  │    │ • Renderer mask │    │ • Sample alter  │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│           │                        │                        │              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │Navigator Spoof  │    │ Timezone Spoof  │    │  WebRTC Block   │        │
│  │ (navigator.ts)  │    │ (timezone.ts)   │    │ (webrtc.ts)     │        │
│  │                 │    │                 │    │                 │        │
│  │ • User-Agent    │    │ • TZ offset     │    │ • IP leak block │        │
│  │ • Platform      │    │ • Date locale   │    │ • ICE candidate │        │
│  │ • Languages     │    │ • Intl API      │    │   filtering     │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Fingerprint Protection Details

#### Canvas Fingerprinting Protection

```typescript
// electron/core/privacy/fingerprint/canvas.ts
export class CanvasFingerprint {
  apply(webContents: WebContents): void {
    webContents.executeJavaScript(`
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
        const context = this.getContext('2d');
        if (context) {
          // Add imperceptible noise
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] += Math.floor(Math.random() * 3) - 1;     // R
            imageData.data[i + 1] += Math.floor(Math.random() * 3) - 1; // G
            imageData.data[i + 2] += Math.floor(Math.random() * 3) - 1; // B
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.call(this, type, quality);
      };
    `);
  }
}
```

#### WebRTC Leak Prevention

```typescript
// electron/core/privacy/webrtc.ts
export class WebRTCProtection {
  enable(session: Session): void {
    // Block WebRTC entirely or filter ICE candidates
    session.webRequest.onBeforeRequest({ urls: ['*://*/'] }, (details, callback) => {
      // Block STUN/TURN requests that could leak IP
      if (this.isWebRTCRequest(details)) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });
  }
}
```

### Tracker Blocking System

```
Request Flow with Tracker Blocking:

┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Page    │────►│   Tracker    │────►│   Blocklist  │────►│  Allow/  │
│  Request │     │   Blocker    │     │    Check     │     │  Block   │
└──────────┘     └──────────────┘     └──────────────┘     └──────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Blocklists:      │
              │ • EasyList       │
              │ • EasyPrivacy    │
              │ • Custom rules   │
              └──────────────────┘
```

---

## IPC Communication Patterns

### Channel Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IPC COMMUNICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RENDERER                    PRELOAD                      MAIN              │
│  ┌─────────┐              ┌──────────┐              ┌─────────────┐        │
│  │ Zustand │    invoke    │ Whitelist│   ipcMain   │   Handler   │        │
│  │ Store   │─────────────►│  Check   │────────────►│ + Validation│        │
│  └─────────┘              └──────────┘              └─────────────┘        │
│       │                        │                          │                │
│       │                        │                          │                │
│       │                   Blocked if                 ┌────┴────┐           │
│       │                   not in list               │ Zod     │           │
│       │                        │                    │ Schema  │           │
│       │                        │                    └────┬────┘           │
│       │                        │                         │                │
│       │◄───────────────────────┼─────────────────────────┘                │
│       │         Response       │                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### IPC Channels Reference

| Category | Channels | Direction |
|----------|----------|-----------|
| **Proxy** | `proxy:add`, `proxy:remove`, `proxy:update`, `proxy:list`, `proxy:validate`, `proxy:set-rotation` | Renderer → Main |
| **Tab** | `tab:create`, `tab:close`, `tab:update`, `tab:list`, `tab:navigate` | Renderer → Main |
| **Privacy** | `privacy:set-fingerprint`, `privacy:toggle-webrtc`, `privacy:toggle-tracker-blocking` | Renderer → Main |
| **Automation** | `automation:start-search`, `automation:stop-search`, `automation:add-keyword`, `automation:add-domain`, `automation:get-tasks` | Renderer → Main |
| **Session** | `session:save`, `session:load`, `session:list` | Renderer → Main |
| **Events** | `event:proxy-status-change`, `event:tab-update`, `event:automation-progress`, `event:log` | Main → Renderer |

### Secure IPC Implementation

```typescript
// electron/main/preload.ts
const ALLOWED_CHANNELS = [
  'proxy:add', 'proxy:remove', 'proxy:update', 'proxy:list', 'proxy:validate',
  'tab:create', 'tab:close', 'tab:navigate',
  'automation:start-search', 'automation:stop-search',
  'privacy:set-fingerprint', 'privacy:toggle-webrtc'
];

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: unknown[]) => {
    if (!ALLOWED_CHANNELS.includes(channel)) {
      throw new Error(`IPC channel not allowed: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  on: (channel: string, callback: Function) => {
    if (channel.startsWith('event:')) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  }
});
```

---

## Data Persistence Layer

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Database Manager                                  │   │
│  │                 (electron/database/index.ts)                         │   │
│  │                                                                      │   │
│  │  • Connection management     • Migration runner                      │   │
│  │  • Transaction support       • Query logging                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│           ┌────────────────────────┼────────────────────────┐              │
│           ▼                        ▼                        ▼              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │ Proxy Repos     │    │ Session Repos   │    │ Rotation Repos  │        │
│  │                 │    │                 │    │                 │        │
│  │ • ProxyRepo     │    │ • StickySession │    │ • RotationConfig│        │
│  │ • CredentialRepo│    │ • SessionRepo   │    │ • RotationEvents│        │
│  │ • UsageStatsRepo│    │                 │    │ • RotationRules │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Encryption Service                                │   │
│  │             (electron/database/services/encryption.service.ts)       │   │
│  │                                                                      │   │
│  │  • AES-256-GCM encryption    • Secure key derivation                │   │
│  │  • IV generation             • Auth tag verification                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```sql
-- Core Tables
proxies              -- Proxy configurations
encrypted_credentials -- Encrypted proxy credentials
proxy_usage_stats    -- Usage statistics per proxy

-- Rotation Tables
rotation_configs     -- Strategy configurations
rotation_rules       -- Custom rule definitions
rotation_events      -- Rotation history/audit log
sticky_sessions      -- Domain-to-proxy mappings

-- Session Tables
sessions             -- Saved browser sessions
```

---

## Resilience Patterns

### Circuit Breaker Pattern (PRD 6.2 P1)

The circuit breaker pattern provides fault tolerance for proxy connections, search automation, and external API calls.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CIRCUIT BREAKER STATE MACHINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ┌─────────┐                                         ┌─────────┐         │
│    │         │──── failures exceed threshold ────────►│         │         │
│    │ CLOSED  │                                         │  OPEN   │         │
│    │         │◄──── success threshold met ────────────│         │         │
│    └─────────┘                                         └────┬────┘         │
│         │                                                   │              │
│         │                                                   │              │
│         │                    ┌───────────┐                  │              │
│         │                    │           │◄── timeout ──────┘              │
│         └── test request ───►│ HALF_OPEN │                                 │
│                              │           │──── failure ────────►OPEN       │
│                              └───────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Circuit Breaker States

| State | Description | Behavior |
|-------|-------------|----------|
| **CLOSED** | Normal operation | Requests pass through, failures tracked |
| **OPEN** | Circuit tripped | Requests rejected immediately (fail fast) |
| **HALF_OPEN** | Testing recovery | Limited requests allowed to test if service recovered |

#### Implementation

```typescript
// electron/core/resilience/circuit-breaker.ts
import { CircuitBreaker, createProxyCircuitBreaker } from './resilience';

// Create circuit breaker for a proxy
const proxyBreaker = createProxyCircuitBreaker('proxy-123', 'US Proxy', {
  failureThreshold: 3,        // Trip after 3 consecutive failures
  failureRateThreshold: 50,   // Or 50% failure rate
  resetTimeout: 30000,        // Wait 30s before testing recovery
  successThreshold: 2         // 2 successes in half-open to close
});

// Execute with circuit breaker protection
try {
  const result = await proxyBreaker.execute(async () => {
    return await makeProxyRequest();
  });
} catch (error) {
  if (error instanceof CircuitBreakerOpenError) {
    // Circuit is open, use fallback
    console.log('Proxy circuit open, trying next proxy');
  }
}

// Check circuit state
if (proxyBreaker.getState() === 'OPEN') {
  // Skip this proxy, it's failing
}

// Get metrics
const metrics = proxyBreaker.getMetrics();
console.log(`Failure rate: ${metrics.failureRate}%`);
console.log(`Trip count: ${metrics.tripCount}`);
```

#### Circuit Breaker Registry

```typescript
// Manage multiple circuit breakers
import { getCircuitBreakerRegistry } from './resilience';

const registry = getCircuitBreakerRegistry();

// Get or create circuit breaker for a proxy
const cb = registry.getForProxy('proxy-456', 'EU Proxy');

// Get all open circuits
const openCircuits = registry.getByState('OPEN');

// Get aggregate metrics
const metrics = registry.getAggregateMetrics();
console.log(`Open circuits: ${metrics.byState.OPEN}`);
console.log(`Total rejections: ${metrics.totalRejected}`);
```

#### Service Type Presets

| Service Type | Failure Threshold | Reset Timeout | Use Case |
|--------------|-------------------|---------------|----------|
| `proxy` | 3 | 60s | Proxy connections |
| `search` | 5 | 30s | Search engine requests |
| `api` | 5 | 45s | External API calls |
| `translation` | 3 | 20s | Translation service |

#### Event Callbacks

```typescript
const callbacks = {
  onStateChange: (event) => {
    logger.info('Circuit breaker state changed', {
      id: event.circuitBreakerId,
      from: event.previousState,
      to: event.newState,
      reason: event.reason
    });
  },
  onOpen: (event) => {
    // Alert when circuit opens
    alertService.warn(`Circuit open: ${event.circuitBreakerId}`);
  },
  onClose: (event) => {
    // Log recovery
    logger.info(`Circuit recovered: ${event.circuitBreakerId}`);
  }
};
```

#### Database Persistence

Circuit breaker state is persisted to SQLite for recovery across restarts:

```sql
-- Circuit breaker state table
CREATE TABLE circuit_breakers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_id TEXT,
  state TEXT DEFAULT 'CLOSED',
  failure_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  -- ... metrics columns
  updated_at DATETIME
);
```

---

## Module Architecture

### Core Modules Dependency Graph

```
                    ┌─────────────────┐
                    │   Main Entry    │
                    │  (index.ts)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Proxy Engine   │ │  Tab Manager    │ │ Privacy Manager │
│                 │ │                 │ │                 │
│ • Manager       │ │ • BrowserView   │ │ • Fingerprint   │
│ • Rotation      │ │ • Lifecycle     │ │ • WebRTC        │
│ • Validator     │ │ • Navigation    │ │ • Trackers      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Session Manager │
                    │                 │
                    │ • Partitions    │
                    │ • Persistence   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Automation    │ │ Creator Support │ │  Translation    │
│                 │ │    (EP-007)     │ │    (EP-008)     │
│ • Domain Target │ │ • Platform Det  │ │ • Language Det  │
│ • Behavior Sim  │ │ • Ad Viewer     │ │ • Cache         │
│ • Page Interact │ │ • Tracker       │ │ • 30+ Languages │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Database     │
                    │                 │
                    │ • Repositories  │
                    │ • Encryption    │
                    │ • Migrations    │
                    └─────────────────┘
```

### File Organization

```
electron/
├── main/
│   ├── index.ts           # Entry point, window creation
│   ├── preload.ts         # IPC bridge, security
│   └── config-manager.ts  # Configuration management
├── core/
│   ├── proxy-engine/      # Proxy management
│   │   ├── manager.ts     # Proxy lifecycle
│   │   ├── rotation.ts    # 10 rotation strategies
│   │   ├── validator.ts   # Proxy validation
│   │   └── credential-store.ts
│   ├── privacy/           # Privacy protection
│   │   ├── manager.ts     # Orchestration
│   │   ├── fingerprint/   # Spoofing modules
│   │   ├── webrtc.ts      # Leak prevention
│   │   └── tracker-blocker.ts
│   ├── automation/        # Web automation
│   │   ├── manager.ts     # Task orchestration
│   │   ├── domain-targeting.ts
│   │   ├── behavior-simulator.ts
│   │   └── page-interaction.ts
│   ├── creator-support/   # EP-007
│   │   ├── platform-detection.ts
│   │   ├── ad-viewer.ts
│   │   └── support-tracker.ts
│   ├── translation/       # EP-008
│   │   ├── translator.ts
│   │   ├── language-detector.ts
│   │   └── translation-cache.ts
│   ├── resilience/        # PRD 6.2 P1 - Fault tolerance
│   │   ├── circuit-breaker.ts      # Core circuit breaker
│   │   ├── circuit-breaker-registry.ts  # Multi-instance management
│   │   ├── types.ts       # Type definitions
│   │   └── index.ts       # Module exports
│   ├── session/
│   │   └── manager.ts     # Session isolation
│   └── tabs/
│       └── manager.ts     # Tab lifecycle
├── database/
│   ├── index.ts           # Database manager
│   ├── migrations/        # Schema migrations
│   ├── repositories/      # Data access layer
│   └── services/          # Encryption service
├── ipc/
│   ├── channels.ts        # Channel definitions
│   ├── handlers/          # IPC handlers
│   ├── rate-limiter.ts    # Rate limiting
│   ├── validation.ts      # Input validation
│   └── schemas/           # Zod schemas
└── utils/
    ├── logger.ts          # Logging utility
    └── security.ts        # Security utilities
```

---

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Electron | 35.x | Desktop application |
| UI Library | React | 19.x | User interface |
| State | Zustand | 5.x | Client-side state |
| Styling | Tailwind CSS | 3.4.x | Utility CSS |
| Animation | Framer Motion | 12.x | UI animations |
| Database | better-sqlite3 | 11.x | Local persistence |
| Validation | Zod | 4.x | Schema validation |
| Testing | Vitest | 1.x | Unit testing |
| E2E Testing | Playwright | 1.x | End-to-end testing |
| Build | electron-vite | 3.x | Build tooling |

---

## New Modules (v1.2.0)

### Resilience Layer (`electron/core/resilience/`)

Provides fault tolerance patterns for the application:

| File | Purpose |
|------|---------|
| `circuit-breaker.ts` | Core circuit breaker implementation with three-state model |
| `circuit-breaker-registry.ts` | Central management of multiple circuit breakers |
| `types.ts` | TypeScript type definitions for resilience patterns |
| `index.ts` | Module exports |

### Automation Enhancements (`electron/core/automation/`)

| File | Purpose |
|------|---------|
| `cron-parser.ts` | Full cron expression parsing with human-readable support |
| `scheduler.ts` | Task scheduling system with timezone awareness |
| `captcha-detector.ts` | Multi-provider captcha detection (reCAPTCHA, hCaptcha, Cloudflare) |

### New Database Repositories (`electron/database/repositories/`)

| Repository | Purpose |
|------------|---------|
| `circuit-breaker.repository.ts` | Persist circuit breaker state across restarts |
| `execution-logs.repository.ts` | Store automation execution history |
| `creator-support-history.repository.ts` | Track creator support sessions |

---

## Related Documentation

- [CODEMAPS Index](./CODEMAPS/INDEX.md) - Module-specific documentation
- [Security Documentation](./SECURITY_CONSOLIDATED.md) - Security controls
- [API Reference](./CODEMAPS/api-reference.md) - IPC channel documentation
- [Contributing Guidelines](../CONTRIBUTING.md) - Development guidelines
- [Testing Documentation](../TESTING.md) - Test coverage and strategy

---

*Last Updated: 2025-01-30*
```

---

## P1 Feature Architecture - Scheduling, Refactoring, and Captcha Detection

This section documents the architectural decisions and implementation details for P1 features as specified in PRD Section 6.2.

### 1. Cron-Based Scheduling System Architecture

#### 1.1 Overview

The scheduling system supports four schedule types with full cron expression support:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCHEDULING SYSTEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         TaskScheduler                                │   │
│  │                   (electron/core/automation/scheduler.ts)            │   │
│  │                                                                      │   │
│  │  • Schedule lifecycle management (add, update, remove)               │   │
│  │  • Timer-based execution                                             │   │
│  │  • Event emission for task execution                                 │   │
│  │  • Persistence support (import/export)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          CronParser                                  │   │
│  │                   (electron/core/automation/cron-parser.ts)          │   │
│  │                                                                      │   │
│  │  • Standard 5-field cron syntax (minute hour day month weekday)      │   │
│  │  • Presets (@hourly, @daily, @weekly, @monthly, @yearly)            │   │
│  │  • Wildcards (*), ranges (1-5), steps (*/15), lists (1,3,5)         │   │
│  │  • Month/day name aliases (jan-dec, mon-sun)                        │   │
│  │  • Next execution calculation                                        │   │
│  │  • Human-readable descriptions                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Schedule Types:                                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │  one-time   │ │  recurring  │ │ continuous  │ │    cron     │          │
│  │             │ │             │ │             │ │             │          │
│  │ Execute at  │ │ Execute at  │ │ Execute     │ │ Execute per │          │
│  │ specific    │ │ intervals   │ │ continuously│ │ cron expr   │          │
│  │ date/time   │ │ + day filter│ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1.2 Cron Expression Format

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12 or jan-dec)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0, or mon-sun)
│ │ │ │ │
* * * * *
```

**Supported Syntax:**
| Syntax | Description | Example |
|--------|-------------|---------|
| `*` | Any value | `* * * * *` (every minute) |
| `5` | Specific value | `5 * * * *` (at minute 5) |
| `1-5` | Range | `* 9-17 * * *` (9 AM to 5 PM) |
| `*/n` | Every n | `*/15 * * * *` (every 15 min) |
| `1,3,5` | List | `0 9,12,18 * * *` (9, 12, 18) |
| `1-10/2` | Range with step | `0-30/10 * * * *` (0,10,20,30) |

#### 1.3 Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Add        │────▶│   Validate   │────▶│   Store      │
│   Schedule   │     │   Cron Expr  │     │   Schedule   │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Execute    │◀────│   Timer      │◀────│   Calculate  │
│   Task       │     │   Fires      │     │   Next Run   │
└──────────────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   Emit       │────▶│   Reschedule │
│   Event      │     │   (if repeat)│
└──────────────┘     └──────────────┘
```

#### 1.4 ADR-002: Cron Parser Implementation

**Context:** Need to parse and evaluate cron expressions for scheduling automation tasks.

**Decision:** Implement custom cron parser rather than using external library.

**Consequences:**
- **Positive:**
  - No external dependencies
  - Full control over parsing logic
  - Optimized for our use case
  - Can be extended for special features
- **Negative:**
  - More code to maintain
  - Need comprehensive testing
  - No community updates

**Alternatives Considered:**
- `node-cron`: Good but adds dependency
- `cron-parser`: Full-featured but overkill
- `croner`: Modern but less documented

---

### 2. Large File Refactoring Plan

#### 2.1 Files Identified for Refactoring

| File | Lines | Issue | Priority |
|------|-------|-------|----------|
| `electron/core/proxy-engine/rotation.ts` | 755 | Multiple strategies in one file | High |
| `electron/core/automation/search-engine.ts` | 533 | Search + Translation combined | High |
| `electron/main/index.ts` | 161 | OK - Keep as is | Low |
| `electron/core/proxy-engine/manager.ts` | 378 | Acceptable size | Low |
| `src/components/dashboard/ActivityLog.tsx` | 338 | Component + data logic mixed | Medium |
| `src/components/dashboard/AnalyticsDashboard.tsx` | 337 | Multiple chart types | Medium |

#### 2.2 Refactoring Recommendations

##### 2.2.1 rotation.ts (755 lines) → Split by Strategy Pattern

**Current Structure:**
```
rotation.ts
├── ProxyRotationStrategy class
│   ├── Basic strategies (round-robin, random, weighted, etc.)
│   ├── Geographic strategy
│   ├── Sticky-session strategy
│   ├── Time-based strategy
│   └── Custom rules strategy
```

**Proposed Structure:**
```
electron/core/proxy-engine/
├── rotation/
│   ├── index.ts                    # Re-exports, factory
│   ├── types.ts                    # Shared types
│   ├── base-strategy.ts            # Abstract base class
│   ├── strategies/
│   │   ├── round-robin.ts          # ~50 lines
│   │   ├── random.ts               # ~30 lines
│   │   ├── weighted.ts             # ~40 lines
│   │   ├── least-used.ts           # ~40 lines
│   │   ├── fastest.ts              # ~40 lines
│   │   ├── failure-aware.ts        # ~50 lines
│   │   ├── geographic.ts           # ~100 lines
│   │   ├── sticky-session.ts       # ~150 lines
│   │   ├── time-based.ts           # ~120 lines
│   │   └── custom-rules.ts         # ~150 lines
│   └── strategy-factory.ts         # Factory for creating strategies
```

**Benefits:**
- Single Responsibility Principle
- Easier testing per strategy
- New strategies don't modify existing code
- Better code navigation

**Migration Path:**
1. Create `rotation/` directory structure
2. Extract `BaseRotationStrategy` abstract class
3. Move each strategy to its own file
4. Create factory for strategy instantiation
5. Update imports in `manager.ts`
6. Add integration tests
7. Remove old `rotation.ts`

##### 2.2.2 search-engine.ts (533 lines) → Separate Concerns

**Current Structure:**
```
search-engine.ts
├── SearchEngineAutomation class
│   ├── Search engine configs
│   ├── Search execution
│   ├── Result extraction
│   ├── Human behavior simulation
│   └── Translation integration (EP-008)
```

**Proposed Structure:**
```
electron/core/automation/
├── search/
│   ├── index.ts                    # Re-exports
│   ├── types.ts                    # Search-specific types
│   ├── search-engine.ts            # Core search logic (~200 lines)
│   ├── result-extractor.ts         # DOM extraction (~100 lines)
│   ├── engine-configs.ts           # Search engine selectors (~50 lines)
│   └── search-translator.ts        # Translation adapter (~100 lines)
├── behavior/
│   ├── human-simulator.ts          # Scrolling, delays (~100 lines)
│   └── interaction-patterns.ts     # Click patterns
```

**Benefits:**
- Search logic separate from translation
- Easier to add new search engines
- Behavior simulation reusable
- Better testability

##### 2.2.3 Frontend Components (ActivityLog, AnalyticsDashboard)

**Current Issue:** Components mix presentation with data fetching/processing.

**Proposed Pattern:** Container/Presenter + Custom Hooks

```tsx
// Before: ActivityLog.tsx (338 lines)
function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  // ... data fetching, filtering, rendering all in one
}

// After: Split into multiple files
// hooks/useActivityLogs.ts
export function useActivityLogs(filter: string) {
  // Data fetching and state management
}

// components/ActivityLog/
// ├── ActivityLog.tsx          # Container (connects hook to presenter)
// ├── ActivityLogList.tsx      # Presenter (pure rendering)
// ├── ActivityLogFilter.tsx    # Filter controls
// └── ActivityLogItem.tsx      # Single log item
```

#### 2.3 Refactoring Priority Matrix

| File | Impact | Effort | Risk | Priority Score |
|------|--------|--------|------|----------------|
| rotation.ts | High | Medium | Low | **P1** |
| search-engine.ts | High | Medium | Medium | **P1** |
| ActivityLog.tsx | Medium | Low | Low | **P2** |
| AnalyticsDashboard.tsx | Medium | Medium | Low | **P2** |

---

### 3. Captcha Detection System Architecture

#### 3.1 Overview

The captcha detection system integrates with the automation flow to detect, log, and optionally handle captcha challenges.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CAPTCHA DETECTION ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Automation Flow                                 │   │
│  │                                                                      │   │
│  │  Navigate ──▶ Wait ──▶ [CAPTCHA CHECK] ──▶ Extract ──▶ Interact    │   │
│  │                              │                                       │   │
│  │                              ▼                                       │   │
│  │                    ┌─────────────────┐                              │   │
│  │                    │ Captcha Found?  │                              │   │
│  │                    └────────┬────────┘                              │   │
│  │                             │                                        │   │
│  │              ┌──────────────┼──────────────┐                        │   │
│  │              ▼              ▼              ▼                        │   │
│  │         ┌────────┐    ┌────────┐    ┌────────┐                     │   │
│  │         │  Log   │    │  Retry │    │  Skip  │                     │   │
│  │         │& Alert │    │w/ Proxy│    │  Task  │                     │   │
│  │         └────────┘    └────────┘    └────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CaptchaDetector                                   │   │
│  │              (electron/core/automation/captcha-detector.ts)          │   │
│  │                                                                      │   │
│  │  Detection Methods:                                                  │   │
│  │  ├── URL pattern matching (recaptcha, hcaptcha domains)             │   │
│  │  ├── DOM element detection (iframe, challenge divs)                 │   │
│  │  ├── Page title/content analysis                                    │   │
│  │  └── Response header analysis (429, challenge headers)              │   │
│  │                                                                      │   │
│  │  Supported Captcha Types:                                           │   │
│  │  ├── Google reCAPTCHA (v2, v3)                                      │   │
│  │  ├── hCaptcha                                                       │   │
│  │  ├── Cloudflare Challenge                                           │   │
│  │  ├── AWS WAF CAPTCHA                                                │   │
│  │  └── Custom challenge pages                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 Anti-Detect Integration                              │   │
│  │                                                                      │   │
│  │  Fingerprint    Proxy         Behavior        Headers               │   │
│  │  Spoofing   ◀──▶ Rotation ◀──▶ Simulation ◀──▶ Modification         │   │
│  │      │              │              │              │                  │   │
│  │      └──────────────┴──────────────┴──────────────┘                  │   │
│  │                           │                                          │   │
│  │                    Reduces Captcha                                   │   │
│  │                    Trigger Rate                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 Detection Strategies

```typescript
// Proposed interface for captcha detection
interface CaptchaDetector {
  // Check if current page has captcha
  detect(webContents: WebContents): Promise<CaptchaDetectionResult>;
  
  // Register custom detection pattern
  addPattern(pattern: CaptchaPattern): void;
  
  // Get detection statistics
  getStats(): CaptchaStats;
}

interface CaptchaDetectionResult {
  detected: boolean;
  type?: CaptchaType;
  confidence: number;        // 0-1
  selector?: string;         // DOM selector if found
  suggestedAction: CaptchaAction;
}

type CaptchaType = 
  | 'recaptcha-v2'
  | 'recaptcha-v3' 
  | 'hcaptcha'
  | 'cloudflare'
  | 'aws-waf'
  | 'custom'
  | 'unknown';

type CaptchaAction = 
  | 'retry-with-new-proxy'
  | 'wait-and-retry'
  | 'skip-task'
  | 'alert-user'
  | 'use-solver';  // Future: external solver integration
```

#### 3.3 Detection Patterns

```typescript
const CAPTCHA_PATTERNS = {
  // URL patterns
  urlPatterns: [
    /recaptcha.*google\.com/i,
    /hcaptcha\.com/i,
    /challenges\.cloudflare\.com/i,
    /captcha.*\.awswaf\./i
  ],
  
  // DOM selectors
  domSelectors: [
    'iframe[src*="recaptcha"]',
    'iframe[src*="hcaptcha"]',
    '.g-recaptcha',
    '.h-captcha',
    '#cf-challenge-running',
    '[data-callback*="captcha"]'
  ],
  
  // Page content patterns
  contentPatterns: [
    /verify.*human/i,
    /captcha.*challenge/i,
    /robot.*check/i,
    /cloudflare.*checking/i
  ],
  
  // Response indicators
  responseIndicators: {
    statusCodes: [403, 429, 503],
    headers: ['cf-ray', 'x-amz-captcha']
  }
};
```

#### 3.4 Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│                    Integration Architecture                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Page Load Hook                                             │
│     └─▶ CaptchaDetector.detect() after did-finish-load        │
│                                                                │
│  2. Request Interception                                       │
│     └─▶ Check response codes in webRequest.onCompleted        │
│                                                                │
│  3. DOM Mutation Observer                                      │
│     └─▶ Watch for dynamically injected captcha elements       │
│                                                                │
│  4. Pre-Action Check                                           │
│     └─▶ Verify no captcha before extraction/interaction       │
│                                                                │
│  Integration with Existing Components:                         │
│                                                                │
│  TaskExecutor ────────────▶ CaptchaDetector                   │
│       │                           │                            │
│       │                           ▼                            │
│       │                    ┌──────────────┐                   │
│       │                    │ Detection    │                   │
│       │                    │ Result       │                   │
│       │                    └──────┬───────┘                   │
│       │                           │                            │
│       ▼                           ▼                            │
│  ProxyRotation ◀────────── Handle Result                      │
│  (failover if                     │                            │
│   captcha)                        ▼                            │
│                            ActivityLog                         │
│                            (log event)                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

#### 3.5 ADR-003: Captcha Detection Strategy

**Context:** Automation tasks may encounter captchas that block progress.

**Decision:** Implement detection-only system with logging and automatic retry via proxy rotation.

**Consequences:**
- **Positive:**
  - Aware of captcha encounters
  - Can trigger proxy rotation
  - Logging for analysis
  - No TOS violations (no solving)
- **Negative:**
  - Can't solve captchas automatically
  - Some tasks may fail
  - Requires manual intervention for persistent captchas

**Future Considerations:**
- Integration with external solving services (2captcha, etc.)
- Machine learning-based detection improvement
- Browser automation workarounds

---

### 4. Implementation Checklist

#### 4.1 Cron Parser (Complete ✓)
- [x] Parse 5-field cron expressions
- [x] Support wildcards, ranges, steps, lists
- [x] Month and day name aliases
- [x] Preset shortcuts (@hourly, @daily, etc.)
- [x] Next execution calculation
- [x] Multiple execution times
- [x] Human-readable descriptions
- [x] Validation without throwing
- [x] Comprehensive tests

#### 4.2 Scheduler Integration (Complete ✓)
- [x] Add 'cron' schedule type
- [x] Integrate CronParser
- [x] Cache parsed expressions
- [x] Validate on add/update
- [x] Calculate cron next runs
- [x] Handle endTime and maxRuns
- [x] Persistence (import/export)
- [x] Query methods
- [x] Comprehensive tests

#### 4.3 Refactoring (Planned)
- [ ] Create rotation strategy directory structure
- [ ] Extract base strategy class
- [ ] Split rotation strategies
- [ ] Split search-engine.ts
- [ ] Refactor frontend components
- [ ] Update imports
- [ ] Add integration tests

#### 4.4 Captcha Detection (Planned)
- [ ] Create CaptchaDetector class
- [ ] Implement URL pattern detection
- [ ] Implement DOM detection
- [ ] Implement response analysis
- [ ] Integrate with TaskExecutor
- [ ] Add logging and statistics
- [ ] Add configuration options
- [ ] Write tests

---

### 5. File Reference

| File | Purpose | Status |
|------|---------|--------|
| `electron/types/scheduling.ts` | Scheduling type definitions | New |
| `electron/core/automation/cron-parser.ts` | Cron expression parser | Updated |
| `electron/core/automation/scheduler.ts` | Task scheduler with cron support | Updated |
| `electron/core/automation/types.ts` | Automation types (added 'cron' type) | Updated |
| `tests/unit/cron-scheduler.test.ts` | Comprehensive tests | New |

---

*Last Updated: Based on PRD Section 6.2 P1 Work Items*
