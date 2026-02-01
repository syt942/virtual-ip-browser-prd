# Virtual IP Browser - Complete System Architecture

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 2.0.0 |
| **Last Updated** | 2025-01-27 |
| **Status** | Comprehensive Architecture Specification |
| **Scope** | Multi-Process Architecture, Design Patterns, Security |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Multi-Process Architecture](#3-multi-process-architecture)
4. [Core Services Architecture](#4-core-services-architecture)
5. [Database Architecture](#5-database-architecture)
6. [IPC Communication Layer](#6-ipc-communication-layer)
7. [State Management Architecture](#7-state-management-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Design Patterns](#9-design-patterns)
10. [Scalability Architecture](#10-scalability-architecture)
11. [Component Diagrams](#11-component-diagrams)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [TypeScript Interfaces](#13-typescript-interfaces)
14. [Implementation Guidelines](#14-implementation-guidelines)

---

## 1. Executive Summary

Virtual IP Browser is built on a sophisticated multi-process architecture leveraging Electron's process isolation capabilities. The system is designed for:

- **Scalability**: Support for 50 concurrent isolated browser tabs
- **Security**: Defense-in-depth with process sandboxing and encrypted storage
- **Maintainability**: Modular design with clear separation of concerns
- **Performance**: Optimized resource management with lazy loading and pooling

### 1.1 Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **Process Isolation** | Each tab runs in isolated BrowserView with unique session partition |
| **Defense in Depth** | Multiple security layers: sandbox, CSP, input validation, encryption |
| **Event-Driven** | EventEmitter pattern for loose coupling between components |
| **Strategy Pattern** | Pluggable algorithms for proxy rotation |
| **Circuit Breaker** | Resilient error handling with automatic recovery |
| **Repository Pattern** | Clean data access abstraction |

---

## 2. High-Level Architecture

### 2.1 System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            VIRTUAL IP BROWSER                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         MAIN PROCESS (Node.js)                           │   │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────┐  │   │
│  │  │ ProxyManager  │ │ PrivacyManager│ │  TabManager   │ │ Automation  │  │   │
│  │  │  - Rotation   │ │  - Fingerprint│ │  - BrowserView│ │  Engine     │  │   │
│  │  │  - Validation │ │  - WebRTC     │ │  - Sessions   │ │  - Search   │  │   │
│  │  │  - Pool       │ │  - Trackers   │ │  - Isolation  │ │  - Domain   │  │   │
│  │  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └──────┬──────┘  │   │
│  │          │                 │                 │                │          │   │
│  │  ┌───────┴─────────────────┴─────────────────┴────────────────┴───────┐  │   │
│  │  │                      IPC HANDLER LAYER                              │  │   │
│  │  │   proxy.ts │ privacy.ts │ tabs.ts │ automation.ts │ navigation.ts  │  │   │
│  │  └───────────────────────────────┬────────────────────────────────────┘  │   │
│  │                                  │                                        │   │
│  │  ┌───────────────────────────────┴────────────────────────────────────┐  │   │
│  │  │                      DATABASE LAYER (SQLite)                        │  │   │
│  │  │  DatabaseManager │ Repositories │ Migrations │ EncryptionService   │  │   │
│  │  └────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                          contextBridge (IPC)                                    │
│                                      │                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       RENDERER PROCESS (Chromium)                        │   │
│  │  ┌───────────────────────────────────────────────────────────────────┐  │   │
│  │  │                      REACT APPLICATION                             │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  │   │
│  │  │  │   TabBar    │ │ AddressBar  │ │   Panels    │ │  Settings   │  │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │  │   │
│  │  │  ┌─────────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │                  ZUSTAND STATE STORES                        │  │  │   │
│  │  │  │  tabStore │ proxyStore │ privacyStore │ automationStore     │  │  │   │
│  │  │  └─────────────────────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    BROWSERVIEW PROCESSES (Isolated)                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       ┌─────────────┐  │   │
│  │  │   Tab 1     │ │   Tab 2     │ │   Tab 3     │  ...  │   Tab N     │  │   │
│  │  │ partition:1 │ │ partition:2 │ │ partition:3 │       │ partition:N │  │   │
│  │  │ proxy: A    │ │ proxy: B    │ │ proxy: C    │       │ proxy: X    │  │   │
│  │  │ fingerprint │ │ fingerprint │ │ fingerprint │       │ fingerprint │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Desktop Framework** | Electron | 34.5.8 | Cross-platform desktop shell |
| **UI Framework** | React | 19.2.3 | Component-based UI |
| **Language** | TypeScript | 5.9.3 | Type-safe development |
| **Build System** | electron-vite | 2.3.0 | Optimized bundling |
| **State Management** | Zustand | 5.0.10 | Lightweight state stores |
| **Styling** | TailwindCSS | 3.4.19 | Utility-first CSS |
| **UI Components** | Radix UI | Latest | Accessible primitives |
| **Database** | better-sqlite3 | 11.10.0 | Synchronous SQLite |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E testing |

---

## 3. Multi-Process Architecture

### 3.1 Process Model

Virtual IP Browser utilizes Electron's multi-process architecture with three distinct process types:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROCESS MODEL                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    MAIN PROCESS (Privileged)                         │    │
│  │                                                                      │    │
│  │  Responsibilities:                                                   │    │
│  │  • Window management (BrowserWindow lifecycle)                       │    │
│  │  • Native OS integration (file system, notifications)               │    │
│  │  • Database operations (SQLite via better-sqlite3)                  │    │
│  │  • Proxy management and rotation                                    │    │
│  │  • Session partitioning and isolation                               │    │
│  │  • IPC message handling and validation                              │    │
│  │  • Encryption key management                                        │    │
│  │                                                                      │    │
│  │  Security Context:                                                   │    │
│  │  • Full Node.js API access                                          │    │
│  │  • File system access (restricted to app data)                      │    │
│  │  • Network access for proxy validation                              │    │
│  │  • Credential encryption/decryption                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      │ contextBridge                         │
│                                      │ (type-safe IPC)                       │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  RENDERER PROCESS (Sandboxed)                        │    │
│  │                                                                      │    │
│  │  Responsibilities:                                                   │    │
│  │  • React UI rendering                                               │    │
│  │  • User interaction handling                                        │    │
│  │  • State management (Zustand stores)                                │    │
│  │  • IPC invocation via window.api                                    │    │
│  │                                                                      │    │
│  │  Security Context:                                                   │    │
│  │  • No Node.js API access (sandbox: true)                            │    │
│  │  • No direct file system access                                     │    │
│  │  • Communication only via exposed IPC channels                      │    │
│  │  • CSP enforced                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                      │                                       │
│                                      │ BrowserView                           │
│                                      │ (session partitions)                  │
│                                      ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              BROWSERVIEW PROCESSES (Fully Isolated)                  │    │
│  │                                                                      │    │
│  │  Per-Tab Isolation:                                                 │    │
│  │  • Unique session partition (persist:tab-{uuid})                    │    │
│  │  • Isolated cookies, localStorage, IndexedDB                        │    │
│  │  • Separate cache directory                                         │    │
│  │  • Individual proxy assignment                                      │    │
│  │  • Unique fingerprint seed                                          │    │
│  │                                                                      │    │
│  │  Security Context:                                                   │    │
│  │  • Chromium sandbox enabled                                         │    │
│  │  • No cross-tab data access                                         │    │
│  │  • WebRTC protection injected                                       │    │
│  │  • Fingerprint spoofing active                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Process Communication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Renderer   │     │    Main      │     │ BrowserView  │
│   Process    │     │   Process    │     │  Processes   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │  ipcRenderer.      │                    │
       │  invoke('proxy:    │                    │
       │  add', data)       │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │ Validate input     │
       │                    │ SSRF prevention    │
       │                    │ Encrypt credentials│
       │                    │ Store in SQLite    │
       │                    │                    │
       │  Promise<result>   │                    │
       │<───────────────────│                    │
       │                    │                    │
       │  Update Zustand    │                    │
       │  store             │                    │
       │                    │                    │
       │                    │ session.setProxy() │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ Apply fingerprint  │
       │                    │ protection script  │
       │                    │───────────────────>│
       │                    │                    │
       │  Event:            │                    │
       │  tab-update        │                    │
       │<───────────────────│                    │
       │                    │                    │
       ▼                    ▼                    ▼
```

### 3.3 Main Process Entry Point

```typescript
// electron/main/index.ts - Initialization Flow

import { app, BrowserWindow } from 'electron';
import { DatabaseManager } from '../database';
import { ProxyManager } from '../core/proxy-engine/manager';
import { TabManager } from '../core/tabs/manager';
import { PrivacyManager } from '../core/privacy/manager';
import { AutomationManager } from '../core/automation/manager';
import { setupIpcHandlers } from '../ipc/handlers';
import { encryptionService } from '../database/services/encryption.service';
import { ConfigManager } from './config-manager';

// Global service instances
let mainWindow: BrowserWindow | null = null;
let configManager: ConfigManager;
let dbManager: DatabaseManager;
let proxyManager: ProxyManager;
let tabManager: TabManager;
let privacyManager: PrivacyManager;
let automationManager: AutomationManager;

async function initialize() {
  // 1. Initialize ConfigManager for secure master key management
  configManager = new ConfigManager();
  configManager.initialize();
  const masterKey = configManager.getMasterKey();
  
  // 2. Initialize encryption service with master key
  encryptionService.initialize(masterKey);
  
  // 3. Initialize database with migrations
  dbManager = new DatabaseManager();
  await dbManager.initialize();
  
  // 4. Initialize core services with dependencies
  proxyManager = new ProxyManager({ masterKey });
  privacyManager = new PrivacyManager();
  tabManager = new TabManager();
  tabManager.setPrivacyManager(privacyManager);
  tabManager.setProxyManager(proxyManager);
  automationManager = new AutomationManager(dbManager);
  
  // 5. Setup IPC handlers with service injection
  setupIpcHandlers({
    proxyManager,
    tabManager,
    privacyManager,
    automationManager,
    dbManager
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    }
  });
  
  tabManager.setWindow(mainWindow);
}

app.whenReady().then(async () => {
  await initialize();
  createWindow();
});

app.on('before-quit', () => {
  // Secure cleanup
  configManager?.destroy();      // Clear master key from memory
  encryptionService?.destroy();  // Clear encryption keys
  proxyManager?.destroy();       // Clear sensitive proxy data
  dbManager?.close();            // Close database connection
});
```

---

## 4. Core Services Architecture

### 4.1 Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE SERVICES ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌─────────────────┐                                 │
│                          │  ConfigManager  │                                 │
│                          │  (Master Key)   │                                 │
│                          └────────┬────────┘                                 │
│                                   │                                          │
│                    ┌──────────────┼──────────────┐                          │
│                    ▼              ▼              ▼                          │
│         ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐            │
│         │EncryptionService│ │DatabaseMgr  │ │  ProxyManager   │            │
│         └─────────────────┘ └──────┬──────┘ └────────┬────────┘            │
│                                    │                 │                      │
│                    ┌───────────────┴─────────────────┤                      │
│                    │                                 │                      │
│         ┌─────────────────┐              ┌──────────┴──────────┐           │
│         │   Repositories  │              │  PrivacyManager     │           │
│         │  ┌───────────┐  │              │  ┌───────────────┐  │           │
│         │  │ProxyRepo  │  │              │  │CanvasSpoof    │  │           │
│         │  │TaskRepo   │  │              │  │WebGLSpoof     │  │           │
│         │  │DomainRepo │  │              │  │AudioSpoof     │  │           │
│         │  │CreatorRepo│  │              │  │NavigatorSpoof │  │           │
│         │  │LogRepo    │  │              │  │TimezoneSpoof  │  │           │
│         │  └───────────┘  │              │  │WebRTCProtect  │  │           │
│         └─────────────────┘              │  │TrackerBlocker │  │           │
│                    │                     │  └───────────────┘  │           │
│                    │                     └──────────┬──────────┘           │
│                    │                                │                      │
│                    └────────────────┬───────────────┘                      │
│                                     │                                      │
│                          ┌──────────┴──────────┐                           │
│                          │     TabManager      │                           │
│                          │  ┌───────────────┐  │                           │
│                          │  │ BrowserViews  │  │                           │
│                          │  │ Session Parts │  │                           │
│                          │  │ Tab Pool      │  │                           │
│                          │  └───────────────┘  │                           │
│                          └──────────┬──────────┘                           │
│                                     │                                      │
│                          ┌──────────┴──────────┐                           │
│                          │  AutomationManager  │                           │
│                          │  ┌───────────────┐  │                           │
│                          │  │SearchEngine   │  │                           │
│                          │  │DomainTargeting│  │                           │
│                          │  │Scheduler      │  │                           │
│                          │  │Executor       │  │                           │
│                          │  │CreatorSupport │  │                           │
│                          │  └───────────────┘  │                           │
│                          └─────────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 ProxyManager Service

The ProxyManager is the central service for proxy lifecycle management with security hardening.

```typescript
// electron/core/proxy-engine/manager.ts

/**
 * ProxyManager Architecture
 * 
 * Features:
 * - Encrypted credential storage (AES-256-GCM)
 * - SSRF prevention (blocks localhost, private IPs)
 * - Input validation for all proxy configurations
 * - Circuit breaker integration for resilience
 * - 10+ rotation strategies via Strategy pattern
 */

export interface ProxyManagerConfig {
  masterKey: string | Buffer;           // For credential encryption
  ssrfConfig?: SSRFConfig;              // SSRF prevention rules
  maxProxies?: number;                  // Pool size limit (default: 100)
  autoValidate?: boolean;               // Validate on add (default: true)
  enableCircuitBreaker?: boolean;       // Enable resilience (default: true)
  circuitBreakerRegistry?: CircuitBreakerRegistry;
}

export class ProxyManager extends EventEmitter {
  private proxies: Map<string, ProxyConfig> = new Map();
  private validator: ProxyValidator;
  private rotationStrategy: ProxyRotationStrategy;
  private credentialStore: CredentialStore;
  private circuitBreakerRegistry: CircuitBreakerRegistry | null = null;

  // Key methods:
  async addProxy(input: ProxyInput): Promise<SafeProxyConfig>;
  async removeProxy(id: string): Promise<void>;
  async validateProxy(id: string): Promise<ProxyValidationResult>;
  selectProxy(context?: RotationContext): ProxyConfig | null;
  setRotationStrategy(config: RotationConfig): void;
  
  // Circuit breaker integration
  async executeWithCircuitBreaker<T>(
    proxyId: string,
    operation: () => Promise<T>
  ): Promise<T>;
  
  // Secure cleanup
  destroy(): void;
}
```

### 4.3 TabManager Service

The TabManager handles isolated tab creation with per-tab session partitioning.

```typescript
// electron/core/tabs/manager.ts

/**
 * TabManager Architecture
 * 
 * Features:
 * - Per-tab session isolation via Electron partitions
 * - Integrated proxy assignment per tab
 * - Fingerprint protection injection
 * - Tab pool for performance optimization
 * - Maximum 50 concurrent tabs
 */

export class TabManager extends EventEmitter {
  private tabs: Map<string, TabConfig> = new Map();
  private views: Map<string, BrowserView> = new Map();
  private window: BrowserWindow | null = null;
  private activeTabId: string | null = null;
  private privacyManager: PrivacyManager | null = null;
  private proxyManager: ProxyManager | null = null;

  // Tab lifecycle
  async createTab(config: Partial<TabConfig>): Promise<TabConfig> {
    const id = crypto.randomUUID();
    
    // Create isolated BrowserView
    const view = new BrowserView({
      webPreferences: {
        partition: `persist:tab-${id}`,  // Unique session
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
    
    // Apply proxy if specified
    if (config.proxyId) {
      await this.applyProxyToSession(view.webContents.session, config.proxyId);
    }
    
    // Inject fingerprint protection
    await this.applyFingerprintProtection(view, config.fingerprint);
    
    return tab;
  }

  async closeTab(id: string): Promise<void>;
  setActiveTab(id: string): void;
  async navigateTab(id: string, url: string): Promise<void>;
  async assignProxy(tabId: string, proxyId: string): Promise<void>;
}
```

### 4.4 PrivacyManager Service

The PrivacyManager orchestrates all privacy protection features.

```typescript
// electron/core/privacy/manager.ts

/**
 * PrivacyManager Architecture
 * 
 * Features:
 * - Canvas fingerprint spoofing
 * - WebGL fingerprint spoofing
 * - Audio context fingerprint spoofing
 * - Navigator property spoofing
 * - Timezone spoofing
 * - WebRTC leak prevention
 * - Tracker blocking with categorization
 */

export interface PrivacyConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  webrtc: boolean;
  trackerBlocking: boolean;
  navigatorConfig?: NavigatorSpoofConfig;
  timezoneRegion?: string;
}

export class PrivacyManager extends EventEmitter {
  private canvasProtection: CanvasFingerprintProtection;
  private webglProtection: WebGLFingerprintProtection;
  private audioProtection: AudioFingerprintProtection;
  private navigatorProtection: NavigatorFingerprintProtection;
  private timezoneProtection: TimezoneFingerprintProtection;
  private webrtcProtection: WebRTCProtection;
  private trackerBlocker: TrackerBlocker;

  // Generate combined protection script for injection
  generateProtectionScript(config: PrivacyConfig): string;
  
  // Apply protection to a session partition
  applyToSession(sessionPartition: string, config: PrivacyConfig): void;
  
  // Generate random realistic profile
  generateRandomProfile(): PrivacyConfig;
}
```

### 4.5 AutomationManager Service

The AutomationManager coordinates search automation, domain targeting, and scheduling.

```typescript
// electron/core/automation/manager.ts

/**
 * AutomationManager Architecture
 * 
 * Features:
 * - Search automation across 5 engines
 * - Domain targeting with click simulation
 * - Human-like behavior simulation
 * - Task scheduling (one-time, recurring, continuous, cron)
 * - Self-healing with automatic retry
 * - Resource monitoring and throttling
 */

export class AutomationManager extends EventEmitter {
  private searchEngine: SearchEngine;
  private domainTargeting: DomainTargeting;
  private scheduler: Scheduler;
  private executor: Executor;
  private behaviorSimulator: BehaviorSimulator;
  private isRunning: boolean = false;

  // Search automation
  async startSearch(config: SearchConfig): Promise<string>;
  async stopSearch(sessionId: string): Promise<void>;
  async pauseSearch(sessionId: string): Promise<void>;
  async resumeSearch(sessionId: string): Promise<void>;
  
  // Domain targeting
  addTargetDomain(domain: string, options?: DomainOptions): void;
  removeTargetDomain(domain: string): void;
  
  // Scheduling
  scheduleTask(config: ScheduleConfig): string;
  cancelSchedule(scheduleId: string): void;
  
  // Status
  getStatus(): AutomationStatus;
  getProgress(): AutomationProgress;
}
```

### 4.6 Service Interaction Patterns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVICE INTERACTION PATTERNS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. TAB CREATION WITH PROXY AND PRIVACY                                     │
│  ─────────────────────────────────────                                      │
│                                                                              │
│  User Request                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐    getProxy()    ┌─────────────┐                          │
│  │ TabManager  │─────────────────>│ProxyManager │                          │
│  └──────┬──────┘                  └─────────────┘                          │
│         │                                                                    │
│         │ generateProtectionScript()                                        │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │PrivacyMgr   │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         │ createBrowserView() + injectScript()                              │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │BrowserView  │ ◄── Isolated tab with proxy + fingerprint                 │
│  └─────────────┘                                                            │
│                                                                              │
│  2. SEARCH AUTOMATION FLOW                                                  │
│  ─────────────────────────                                                  │
│                                                                              │
│  Schedule Trigger                                                           │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────┐   createTab()    ┌─────────────┐                          │
│  │AutomationMgr│─────────────────>│ TabManager  │                          │
│  └──────┬──────┘                  └─────────────┘                          │
│         │                                                                    │
│         │ selectProxy()                                                     │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │ProxyManager │──► Rotation Strategy selects optimal proxy                │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         │ executeSearch()                                                   │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │SearchEngine │──► Human-like typing, delays, scrolling                   │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         │ findAndClickDomain()                                              │
│         ▼                                                                    │
│  ┌─────────────┐                                                            │
│  │DomainTarget │──► Mouse movement simulation, dwell time                  │
│  └─────────────┘                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Architecture

### 5.1 Database Overview

Virtual IP Browser uses SQLite via `better-sqlite3` for local data persistence with the following characteristics:

| Feature | Implementation |
|---------|----------------|
| **Engine** | SQLite 3 via better-sqlite3 |
| **Mode** | WAL (Write-Ahead Logging) for performance |
| **Foreign Keys** | Enabled for referential integrity |
| **Migrations** | Versioned, embedded SQL migrations |
| **Encryption** | AES-256-GCM for sensitive fields |
| **Location** | `{userData}/virtual-ip-browser.db` |

### 5.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE ENTITY RELATIONSHIPS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐          ┌─────────────────┐                           │
│  │     proxies     │          │  search_tasks   │                           │
│  ├─────────────────┤          ├─────────────────┤                           │
│  │ id (PK)         │◄────────┤│ proxy_id (FK)   │                           │
│  │ name            │          │ id (PK)         │                           │
│  │ host            │          │ session_id      │                           │
│  │ port            │          │ keyword         │                           │
│  │ protocol        │          │ engine          │                           │
│  │ username (enc)  │          │ status          │                           │
│  │ password (enc)  │          │ tab_id          │                           │
│  │ status          │          │ position        │                           │
│  │ latency         │          │ results (JSON)  │                           │
│  │ failure_count   │          │ error           │                           │
│  │ success_rate    │          │ retry_count     │                           │
│  │ region          │          │ duration        │                           │
│  │ tags (JSON)     │          │ created_at      │                           │
│  │ created_at      │          └─────────────────┘                           │
│  │ updated_at      │                                                        │
│  └─────────────────┘          ┌─────────────────┐                           │
│          │                    │ target_domains  │                           │
│          │                    ├─────────────────┤                           │
│          │                    │ id (PK)         │                           │
│          │                    │ domain (UNIQUE) │                           │
│          │                    │ pattern         │                           │
│          │                    │ enabled         │                           │
│          │                    │ priority        │                           │
│          │                    │ visit_count     │                           │
│          │                    │ avg_position    │                           │
│          │                    │ created_at      │                           │
│          │                    └─────────────────┘                           │
│          │                                                                   │
│          │                    ┌─────────────────┐                           │
│          │                    │    creators     │                           │
│          │                    ├─────────────────┤                           │
│          │                    │ id (PK)         │                           │
│          │                    │ name            │                           │
│          │                    │ url (UNIQUE)    │                           │
│          │                    │ platform        │                           │
│          │                    │ support_methods │                           │
│          │                    │ enabled         │                           │
│          │                    │ total_supports  │                           │
│          │                    │ total_ads_viewed│                           │
│          │                    │ created_at      │                           │
│          │                    └─────────────────┘                           │
│          │                                                                   │
│          ▼                    ┌─────────────────┐                           │
│  ┌─────────────────┐          │  activity_logs  │                           │
│  │    sessions     │          ├─────────────────┤                           │
│  ├─────────────────┤          │ id (PK)         │                           │
│  │ id (PK)         │          │ timestamp       │                           │
│  │ name            │          │ level           │                           │
│  │ tabs (JSON)     │          │ category        │                           │
│  │ window_bounds   │          │ message         │                           │
│  │ created_at      │          │ metadata (JSON) │                           │
│  │ updated_at      │          │ session_id      │                           │
│  └─────────────────┘          │ tab_id          │                           │
│                               │ proxy_id        │                           │
│  ┌─────────────────┐          └─────────────────┘                           │
│  │    schedules    │                                                        │
│  ├─────────────────┤                                                        │
│  │ id (PK)         │                                                        │
│  │ name            │                                                        │
│  │ type            │                                                        │
│  │ task_config     │                                                        │
│  │ cron_expression │                                                        │
│  │ enabled         │                                                        │
│  │ next_run        │                                                        │
│  │ run_count       │                                                        │
│  │ created_at      │                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Complete Database Schema

```sql
-- Proxies Table (Core proxy storage)
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  username TEXT,                    -- Encrypted with AES-256-GCM
  password TEXT,                    -- Encrypted with AES-256-GCM
  status TEXT DEFAULT 'checking' CHECK (status IN ('active', 'failed', 'checking', 'disabled')),
  latency INTEGER,
  last_checked DATETIME,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  region TEXT,
  tags TEXT,                        -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(host, port, protocol)
);

CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_region ON proxies(region);

-- Search Tasks Table (Automation task tracking)
CREATE TABLE IF NOT EXISTS search_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  proxy_id TEXT,
  tab_id TEXT,
  position INTEGER,
  results TEXT,                     -- JSON array of SearchResult
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_search_tasks_session ON search_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_search_tasks_status ON search_tasks(status);
CREATE INDEX IF NOT EXISTS idx_search_tasks_keyword ON search_tasks(keyword);

-- Target Domains Table (SEO domain tracking)
CREATE TABLE IF NOT EXISTS target_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT,                     -- Regex pattern for matching
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_visited DATETIME,
  visit_count INTEGER DEFAULT 0,
  avg_position REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_target_domains_enabled ON target_domains(enabled);
CREATE INDEX IF NOT EXISTS idx_target_domains_priority ON target_domains(priority DESC);

-- Creators Table (Creator support tracking)
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'blog', 'website')),
  thumbnail_url TEXT,
  support_methods TEXT,             -- JSON array
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_supported DATETIME,
  total_supports INTEGER DEFAULT 0,
  total_ads_viewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creators_enabled ON creators(enabled);
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);

-- Activity Logs Table (Comprehensive logging)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'success')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,                    -- JSON object
  session_id TEXT,
  tab_id TEXT,
  proxy_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);

-- Sessions Table (Browser session persistence)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tabs TEXT,                        -- JSON array of tab configurations
  window_bounds TEXT,               -- JSON {x, y, width, height}
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedules Table (Automation scheduling)
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('one-time', 'recurring', 'continuous', 'custom')),
  task_config TEXT NOT NULL,        -- JSON configuration
  start_time DATETIME,
  end_time DATETIME,
  interval_minutes INTEGER,
  days_of_week TEXT,                -- JSON array [0-6]
  cron_expression TEXT,
  enabled INTEGER DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  run_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run);
```

### 5.4 Repository Pattern Implementation

```typescript
// electron/database/repositories/proxy.repository.ts

/**
 * Repository Pattern for data access abstraction
 * 
 * Benefits:
 * - Separation of data access from business logic
 * - Centralized query management
 * - Easy testing with mock implementations
 * - Consistent error handling
 */

export class ProxyRepository {
  private db: Database.Database;
  private statements: PreparedStatements;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    this.statements = {
      insert: this.db.prepare(`
        INSERT INTO proxies (id, name, host, port, protocol, username, password, 
                            status, region, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      findById: this.db.prepare('SELECT * FROM proxies WHERE id = ?'),
      findAll: this.db.prepare('SELECT * FROM proxies ORDER BY created_at DESC'),
      findByStatus: this.db.prepare('SELECT * FROM proxies WHERE status = ?'),
      update: this.db.prepare(`
        UPDATE proxies SET name = ?, host = ?, port = ?, protocol = ?,
                          status = ?, latency = ?, updated_at = ?
        WHERE id = ?
      `),
      delete: this.db.prepare('DELETE FROM proxies WHERE id = ?'),
      updateStatus: this.db.prepare(`
        UPDATE proxies SET status = ?, latency = ?, last_checked = ?, 
                          failure_count = ?, updated_at = ?
        WHERE id = ?
      `)
    };
  }

  // CRUD Operations
  create(proxy: ProxyCreateInput): ProxyRow;
  findById(id: string): ProxyRow | undefined;
  findAll(): ProxyRow[];
  findByStatus(status: ProxyStatus): ProxyRow[];
  update(id: string, data: ProxyUpdateInput): void;
  delete(id: string): void;
  updateValidationResult(id: string, result: ValidationResult): void;
}
```

### 5.5 Migration System

```typescript
// electron/database/migrations/runner.ts

/**
 * Migration System Architecture
 * 
 * Features:
 * - Versioned migrations with up/down support
 * - Embedded SQL for packaged app compatibility
 * - Transaction-wrapped execution
 * - Migration history tracking
 */

export interface Migration {
  version: number;
  name: string;
  up: string;    // SQL for applying migration
  down: string;  // SQL for rolling back
}

export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.ensureMigrationTable();
  }

  private ensureMigrationTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  run(migrations: Migration[]): MigrationResult[] {
    const applied = this.getAppliedVersions();
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      if (!applied.has(migration.version)) {
        this.db.transaction(() => {
          this.db.exec(migration.up);
          this.db.prepare(
            'INSERT INTO migrations (version, name) VALUES (?, ?)'
          ).run(migration.version, migration.name);
        })();
        
        results.push({ version: migration.version, status: 'applied' });
      }
    }

    return results;
  }

  rollback(version: number): void;
  getAppliedVersions(): Set<number>;
}
```

---

## 6. IPC Communication Layer

### 6.1 IPC Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          IPC COMMUNICATION LAYER                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RENDERER PROCESS                         MAIN PROCESS                       │
│  ┌─────────────────┐                     ┌─────────────────┐                │
│  │                 │                     │                 │                │
│  │  window.api     │    contextBridge    │  IPC Handlers   │                │
│  │  ┌───────────┐  │                     │  ┌───────────┐  │                │
│  │  │ proxy     │──┼─────────────────────┼─>│ proxy.ts  │  │                │
│  │  │ tab       │──┼─────────────────────┼─>│ tabs.ts   │  │                │
│  │  │ privacy   │──┼─────────────────────┼─>│ privacy.ts│  │                │
│  │  │ automation│──┼─────────────────────┼─>│automation │  │                │
│  │  │ navigation│──┼─────────────────────┼─>│navigation │  │                │
│  │  └───────────┘  │                     │  └───────────┘  │                │
│  │                 │                     │       │         │                │
│  │  Type-safe API  │                     │       ▼         │                │
│  │  (window.d.ts)  │                     │  ┌───────────┐  │                │
│  │                 │                     │  │ Services  │  │                │
│  │                 │                     │  │ Managers  │  │                │
│  │                 │                     │  │ Database  │  │                │
│  │                 │                     │  └───────────┘  │                │
│  └─────────────────┘                     └─────────────────┘                │
│                                                                              │
│  Security Features:                                                         │
│  • contextIsolation: true (no direct access to Node.js)                     │
│  • sandbox: true (process isolation)                                        │
│  • Input validation on both sides                                           │
│  • Rate limiting for sensitive operations                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 IPC Channel Definitions

```typescript
// electron/ipc/channels.ts

/**
 * Type-safe IPC channel definitions
 * Single source of truth for all IPC communication
 */

export const IPC_CHANNELS = {
  // Proxy Management
  PROXY_ADD: 'proxy:add',
  PROXY_REMOVE: 'proxy:remove',
  PROXY_UPDATE: 'proxy:update',
  PROXY_LIST: 'proxy:list',
  PROXY_VALIDATE: 'proxy:validate',
  PROXY_SET_ROTATION: 'proxy:set-rotation',
  
  // Tab Management
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_UPDATE: 'tab:update',
  TAB_LIST: 'tab:list',
  TAB_NAVIGATE: 'tab:navigate',
  
  // Privacy & Fingerprint
  PRIVACY_SET_FINGERPRINT: 'privacy:set-fingerprint',
  PRIVACY_TOGGLE_WEBRTC: 'privacy:toggle-webrtc',
  PRIVACY_TOGGLE_TRACKER_BLOCKING: 'privacy:toggle-tracker-blocking',
  
  // Automation
  AUTOMATION_START_SEARCH: 'automation:start-search',
  AUTOMATION_STOP_SEARCH: 'automation:stop-search',
  AUTOMATION_ADD_KEYWORD: 'automation:add-keyword',
  AUTOMATION_ADD_DOMAIN: 'automation:add-domain',
  AUTOMATION_GET_TASKS: 'automation:get-tasks',
  
  // Session Management
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_LIST: 'session:list',
  
  // Events (Main -> Renderer)
  EVENT_PROXY_STATUS_CHANGE: 'event:proxy-status-change',
  EVENT_TAB_UPDATE: 'event:tab-update',
  EVENT_AUTOMATION_PROGRESS: 'event:automation-progress',
  EVENT_LOG: 'event:log'
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

### 6.3 Preload Script (Context Bridge)

```typescript
// electron/main/preload.ts

/**
 * Preload Script - Secure IPC Bridge
 * 
 * Exposes a type-safe API to the renderer process
 * without exposing Node.js or Electron internals
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

// Type definitions for the exposed API
interface ProxyAPI {
  add: (data: ProxyInput) => Promise<ProxyResult>;
  remove: (id: string) => Promise<void>;
  update: (id: string, data: Partial<ProxyInput>) => Promise<ProxyResult>;
  list: () => Promise<ProxyListResult>;
  validate: (id: string) => Promise<ValidationResult>;
  setRotation: (config: RotationConfig) => Promise<void>;
}

interface TabAPI {
  create: (config: TabConfig) => Promise<TabResult>;
  close: (id: string) => Promise<void>;
  update: (id: string, updates: Partial<TabConfig>) => Promise<void>;
  list: () => Promise<Tab[]>;
  navigate: (id: string, url: string) => Promise<void>;
}

interface PrivacyAPI {
  setFingerprint: (config: FingerprintConfig) => Promise<void>;
  toggleWebRTC: (enabled: boolean) => Promise<void>;
  toggleTrackerBlocking: (enabled: boolean) => Promise<void>;
}

interface AutomationAPI {
  startSearch: (config: SearchConfig) => Promise<string>;
  stopSearch: (sessionId: string) => Promise<void>;
  addKeyword: (keyword: string) => Promise<void>;
  addDomain: (domain: string) => Promise<void>;
  getTasks: () => Promise<SearchTask[]>;
}

// Expose secure API via contextBridge
contextBridge.exposeInMainWorld('api', {
  proxy: {
    add: (data) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_ADD, data),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_REMOVE, id),
    update: (id, data) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_UPDATE, id, data),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROXY_LIST),
    validate: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_VALIDATE, id),
    setRotation: (config) => ipcRenderer.invoke(IPC_CHANNELS.PROXY_SET_ROTATION, config)
  } as ProxyAPI,
  
  tab: {
    create: (config) => ipcRenderer.invoke(IPC_CHANNELS.TAB_CREATE, config),
    close: (id) => ipcRenderer.invoke(IPC_CHANNELS.TAB_CLOSE, id),
    update: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.TAB_UPDATE, id, updates),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TAB_LIST),
    navigate: (id, url) => ipcRenderer.invoke(IPC_CHANNELS.TAB_NAVIGATE, id, url)
  } as TabAPI,
  
  privacy: {
    setFingerprint: (config) => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_SET_FINGERPRINT, config),
    toggleWebRTC: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, enabled),
    toggleTrackerBlocking: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.PRIVACY_TOGGLE_TRACKER_BLOCKING, enabled)
  } as PrivacyAPI,
  
  automation: {
    startSearch: (config) => ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_START_SEARCH, config),
    stopSearch: (sessionId) => ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_STOP_SEARCH, sessionId),
    addKeyword: (keyword) => ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_ADD_KEYWORD, keyword),
    addDomain: (domain) => ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_ADD_DOMAIN, domain),
    getTasks: () => ipcRenderer.invoke(IPC_CHANNELS.AUTOMATION_GET_TASKS)
  } as AutomationAPI,
  
  // Event listeners (Main -> Renderer)
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = Object.values(IPC_CHANNELS).filter(c => c.startsWith('event:'));
    if (validChannels.includes(channel as IPCChannel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  
  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
```

### 6.4 IPC Handler Implementation

```typescript
// electron/ipc/handlers/index.ts

/**
 * IPC Handler Setup
 * Registers all IPC handlers with dependency injection
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import { validateInput } from '../validation';
import { RateLimiter } from '../rate-limiter';

interface HandlerDependencies {
  proxyManager: ProxyManager;
  tabManager: TabManager;
  privacyManager: PrivacyManager;
  automationManager: AutomationManager;
  dbManager: DatabaseManager;
}

export function setupIpcHandlers(deps: HandlerDependencies): void {
  const rateLimiter = new RateLimiter();

  // Proxy Handlers
  ipcMain.handle(IPC_CHANNELS.PROXY_ADD, async (_, data) => {
    try {
      // Input validation
      const validated = validateInput('proxy:add', data);
      
      // Rate limiting
      await rateLimiter.checkLimit('proxy:add');
      
      // Execute operation
      const proxy = await deps.proxyManager.addProxy(validated);
      return { success: true, proxy };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_LIST, async () => {
    try {
      const proxies = deps.proxyManager.getProxies();
      return { success: true, proxies };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROXY_VALIDATE, async (_, id) => {
    try {
      const result = await deps.proxyManager.validateProxy(id);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Tab Handlers
  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, async (_, config) => {
    try {
      const tab = await deps.tabManager.createTab(config);
      return { success: true, tab };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Privacy Handlers
  ipcMain.handle(IPC_CHANNELS.PRIVACY_TOGGLE_WEBRTC, async (_, enabled) => {
    try {
      deps.privacyManager.getWebRTCProtection().setEnabled(enabled);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Automation Handlers
  ipcMain.handle(IPC_CHANNELS.AUTOMATION_START_SEARCH, async (_, config) => {
    try {
      const sessionId = await deps.automationManager.startSearch(config);
      return { success: true, sessionId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
```

### 6.5 Input Validation

```typescript
// electron/ipc/validation.ts

/**
 * Input Validation for IPC
 * Uses Zod schemas for runtime type checking
 */

import { z } from 'zod';

// Proxy input schema
const ProxyInputSchema = z.object({
  name: z.string().min(1).max(100),
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(100).optional(),
  password: z.string().max(100).optional(),
  region: z.string().max(50).optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});

// Tab config schema
const TabConfigSchema = z.object({
  url: z.string().url().optional(),
  proxyId: z.string().uuid().optional(),
  fingerprint: z.object({
    canvas: z.boolean().optional(),
    webgl: z.boolean().optional(),
    audio: z.boolean().optional(),
    navigator: z.boolean().optional(),
    timezone: z.boolean().optional()
  }).optional()
});

// Validation function
export function validateInput<T>(channel: string, data: unknown): T {
  const schemas: Record<string, z.ZodSchema> = {
    'proxy:add': ProxyInputSchema,
    'tab:create': TabConfigSchema,
    // ... more schemas
  };

  const schema = schemas[channel];
  if (!schema) {
    throw new Error(`No validation schema for channel: ${channel}`);
  }

  return schema.parse(data) as T;
}
```



---

## 7. State Management Architecture

### 7.1 Zustand Store Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ZUSTAND STORES                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │  tabStore   │  │ proxyStore  │  │privacyStore │  │automation │  │   │
│  │  │             │  │             │  │             │  │  Store    │  │   │
│  │  │ • tabs[]    │  │ • proxies[] │  │ • canvas    │  │ • keywords│  │   │
│  │  │ • activeId  │  │ • strategy  │  │ • webgl     │  │ • domains │  │   │
│  │  │ • isLoading │  │ • isLoading │  │ • webrtc    │  │ • status  │  │   │
│  │  │             │  │             │  │ • trackers  │  │ • progress│  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │   │
│  │         │                │                │               │         │   │
│  │         └────────────────┴────────────────┴───────────────┘         │   │
│  │                                   │                                  │   │
│  │                            React Components                          │   │
│  │                                   │                                  │   │
│  │         ┌─────────────────────────┴─────────────────────────┐       │   │
│  │         │                                                    │       │   │
│  │         ▼                                                    ▼       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │  │   TabBar    │  │ ProxyPanel  │  │PrivacyPanel │  │Automation │  │   │
│  │  │  Component  │  │  Component  │  │  Component  │  │  Panel    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Data Flow:                                                                 │
│  1. User action triggers store method                                       │
│  2. Store calls IPC to main process                                         │
│  3. Main process executes operation                                         │
│  4. Store updates local state                                               │
│  5. React components re-render                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Store Implementations

```typescript
// src/stores/proxyStore.ts

import { create } from "zustand";

export interface Proxy {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: "http" | "https" | "socks4" | "socks5";
  status: "active" | "failed" | "checking" | "disabled";
  latency?: number;
  failureCount: number;
  successRate: number;
}

interface ProxyState {
  proxies: Proxy[];
  rotationStrategy: RotationStrategy;
  isLoading: boolean;
  
  // Actions
  addProxy: (proxy: ProxyInput) => Promise<void>;
  removeProxy: (id: string) => Promise<void>;
  updateProxy: (id: string, updates: Partial<Proxy>) => Promise<void>;
  validateProxy: (id: string) => Promise<void>;
  setRotationStrategy: (strategy: RotationStrategy) => Promise<void>;
  loadProxies: () => Promise<void>;
  getActiveProxies: () => Proxy[];
}

export const useProxyStore = create<ProxyState>((set, get) => ({
  proxies: [],
  rotationStrategy: "round-robin",
  isLoading: false,

  addProxy: async (proxyData) => {
    set({ isLoading: true });
    const result = await window.api.proxy.add(proxyData);
    if (result.success) {
      set((state) => ({
        proxies: [...state.proxies, result.proxy],
        isLoading: false
      }));
    }
  },

  loadProxies: async () => {
    set({ isLoading: true });
    const result = await window.api.proxy.list();
    if (result.success) {
      set({ proxies: result.proxies, isLoading: false });
    }
  },

  getActiveProxies: () => get().proxies.filter(p => p.status === "active")
}));
```

```typescript
// src/stores/tabStore.ts

import { create } from "zustand";

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  
  addTab: (tab: Partial<Tab>) => void;
  removeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  getActiveTab: () => Tab | undefined;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (tabData) => {
    const newTab: Tab = {
      id: crypto.randomUUID(),
      url: tabData.url || "about:blank",
      title: tabData.title || "New Tab",
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      ...tabData
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));

    window.api.tab.create(newTab);
  },

  removeTab: (id) => {
    set((state) => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      const newActiveId = state.activeTabId === id
        ? newTabs[0]?.id || null
        : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActiveId };
    });
    window.api.tab.close(id);
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find(t => t.id === state.activeTabId);
  }
}));
```


---

## 8. Security Architecture

### 8.1 Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SECURITY BOUNDARY 1: OS Level                     │   │
│  │  • Application sandboxing (macOS/Windows)                           │   │
│  │  • File system access restricted to userData                        │   │
│  │  • Network permissions controlled                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                 SECURITY BOUNDARY 2: Process Level                   │   │
│  │                                                                      │   │
│  │   MAIN PROCESS (Privileged)        RENDERER PROCESS (Sandboxed)    │   │
│  │   ┌─────────────────────┐          ┌─────────────────────┐         │   │
│  │   │ • Full Node.js      │          │ • No Node.js access │         │   │
│  │   │ • File system       │◄────────►│ • No file system    │         │   │
│  │   │ • Native modules    │   IPC    │ • CSP enforced      │         │   │
│  │   │ • Encryption keys   │ (validated)│ • sandbox: true    │         │   │
│  │   └─────────────────────┘          └─────────────────────┘         │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                SECURITY BOUNDARY 3: Tab/Session Level                │   │
│  │                                                                      │   │
│  │   Tab 1 (partition:1)    Tab 2 (partition:2)    Tab N (partition:N) │   │
│  │   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐│   │
│  │   │ Isolated cookies │   │ Isolated cookies │   │ Isolated cookies ││   │
│  │   │ Isolated storage │   │ Isolated storage │   │ Isolated storage ││   │
│  │   │ Isolated cache   │   │ Isolated cache   │   │ Isolated cache   ││   │
│  │   │ Unique proxy     │   │ Unique proxy     │   │ Unique proxy     ││   │
│  │   │ Unique fingerprnt│   │ Unique fingerprnt│   │ Unique fingerprnt││   │
│  │   └──────────────────┘   └──────────────────┘   └──────────────────┘│   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Security Controls Matrix

| Control | Implementation | Layer |
|---------|----------------|-------|
| **Process Isolation** | `sandbox: true` in BrowserWindow | Process |
| **Context Isolation** | `contextIsolation: true` | Process |
| **Node Integration Disabled** | `nodeIntegration: false` | Process |
| **WebView Disabled** | `webviewTag: false` | Process |
| **Input Validation** | Zod schemas for all IPC | IPC |
| **Rate Limiting** | Token bucket algorithm | IPC |
| **SSRF Prevention** | Block localhost/private IPs | Network |
| **Credential Encryption** | AES-256-GCM | Data |
| **Session Partitioning** | Unique partition per tab | Tab |
| **WebRTC Protection** | ICE candidate filtering | Privacy |
| **CSP Headers** | Strict content policy | Renderer |

### 8.3 Credential Encryption

```typescript
// electron/database/services/encryption.service.ts

/**
 * Encryption Service
 * AES-256-GCM encryption for sensitive data
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionService {
  private masterKey: Buffer | null = null;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  initialize(masterKey: string | Buffer): void {
    this.masterKey = typeof masterKey === 'string' 
      ? Buffer.from(masterKey, 'hex')
      : masterKey;
    
    if (this.masterKey.length !== 32) {
      throw new Error('Master key must be 32 bytes (256 bits)');
    }
  }

  encrypt(plaintext: string): EncryptedData {
    if (!this.masterKey) throw new Error('Encryption not initialized');
    
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  decrypt(data: EncryptedData): string {
    if (!this.masterKey) throw new Error('Encryption not initialized');
    
    const decipher = createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(data.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'base64'));
    
    let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);  // Secure memory wipe
      this.masterKey = null;
    }
  }
}
```

### 8.4 SSRF Prevention

```typescript
// electron/core/proxy-engine/validator.ts

/**
 * SSRF Prevention
 * Blocks connections to localhost and private IP ranges
 */

export interface SSRFConfig {
  blockLocalhost: boolean;
  blockPrivateRanges: boolean;
  allowedHosts?: string[];
  blockedHosts?: string[];
}

const PRIVATE_IP_RANGES = [
  /^127\./,                    // Loopback
  /^10\./,                     // Class A private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Class B private
  /^192\.168\./,               // Class C private
  /^169\.254\./,               // Link-local
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 unique local
  /^fd00:/i                    // IPv6 unique local
];

export function isPrivateIP(host: string): boolean {
  // Check for localhost
  if (host === 'localhost' || host === '0.0.0.0') {
    return true;
  }
  
  // Check against private IP patterns
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(host)) {
      return true;
    }
  }
  
  return false;
}

export function validateProxyHost(host: string, config: SSRFConfig): void {
  if (config.blockLocalhost && (host === 'localhost' || host === '127.0.0.1')) {
    throw new ProxyValidationError('Localhost proxies are blocked', 'SSRF_LOCALHOST');
  }
  
  if (config.blockPrivateRanges && isPrivateIP(host)) {
    throw new ProxyValidationError('Private IP proxies are blocked', 'SSRF_PRIVATE_IP');
  }
  
  if (config.blockedHosts?.includes(host)) {
    throw new ProxyValidationError('Host is in blocklist', 'SSRF_BLOCKLIST');
  }
}
```

### 8.5 BrowserWindow Security Configuration

```typescript
// Secure BrowserWindow configuration

const mainWindow = new BrowserWindow({
  webPreferences: {
    // Core security settings
    nodeIntegration: false,       // Prevent Node.js access in renderer
    contextIsolation: true,       // Isolate preload from page context
    sandbox: true,                // Enable Chromium sandbox
    webviewTag: false,            // Disable <webview> tag
    
    // Content security
    allowRunningInsecureContent: false,  // Block HTTP content on HTTPS
    experimentalFeatures: false,         // Disable experimental APIs
    
    // Preload script (only way to communicate)
    preload: join(__dirname, '../preload/index.js')
  }
});

// Additional security measures
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  // Validate URL before allowing new windows
  if (isAllowedURL(url)) {
    return { action: 'allow' };
  }
  return { action: 'deny' };
});

// Prevent navigation to dangerous URLs
mainWindow.webContents.on('will-navigate', (event, url) => {
  if (!isAllowedURL(url)) {
    event.preventDefault();
  }
});
```

---

## 9. Design Patterns

### 9.1 Strategy Pattern (Proxy Rotation)

The Strategy pattern enables pluggable proxy rotation algorithms.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STRATEGY PATTERN: PROXY ROTATION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                        ┌──────────────────────┐                             │
│                        │ ProxyRotationStrategy│                             │
│                        │ (Context)            │                             │
│                        ├──────────────────────┤                             │
│                        │ - config             │                             │
│                        │ - strategies[]       │                             │
│                        ├──────────────────────┤                             │
│                        │ + selectProxy()      │                             │
│                        │ + setConfig()        │                             │
│                        └──────────┬───────────┘                             │
│                                   │                                          │
│                    ┌──────────────┴──────────────┐                          │
│                    │                             │                          │
│           ┌────────┴────────┐           ┌───────┴────────┐                 │
│           │ <<interface>>   │           │ <<interface>>  │                 │
│           │ BaseStrategy    │           │ BaseStrategy   │                 │
│           └────────┬────────┘           └───────┬────────┘                 │
│                    │                            │                          │
│    ┌───────────────┼───────────────┐           │                          │
│    │               │               │           │                          │
│ ┌──┴───┐      ┌────┴───┐     ┌────┴────┐  ┌───┴────┐                     │
│ │Round │      │ Random │     │ Fastest │  │Weighted│  ...7 more          │
│ │Robin │      │Strategy│     │ Strategy│  │Strategy│                     │
│ └──────┘      └────────┘     └─────────┘  └────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```typescript
// electron/core/proxy-engine/strategies/base-strategy.ts

export abstract class BaseStrategy {
  protected config: RotationConfig;
  protected usageStats: Map<string, number> = new Map();

  constructor(config: RotationConfig) {
    this.config = config;
  }

  abstract selectProxy(proxies: ProxyConfig[], context?: RotationContext): ProxyConfig | null;

  setConfig(config: RotationConfig): void {
    this.config = config;
  }

  recordUsage(proxyId: string): void {
    this.usageStats.set(proxyId, (this.usageStats.get(proxyId) || 0) + 1);
  }

  getUsageStats(): Map<string, number> {
    return new Map(this.usageStats);
  }
}

// Round Robin Strategy
export class RoundRobinStrategy extends BaseStrategy {
  private currentIndex = 0;

  selectProxy(proxies: ProxyConfig[]): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    const proxy = proxies[this.currentIndex % proxies.length];
    this.currentIndex++;
    this.recordUsage(proxy.id);
    
    return proxy;
  }
}

// Fastest (Latency-Based) Strategy
export class FastestStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[]): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    const sorted = [...proxies].sort((a, b) => 
      (a.latency || Infinity) - (b.latency || Infinity)
    );
    
    const proxy = sorted[0];
    this.recordUsage(proxy.id);
    
    return proxy;
  }
}

// Failure-Aware Strategy
export class FailureAwareStrategy extends BaseStrategy {
  selectProxy(proxies: ProxyConfig[]): ProxyConfig | null {
    if (proxies.length === 0) return null;
    
    // Filter out proxies with high failure rates
    const healthy = proxies.filter(p => 
      p.successRate > 0.5 || p.totalRequests < 10
    );
    
    if (healthy.length === 0) {
      // Fallback to least failed
      return proxies.sort((a, b) => a.failureCount - b.failureCount)[0];
    }
    
    // Random selection from healthy proxies
    const proxy = healthy[Math.floor(Math.random() * healthy.length)];
    this.recordUsage(proxy.id);
    
    return proxy;
  }
}
```

### 9.2 Observer Pattern (Event Emitter)

Used for loose coupling between components.

```typescript
// Event-driven communication between services

export class ProxyManager extends EventEmitter {
  async validateProxy(id: string): Promise<ValidationResult> {
    const proxy = this.proxies.get(id);
    
    this.emit('proxy:validating', { proxyId: id });
    
    try {
      const result = await this.validator.validate(proxy);
      
      if (result.success) {
        this.emit('proxy:validated', { proxyId: id, latency: result.latency });
      } else {
        this.emit('proxy:validation-failed', { proxyId: id, error: result.error });
      }
      
      return result;
    } catch (error) {
      this.emit('proxy:error', { proxyId: id, error });
      throw error;
    }
  }
}

// Subscribing to events
proxyManager.on('proxy:validated', ({ proxyId, latency }) => {
  console.log(`Proxy ${proxyId} validated with ${latency}ms latency`);
  updateUI(proxyId, 'active');
});

proxyManager.on('proxy:validation-failed', ({ proxyId, error }) => {
  console.log(`Proxy ${proxyId} failed: ${error}`);
  updateUI(proxyId, 'failed');
});
```

### 9.3 Factory Pattern (Tab Creation)

```typescript
// electron/core/tabs/manager.ts

export class TabManager extends EventEmitter {
  /**
   * Factory method for creating isolated tabs
   */
  async createTab(config: Partial<TabConfig>): Promise<TabConfig> {
    const id = crypto.randomUUID();
    
    // Create tab configuration
    const tab: TabConfig = {
      id,
      url: config.url || 'about:blank',
      title: config.title || 'New Tab',
      proxyId: config.proxyId,
      fingerprint: config.fingerprint || this.generateDefaultFingerprint(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create isolated BrowserView (product)
    const view = this.createBrowserView(tab);
    
    // Apply configurations
    await this.configureProxy(view, tab.proxyId);
    await this.configureFingerprint(view, tab.fingerprint);
    await this.configureTrackerBlocking(view);
    
    // Store references
    this.tabs.set(id, tab);
    this.views.set(id, view);
    
    return tab;
  }

  private createBrowserView(tab: TabConfig): BrowserView {
    return new BrowserView({
      webPreferences: {
        partition: `persist:tab-${tab.id}`,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });
  }

  private generateDefaultFingerprint(): FingerprintConfig {
    return {
      canvas: true,
      webgl: true,
      audio: true,
      navigator: true,
      timezone: true,
      seed: crypto.randomUUID()
    };
  }
}
```

### 9.4 Circuit Breaker Pattern (Resilience)

```typescript
// electron/core/resilience/circuit-breaker.ts

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by failing fast
 */

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half-open' // Testing recovery
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: Date | null = null;
  
  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {
    super();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should transition
    this.checkStateTransition();
    
    // Fail fast if circuit is open
    if (this.state === CircuitState.OPEN) {
      throw new CircuitOpenError(this.name);
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.successCount = 0;
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private checkStateTransition(): void {
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const elapsed = Date.now() - this.lastFailureTime.getTime();
      if (elapsed >= this.options.resetTimeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.emit('state-change', { from: oldState, to: newState });
  }
}
```

### 9.5 Repository Pattern (Data Access)

```typescript
// electron/database/repositories/base.repository.ts

/**
 * Base Repository Pattern
 * Abstracts data access from business logic
 */

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected db: Database.Database;
  protected tableName: string;

  constructor(db: Database.Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  abstract create(input: CreateInput): T;
  abstract findById(id: string): T | undefined;
  abstract findAll(): T[];
  abstract update(id: string, input: UpdateInput): void;
  abstract delete(id: string): void;

  protected generateId(): string {
    return crypto.randomUUID();
  }

  protected now(): string {
    return new Date().toISOString();
  }
}

// Concrete implementation
export class ProxyRepository extends BaseRepository<ProxyRow, ProxyCreateInput, ProxyUpdateInput> {
  private statements: {
    insert: Statement;
    findById: Statement;
    findAll: Statement;
    update: Statement;
    delete: Statement;
  };

  constructor(db: Database.Database) {
    super(db, 'proxies');
    this.prepareStatements();
  }

  create(input: ProxyCreateInput): ProxyRow {
    const id = this.generateId();
    const now = this.now();
    
    this.statements.insert.run(
      id, input.name, input.host, input.port,
      input.protocol, input.username, input.password,
      'checking', input.region, JSON.stringify(input.tags || []),
      now, now
    );
    
    return this.findById(id)!;
  }

  findById(id: string): ProxyRow | undefined {
    return this.statements.findById.get(id) as ProxyRow | undefined;
  }

  findAll(): ProxyRow[] {
    return this.statements.findAll.all() as ProxyRow[];
  }
}
```

---

## 10. Scalability Architecture

### 10.1 Scalability for 50 Concurrent Tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SCALABILITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RESOURCE MANAGEMENT FOR 50 CONCURRENT TABS                                  │
│  ═══════════════════════════════════════════                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        TAB POOL MANAGER                              │   │
│  │                                                                      │   │
│  │  Configuration:                                                      │   │
│  │  • maxConcurrentTabs: 50                                            │   │
│  │  • memoryThresholdPerTab: 200MB                                     │   │
│  │  • idleTimeout: 300000ms (5 min)                                    │   │
│  │  • preCreatedPoolSize: 5                                            │   │
│  │                                                                      │   │
│  │  ┌──────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Tab Lifecycle States                       │  │   │
│  │  │                                                               │  │   │
│  │  │  CREATED ──► LOADING ──► ACTIVE ──► IDLE ──► SUSPENDED       │  │   │
│  │  │     │                        │         │          │          │  │   │
│  │  │     └────────────────────────┴─────────┴──────────┴──► CLOSED│  │   │
│  │  └──────────────────────────────────────────────────────────────┘  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  MEMORY MANAGEMENT                                                          │
│  ─────────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Total Budget: ~10GB for 50 tabs                                    │   │
│  │                                                                      │   │
│  │  Per-Tab Allocation:                                                │   │
│  │  • Base memory: ~50MB (empty tab)                                   │   │
│  │  • Average loaded: ~150MB                                           │   │
│  │  • Heavy pages: ~300MB                                              │   │
│  │  • Threshold warning: 200MB                                         │   │
│  │                                                                      │   │
│  │  Strategies:                                                        │   │
│  │  • Tab suspension after 5 min idle                                  │   │
│  │  • Automatic garbage collection triggers                            │   │
│  │  • Memory pressure detection and throttling                         │   │
│  │  • Tab recycling for automation                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  PERFORMANCE OPTIMIZATIONS                                                  │
│  ─────────────────────────────                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  1. Pre-created Tab Pool                                            │   │
│  │     • 5 tabs pre-initialized for instant creation                   │   │
│  │     • Reduces tab creation from 500ms to <50ms                      │   │
│  │                                                                      │   │
│  │  2. Lazy Loading                                                    │   │
│  │     • BrowserViews created on-demand                                │   │
│  │     • Protection scripts injected only when needed                  │   │
│  │                                                                      │   │
│  │  3. Session Partitioning                                            │   │
│  │     • Separate cache per partition                                  │   │
│  │     • No cross-tab resource sharing                                 │   │
│  │                                                                      │   │
│  │  4. Database Optimization                                           │   │
│  │     • WAL mode for concurrent reads                                 │   │
│  │     • Prepared statements cached                                    │   │
│  │     • Batch operations for bulk inserts                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Tab Pool Implementation

```typescript
// electron/core/tabs/pool.ts

export class TabPool {
  private readonly maxTabs = 50;
  private readonly preCreatedSize = 5;
  private readonly idleTimeout = 300000; // 5 minutes
  private readonly memoryThreshold = 200 * 1024 * 1024; // 200MB

  private pool: Map<string, PooledTab> = new Map();
  private preCreated: BrowserView[] = [];
  private memoryMonitor: NodeJS.Timer | null = null;

  constructor() {
    this.initializePreCreatedPool();
    this.startMemoryMonitoring();
  }

  private initializePreCreatedPool(): void {
    for (let i = 0; i < this.preCreatedSize; i++) {
      const view = this.createBrowserView();
      this.preCreated.push(view);
    }
  }

  async acquireTab(): Promise<BrowserView> {
    // Check capacity
    if (this.pool.size >= this.maxTabs) {
      // Try to reclaim idle tabs
      const reclaimed = this.reclaimIdleTabs();
      if (!reclaimed) {
        throw new Error('Maximum tab limit reached (50)');
      }
    }

    // Use pre-created tab if available
    if (this.preCreated.length > 0) {
      const view = this.preCreated.pop()!;
      this.replenishPool();
      return view;
    }

    // Create new tab
    return this.createBrowserView();
  }

  releaseTab(id: string): void {
    const pooledTab = this.pool.get(id);
    if (pooledTab) {
      pooledTab.view.webContents.close();
      this.pool.delete(id);
    }
  }

  private reclaimIdleTabs(): boolean {
    const now = Date.now();
    for (const [id, tab] of this.pool) {
      if (now - tab.lastActiveAt > this.idleTimeout) {
        this.releaseTab(id);
        return true;
      }
    }
    return false;
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitor = setInterval(() => {
      for (const [id, tab] of this.pool) {
        const usage = process.memoryUsage().heapUsed;
        if (usage > this.memoryThreshold) {
          this.emit('memory-warning', { tabId: id, usage });
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private replenishPool(): void {
    setImmediate(() => {
      if (this.preCreated.length < this.preCreatedSize) {
        const view = this.createBrowserView();
        this.preCreated.push(view);
      }
    });
  }

  destroy(): void {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    for (const [id] of this.pool) {
      this.releaseTab(id);
    }
    for (const view of this.preCreated) {
      view.webContents.close();
    }
  }
}
```

### 10.3 Resource Throttling

```typescript
// electron/core/automation/executor.ts

export class AutomationExecutor {
  private readonly cpuThreshold = 0.8;  // 80%
  private readonly memoryThreshold = 0.8; // 80%
  
  private currentConcurrency: number;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 50) {
    this.maxConcurrency = maxConcurrency;
    this.currentConcurrency = maxConcurrency;
  }

  async executeWithThrottling<T>(
    tasks: (() => Promise<T>)[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const queue = [...tasks];
    let completed = 0;

    const executeTask = async (): Promise<void> => {
      while (queue.length > 0) {
        // Check resource usage
        await this.throttleIfNeeded();
        
        const task = queue.shift();
        if (task) {
          try {
            const result = await task();
            results.push(result);
          } catch (error) {
            console.error('Task failed:', error);
          }
          completed++;
          onProgress?.(completed, tasks.length);
        }
      }
    };

    // Start workers up to current concurrency limit
    const workers = Array(this.currentConcurrency)
      .fill(null)
      .map(() => executeTask());

    await Promise.all(workers);
    return results;
  }

  private async throttleIfNeeded(): Promise<void> {
    const metrics = await this.getSystemMetrics();
    
    if (metrics.cpu > this.cpuThreshold || metrics.memory > this.memoryThreshold) {
      // Reduce concurrency
      this.currentConcurrency = Math.max(1, Math.floor(this.currentConcurrency / 2));
      
      // Add delay
      await this.delay(1000);
    } else if (this.currentConcurrency < this.maxConcurrency) {
      // Gradually increase concurrency
      this.currentConcurrency = Math.min(
        this.maxConcurrency,
        this.currentConcurrency + 1
      );
    }
  }

  private async getSystemMetrics(): Promise<{ cpu: number; memory: number }> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    
    return {
      cpu: process.cpuUsage().user / 1000000, // Simplified
      memory: memUsage.heapUsed / totalMem
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 11. Component Diagrams

### 11.1 Module Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODULE DEPENDENCIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  electron/                                                                   │
│  ├── main/                                                                  │
│  │   ├── index.ts ──────────────────┐                                       │
│  │   ├── config-manager.ts          │                                       │
│  │   └── preload.ts                 │                                       │
│  │                                  ▼                                       │
│  ├── core/                    ┌─────────────┐                               │
│  │   ├── proxy-engine/ ◄──────┤  Services   │                               │
│  │   │   ├── manager.ts       │  Init Flow  │                               │
│  │   │   ├── rotation.ts      └─────────────┘                               │
│  │   │   ├── validator.ts           │                                       │
│  │   │   └── strategies/            │                                       │
│  │   │       ├── round-robin.ts     │                                       │
│  │   │       ├── random.ts          │                                       │
│  │   │       └── ... (10 total)     │                                       │
│  │   │                              │                                       │
│  │   ├── privacy/ ◄─────────────────┤                                       │
│  │   │   ├── manager.ts             │                                       │
│  │   │   ├── webrtc.ts              │                                       │
│  │   │   ├── tracker-blocker.ts     │                                       │
│  │   │   └── fingerprint/           │                                       │
│  │   │       ├── canvas.ts          │                                       │
│  │   │       ├── webgl.ts           │                                       │
│  │   │       └── ...                │                                       │
│  │   │                              │                                       │
│  │   ├── tabs/ ◄────────────────────┤                                       │
│  │   │   ├── manager.ts             │                                       │
│  │   │   └── pool.ts                │                                       │
│  │   │                              │                                       │
│  │   ├── automation/ ◄──────────────┤                                       │
│  │   │   ├── manager.ts             │                                       │
│  │   │   ├── search-engine.ts       │                                       │
│  │   │   ├── domain-targeting.ts    │                                       │
│  │   │   ├── scheduler.ts           │                                       │
│  │   │   └── executor.ts            │                                       │
│  │   │                              │                                       │
│  │   └── resilience/ ◄──────────────┘                                       │
│  │       ├── circuit-breaker.ts                                             │
│  │       └── circuit-breaker-registry.ts                                    │
│  │                                                                          │
│  ├── ipc/                                                                   │
│  │   ├── channels.ts                                                        │
│  │   ├── validation.ts                                                      │
│  │   └── handlers/                                                          │
│  │       ├── proxy.ts                                                       │
│  │       ├── privacy.ts                                                     │
│  │       ├── tabs.ts                                                        │
│  │       └── automation.ts                                                  │
│  │                                                                          │
│  └── database/                                                              │
│      ├── index.ts                                                           │
│      ├── migrations/                                                        │
│      ├── repositories/                                                      │
│      └── services/                                                          │
│          └── encryption.service.ts                                          │
│                                                                              │
│  src/                                                                       │
│  ├── App.tsx                                                                │
│  ├── components/                                                            │
│  │   ├── browser/                                                           │
│  │   ├── panels/                                                            │
│  │   └── ui/                                                                │
│  └── stores/                                                                │
│      ├── tabStore.ts                                                        │
│      ├── proxyStore.ts                                                      │
│      ├── privacyStore.ts                                                    │
│      └── automationStore.ts                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Data Flow Through Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW DIAGRAM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  USER ACTION: Add Proxy                                                      │
│  ══════════════════════                                                      │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │   UI     │    │  Store   │    │   IPC    │    │  Main    │              │
│  │Component │    │(Zustand) │    │ Channel  │    │ Process  │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │               │                     │
│       │ onClick()     │               │               │                     │
│       │──────────────►│               │               │                     │
│       │               │               │               │                     │
│       │               │ addProxy()    │               │                     │
│       │               │──────────────►│               │                     │
│       │               │               │               │                     │
│       │               │               │ invoke()      │                     │
│       │               │               │──────────────►│                     │
│       │               │               │               │                     │
│       │               │               │               │ ┌────────────────┐  │
│       │               │               │               │ │ ProxyManager   │  │
│       │               │               │               │ │ • Validate     │  │
│       │               │               │               │ │ • Encrypt creds│  │
│       │               │               │               │ │ • Store in DB  │  │
│       │               │               │               │ └────────────────┘  │
│       │               │               │               │                     │
│       │               │               │ result        │                     │
│       │               │               │◄──────────────│                     │
│       │               │               │               │                     │
│       │               │ setState()    │               │                     │
│       │               │◄──────────────│               │                     │
│       │               │               │               │                     │
│       │ re-render     │               │               │                     │
│       │◄──────────────│               │               │                     │
│       │               │               │               │                     │
│       ▼               ▼               ▼               ▼                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Data Flow Diagrams

### 12.1 Search Automation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SEARCH AUTOMATION DATA FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         AUTOMATION PIPELINE                         │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  1. CONFIGURATION                                                           │
│     ┌─────────┐     ┌─────────┐     ┌─────────┐                            │
│     │Keywords │────►│ Target  │────►│Schedule │                            │
│     │ Queue   │     │ Domains │     │ Config  │                            │
│     └─────────┘     └─────────┘     └─────────┘                            │
│          │               │               │                                  │
│          └───────────────┴───────────────┘                                  │
│                          │                                                  │
│                          ▼                                                  │
│  2. EXECUTION      ┌─────────────┐                                         │
│                    │  Scheduler  │                                         │
│                    │  (Trigger)  │                                         │
│                    └──────┬──────┘                                         │
│                           │                                                 │
│                           ▼                                                 │
│  3. TAB SETUP      ┌─────────────┐     ┌─────────────┐                     │
│                    │ TabManager  │────►│ProxyManager │                     │
│                    │ createTab() │     │selectProxy()│                     │
│                    └──────┬──────┘     └─────────────┘                     │
│                           │                                                 │
│                           ▼                                                 │
│  4. PRIVACY        ┌─────────────┐                                         │
│                    │PrivacyMgr   │                                         │
│                    │ inject()    │                                         │
│                    └──────┬──────┘                                         │
│                           │                                                 │
│                           ▼                                                 │
│  5. SEARCH         ┌─────────────┐     ┌─────────────┐                     │
│                    │SearchEngine │────►│  Behavior   │                     │
│                    │ navigate()  │     │ Simulator   │                     │
│                    │ type()      │     │ (delays,    │                     │
│                    │ submit()    │     │  scrolling) │                     │
│                    └──────┬──────┘     └─────────────┘                     │
│                           │                                                 │
│                           ▼                                                 │
│  6. EXTRACTION     ┌─────────────┐                                         │
│                    │  Result     │                                         │
│                    │ Extractor   │                                         │
│                    │ • position  │                                         │
│                    │ • title     │                                         │
│                    │ • url       │                                         │
│                    └──────┬──────┘                                         │
│                           │                                                 │
│                           ▼                                                 │
│  7. TARGETING      ┌─────────────┐     ┌─────────────┐                     │
│                    │  Domain     │────►│   Click     │                     │
│                    │  Matcher    │     │ Simulator   │                     │
│                    └──────┬──────┘     └──────┬──────┘                     │
│                           │                   │                             │
│                           ▼                   ▼                             │
│  8. INTERACTION    ┌─────────────┐     ┌─────────────┐                     │
│                    │   Page      │     │   Dwell     │                     │
│                    │Interaction  │     │   Timer     │                     │
│                    │ (scroll,    │     │ (10-300s)   │                     │
│                    │  navigate)  │     │             │                     │
│                    └──────┬──────┘     └──────┬──────┘                     │
│                           │                   │                             │
│                           └─────────┬─────────┘                             │
│                                     │                                       │
│                                     ▼                                       │
│  9. LOGGING        ┌─────────────────────────────┐                         │
│                    │        Activity Log          │                         │
│                    │  • Task result               │                         │
│                    │  • Position found            │                         │
│                    │  • Duration                  │                         │
│                    │  • Proxy used                │                         │
│                    └──────────────────────────────┘                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Privacy Protection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRIVACY PROTECTION DATA FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TAB CREATION                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────┐                                                        │
│  │  Generate Seed  │  (crypto.randomUUID per tab)                          │
│  └────────┬────────┘                                                        │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                  FINGERPRINT GENERATION                          │       │
│  │                                                                  │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │       │
│  │  │  Canvas  │  │  WebGL   │  │  Audio   │  │Navigator │       │       │
│  │  │ Spoofer  │  │ Spoofer  │  │ Spoofer  │  │ Spoofer  │       │       │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │       │
│  │       │             │             │             │              │       │
│  │       └─────────────┴─────────────┴─────────────┘              │       │
│  │                           │                                    │       │
│  │                           ▼                                    │       │
│  │                  ┌─────────────────┐                          │       │
│  │                  │ Combined Script │                          │       │
│  │                  │ (deterministic  │                          │       │
│  │                  │  based on seed) │                          │       │
│  │                  └─────────────────┘                          │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              WEBRTC PROTECTION                                   │       │
│  │                                                                  │       │
│  │  Policy: disable_non_proxied                                    │       │
│  │                                                                  │       │
│  │  ┌──────────────────────────────────────────────────────────┐  │       │
│  │  │  ICE Candidate Filtering                                  │  │       │
│  │  │  • Block local IP candidates                             │  │       │
│  │  │  • Block mDNS candidates                                 │  │       │
│  │  │  • Allow only relay candidates (through proxy)           │  │       │
│  │  └──────────────────────────────────────────────────────────┘  │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              TRACKER BLOCKING                                    │       │
│  │                                                                  │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐               │       │
│  │  │    Ads     │  │ Analytics  │  │   Social   │               │       │
│  │  │  (50K+)    │  │  (20K+)    │  │   (5K+)    │               │       │
│  │  └────────────┘  └────────────┘  └────────────┘               │       │
│  │                                                                  │       │
│  │  Request Interception via webRequest.onBeforeRequest            │       │
│  │  Bloom filter for fast lookup (<1ms)                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                           │                                                 │
│                           ▼                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │              SCRIPT INJECTION                                    │       │
│  │                                                                  │       │
│  │  webContents.executeJavaScript(protectionScript, true)          │       │
│  │  Executed before page load (preload)                            │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. TypeScript Interfaces

### 13.1 Core Domain Interfaces

```typescript
// electron/core/proxy-engine/types.ts

/**
 * Proxy Configuration Interface
 */
export interface ProxyConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  encryptedCredentials?: EncryptedCredential;
  requiresAuth: boolean;
  status: ProxyStatus;
  latency?: number;
  lastChecked?: Date;
  failureCount: number;
  totalRequests: number;
  successRate: number;
  region?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProxyStatus = 'active' | 'failed' | 'checking' | 'disabled';
export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

/**
 * Proxy Input for creation (credentials unencrypted)
 */
export interface ProxyInput {
  name: string;
  host: string;
  port: number;
  protocol: ProxyProtocol;
  username?: string;
  password?: string;
  region?: string;
  tags?: string[];
}

/**
 * Rotation Configuration
 */
export interface RotationConfig {
  strategy: RotationStrategy;
  interval?: number;           // For time-based rotation
  rules?: ProxyRule[];         // For custom rules
  stickySessionTTL?: number;   // For sticky sessions
  preferredRegions?: string[]; // For geographic rotation
  weights?: Record<string, number>; // For weighted rotation
}

export type RotationStrategy =
  | 'round-robin'
  | 'random'
  | 'least-used'
  | 'fastest'
  | 'failure-aware'
  | 'weighted'
  | 'geographic'
  | 'sticky-session'
  | 'time-based'
  | 'custom';

/**
 * Rotation Context (passed to strategies)
 */
export interface RotationContext {
  domain?: string;
  tabId?: string;
  previousProxyId?: string;
  requestType?: string;
}
```

### 13.2 Tab Management Interfaces

```typescript
// electron/core/tabs/types.ts

/**
 * Tab Configuration
 */
export interface TabConfig {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  fingerprint?: FingerprintConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fingerprint Configuration
 */
export interface FingerprintConfig {
  canvas: boolean;
  webgl: boolean;
  audio: boolean;
  navigator: boolean;
  timezone: boolean;
  language?: string;
  seed?: string;  // Deterministic fingerprint generation
}

/**
 * Tab State (for renderer)
 */
export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  proxyId?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  createdAt: Date;
}
```

### 13.3 Automation Interfaces

```typescript
// electron/core/automation/types.ts

/**
 * Search Configuration
 */
export interface SearchConfig {
  keywords: string[];
  engine: SearchEngine;
  maxConcurrentTabs: number;
  targetDomains?: string[];
  options?: SearchOptions;
}

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';

export interface SearchOptions {
  dwellTime: number;           // Seconds on target page
  clickTargets: boolean;       // Click matching domains
  extractResults: boolean;     // Extract SERP data
  humanLikeDelays: boolean;    // Random delays
  scrollBehavior: 'none' | 'natural' | 'full';
}

/**
 * Search Task
 */
export interface SearchTask {
  id: string;
  sessionId: string;
  keyword: string;
  engine: SearchEngine;
  status: TaskStatus;
  proxyId?: string;
  tabId?: string;
  position?: number;           // Target domain position in SERP
  results: SearchResult[];
  error?: string;
  retryCount: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  createdAt: Date;
}

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Search Result
 */
export interface SearchResult {
  position: number;
  title: string;
  url: string;
  description: string;
  isTargetDomain: boolean;
}

/**
 * Schedule Configuration
 */
export interface ScheduleConfig {
  type: ScheduleType;
  startTime?: Date;
  endTime?: Date;
  interval?: number;           // Minutes for continuous
  daysOfWeek?: number[];       // 0-6 for recurring
  cronExpression?: string;     // For custom
  task: SearchConfig;
}

export type ScheduleType = 'one-time' | 'recurring' | 'continuous' | 'custom';

/**
 * Automation Progress
 */
export interface AutomationProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  activeTabs: number;
  startTime: Date;
  estimatedCompletion?: Date;
}
```

### 13.4 IPC Interfaces

```typescript
// electron/types/ipc.ts

/**
 * IPC Request/Response Types
 */

// Proxy API
export interface AddProxyRequest extends ProxyInput {}
export interface AddProxyResponse {
  success: boolean;
  proxy?: SafeProxyConfig;
  error?: string;
}

export interface ListProxiesResponse {
  success: boolean;
  proxies?: SafeProxyConfig[];
  error?: string;
}

export interface ValidateProxyResponse {
  success: boolean;
  result?: {
    status: ProxyStatus;
    latency?: number;
    error?: string;
  };
  error?: string;
}

// Tab API
export interface CreateTabRequest {
  url?: string;
  proxyId?: string;
  fingerprint?: FingerprintConfig;
}

export interface CreateTabResponse {
  success: boolean;
  tab?: Tab;
  error?: string;
}

// Automation API
export interface StartSearchRequest extends SearchConfig {}
export interface StartSearchResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface GetStatusResponse {
  success: boolean;
  status?: AutomationProgress;
  error?: string;
}

/**
 * Window API Declaration (for renderer)
 */
declare global {
  interface Window {
    api: {
      proxy: {
        add: (data: AddProxyRequest) => Promise<AddProxyResponse>;
        remove: (id: string) => Promise<{ success: boolean }>;
        update: (id: string, data: Partial<ProxyInput>) => Promise<AddProxyResponse>;
        list: () => Promise<ListProxiesResponse>;
        validate: (id: string) => Promise<ValidateProxyResponse>;
        setRotation: (config: RotationConfig) => Promise<{ success: boolean }>;
      };
      tab: {
        create: (config: CreateTabRequest) => Promise<CreateTabResponse>;
        close: (id: string) => Promise<{ success: boolean }>;
        update: (id: string, updates: Partial<Tab>) => Promise<{ success: boolean }>;
        list: () => Promise<{ tabs: Tab[] }>;
        navigate: (id: string, url: string) => Promise<{ success: boolean }>;
      };
      privacy: {
        setFingerprint: (config: FingerprintConfig) => Promise<{ success: boolean }>;
        toggleWebRTC: (enabled: boolean) => Promise<{ success: boolean }>;
        toggleTrackerBlocking: (enabled: boolean) => Promise<{ success: boolean }>;
      };
      automation: {
        startSearch: (config: StartSearchRequest) => Promise<StartSearchResponse>;
        stopSearch: (sessionId: string) => Promise<{ success: boolean }>;
        addKeyword: (keyword: string) => Promise<{ success: boolean }>;
        addDomain: (domain: string) => Promise<{ success: boolean }>;
        getTasks: () => Promise<{ tasks: SearchTask[] }>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => void;
      off: (channel: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
```

---

## 14. Implementation Guidelines

### 14.1 Code Organization Standards

```
✅ DO:
• Keep files small and focused (<300 lines)
• One class/component per file
• Group related functionality in directories
• Use barrel exports (index.ts) for public APIs
• Place types adjacent to implementation

❌ DON'T:
• Create "god" files with multiple responsibilities
• Mix business logic with UI components
• Put database queries in service layer directly
• Export internal implementation details
```

### 14.2 Security Checklist

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **IPC** | Validate all inputs | Zod schemas |
| **IPC** | Whitelist channels | Static channel list |
| **Process** | Enable sandbox | `sandbox: true` |
| **Process** | Disable node integration | `nodeIntegration: false` |
| **Data** | Encrypt credentials | AES-256-GCM |
| **Data** | Secure key storage | OS keychain |
| **Network** | SSRF prevention | Block private IPs |
| **Network** | TLS validation | Reject invalid certs |

### 14.3 Performance Guidelines

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| App Launch | <3s | Lazy load modules |
| Tab Creation | <500ms | Pre-created pool |
| UI Response | <100ms | Debounce, virtualization |
| Memory/Tab | <200MB | Monitor and warn |
| DB Query | <10ms | Prepared statements, indexes |

### 14.4 Testing Requirements

```typescript
// Unit Test Example
describe('ProxyManager', () => {
  it('should encrypt credentials on add', async () => {
    const manager = new ProxyManager({ masterKey: testKey });
    
    const result = await manager.addProxy({
      name: 'Test',
      host: '192.168.1.1',
      port: 8080,
      protocol: 'http',
      username: 'user',
      password: 'pass'
    });
    
    expect(result.hasCredentials).toBe(true);
    expect(result.username).toBeUndefined(); // Not exposed
    expect(result.password).toBeUndefined(); // Not exposed
  });

  it('should block localhost for SSRF prevention', async () => {
    const manager = new ProxyManager({ 
      masterKey: testKey,
      ssrfConfig: { blockLocalhost: true, blockPrivateRanges: true }
    });
    
    await expect(manager.addProxy({
      name: 'Local',
      host: 'localhost',
      port: 8080,
      protocol: 'http'
    })).rejects.toThrow('SSRF_LOCALHOST');
  });
});
```

### 14.5 Error Handling Standards

```typescript
// Custom Error Classes
export class ProxyValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ProxyValidationError';
  }
}

// Error Handling Pattern
async function handleOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`[${context}] Operation failed:`, error);
    
    if (error instanceof ProxyValidationError) {
      return { success: false, error: `${error.code}: ${error.message}` };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
}
```

---

## Appendix A: Quick Reference

### A.1 IPC Channel Quick Reference

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `proxy:add` | R→M | Add new proxy |
| `proxy:list` | R→M | Get all proxies |
| `proxy:validate` | R→M | Validate proxy |
| `tab:create` | R→M | Create new tab |
| `tab:navigate` | R→M | Navigate tab |
| `privacy:toggle-webrtc` | R→M | Toggle WebRTC |
| `automation:start-search` | R→M | Start automation |
| `event:tab-update` | M→R | Tab state change |
| `event:automation-progress` | M→R | Progress update |

### A.2 Database Table Quick Reference

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `proxies` | Proxy storage | id, host, port, status |
| `search_tasks` | Task tracking | keyword, status, position |
| `target_domains` | SEO domains | domain, priority |
| `creators` | Creator support | url, platform |
| `activity_logs` | Logging | level, category, message |
| `sessions` | Browser sessions | tabs (JSON) |
| `schedules` | Automation schedules | type, cron_expression |

### A.3 Rotation Strategy Quick Reference

| Strategy | Best For | Parameters |
|----------|----------|------------|
| Round Robin | Even distribution | None |
| Random | Unpredictability | None |
| Fastest | Speed optimization | None |
| Failure-Aware | Reliability | threshold |
| Weighted | Priority-based | weights |
| Geographic | Location targeting | regions |
| Sticky Session | Session consistency | TTL |
| Time-Based | Regular rotation | interval |

---

**Document End**

*Last Updated: 2025-01-27*
*Version: 2.0.0*
