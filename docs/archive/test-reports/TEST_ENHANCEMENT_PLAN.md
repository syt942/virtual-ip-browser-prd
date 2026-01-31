# Virtual IP Browser - Test Enhancement Plan

**Generated**: Analysis Report  
**Current Coverage**: 44.79% statements | 77.45% branches | 60.99% functions  
**Target Coverage**: 80% (PRD Requirement)  
**Passing Tests**: 698

---

## Executive Summary

### Why Critical Modules Have 0% Coverage

After analyzing the codebase, I identified **4 root causes** for the coverage gaps:

| Module | Root Cause | Technical Barrier |
|--------|-----------|-------------------|
| **Tab Manager** | Electron dependency | `BrowserView`, `BrowserWindow` require Electron runtime |
| **Database Layer** | Electron `app` dependency | `app.getPath()` unavailable in test environment |
| **Zustand Stores** | `window.api` dependency | IPC bridge not available in jsdom |
| **IPC Handlers** | `ipcMain` registration | Requires Electron main process context |

### Key Findings

1. **Test files exist but don't cover actual code** - `tab-manager.test.ts` (855 lines) and `database-manager.test.ts` (607 lines) exist but test mock implementations, not the real modules
2. **Electron mocking is incomplete** - Current mocks don't properly simulate Electron APIs
3. **No dependency injection** - Modules are tightly coupled to Electron/window globals
4. **Store tests missing entirely** - No tests for Zustand stores despite 657 lines of code

---

## 1. Analysis of Critical Gaps

### 1.1 Tab Manager (`electron/core/tabs/manager.ts`) - 343 lines, 0% coverage

**Why it has 0% coverage:**
```typescript
// The actual TabManager imports Electron directly
import { BrowserView, BrowserWindow } from 'electron';

// Creates BrowserView instances - requires Electron runtime
const view = new BrowserView({
  webPreferences: {
    partition: `persist:tab-${id}`,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  }
});
```

**Current test file issue:**
- `tests/unit/tab-manager.test.ts` exists with 855 lines
- Tests use mocks but the mocks don't properly intercept the real module
- Coverage tool sees the test file but not the actual `manager.ts` execution

**Solution:**
- Create proper Electron mocks that intercept at module level
- Use dependency injection for `BrowserView` and `BrowserWindow`
- Test the business logic separately from Electron integration

### 1.2 Database Layer (`electron/database/`) - ~2,500 lines, 0% coverage

**Why it has 0% coverage:**
```typescript
// DatabaseManager uses Electron's app module
import { app } from 'electron';
import { join } from 'path';

// This fails in test environment - app.getPath() throws
const dbPath = join(app.getPath('userData'), 'virtual-ip-browser.db');
```

**Current test file issue:**
- `tests/unit/database/database-manager.test.ts` creates a `TestDatabaseManager` class
- This tests a mock, not the actual `DatabaseManager` from `electron/database/index.ts`
- Repository tests also use mock implementations

**Solution:**
- Mock `electron` module to provide fake `app.getPath()`
- Use in-memory SQLite (`:memory:`) for tests
- Test actual repository classes with mocked database connection

### 1.3 Zustand Stores (`src/stores/`) - 657 lines, 0% coverage

**Why it has 0% coverage:**
```typescript
// All stores depend on window.api (IPC bridge)
addTab: (tabData) => {
  // ...
  window.api.tab.create(newTab).catch(console.error);  // Fails in jsdom
}
```

**No test files exist for stores.**

**Solution:**
- Mock `window.api` globally in test setup
- Test store state transitions independently of IPC calls
- Use `zustand`'s testing utilities

### 1.4 IPC Handlers (`electron/ipc/handlers/`) - ~570 lines, 0% coverage

**Why it has 0% coverage:**
```typescript
// Handlers register with ipcMain
import { ipcMain } from 'electron';

ipcMain.handle(IPC_CHANNELS.PROXY_ADD, async (_event, config) => {
  // Handler logic
});
```

**Current test file issue:**
- `tests/unit/ipc-handlers.test.ts` exists with 1130+ lines
- Mocks `ipcMain.handle` but doesn't execute the actual handler registration
- Tests validate mock implementations, not real handlers

**Solution:**
- Import and call `setupIpcHandlers()` with mocked dependencies
- Capture registered handlers and invoke them directly
- Test validation, rate limiting, and error handling

---

## 2. Module Priority Matrix

| Priority | Module | Lines | Coverage Impact | Effort | Risk if Untested |
|----------|--------|-------|-----------------|--------|------------------|
| **P0** | Database Layer | 2,500 | +15% | High | Data corruption, loss |
| **P0** | Tab Manager | 343 | +5% | Medium | Session leaks, crashes |
| **P1** | Zustand Stores | 657 | +4% | Medium | UI state bugs |
| **P1** | IPC Handlers | 570 | +3% | Medium | Security vulnerabilities |
| **P2** | Custom Hooks | 383 | +2% | Low | UX issues |
| **P2** | Panel Components | 500 | +3% | Medium | Visual regressions |
| **P3** | Browser Components | 300 | +2% | Low | Minor UI bugs |

---

## 3. Test Plan - Detailed Test Cases

### 3.1 Tab Manager Tests (Priority: P0)

**File:** `tests/unit/core/tab-manager.test.ts`

#### Unit Tests (25-30 tests)

```typescript
describe('TabManager', () => {
  describe('Tab Lifecycle', () => {
    it('should create tab with unique ID')
    it('should create tab with default URL about:blank')
    it('should create tab with custom URL')
    it('should create tab with isolated session partition')
    it('should throw error if window not set')
    it('should emit tab:created event on creation')
    it('should set new tab as active by default')
  });

  describe('Tab Navigation', () => {
    it('should navigate to valid URL')
    it('should throw error for non-existent tab')
    it('should update tab URL after navigation')
    it('should emit tab:updated event on navigation')
    it('should handle navigation errors gracefully')
  });

  describe('Tab Activation', () => {
    it('should activate tab by ID')
    it('should remove previous active view from window')
    it('should add new view to window')
    it('should emit tab:activated event')
    it('should handle activation of non-existent tab')
  });

  describe('Tab Closing', () => {
    it('should close tab and destroy webContents')
    it('should remove tab from internal map')
    it('should emit tab:closed event')
    it('should return false for non-existent tab')
    it('should handle closing active tab')
  });

  describe('Proxy Integration', () => {
    it('should apply proxy to tab session')
    it('should emit proxy:applied event')
    it('should handle missing proxy gracefully')
  });

  describe('Fingerprint Protection', () => {
    it('should inject protection script on page load')
    it('should apply tracker blocking to session')
    it('should handle missing privacy manager')
  });

  describe('History Navigation', () => {
    it('should go back when history available')
    it('should go forward when history available')
    it('should reload current page')
    it('should handle navigation on non-existent tab')
  });
});
```

### 3.2 Database Layer Tests (Priority: P0)

**Files:**
- `tests/unit/database/database-manager.test.ts` (enhance existing)
- `tests/unit/database/repositories/*.test.ts` (new)

#### DatabaseManager Tests (15 tests)

```typescript
describe('DatabaseManager', () => {
  describe('Initialization', () => {
    it('should create database at specified path')
    it('should enable foreign keys')
    it('should enable WAL mode')
    it('should run migrations on init')
    it('should handle initialization errors')
  });

  describe('Query Operations', () => {
    it('should execute SELECT queries')
    it('should execute parameterized queries')
    it('should return empty array for no results')
    it('should handle query errors')
  });

  describe('Transactions', () => {
    it('should commit successful transactions')
    it('should rollback failed transactions')
    it('should handle nested transactions')
  });

  describe('Connection Management', () => {
    it('should close database connection')
    it('should throw error when accessing closed database')
    it('should handle multiple close calls')
  });
});
```

#### Repository Tests (40 tests across all repositories)

```typescript
describe('ProxyRepository', () => {
  it('should create proxy with valid data')
  it('should find proxy by ID')
  it('should find all proxies')
  it('should find proxies by status')
  it('should update proxy')
  it('should delete proxy')
  it('should handle duplicate host/port/protocol')
  it('should validate port range')
});

describe('RotationConfigRepository', () => {
  it('should save rotation configuration')
  it('should retrieve active configuration')
  it('should update configuration')
  it('should handle missing configuration')
});

// Similar for all other repositories...
```

### 3.3 Zustand Store Tests (Priority: P1)

**Files:**
- `tests/unit/stores/tabStore.test.ts`
- `tests/unit/stores/proxyStore.test.ts`
- `tests/unit/stores/automationStore.test.ts`
- `tests/unit/stores/privacyStore.test.ts`

#### tabStore Tests (12 tests)

```typescript
describe('useTabStore', () => {
  describe('Initial State', () => {
    it('should have empty tabs array')
    it('should have null activeTabId')
  });

  describe('addTab', () => {
    it('should add tab with generated ID')
    it('should add tab with custom ID')
    it('should set new tab as active')
    it('should call IPC to create tab')
  });

  describe('removeTab', () => {
    it('should remove tab from array')
    it('should switch active tab when removing active')
    it('should call IPC to close tab')
  });

  describe('updateTab', () => {
    it('should update tab properties')
    it('should call IPC to update tab')
  });

  describe('duplicateTab', () => {
    it('should create new tab with same URL')
    it('should not duplicate non-existent tab')
  });
});
```

#### proxyStore Tests (15 tests)

```typescript
describe('useProxyStore', () => {
  describe('addProxy', () => {
    it('should add proxy on success')
    it('should set loading state')
    it('should handle API errors')
    it('should throw descriptive error')
  });

  describe('removeProxy', () => {
    it('should remove proxy from state')
    it('should handle removal errors')
  });

  describe('validateProxy', () => {
    it('should set status to checking')
    it('should reload proxies after validation')
    it('should set status to failed on error')
  });

  describe('setRotationStrategy', () => {
    it('should update strategy')
    it('should call IPC')
    it('should handle errors')
  });

  describe('Selectors', () => {
    it('should return active proxies only')
    it('should find proxy by ID')
  });
});
```

### 3.4 IPC Handler Tests (Priority: P1)

**File:** `tests/unit/ipc/handlers.test.ts` (enhance existing)

#### Handler Registration Tests (10 tests)

```typescript
describe('IPC Handlers', () => {
  describe('Registration', () => {
    it('should register all proxy handlers')
    it('should register all tab handlers')
    it('should register all privacy handlers')
    it('should register all automation handlers')
  });

  describe('Rate Limiting', () => {
    it('should reject requests exceeding rate limit')
    it('should return retryAfter in response')
    it('should reset rate limit after window')
  });

  describe('Input Validation', () => {
    it('should reject invalid proxy config')
    it('should reject invalid tab ID format')
    it('should sanitize URL inputs')
  });
});
```

#### Proxy Handler Tests (15 tests)

```typescript
describe('Proxy Handlers', () => {
  describe('PROXY_ADD', () => {
    it('should add valid proxy')
    it('should validate required fields')
    it('should validate port range')
    it('should validate protocol')
    it('should handle manager errors')
  });

  describe('PROXY_REMOVE', () => {
    it('should remove existing proxy')
    it('should validate UUID format')
    it('should handle non-existent proxy')
  });

  describe('PROXY_VALIDATE', () => {
    it('should trigger proxy validation')
    it('should return validation result')
  });
});
```

---

## 4. Test Strategy Recommendations

### 4.1 Test Type Distribution

| Test Type | Current | Target | Purpose |
|-----------|---------|--------|---------|
| **Unit Tests** | 698 | 900+ | Individual function/class behavior |
| **Integration Tests** | ~10 | 50+ | Module interactions, IPC flow |
| **E2E Tests** | ~25 | 40+ | Critical user journeys |

### 4.2 When to Use Each Test Type

#### Unit Tests (80% of new tests)
- Pure functions and utilities
- Class methods with mocked dependencies
- Store state transitions
- Validation logic
- Error handling

#### Integration Tests (15% of new tests)
- IPC handler → Manager → Repository flow
- Database operations with real SQLite
- Store → IPC → Main process round trips

#### E2E Tests (5% of new tests)
- Tab creation and navigation flow
- Proxy configuration and rotation
- Privacy toggle verification
- Search automation workflow

---

## 5. Testing Anti-Patterns Identified

### ❌ Anti-Pattern 1: Testing Mocks Instead of Real Code

**Current Problem:**
```typescript
// tests/unit/database/database-manager.test.ts
class TestDatabaseManager {  // This is a mock, not the real class!
  private db: Database.Database | null = null;
  // ...
}
```

**Fix:**
```typescript
// Import the REAL DatabaseManager
import { DatabaseManager } from '../../../electron/database';

// Mock only the Electron dependencies
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/test' }
}));
```

### ❌ Anti-Pattern 2: Incomplete Electron Mocks

**Current Problem:**
```typescript
vi.mock('electron', () => ({
  BrowserView: vi.fn(),  // Returns undefined, not a mock instance
}));
```

**Fix:**
```typescript
vi.mock('electron', () => ({
  BrowserView: vi.fn().mockImplementation(() => ({
    webContents: {
      loadURL: vi.fn(),
      on: vi.fn(),
      session: { partition: 'test' }
    },
    setBounds: vi.fn(),
    setAutoResize: vi.fn()
  }))
}));
```

### ❌ Anti-Pattern 3: No Global window.api Mock

**Current Problem:**
```typescript
// Stores call window.api but it's undefined in tests
window.api.tab.create(newTab);  // TypeError: Cannot read property 'tab' of undefined
```

**Fix in `tests/setup.ts`:**
```typescript
// Add to tests/setup.ts
(global as any).window = {
  api: {
    tab: {
      create: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue({ success: true }),
      update: vi.fn().mockResolvedValue({ success: true }),
    },
    proxy: {
      add: vi.fn().mockResolvedValue({ success: true, proxy: {} }),
      remove: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ success: true, proxies: [] }),
      validate: vi.fn().mockResolvedValue({ success: true }),
      setRotation: vi.fn().mockResolvedValue({ success: true }),
    },
    privacy: {
      setFingerprint: vi.fn().mockResolvedValue({ success: true }),
      toggleWebRTC: vi.fn().mockResolvedValue({ success: true }),
      toggleTrackerBlocking: vi.fn().mockResolvedValue({ success: true }),
    },
    automation: {
      startSearch: vi.fn().mockResolvedValue({ success: true }),
      stopSearch: vi.fn().mockResolvedValue({ success: true }),
      addDomain: vi.fn().mockResolvedValue({ success: true }),
    }
  }
};
```

### ❌ Anti-Pattern 4: Tests Without Cleanup

**Current Problem:**
```typescript
it('should create tab', () => {
  manager.createTab({});
  // No cleanup - tab persists to next test
});
```

**Fix:**
```typescript
afterEach(() => {
  manager.getAllTabs().forEach(tab => manager.closeTab(tab.id));
});
```

### ❌ Anti-Pattern 5: Hardcoded Test Data

**Current Problem:**
```typescript
it('should add proxy', async () => {
  const proxy = {
    id: '123',
    name: 'Test',
    host: 'proxy.com',
    port: 8080,
    // ... repeated in every test
  };
});
```

**Fix:**
```typescript
// Use factories
const proxy = createTestProxy({ name: 'Custom Name' });
```

---

## 6. Test Infrastructure Improvements

### 6.1 Update `tests/setup.ts`

```typescript
// tests/setup.ts - Enhanced version
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => {
      const hex = (uuidCounter++).toString(16).padStart(12, '0');
      return `00000000-0000-4000-a000-${hex}`;
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  },
  writable: true
});

// Mock window.api for Zustand stores
const mockApi = {
  tab: {
    create: vi.fn().mockResolvedValue({ success: true }),
    close: vi.fn().mockResolvedValue({ success: true }),
    update: vi.fn().mockResolvedValue({ success: true }),
  },
  proxy: {
    add: vi.fn().mockResolvedValue({ success: true, proxy: {} }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    list: vi.fn().mockResolvedValue({ success: true, proxies: [] }),
    validate: vi.fn().mockResolvedValue({ success: true }),
    setRotation: vi.fn().mockResolvedValue({ success: true }),
  },
  privacy: {
    setFingerprint: vi.fn().mockResolvedValue({ success: true }),
    toggleWebRTC: vi.fn().mockResolvedValue({ success: true }),
    toggleTrackerBlocking: vi.fn().mockResolvedValue({ success: true }),
  },
  automation: {
    startSearch: vi.fn().mockResolvedValue({ success: true, session: {} }),
    stopSearch: vi.fn().mockResolvedValue({ success: true }),
    addDomain: vi.fn().mockResolvedValue({ success: true }),
  }
};

Object.defineProperty(global, 'window', {
  value: { api: mockApi },
  writable: true
});

// Export for tests to access and customize
export { mockApi };
```

### 6.2 Update `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'dist-electron/**',
      'tests/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'dist-electron/',
        'tests/',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types/**'
      ],
      // Enforce coverage thresholds
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    // Improve test isolation
    isolate: true,
    // Better error reporting
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@electron': resolve(__dirname, 'electron'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types')
    }
  }
});
```

### 6.3 Create Test Utilities Module

**File:** `tests/utils/test-factories.ts`

```typescript
// Centralized test data factories
export function createTestProxy(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Proxy',
    host: 'proxy.example.com',
    port: 8080,
    protocol: 'https' as const,
    status: 'active' as const,
    failureCount: 0,
    totalRequests: 0,
    successRate: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

export function createTestTab(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    url: 'https://example.com',
    title: 'Test Tab',
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    createdAt: new Date(),
    ...overrides
  };
}

export function createTestAutomationSession(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Session',
    status: 'active' as const,
    engine: 'google' as const,
    keywords: ['test keyword'],
    targetDomains: ['example.com'],
    tasks: [],
    statistics: {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      avgDuration: 0,
      successRate: 0
    },
    ...overrides
  };
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Days 1-2)
- [ ] Update `tests/setup.ts` with global mocks
- [ ] Create `tests/utils/test-factories.ts`
- [ ] Update `vitest.config.ts` with thresholds
- [ ] Create proper Electron mock module

### Phase 2: Critical Modules (Days 3-5)
- [ ] Database layer tests (50 tests) → +15%
- [ ] Tab Manager tests (30 tests) → +5%
- [ ] Fix existing test files to test real code

### Phase 3: State Management (Days 6-7)
- [ ] Zustand store tests (50 tests) → +4%
- [ ] IPC handler tests (40 tests) → +3%

### Phase 4: UI Layer (Days 8-10)
- [ ] Custom hook tests (25 tests) → +2%
- [ ] Component tests (40 tests) → +5%

### Expected Coverage After Implementation

| Phase | Statements | Target Met? |
|-------|-----------|-------------|
| Current | 44.79% | ❌ |
| After Phase 2 | 64.79% | ❌ |
| After Phase 3 | 71.79% | ❌ |
| After Phase 4 | 81.79% | ✅ |

---

## 8. Quick Wins (Immediate Actions)

### Action 1: Fix Test Setup (30 minutes)
Add `window.api` mock to `tests/setup.ts` - enables store testing immediately.

### Action 2: Create Electron Mock Module (1 hour)
Create `tests/mocks/electron.ts` with proper mock implementations.

### Action 3: Add Coverage Thresholds (15 minutes)
Update `vitest.config.ts` to fail CI when coverage drops.

### Action 4: Fix Database Test Imports (1 hour)
Update database tests to import and test real `DatabaseManager`.

---

## Summary

The 0% coverage in critical modules is caused by:
1. **Dependency issues** - Electron APIs unavailable in test environment
2. **Mock implementations** - Tests test mocks, not real code
3. **Missing global mocks** - `window.api` undefined breaks stores
4. **No store tests** - 657 lines completely untested

**To reach 80% coverage:**
- Create ~200 new tests across 15+ files
- Fix existing tests to cover real implementations
- Update test infrastructure with proper mocks
- Estimated effort: 7-10 working days

Would you like me to:
1. **Start implementing** the test infrastructure improvements (setup.ts, factories)?
2. **Create specific test files** for a priority module (e.g., Zustand stores)?
3. **Fix the existing database tests** to cover the real DatabaseManager?
4. **Something else?**
