# Virtual IP Browser - Architecture Documentation

**Last Updated:** 2025-02-01  
**Version:** 1.3.0

## Table of Contents

1. [Overview](#overview)
2. [Process Architecture](#process-architecture)
3. [Core Modules](#core-modules)
4. [IPC Layer](#ipc-layer)
5. [Security Architecture](#security-architecture)
6. [Database Architecture](#database-architecture)
7. [Error Handling](#error-handling)

---

## Overview

Virtual IP Browser is built on Electron with a security-first architecture. The application separates concerns between the main process (Node.js) and renderer process (React), communicating through a validated IPC layer.

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Desktop Framework | Electron | 34.5.8 |
| Frontend | React | 19.2.3 |
| Language | TypeScript | 5.9.3 |
| Build Tool | electron-vite | 2.3.0 |
| State Management | Zustand | 5.0.10 |
| CSS | TailwindCSS | 3.4.19 |
| Database | better-sqlite3 | 11.10.0 |
| Testing (Unit) | Vitest | 2.1.9 |
| Testing (E2E) | Playwright | 1.57.0 |

---

## Process Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN PROCESS                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Initialization                               │    │
│  │  1. ConfigManager.initialize() → Master key setup                   │    │
│  │  2. EncryptionService.initialize(masterKey)                         │    │
│  │  3. DatabaseManager.initialize() → Migrations                       │    │
│  │  4. Core Managers (Proxy, Privacy, Tab, Automation)                 │    │
│  │  5. setupIpcHandlers() → Register validated handlers                │    │
│  │  6. setupSecurityHeaders() → CSP, HSTS via webRequest               │    │
│  │  7. createWindow() → BrowserWindow with security options            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Core Services                                │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │    │
│  │  │ ProxyManager │ │PrivacyManager│ │  TabManager  │                 │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │    │
│  │  │ Automation   │ │  Session     │ │ CircuitBreaker│                │    │
│  │  │ Manager      │ │  Manager     │ │ Registry      │                │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Security Layer                                  │    │
│  │  • CSP Headers (webRequest.onHeadersReceived)                       │    │
│  │  • HSTS (max-age=31536000; includeSubDomains)                       │    │
│  │  • X-Frame-Options: DENY                                            │    │
│  │  • X-Content-Type-Options: nosniff                                  │    │
│  │  • Referrer-Policy: strict-origin-when-cross-origin                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                              ↕ IPC Bridge (contextBridge)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RENDERER PROCESS                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  React Application (src/)                                           │    │
│  │  • Components: Browser, Dashboard, Panels, Magic UI                 │    │
│  │  • Stores: proxyStore, privacyStore, automationStore, animationStore│    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BrowserWindow Security Configuration

```typescript
// electron/main/index.ts
mainWindow = new BrowserWindow({
  webPreferences: {
    preload: join(__dirname, '../preload/index.js'),
    nodeIntegration: false,      // Prevent Node.js in renderer
    contextIsolation: true,      // Isolate preload context
    sandbox: true,               // Enable process sandbox
    webviewTag: false,           // Disable webview tag
    allowRunningInsecureContent: false,  // Block mixed content
    experimentalFeatures: false  // Disable experimental APIs
  }
});
```

---

## Core Modules

### Proxy Engine (`electron/core/proxy-engine/`)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ProxyManager                              │
├─────────────────────────────────────────────────────────────────┤
│  Responsibilities:                                               │
│  • CRUD operations for proxies                                  │
│  • Rotation strategy management                                 │
│  • Health validation and monitoring                             │
│  • Credential encryption/decryption                             │
├─────────────────────────────────────────────────────────────────┤
│  Key Methods:                                                    │
│  • addProxy(config) → Proxy                                     │
│  • removeProxy(id) → boolean                                    │
│  • validateProxy(id) → ValidationResult                         │
│  • getNextProxy() → Proxy (via rotation strategy)               │
│  • setRotationStrategy(config) → void                           │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rotation Strategies                           │
├─────────────────────────────────────────────────────────────────┤
│  11 Strategies in electron/core/proxy-engine/strategies/:       │
│  • RoundRobinStrategy    • RandomStrategy                       │
│  • WeightedStrategy      • FastestStrategy                      │
│  • LeastUsedStrategy     • GeographicStrategy                   │
│  • StickySessionStrategy • FailoverStrategy                     │
│  • TimeBasedStrategy     • FailureAwareStrategy                 │
│  • CustomRulesStrategy                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Privacy Suite (`electron/core/privacy/`)

```
┌─────────────────────────────────────────────────────────────────┐
│                       PrivacyManager                             │
├─────────────────────────────────────────────────────────────────┤
│  • Coordinates all privacy protections                          │
│  • Applies settings to BrowserViews                             │
│  • Tracks blocking statistics                                   │
└─────────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────────┬────────────────┐
    ▼           ▼             ▼                ▼
┌────────┐ ┌────────┐ ┌─────────────┐ ┌──────────────┐
│ WebRTC │ │Tracker │ │ Fingerprint │ │   Pattern    │
│  Guard │ │Blocker │ │  Spoofers   │ │   Matcher    │
└────────┘ └────────┘ └─────────────┘ └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
        ┌────────┐    ┌────────┐    ┌────────────┐
        │ Canvas │    │ WebGL  │    │  Audio     │
        └────────┘    └────────┘    └────────────┘
        ┌────────┐    ┌────────┐    ┌────────────┐
        │Navigator│   │Timezone│    │   Fonts    │
        └────────┘    └────────┘    └────────────┘
```

### Automation Engine (`electron/core/automation/`)

```
┌─────────────────────────────────────────────────────────────────┐
│                     AutomationManager                            │
├─────────────────────────────────────────────────────────────────┤
│  Orchestrates all automation workflows                          │
│  • Search automation                                            │
│  • Domain targeting                                             │
│  • Creator support                                              │
│  • Scheduling                                                   │
└─────────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────────┬────────────────┐
    ▼           ▼             ▼                ▼
┌────────┐ ┌────────┐ ┌─────────────┐ ┌──────────────┐
│Scheduler│ │Executor│ │SearchEngine │ │DomainTargeting│
└────────┘ └────────┘ └─────────────┘ └──────────────┘
    │           │             │                │
    │           └─────────────┴────────────────┘
    │                         │
    ▼                         ▼
┌────────────────┐    ┌───────────────────┐
│  CronParser    │    │ SelfHealingEngine │
│  (Scheduling)  │    │ (Error Recovery)  │
└────────────────┘    └───────────────────┘
                              │
                              ▼
                      ┌───────────────┐
                      │CircuitBreaker │
                      │  Registry     │
                      └───────────────┘
```

---

## IPC Layer

The IPC layer provides secure communication between main and renderer processes with comprehensive validation, rate limiting, and error handling.

### IPC Channel Structure

```typescript
// electron/ipc/channels.ts
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
  TAB_ASSIGN_PROXY: 'tab:assign-proxy',
  
  // Privacy & Fingerprint
  PRIVACY_SET_FINGERPRINT: 'privacy:set-fingerprint',
  PRIVACY_TOGGLE_WEBRTC: 'privacy:toggle-webrtc',
  PRIVACY_TOGGLE_TRACKER_BLOCKING: 'privacy:toggle-tracker-blocking',
  PRIVACY_GET_STATS: 'privacy:get-stats',
  
  // Automation
  AUTOMATION_START_SEARCH: 'automation:start-search',
  AUTOMATION_STOP_SEARCH: 'automation:stop-search',
  AUTOMATION_ADD_KEYWORD: 'automation:add-keyword',
  AUTOMATION_ADD_DOMAIN: 'automation:add-domain',
  AUTOMATION_GET_TASKS: 'automation:get-tasks',
  AUTOMATION_SCHEDULE: 'automation:schedule',
  AUTOMATION_PAUSE: 'automation:pause',
  AUTOMATION_RESUME: 'automation:resume',
  
  // Session Management
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_LIST: 'session:list',
  
  // Events (Main → Renderer)
  EVENT_PROXY_STATUS_CHANGE: 'event:proxy-status-change',
  EVENT_TAB_UPDATE: 'event:tab-update',
  EVENT_AUTOMATION_PROGRESS: 'event:automation-progress',
  EVENT_LOG: 'event:log'
};
```

### IPC Handler Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      IPC Handler Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Renderer Request                                                │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │  Rate Limiter   │ ──── Exceeded? ──→ Return 429 + retryAfter │
│  └─────────────────┘                                            │
│       │ Allowed                                                  │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │ Zod Validation  │ ──── Invalid? ──→ Return validation error  │
│  │  • Type check   │                                            │
│  │  • SSRF check   │                                            │
│  │  • XSS check    │                                            │
│  │  • Sanitization │                                            │
│  └─────────────────┘                                            │
│       │ Valid                                                    │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │ Handler Logic   │                                            │
│  │  (try/catch)    │                                            │
│  └─────────────────┘                                            │
│       │                                                          │
│       ▼                                                          │
│  Return { success, data/error }                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rate Limiting Configuration

```typescript
// electron/ipc/rate-limiter.ts
const channelLimits = new Map([
  // Proxy operations - moderate limits
  ['proxy:add', { windowMs: 60000, maxRequests: 10 }],
  ['proxy:remove', { windowMs: 60000, maxRequests: 20 }],
  ['proxy:validate', { windowMs: 60000, maxRequests: 20 }],
  ['proxy:set-rotation', { windowMs: 60000, maxRequests: 10 }],
  ['proxy:list', { windowMs: 60000, maxRequests: 100 }],
  
  // Tab operations - higher limits
  ['tab:create', { windowMs: 60000, maxRequests: 50 }],
  ['tab:close', { windowMs: 60000, maxRequests: 50 }],
  ['tab:navigate', { windowMs: 60000, maxRequests: 100 }],
  
  // Automation - strict limits to prevent abuse
  ['automation:start-search', { windowMs: 60000, maxRequests: 5 }],
  ['automation:stop-search', { windowMs: 60000, maxRequests: 10 }],
  ['automation:schedule', { windowMs: 60000, maxRequests: 10 }],
  
  // Privacy - moderate limits
  ['privacy:set-fingerprint', { windowMs: 60000, maxRequests: 20 }],
  ['privacy:get-stats', { windowMs: 60000, maxRequests: 120 }],
  
  // Session - strict limits
  ['session:save', { windowMs: 60000, maxRequests: 10 }],
  ['session:load', { windowMs: 60000, maxRequests: 10 }],
]);
```

### Validation Schemas

```typescript
// electron/ipc/validation.ts - Key Schemas

// SSRF Protection
function isPrivateOrBlockedIP(hostname: string): boolean {
  const blockedHosts = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '169.254.169.254', // AWS metadata
    '169.254.170.2',   // AWS ECS
    'metadata.google.internal',
  ];
  // Also blocks 10.x.x.x, 172.16-31.x.x, 192.168.x.x
}

// XSS Pattern Detection
const XSS_PATTERNS = /<script|javascript:|on\w+\s*=|data:text\/html|vbscript:/i;

// Safe URL Schema
export const SafeUrlSchema = z.string()
  .max(2048, 'URL too long')
  .transform(sanitize)
  .refine((url) => {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) &&
           !isPrivateOrBlockedIP(parsed.hostname) &&
           !parsed.username && !parsed.password;
  });

// Proxy Config Schema
export const ProxyConfigSchema = z.object({
  host: z.string().min(1).max(255).transform(sanitize)
    .refine((host) => !hasXSSPatterns(host)),
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['http', 'https', 'socks4', 'socks5']),
  username: z.string().max(255).optional(),
  password: z.string().max(255).optional(),
});

// ReDoS Protection for Domain Patterns
export const DomainPatternSchema = z.string()
  .max(200)
  .refine((pattern) => {
    const redosPatterns = [/\(\.\*\)\+/, /\(\.\+\)\+/, /\([^)]+\+\)\+/];
    return !redosPatterns.some(p => p.test(pattern));
  });
```

---

## Security Architecture

### Security Headers Implementation

```typescript
// electron/main/index.ts - setupSecurityHeaders()

function setupSecurityHeaders(): void {
  const defaultSession = session.defaultSession;
  
  // Generate strict CSP
  const cspHeader = generateCSP({ strict: true });
  
  // HSTS: 1 year with includeSubDomains
  const hstsHeader = 'max-age=31536000; includeSubDomains';
  
  defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Apply CSP to HTML documents only
    if (isHtmlDocument(details)) {
      responseHeaders['Content-Security-Policy'] = [cspHeader];
    }
    
    // Apply HSTS for HTTPS
    if (details.url.startsWith('https://')) {
      responseHeaders['Strict-Transport-Security'] = [hstsHeader];
    }
    
    // Additional security headers
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    responseHeaders['X-Frame-Options'] = ['DENY'];
    responseHeaders['X-XSS-Protection'] = ['1; mode=block'];
    responseHeaders['Referrer-Policy'] = ['strict-origin-when-cross-origin'];
    
    // Remove dangerous headers
    delete responseHeaders['x-powered-by'];
    delete responseHeaders['server'];
    
    callback({ responseHeaders });
  });
}
```

### Content Security Policy

```typescript
// electron/utils/security.ts - generateCSP()

export function generateCSP(options: CSPOptions = {}): string {
  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self'",           // No unsafe-eval, no unsafe-inline
    "style-src 'self' 'unsafe-inline'",  // Required for CSS-in-JS
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",      // Clickjacking protection
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",           // Block plugins
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ];
  
  return directives.join('; ');
}
```

### TLS Validation

```typescript
// BrowserWindow security preferences
webPreferences: {
  allowRunningInsecureContent: false,  // Block HTTP in HTTPS pages
}

// HSTS enforcement via headers
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

### IPC Channel Whitelist

```typescript
// electron/utils/security.ts

export const IPC_INVOKE_WHITELIST = new Set([
  'proxy:add', 'proxy:remove', 'proxy:update', 'proxy:list',
  'proxy:validate', 'proxy:set-rotation',
  'tab:create', 'tab:close', 'tab:update', 'tab:list',
  'tab:navigate', 'tab:go-back', 'tab:go-forward', 'tab:reload',
  'privacy:set-fingerprint', 'privacy:toggle-webrtc',
  'privacy:toggle-tracker-blocking',
  'automation:start-search', 'automation:stop-search',
  'automation:add-keyword', 'automation:add-domain',
  'automation:get-tasks',
  'session:save', 'session:load', 'session:list',
]);

export function isChannelAllowed(channel: string, type: 'invoke' | 'event'): boolean {
  const whitelist = type === 'invoke' ? IPC_INVOKE_WHITELIST : IPC_EVENT_WHITELIST;
  return whitelist.has(channel);
}
```

### Credential Encryption

```typescript
// electron/database/services/encryption.service.ts

class EncryptionService {
  private masterKey: Buffer | null = null;
  
  initialize(masterKey: Buffer): void {
    this.masterKey = masterKey;
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);  // 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey!, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }
  
  decrypt(ciphertext: string): string {
    const [ivB64, tagB64, dataB64] = ciphertext.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey!, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
  
  destroy(): void {
    if (this.masterKey) {
      this.masterKey.fill(0);  // Clear from memory
      this.masterKey = null;
    }
  }
}
```

### Security Summary Table

| Control | Implementation | Location |
|---------|----------------|----------|
| CSP Headers | Strict policy via webRequest | `electron/main/index.ts` |
| HSTS | 1 year max-age | `electron/main/index.ts` |
| TLS Validation | Block insecure content | BrowserWindow config |
| IPC Validation | Zod schemas | `electron/ipc/validation.ts` |
| Rate Limiting | Per-channel limits | `electron/ipc/rate-limiter.ts` |
| SSRF Protection | Private IP blocking | `electron/ipc/validation.ts` |
| XSS Prevention | Pattern detection | `electron/ipc/validation.ts` |
| ReDoS Protection | Safe regex compilation | `electron/utils/security.ts` |
| Credential Encryption | AES-256-GCM | `electron/database/services/` |
| Key Storage | OS keychain | `safe-storage.service.ts` |
| Process Isolation | Sandbox + context isolation | BrowserWindow config |
| Channel Whitelist | Explicit allow list | `electron/utils/security.ts` |

---

## Database Architecture

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Database Schema                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   proxies   │     │    tabs     │     │  sessions   │       │
│  ├─────────────┤     ├─────────────┤     ├─────────────┤       │
│  │ id (PK)     │     │ id (PK)     │     │ id (PK)     │       │
│  │ host        │     │ url         │     │ name        │       │
│  │ port        │     │ title       │     │ tabs (JSON) │       │
│  │ protocol    │     │ proxy_id(FK)│     │ created_at  │       │
│  │ username    │     │ partition   │     └─────────────┘       │
│  │ password    │     │ created_at  │                           │
│  │ status      │     └─────────────┘                           │
│  │ latency     │                                                │
│  │ region      │     ┌─────────────┐     ┌─────────────┐       │
│  └─────────────┘     │search_tasks │     │target_domains│      │
│        │             ├─────────────┤     ├─────────────┤       │
│        │             │ id (PK)     │     │ id (PK)     │       │
│        ▼             │ session_id  │     │ domain      │       │
│  ┌─────────────┐     │ keyword     │     │ pattern     │       │
│  │proxy_usage  │     │ engine      │     │ priority    │       │
│  │   _stats    │     │ status      │     │ enabled     │       │
│  ├─────────────┤     │ position    │     └─────────────┘       │
│  │ proxy_id(FK)│     │ results     │                           │
│  │ requests    │     └─────────────┘                           │
│  │ successes   │                                                │
│  │ failures    │     ┌─────────────┐     ┌─────────────┐       │
│  │ avg_latency │     │  creators   │     │activity_logs│       │
│  └─────────────┘     ├─────────────┤     ├─────────────┤       │
│                      │ id (PK)     │     │ id (PK)     │       │
│  ┌─────────────┐     │ name        │     │ timestamp   │       │
│  │rotation_    │     │ url         │     │ level       │       │
│  │  config     │     │ platform    │     │ category    │       │
│  ├─────────────┤     │ enabled     │     │ message     │       │
│  │ id (PK)     │     │ priority    │     │ metadata    │       │
│  │ strategy    │     └─────────────┘     └─────────────┘       │
│  │ params      │                                                │
│  │ is_active   │     ┌─────────────┐     ┌─────────────┐       │
│  └─────────────┘     │  schedules  │     │encrypted_   │       │
│                      ├─────────────┤     │ credentials │       │
│  ┌─────────────┐     │ id (PK)     │     ├─────────────┤       │
│  │sticky_      │     │ type        │     │ id (PK)     │       │
│  │ sessions    │     │ cron_expr   │     │ proxy_id(FK)│       │
│  ├─────────────┤     │ task_config │     │ encrypted   │       │
│  │ domain      │     │ enabled     │     │ algorithm   │       │
│  │ proxy_id(FK)│     │ next_run    │     │ created_at  │       │
│  │ created_at  │     └─────────────┘     └─────────────┘       │
│  │ expires_at  │                                                │
│  └─────────────┘                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Repositories

| Repository | Purpose | Key Methods |
|------------|---------|-------------|
| `ProxyRepository` | Proxy CRUD | `create`, `findById`, `update`, `delete` |
| `ProxyUsageStatsRepository` | Usage tracking | `increment`, `getStats`, `reset` |
| `RotationConfigRepository` | Strategy config | `getActive`, `setActive`, `update` |
| `RotationEventsRepository` | Rotation history | `log`, `getRecent` |
| `StickySessionRepository` | Domain affinity | `get`, `set`, `expire` |
| `EncryptedCredentialsRepository` | Secure creds | `store`, `retrieve`, `delete` |
| `ExecutionLogsRepository` | Task logs | `log`, `query`, `cleanup` |
| `PositionHistoryRepository` | SERP tracking | `record`, `getHistory` |
| `CreatorSupportHistoryRepository` | Creator stats | `record`, `getStats` |
| `CircuitBreakerRepository` | CB state | `getState`, `setState` |

### Migrations

```
electron/database/migrations/
├── 001_proxy_rotation_system.sql    # Base proxy tables
├── 002_creator_support_and_execution_logs.sql  # Creator + logs
├── 004_add_performance_indexes.sql  # Performance indexes
├── 004_rollback.sql                 # Rollback script
├── runner.ts                        # Migration runner
└── types.ts                         # Migration types
```

### Migration Runner

```typescript
// electron/database/migrations/runner.ts
class MigrationRunner {
  async runPending(): Promise<void> {
    const applied = await this.getAppliedMigrations();
    const pending = migrations.filter(m => !applied.includes(m.id));
    
    for (const migration of pending) {
      await this.db.exec('BEGIN TRANSACTION');
      try {
        await this.db.exec(migration.up);
        await this.recordMigration(migration.id);
        await this.db.exec('COMMIT');
      } catch (error) {
        await this.db.exec('ROLLBACK');
        throw error;
      }
    }
  }
}
```

---

## Error Handling

### Error Class Hierarchy

```
BaseError
├── ValidationError      # Input validation failures
├── ProxyError           # Proxy-related errors
│   ├── ProxyNotFoundError
│   ├── ProxyValidationError
│   └── ProxyConnectionError
├── AutomationError      # Automation failures
│   ├── SearchError
│   ├── ScheduleError
│   └── ExecutionError
├── DatabaseError        # Database operations
│   ├── MigrationError
│   └── QueryError
└── SecurityError        # Security violations
    ├── RateLimitError
    └── ValidationError
```

### Error Handling Pattern

```typescript
// Standard IPC handler error handling
ipcMain.handle(CHANNEL, async (_event, input) => {
  // Rate limiting check
  const rateCheck = rateLimiter.checkLimit(CHANNEL);
  if (!rateCheck.allowed) {
    return { 
      success: false, 
      error: 'Rate limit exceeded', 
      retryAfter: rateCheck.retryAfter 
    };
  }

  // Validation
  const validation = validateInput(Schema, input);
  if (!validation.success) {
    return { success: false, error: `Validation failed: ${validation.error}` };
  }

  // Handler logic with try/catch
  try {
    const result = await handler(validation.data);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[IPC:${CHANNEL}] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
});
```

### Circuit Breaker Pattern

```typescript
// electron/core/resilience/circuit-breaker.ts
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### Self-Healing Engine

```typescript
// electron/core/automation/self-healing-engine.ts
class SelfHealingEngine {
  async executeWithRecovery<T>(
    task: () => Promise<T>,
    options: RecoveryOptions
  ): Promise<T> {
    const { maxRetries = 3, backoffMs = 1000 } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        // Categorize error and apply recovery strategy
        const strategy = this.getRecoveryStrategy(error);
        await strategy.apply();
        
        // Exponential backoff
        await sleep(backoffMs * Math.pow(2, attempt - 1));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

---

## Related Documentation

- [API Reference](./CODEMAPS/api-reference.md) - Complete IPC API documentation
- [Security](./SECURITY.md) - Security controls and practices  
- [Testing](../TESTING.md) - Test strategy and organization
- [Codemaps](./CODEMAPS/INDEX.md) - Module architecture maps

---

**Last Updated:** 2025-02-01 | **Version:** 1.3.0
