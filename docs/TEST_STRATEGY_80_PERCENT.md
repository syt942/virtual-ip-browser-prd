# Virtual IP Browser - Test Strategy: 44.79% → 80% Coverage

## Executive Summary

**Current State:** 698 tests passing, 44.79% statement coverage  
**Target State:** ~933 tests passing, 80%+ statement coverage  
**Estimated New Tests:** 235 tests  
**Timeline:** 7-10 days  
**Frameworks:** Vitest (unit/integration), Playwright (E2E)

---

## 1. Coverage Gap Analysis

### Critical Modules at 0% Coverage

| Module | Location | Lines | Priority |
|--------|----------|-------|----------|
| Database Index | `electron/database/index.ts` | 433 | P0 |
| Encrypted Credentials Repo | `electron/database/repositories/encrypted-credentials.repository.ts` | 289 | P0 |
| Zustand Stores | `src/stores/*.ts` | 657 | P0 |
| Hooks | `src/hooks/*.ts` | 396 | P1 |
| Sanitization Utils | `src/utils/sanitization.ts`, `sanitize.ts` | 384 | P1 |

### Partially Covered Modules Needing Improvement

| Module | Current | Target | Gap |
|--------|---------|--------|-----|
| Tab Manager | ~60% | 80% | Navigation, error handling |
| IPC Handlers | ~65% | 80% | Edge cases, rate limiting |
| Rotation Config Repo | 96.28% | 80% | ✅ Already met |
| Execution Logs Repo | 97.95% | 80% | ✅ Already met |

---

## 2. Test File Structure

```
tests/
├── setup.ts                          # Global test configuration
├── unit/
│   ├── database/
│   │   ├── test-helpers.ts           # ✅ Exists - DB test utilities
│   │   ├── database-manager.test.ts  # NEW - DatabaseManager class
│   │   ├── encryption.service.test.ts # NEW - EncryptionService
│   │   ├── encrypted-credentials.repository.test.ts # NEW
│   │   ├── proxy.repository.test.ts  # ✅ Exists - Extend
│   │   ├── rotation-config.repository.test.ts # ✅ Exists
│   │   ├── sticky-session.repository.test.ts # ✅ Exists
│   │   ├── execution-logs.repository.test.ts # ✅ Exists
│   │   └── migration-runner.test.ts  # ✅ Exists - Extend
│   ├── stores/
│   │   ├── proxyStore.test.ts        # NEW
│   │   ├── tabStore.test.ts          # NEW
│   │   ├── automationStore.test.ts   # NEW
│   │   └── privacyStore.test.ts      # NEW
│   ├── ipc/
│   │   ├── validation.test.ts        # NEW - Zod schemas
│   │   ├── rate-limiter.test.ts      # NEW - Rate limiting
│   │   └── handlers/
│   │       ├── proxy-handlers.test.ts     # NEW
│   │       ├── tab-handlers.test.ts       # NEW
│   │       ├── automation-handlers.test.ts # NEW
│   │       └── privacy-handlers.test.ts   # NEW
│   ├── utils/
│   │   ├── sanitization.test.ts      # NEW
│   │   └── sanitize.test.ts          # NEW
│   ├── hooks/
│   │   ├── useActivityLogs.test.ts   # NEW
│   │   ├── useDashboardData.test.ts  # NEW
│   │   ├── useKeyboardShortcuts.test.ts # NEW
│   │   └── useProxyPerformance.test.ts  # NEW
│   └── tabs/
│       └── manager.test.ts           # ✅ Exists - Extend
├── integration/
│   ├── ipc-communication.test.ts     # ✅ Exists - Extend
│   ├── database-transactions.test.ts # NEW
│   └── store-ipc-integration.test.ts # NEW
└── e2e/
    └── ... (existing Playwright tests)
```

---

## 3. Mock Utilities Required

### 3.1 Database Mock Helper (`tests/unit/database/test-helpers.ts`)

Already exists with in-memory SQLite. Extend with:

```typescript
// Add to existing test-helpers.ts
export function createTestEncryptionService() {
  const service = new EncryptionService();
  service.initialize('test-master-password', 'test-salt-12345');
  return service;
}

export function seedTestCredentials(db: Database.Database, count: number = 3) {
  const repo = new EncryptedCredentialsRepository(db);
  const encryption = createTestEncryptionService();
  
  return Array.from({ length: count }, (_, i) => {
    const { encrypted: encUser } = encryption.encrypt(`user${i}`);
    const { encrypted: encPass } = encryption.encrypt(`pass${i}`);
    return repo.create({
      credentialName: `Test Credential ${i}`,
      credentialType: 'basic',
      encryptedUsername: encUser,
      encryptedPassword: encPass,
      keyId: encryption.getKeyId()!,
      accessLevel: 'private'
    });
  });
}
```

### 3.2 Window API Mock (`tests/mocks/window-api.mock.ts`)

```typescript
// NEW FILE: tests/mocks/window-api.mock.ts
import { vi } from 'vitest';

export interface MockWindowApi {
  proxy: {
    add: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    validate: ReturnType<typeof vi.fn>;
    setRotation: ReturnType<typeof vi.fn>;
  };
  tab: {
    create: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    navigate: ReturnType<typeof vi.fn>;
  };
  automation: {
    startSearch: ReturnType<typeof vi.fn>;
    stopSearch: ReturnType<typeof vi.fn>;
    addDomain: ReturnType<typeof vi.fn>;
  };
  privacy: {
    setFingerprint: ReturnType<typeof vi.fn>;
    toggleWebRTC: ReturnType<typeof vi.fn>;
    toggleTrackerBlocking: ReturnType<typeof vi.fn>;
  };
}

export function createMockWindowApi(): MockWindowApi {
  return {
    proxy: {
      add: vi.fn().mockResolvedValue({ success: true, proxy: { id: 'test-id' } }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true, proxy: {} }),
      list: vi.fn().mockResolvedValue({ success: true, proxies: [] }),
      validate: vi.fn().mockResolvedValue({ success: true }),
      setRotation: vi.fn().mockResolvedValue({ success: true }),
    },
    tab: {
      create: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
      navigate: vi.fn().mockResolvedValue({ success: true }),
    },
    automation: {
      startSearch: vi.fn().mockResolvedValue({ success: true, session: {} }),
      stopSearch: vi.fn().mockResolvedValue({ success: true }),
      addDomain: vi.fn().mockResolvedValue({ success: true }),
    },
    privacy: {
      setFingerprint: vi.fn().mockResolvedValue({ success: true }),
      toggleWebRTC: vi.fn().mockResolvedValue({ success: true }),
      toggleTrackerBlocking: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

export function setupWindowApiMock(api: MockWindowApi = createMockWindowApi()): void {
  Object.defineProperty(global, 'window', {
    value: { api },
    writable: true,
  });
}

export function resetWindowApiMock(): void {
  if (global.window?.api) {
    Object.values(global.window.api).forEach(namespace => {
      Object.values(namespace).forEach(fn => {
        if (typeof fn?.mockReset === 'function') fn.mockReset();
      });
    });
  }
}
```

### 3.3 Electron Mock (`tests/mocks/electron.mock.ts`)

```typescript
// NEW FILE: tests/mocks/electron.mock.ts
import { vi } from 'vitest';

export const mockIpcMain = {
  handle: vi.fn(),
  removeHandler: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
};

export const mockBrowserView = vi.fn().mockImplementation(() => ({
  webContents: {
    loadURL: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    canGoBack: vi.fn().mockReturnValue(true),
    canGoForward: vi.fn().mockReturnValue(true),
    goBack: vi.fn(),
    goForward: vi.fn(),
    reload: vi.fn(),
    session: {
      partition: 'persist:test',
      setProxy: vi.fn().mockResolvedValue(undefined),
    },
  },
  setBounds: vi.fn(),
  setAutoResize: vi.fn(),
}));

export const mockBrowserWindow = vi.fn().mockImplementation(() => ({
  getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 1200, height: 800 }),
  addBrowserView: vi.fn(),
  removeBrowserView: vi.fn(),
  on: vi.fn(),
}));

export const mockSession = {
  fromPartition: vi.fn().mockReturnValue({
    setProxy: vi.fn().mockResolvedValue(undefined),
  }),
};

export function setupElectronMock(): void {
  vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserView: mockBrowserView,
    BrowserWindow: mockBrowserWindow,
    session: mockSession,
  }));
}
```

---

## 4. Test Cases by Module (235 Total)

### 4.1 Database Layer Tests (65 tests)

#### EncryptionService Tests (15 tests)
```typescript
// File: tests/unit/database/encryption.service.test.ts

describe('EncryptionService', () => {
  // Initialization (4 tests)
  it('initializes with master password and salt')
  it('initializes with raw key buffer')
  it('throws if key length is incorrect')
  it('isInitialized returns correct state')

  // Encryption (5 tests)
  it('encrypts and decrypts string correctly')
  it('produces different ciphertext for same plaintext (random IV)')
  it('throws when encrypting without initialization')
  it('encrypts credentials pair correctly')
  it('encrypts objects to JSON')

  // Decryption (4 tests)
  it('returns error for invalid encrypted format')
  it('returns error for tampered ciphertext')
  it('returns error for wrong key')
  it('decrypts objects from JSON')

  // Key Management (2 tests)
  it('generates unique key IDs')
  it('re-encrypts data with new key')
});
```

#### EncryptedCredentialsRepository Tests (18 tests)
```typescript
// File: tests/unit/database/encrypted-credentials.repository.test.ts

describe('EncryptedCredentialsRepository', () => {
  // CRUD Operations (6 tests)
  it('creates credential with all fields')
  it('creates credential with minimal fields')
  it('finds credential by ID')
  it('returns null for non-existent ID')
  it('deletes credential by ID')
  it('deletes all credentials for proxy')

  // Query Methods (5 tests)
  it('finds credentials by proxy ID')
  it('finds credentials by type')
  it('finds credentials by provider')
  it('finds credentials needing rotation')
  it('finds expired credentials')

  // Access Tracking (3 tests)
  it('tracks access count on retrieval')
  it('updates last_accessed_at timestamp')
  it('getWithAccessTracking increments counter')

  // Encryption Management (4 tests)
  it('updates encrypted data fields')
  it('marks credential for rotation')
  it('clears rotation required flag')
  it('increments encryption version')
});
```

#### DatabaseManager Tests (12 tests)
```typescript
// File: tests/unit/database/database-manager.test.ts

describe('DatabaseManager', () => {
  // Initialization (3 tests)
  it('initializes database with schema')
  it('runs pending migrations on init')
  it('creates all repository instances')

  // Repository Access (5 tests)
  it('provides ProxyRepository instance')
  it('provides RotationConfigRepository instance')
  it('provides StickySessionRepository instance')
  it('provides EncryptedCredentialsRepository instance')
  it('provides ExecutionLogsRepository instance')

  // Lifecycle (4 tests)
  it('closes database connection properly')
  it('handles multiple close calls gracefully')
  it('returns same instance (singleton pattern)')
  it('throws on operations after close')
});
```

#### MigrationRunner Extended Tests (8 tests)
```typescript
// File: tests/unit/database/migration-runner.test.ts (extend existing)

describe('MigrationRunner - Extended', () => {
  // Status & Verification (4 tests)
  it('getStatus returns pending migrations')
  it('getStatus returns applied migrations')
  it('verifyChecksums detects modified migrations')
  it('verifyChecksums passes for unmodified migrations')

  // Backup & Recovery (4 tests)
  it('runWithBackup creates backup file')
  it('runWithBackup runs migrations after backup')
  it('runWithBackup skips backup when no migrations pending')
  it('runTo stops at target version')
});
```

#### ProxyRepository Extended Tests (12 tests)
```typescript
// File: tests/unit/database/proxy.repository.test.ts (extend existing)

describe('ProxyRepository - Extended', () => {
  // Weight Management (4 tests)
  it('updateWeight validates range 0-100')
  it('batchUpdateWeights in transaction')
  it('normalizeWeights sums to 100')
  it('equalizeWeights distributes evenly')

  // Rotation Groups (4 tests)
  it('findByRotationGroup filters active proxies')
  it('getGroupedByRotationGroup includes ungrouped')
  it('getCountByRotationGroup returns accurate counts')
  it('batchUpdateRotationGroups in transaction')

  // Statistics (4 tests)
  it('getTotalWeight for group')
  it('getTotalWeight for all')
  it('getWeightStats returns min/max/avg')
  it('findActiveByWeight orders by weight DESC')
});
```

### 4.2 Zustand Store Tests (48 tests)

#### ProxyStore Tests (14 tests)
```typescript
// File: tests/unit/stores/proxyStore.test.ts

describe('useProxyStore', () => {
  // State Initialization (2 tests)
  it('initializes with empty proxies array')
  it('initializes with round-robin strategy')

  // Add Proxy (4 tests)
  it('addProxy calls window.api.proxy.add')
  it('addProxy adds proxy to state on success')
  it('addProxy sets isLoading during operation')
  it('addProxy throws and logs on failure')

  // Remove Proxy (2 tests)
  it('removeProxy removes from state on success')
  it('removeProxy throws on failure')

  // Update Proxy (2 tests)
  it('updateProxy updates state on success')
  it('updateProxy throws on failure')

  // Validate Proxy (2 tests)
  it('validateProxy sets status to checking')
  it('validateProxy sets status to failed on error')

  // Selectors (2 tests)
  it('getActiveProxies filters by active status')
  it('getProxyById returns correct proxy')
});
```

#### TabStore Tests (12 tests)
```typescript
// File: tests/unit/stores/tabStore.test.ts

describe('useTabStore', () => {
  // Add Tab (3 tests)
  it('addTab creates tab with defaults')
  it('addTab sets new tab as active')
  it('addTab calls window.api.tab.create')

  // Remove Tab (4 tests)
  it('removeTab removes tab from state')
  it('removeTab switches active to next tab')
  it('removeTab switches active to previous if at end')
  it('removeTab calls window.api.tab.close')

  // Update Tab (2 tests)
  it('updateTab updates tab properties')
  it('updateTab calls window.api.tab.update')

  // Utility Actions (3 tests)
  it('setActiveTab updates activeTabId')
  it('getActiveTab returns current active tab')
  it('closeAllTabs clears all tabs')
  it('duplicateTab creates copy with same url')
});
```

#### AutomationStore Tests (12 tests)
```typescript
// File: tests/unit/stores/automationStore.test.ts

describe('useAutomationStore', () => {
  // Session Management (4 tests)
  it('startSession calls API and adds to state')
  it('stopSession updates status to stopped')
  it('pauseSession updates status to paused')
  it('resumeSession updates status to active')

  // Keyword Management (3 tests)
  it('addKeyword adds trimmed keyword')
  it('addKeyword prevents duplicates')
  it('removeKeyword removes from list')

  // Domain Management (3 tests)
  it('addTargetDomain calls API')
  it('addTargetDomain prevents duplicates')
  it('removeTargetDomain removes from list')

  // Utility (2 tests)
  it('setEngine updates selectedEngine')
  it('getActiveSession returns correct session')
});
```

#### PrivacyStore Tests (10 tests)
```typescript
// File: tests/unit/stores/privacyStore.test.ts

describe('usePrivacyStore', () => {
  // Settings Updates (4 tests)
  it('updateSettings merges with current')
  it('updateSettings calls window.api.privacy.setFingerprint')
  it('toggle functions flip boolean values')
  it('toggleWebRTC calls API')

  // Profile Management (4 tests)
  it('createProfile adds new profile')
  it('deleteProfile removes profile')
  it('activateProfile sets settings and activeProfileId')
  it('generateRandomProfile sets all to true')

  // Persistence (2 tests)
  it('persists state to localStorage')
  it('restores state from localStorage')
});
```

### 4.3 IPC Handlers & Validation Tests (52 tests)

#### Validation Schema Tests (20 tests)
```typescript
// File: tests/unit/ipc/validation.test.ts

describe('IPC Validation Schemas', () => {
  // ProxyConfigSchema (5 tests)
  it('validates correct proxy config')
  it('rejects host with XSS patterns')
  it('rejects invalid port range')
  it('sanitizes null bytes from strings')
  it('validates protocol enum')

  // SafeUrlSchema (6 tests)
  it('accepts valid http/https URLs')
  it('rejects javascript: protocol')
  it('rejects private IP addresses')
  it('rejects localhost')
  it('rejects AWS metadata endpoint')
  it('accepts relative URLs')

  // AutomationConfigSchema (4 tests)
  it('validates keywords array max length')
  it('validates search engine enum')
  it('validates delay range')
  it('applies default values')

  // DomainPatternSchema (3 tests)
  it('rejects ReDoS patterns')
  it('validates regex syntax')
  it('accepts valid patterns')

  // validateInput helper (2 tests)
  it('returns data on success')
  it('returns formatted error on failure')
});
```

#### RateLimiter Tests (12 tests)
```typescript
// File: tests/unit/ipc/rate-limiter.test.ts

describe('RateLimiter', () => {
  // Basic Operations (4 tests)
  it('allows requests under limit')
  it('blocks requests over limit')
  it('resets after window expires')
  it('tracks requests per key')

  // Utility Methods (3 tests)
  it('getRemainingRequests returns correct count')
  it('getRetryAfter returns time until reset')
  it('reset clears all limits')
});

describe('IPCRateLimiter', () => {
  // Channel Configuration (3 tests)
  it('applies stricter limits to automation channels')
  it('applies higher limits to tab operations')
  it('uses default limits for unknown channels')

  // Integration (2 tests)
  it('checkLimit returns allowed/remaining/retryAfter')
  it('cleanup removes expired entries')
});
```

#### Proxy IPC Handlers Tests (8 tests)
```typescript
// File: tests/unit/ipc/handlers/proxy-handlers.test.ts

describe('Proxy IPC Handlers', () => {
  // proxy:add (3 tests)
  it('returns rate limit error when exceeded')
  it('returns validation error for invalid config')
  it('returns proxy on successful add')

  // proxy:remove (2 tests)
  it('validates UUID format')
  it('returns success on removal')

  // proxy:validate (2 tests)
  it('calls proxyManager.validateProxy')
  it('handles validation timeout')

  // proxy:set-rotation (1 test)
  it('validates rotation strategy enum')
});
```

#### Navigation Handlers Tests (6 tests)
```typescript
// File: tests/unit/ipc/handlers/navigation-handlers.test.ts

describe('Navigation IPC Handlers', () => {
  // tab:navigate (3 tests)
  it('sanitizes URL before navigation')
  it('validates tab ID format')
  it('returns error for blocked URLs')

  // Navigation controls (3 tests)
  it('tab:go-back calls tabManager.goBack')
  it('tab:go-forward calls tabManager.goForward')
  it('tab:reload calls tabManager.reload')
});
```

#### Privacy Handlers Tests (6 tests)
```typescript
// File: tests/unit/ipc/handlers/privacy-handlers.test.ts

describe('Privacy IPC Handlers', () => {
  // privacy:set-fingerprint (2 tests)
  it('validates fingerprint config schema')
  it('generates protection script')

  // privacy:toggle-webrtc (2 tests)
  it('validates boolean input')
  it('calls webrtc protection toggle')

  // privacy:toggle-tracker-blocking (2 tests)
  it('validates boolean input')
  it('calls tracker blocker toggle')
});
```

### 4.4 Tab Manager Extended Tests (20 tests)

```typescript
// File: tests/unit/tabs/manager.test.ts (extend existing)

describe('TabManager - Extended Coverage', () => {
  // Session Isolation (4 tests)
  it('creates unique partition per tab')
  it('isolates cookies between tabs')
  it('applies proxy to tab session')
  it('applies fingerprint protection on load')

  // Navigation Events (4 tests)
  it('emits tab:updated on title change')
  it('emits tab:updated on favicon change')
  it('emits tab:updated on URL change')
  it('emits tab:error on load failure')

  // Tab Lifecycle (4 tests)
  it('destroys webContents on close')
  it('removes view from window on close')
  it('handles close of non-existent tab')
  it('updates active tab after close')

  // View Management (4 tests)
  it('sets correct bounds for browser view')
  it('enables auto-resize on view')
  it('switches views when changing active tab')
  it('removes old view before adding new')

  // Error Handling (4 tests)
  it('throws when window not set')
  it('handles failed script injection')
  it('handles navigation to invalid URL')
  it('recovers from crashed tab')
});
```

### 4.5 Utility Tests (25 tests)

#### Sanitization Tests (15 tests)
```typescript
// File: tests/unit/utils/sanitization.test.ts

describe('Sanitization Utils', () => {
  // XSS Prevention (5 tests)
  it('escapes HTML entities')
  it('removes script tags')
  it('removes event handlers')
  it('sanitizes SVG content')
  it('handles nested XSS attempts')

  // Input Validation (5 tests)
  it('validates email format')
  it('validates URL format')
  it('validates domain format')
  it('strips control characters')
  it('normalizes unicode')

  // SQL Injection Prevention (5 tests)
  it('escapes single quotes')
  it('escapes double quotes')
  it('removes SQL keywords')
  it('handles parameterized queries')
  it('validates identifier names')
});
```

#### Sanitize Tests (10 tests)
```typescript
// File: tests/unit/utils/sanitize.test.ts

describe('Sanitize Module', () => {
  // URL Sanitization (4 tests)
  it('sanitizeUrl blocks javascript protocol')
  it('sanitizeUrl blocks data URLs')
  it('sanitizeUrl normalizes URL encoding')
  it('sanitizeUrl handles malformed URLs')

  // String Sanitization (3 tests)
  it('sanitizeString removes null bytes')
  it('sanitizeString trims whitespace')
  it('sanitizeString limits length')

  // HTML Sanitization (3 tests)
  it('sanitizeHtml removes dangerous tags')
  it('sanitizeHtml allows safe attributes')
  it('sanitizeHtml handles edge cases')
});
```

### 4.6 Hooks Tests (25 tests)

```typescript
// File: tests/unit/hooks/useActivityLogs.test.ts

describe('useActivityLogs', () => {
  it('fetches logs on mount')
  it('filters logs by level')
  it('filters logs by category')
  it('paginates results')
  it('handles API errors')
  it('debounces filter changes')
});

// File: tests/unit/hooks/useDashboardData.test.ts

describe('useDashboardData', () => {
  it('aggregates proxy statistics')
  it('aggregates automation statistics')
  it('calculates success rates')
  it('handles loading state')
  it('refreshes on interval')
  it('handles empty data')
});

// File: tests/unit/hooks/useKeyboardShortcuts.test.ts

describe('useKeyboardShortcuts', () => {
  it('registers keyboard listeners')
  it('handles Ctrl+T for new tab')
  it('handles Ctrl+W for close tab')
  it('handles Ctrl+Tab for next tab')
  it('prevents default browser behavior')
  it('cleans up on unmount')
});

// File: tests/unit/hooks/useProxyPerformance.test.ts

describe('useProxyPerformance', () => {
  it('calculates average latency')
  it('calculates success rate')
  it('tracks usage over time')
  it('identifies slow proxies')
  it('handles missing data')
  it('updates on proxy changes')
  it('provides performance recommendations')
});
```

---

## 5. Test Data Fixtures

### 5.1 Proxy Fixtures (`tests/fixtures/proxies.ts`)

```typescript
// NEW FILE: tests/fixtures/proxies.ts
import type { Proxy } from '@/stores/proxyStore';

export const validProxyConfigs = [
  {
    name: 'US Proxy 1',
    host: 'us-proxy.example.com',
    port: 8080,
    protocol: 'https' as const,
    region: 'US',
    tags: ['fast', 'reliable'],
  },
  {
    name: 'EU Proxy 1',
    host: 'eu-proxy.example.com',
    port: 3128,
    protocol: 'http' as const,
    region: 'EU',
    username: 'user',
    password: 'pass',
  },
  {
    name: 'SOCKS Proxy',
    host: 'socks.example.com',
    port: 1080,
    protocol: 'socks5' as const,
  },
];

export const invalidProxyConfigs = [
  { host: '', port: 8080, protocol: 'http' }, // Empty host
  { host: 'valid.com', port: 0, protocol: 'http' }, // Invalid port
  { host: 'valid.com', port: 70000, protocol: 'http' }, // Port out of range
  { host: '<script>alert(1)</script>', port: 8080, protocol: 'http' }, // XSS
  { host: '127.0.0.1', port: 8080, protocol: 'http' }, // Localhost
  { host: '169.254.169.254', port: 80, protocol: 'http' }, // AWS metadata
];

export function createMockProxy(overrides: Partial<Proxy> = {}): Proxy {
  return {
    id: crypto.randomUUID(),
    name: 'Test Proxy',
    host: 'test.proxy.com',
    port: 8080,
    protocol: 'https',
    status: 'active',
    failureCount: 0,
    totalRequests: 100,
    successRate: 95,
    latency: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### 5.2 Automation Fixtures (`tests/fixtures/automation.ts`)

```typescript
// NEW FILE: tests/fixtures/automation.ts
export const validAutomationConfigs = [
  {
    keywords: ['test keyword 1', 'test keyword 2'],
    engine: 'google' as const,
    targetDomains: ['example.com'],
    maxRetries: 3,
    delayBetweenSearches: 5000,
  },
  {
    keywords: ['single keyword'],
    engine: 'bing' as const,
    targetDomains: ['example.com', 'test.com'],
    useRandomProxy: true,
    clickThrough: false,
  },
];

export const invalidAutomationConfigs = [
  { keywords: [], engine: 'google' }, // Empty keywords
  { keywords: ['a'.repeat(300)], engine: 'google' }, // Keyword too long
  { keywords: ['test'], engine: 'invalid' }, // Invalid engine
  { keywords: ['test'], engine: 'google', delayBetweenSearches: 100 }, // Delay too short
];

export const maliciousInputs = {
  keywords: [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '"><img src=x onerror=alert(1)>',
    "'; DROP TABLE users; --",
  ],
  domains: [
    'example.com"><script>',
    'localhost',
    '127.0.0.1',
    '169.254.169.254',
  ],
};
```

### 5.3 Credential Fixtures (`tests/fixtures/credentials.ts`)

```typescript
// NEW FILE: tests/fixtures/credentials.ts
export const credentialTestCases = {
  basic: {
    credentialName: 'Test Basic Auth',
    credentialType: 'basic' as const,
    username: 'testuser',
    password: 'testpass123',
    accessLevel: 'private' as const,
  },
  apiKey: {
    credentialName: 'Test API Key',
    credentialType: 'api_key' as const,
    data: 'sk-test-key-12345',
    provider: 'test-provider',
    accessLevel: 'team' as const,
  },
  withExpiry: {
    credentialName: 'Expiring Credential',
    credentialType: 'basic' as const,
    username: 'expiring-user',
    password: 'expiring-pass',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    accessLevel: 'private' as const,
  },
  expired: {
    credentialName: 'Expired Credential',
    credentialType: 'basic' as const,
    username: 'expired-user',
    password: 'expired-pass',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    accessLevel: 'private' as const,
  },
};
```

---

## 6. Test Execution Order

### Phase 1: Foundation (Days 1-2)
```bash
# Run order - dependencies first
npm test -- tests/unit/database/test-helpers.ts
npm test -- tests/unit/database/encryption.service.test.ts
npm test -- tests/mocks/
```

### Phase 2: Database Layer (Days 2-4)
```bash
npm test -- tests/unit/database/encrypted-credentials.repository.test.ts
npm test -- tests/unit/database/database-manager.test.ts
npm test -- tests/unit/database/migration-runner.test.ts
npm test -- tests/unit/database/proxy.repository.test.ts
```

### Phase 3: IPC Layer (Days 4-5)
```bash
npm test -- tests/unit/ipc/validation.test.ts
npm test -- tests/unit/ipc/rate-limiter.test.ts
npm test -- tests/unit/ipc/handlers/
```

### Phase 4: Stores & UI (Days 5-7)
```bash
npm test -- tests/unit/stores/
npm test -- tests/unit/hooks/
npm test -- tests/unit/utils/
```

### Phase 5: Integration (Days 7-8)
```bash
npm test -- tests/integration/
npm test -- tests/unit/tabs/manager.test.ts
```

### Phase 6: Coverage Verification (Days 8-10)
```bash
npm run test:coverage
# Verify 80%+ coverage achieved
# Fix any remaining gaps
```

---

## 7. Coverage Measurement Strategy

### 7.1 Run Coverage Report

```bash
# Full coverage report with HTML output
npm test -- --coverage --reporter=verbose

# View detailed HTML report
open coverage/lcov-report/index.html
```

### 7.2 Coverage Configuration

Update `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts',
        'src/renderer/', // Electron renderer bootstrap
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### 7.3 Per-Module Coverage Targets

| Module | Current | Target | Tests Needed |
|--------|---------|--------|--------------|
| electron/database/index.ts | 0% | 80% | 12 |
| electron/database/services/encryption.service.ts | 0% | 90% | 15 |
| electron/database/repositories/encrypted-credentials | 0% | 85% | 18 |
| src/stores/*.ts | 0% | 85% | 48 |
| src/hooks/*.ts | 0% | 80% | 25 |
| electron/ipc/validation.ts | ~70% | 90% | 20 |
| electron/ipc/rate-limiter.ts | ~60% | 85% | 12 |
| electron/core/tabs/manager.ts | ~60% | 85% | 20 |
| src/utils/sanitization.ts | 0% | 85% | 15 |
| src/utils/sanitize.ts | 0% | 85% | 10 |

---

## 8. CI Integration

### 8.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests with coverage
        run: npm test -- --coverage --reporter=verbose
      
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### 8.2 Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for changed files
npm test -- --changed --passWithNoTests

# Check coverage doesn't drop
npm test -- --coverage --reporter=json-summary
```

---

## 9. Implementation Timeline

### Week 1: Foundation & Database

| Day | Tasks | Tests | Cumulative |
|-----|-------|-------|------------|
| 1 | Setup mocks, fixtures | 0 | 698 |
| 2 | EncryptionService tests | 15 | 713 |
| 3 | EncryptedCredentials, DatabaseManager | 30 | 743 |
| 4 | MigrationRunner, ProxyRepository extensions | 20 | 763 |

### Week 2: IPC & Stores

| Day | Tasks | Tests | Cumulative |
|-----|-------|-------|------------|
| 5 | Validation schemas, RateLimiter | 32 | 795 |
| 6 | IPC handlers (proxy, navigation, privacy) | 20 | 815 |
| 7 | ProxyStore, TabStore | 26 | 841 |
| 8 | AutomationStore, PrivacyStore | 22 | 863 |

### Week 3: Utilities & Integration

| Day | Tasks | Tests | Cumulative |
|-----|-------|-------|------------|
| 9 | Hooks tests | 25 | 888 |
| 10 | Sanitization utils | 25 | 913 |
| 11 | TabManager extensions | 20 | 933 |
| 12 | Coverage gaps, CI setup | - | 933 |

---

## 10. Success Criteria

### Coverage Metrics
- [ ] Overall statement coverage ≥ 80%
- [ ] Branch coverage ≥ 75%
- [ ] Function coverage ≥ 80%
- [ ] Line coverage ≥ 80%

### Quality Metrics
- [ ] All 933+ tests passing
- [ ] No flaky tests (3 consecutive runs)
- [ ] Test execution time < 60 seconds
- [ ] CI pipeline green on main branch

### Documentation
- [ ] All test files have descriptive names
- [ ] Complex tests have comments explaining intent
- [ ] Fixtures are reusable across test files
- [ ] Mock utilities are documented

---

## Appendix A: Quick Start Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/unit/database/encryption.service.test.ts

# Run tests matching pattern
npm test -- --grep "EncryptionService"

# Run tests in watch mode
npm test -- --watch

# Run only changed tests
npm test -- --changed

# Generate coverage report
npm test -- --coverage --reporter=html
open coverage/index.html
```

---

*Document Version: 1.0*  
*Created: 2025*  
*Target Completion: 7-10 days*  
*Total New Tests: 235*

