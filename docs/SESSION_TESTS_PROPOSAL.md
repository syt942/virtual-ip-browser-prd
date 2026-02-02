# Session Tests - Consistent Structure Proposal

Based on analysis of existing test patterns in this codebase, this document proposes a consistent structure for new session-related tests.

---

## Executive Summary

After reviewing the existing test infrastructure, I've identified clear patterns that should be followed for new session tests:

| Test Type | Location | Framework | Naming Convention |
|-----------|----------|-----------|-------------------|
| Unit Tests | `tests/unit/` | Vitest | `*.test.ts` |
| Integration Tests | `tests/integration/` | Vitest | `*.test.ts` |
| E2E Tests | `tests/e2e/` | Playwright | `*.spec.ts` |

---

## 1. Existing Patterns Analysis

### 1.1 File Structure Conventions

```
tests/
├── unit/
│   ├── session-manager.test.ts      # Existing session tests
│   └── database/
│       └── *.repository.test.ts     # Database layer tests
├── integration/
│   └── *.test.ts                    # Cross-module tests
├── e2e/
│   ├── session-isolation.spec.ts    # E2E session tests
│   └── pages/                       # Page Object Models
├── fixtures/                        # Shared test data
├── helpers/                         # Test utilities
└── templates/                       # Test templates
```

### 1.2 Common Patterns Identified

1. **AAA Pattern** (Arrange-Act-Assert) - Used consistently in unit tests
2. **Describe Blocks** - Organized by feature/method/behavior
3. **Factory Functions** - For creating test data (see `tests/fixtures/proxies.ts`)
4. **Page Objects** - For E2E tests (see `tests/e2e/pages/`)
5. **Test Helpers** - Shared utilities in `tests/helpers/test-helpers.ts`

---

## 2. Proposed Session Test Structure

### 2.1 Unit Test Template for Session Features

```typescript
/**
 * Session [Feature] Unit Tests
 * Tests for electron/core/session/[feature].ts
 * 
 * Coverage targets:
 * - [List key behaviors to test]
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DatabaseManager } from '../../electron/database';

// ============================================================================
// MOCKS
// ============================================================================

const mockDb = {
  query: vi.fn(() => []),
  queryOne: vi.fn(),
  execute: vi.fn(() => ({ changes: 1 })),
  close: vi.fn()
} as unknown as DatabaseManager;

// ============================================================================
// TEST SUITE
// ============================================================================

describe('SessionFeatureName', () => {
  let instance: SessionFeature;

  beforeEach(() => {
    instance = new SessionFeature(mockDb);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------
  describe('initialization', () => {
    it('should create instance with default configuration', () => {
      // Arrange & Act
      const feature = new SessionFeature(mockDb);

      // Assert
      expect(feature).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Core Functionality
  // --------------------------------------------------------------------------
  describe('methodName', () => {
    it('should perform expected action with valid input', async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = await instance.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should handle empty input gracefully', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await instance.methodName(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------
  describe('error handling', () => {
    it('should throw descriptive error for invalid state', async () => {
      // Arrange
      mockDb.execute.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(instance.methodName({})).rejects.toThrow('Database error');
    });
  });

  // --------------------------------------------------------------------------
  // Security
  // --------------------------------------------------------------------------
  describe('security', () => {
    it('should validate input parameters', async () => {
      // Arrange
      const maliciousInput = '<script>alert(1)</script>';

      // Act & Assert
      await expect(instance.methodName(maliciousInput)).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------
  describe('events', () => {
    it('should emit event when action occurs', async () => {
      // Arrange
      const listener = vi.fn();
      instance.on('session:event', listener);

      // Act
      await instance.methodName({});

      // Assert
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        /* expected event data */
      }));
    });
  });
});
```

### 2.2 Integration Test Template for Sessions

```typescript
/**
 * Session Integration Tests
 * Tests interactions between session modules
 * 
 * Key differences from unit tests:
 * - Use real database (test instance)
 * - Test complete workflows
 * - Focus on module boundaries
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { 
  createTestDatabaseWithSchema, 
  cleanupDatabase,
} from '../helpers/test-helpers';

describe('Session Module Integration', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = createTestDatabaseWithSchema();
  });

  afterAll(() => {
    cleanupDatabase(db);
  });

  beforeEach(() => {
    // Clear test data between tests
    db.exec('DELETE FROM sessions');
  });

  // --------------------------------------------------------------------------
  // Complete Workflows
  // --------------------------------------------------------------------------
  describe('complete workflow', () => {
    it('should save and restore session end-to-end', async () => {
      // Arrange
      const sessionData = {
        name: 'Integration Test Session',
        tabs: [{ url: 'https://example.com', title: 'Example' }],
        windowBounds: { x: 0, y: 0, width: 1200, height: 800 }
      };

      // Act
      const savedSession = await sessionManager.saveSession(
        sessionData.name,
        sessionData.tabs,
        sessionData.windowBounds
      );
      const loadedSession = await sessionManager.loadSession(savedSession.id);

      // Assert
      expect(loadedSession).toBeDefined();
      expect(loadedSession?.name).toBe(sessionData.name);
      expect(loadedSession?.tabs).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Data Flow
  // --------------------------------------------------------------------------
  describe('data flow between modules', () => {
    it('should pass session data correctly to tab manager', async () => {
      // Test session -> tab manager integration
    });
  });

  // --------------------------------------------------------------------------
  // Database Operations
  // --------------------------------------------------------------------------
  describe('database operations', () => {
    it('should persist session data correctly', async () => {
      // Test database persistence
    });

    it('should maintain referential integrity', async () => {
      // Test foreign key relationships
    });
  });

  // --------------------------------------------------------------------------
  // Error Recovery
  // --------------------------------------------------------------------------
  describe('error recovery', () => {
    it('should maintain consistency after partial failure', async () => {
      // Test transaction rollback scenarios
    });
  });
});
```

### 2.3 E2E Test Template for Sessions

```typescript
/**
 * E2E Tests - Session Feature (PRD EP-010)
 * Tests for session save/restore functionality
 * 
 * Coverage:
 * - UI interactions
 * - User workflows
 * - Visual verification
 */

import { test, expect } from '@playwright/test';
import { NavigationPage } from './pages/NavigationPage';

test.describe('Session Management', () => {
  let navPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    navPage = new NavigationPage(page);
    await navPage.goto();
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Screenshot on failure for debugging
    if (testInfo.status !== 'passed') {
      await page.screenshot({ 
        path: `test-results/screenshots/session-${testInfo.title.replace(/\\s+/g, '-')}-failed.png`,
        fullPage: true 
      });
    }
  });

  test('should save current session', async () => {
    // Arrange: Create tabs to save
    await navPage.createNewTab();
    await navPage.navigateTo('https://example.com');

    // Act: Save session
    // await navPage.saveSession('My Session');

    // Assert: Session saved confirmation
    // await expect(navPage.sessionSavedToast).toBeVisible();
    
    await navPage.screenshot('session-saved');
  });

  test('should restore saved session', async () => {
    // Test session restoration
  });

  test('should display session list', async () => {
    // Test session list UI
  });
});
```

---

## 3. Session Test Fixtures

### 3.1 Proposed `tests/fixtures/sessions.ts`

```typescript
/**
 * Session Test Fixtures
 * Reusable test data for session-related tests
 */

import type { Session, SessionTab, WindowBounds } from '../../electron/core/session/types';

// ============================================================================
// VALID CONFIGURATIONS
// ============================================================================

export const validSessionConfigs = [
  {
    name: 'Basic Session',
    tabs: [{ url: 'https://google.com', title: 'Google' }],
    windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
  },
  {
    name: 'Multi-Tab Session',
    tabs: [
      { url: 'https://google.com', title: 'Google' },
      { url: 'https://github.com', title: 'GitHub' },
      { url: 'https://example.com', title: 'Example' },
    ],
    windowBounds: { x: 100, y: 100, width: 1400, height: 900 },
  },
  {
    name: 'Session with Proxy',
    tabs: [
      { 
        url: 'https://example.com', 
        title: 'Example',
        proxyId: '550e8400-e29b-41d4-a716-446655440000'
      }
    ],
    windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
  },
];

// ============================================================================
// INVALID CONFIGURATIONS (for negative tests)
// ============================================================================

export const invalidSessionConfigs = [
  { name: '', tabs: [], reason: 'Empty session name' },
  { name: 'Test', tabs: null, reason: 'Null tabs array' },
  { name: 'Test', tabs: [{ url: '' }], reason: 'Empty URL in tab' },
];

// ============================================================================
// SECURITY TEST CASES
// ============================================================================

export const maliciousSessionConfigs = [
  {
    name: '<script>alert(1)</script>',
    tabs: [{ url: 'https://safe.com', title: 'Safe' }],
    reason: 'XSS in session name',
  },
  {
    name: 'Test',
    tabs: [{ url: 'javascript:alert(1)', title: 'XSS' }],
    reason: 'JavaScript URL in tab',
  },
  {
    name: 'Test',
    tabs: [{ url: 'file:///etc/passwd', title: 'File' }],
    reason: 'File URL in tab',
  },
  {
    name: 'Test',
    tabs: [{ url: 'http://localhost:8080', title: 'Local' }],
    reason: 'Localhost URL in tab',
  },
  {
    name: 'Test',
    tabs: [{ url: 'http://169.254.169.254/metadata', title: 'AWS' }],
    reason: 'AWS metadata URL',
  },
  {
    name: 'Test',
    tabs: [{ url: 'http://192.168.1.1', title: 'Private' }],
    reason: 'Private IP URL',
  },
];

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let sessionIdCounter = 0;

/**
 * Create a mock session with optional overrides
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const id = overrides.id || `00000000-0000-4000-a000-${String(sessionIdCounter++).padStart(12, '0')}`;
  
  return {
    id,
    name: `Test Session ${sessionIdCounter}`,
    tabs: [{ url: 'https://example.com', title: 'Example' }],
    windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock session tab
 */
export function createMockTab(overrides: Partial<SessionTab> = {}): SessionTab {
  return {
    url: 'https://example.com',
    title: 'Example Page',
    ...overrides,
  };
}

/**
 * Create mock window bounds
 */
export function createMockWindowBounds(overrides: Partial<WindowBounds> = {}): WindowBounds {
  return {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    ...overrides,
  };
}

/**
 * Create multiple mock sessions
 */
export function createMockSessions(count: number, overrides: Partial<Session> = {}): Session[] {
  return Array.from({ length: count }, (_, i) => 
    createMockSession({ 
      name: `Session ${i + 1}`,
      ...overrides 
    })
  );
}

/**
 * Reset session ID counter (call in beforeEach)
 */
export function resetSessionFixtures(): void {
  sessionIdCounter = 0;
}
```

---

## 4. Test Categories for Sessions

Based on the existing `session-manager.test.ts` and PRD requirements, new session tests should cover:

### 4.1 Unit Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| **CRUD Operations** | Save, load, update, delete sessions | P0 |
| **URL Validation** | SSRF prevention, malicious URL filtering | P0 |
| **Input Sanitization** | XSS prevention, HTML escaping | P0 |
| **ID Validation** | UUID format, path traversal prevention | P0 |
| **Window Bounds** | Bounds validation, safe defaults | P1 |
| **Event Emission** | session:saved, session:loaded events | P1 |
| **Tab Management** | Tab data persistence, restoration | P1 |
| **Error Handling** | Database errors, invalid data | P1 |

### 4.2 Integration Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| **Session + Tab Manager** | Tab restoration flow | P0 |
| **Session + Database** | Persistence verification | P0 |
| **Session + Proxy Manager** | Proxy assignment restoration | P1 |
| **Session + Privacy Manager** | Privacy settings restoration | P1 |

### 4.3 E2E Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| **Save Session UI** | Modal, form, confirmation | P0 |
| **Load Session UI** | Session list, selection | P0 |
| **Delete Session UI** | Confirmation dialog | P1 |
| **Session Templates** | Template save/apply | P2 |

---

## 5. Naming Conventions

### 5.1 File Naming

```
tests/unit/session-[feature].test.ts        # Unit tests
tests/integration/session-[flow].test.ts    # Integration tests
tests/e2e/session-[scenario].spec.ts        # E2E tests
tests/fixtures/sessions.ts                  # Shared fixtures
```

### 5.2 Test Naming

Follow the pattern: `should [expected behavior] when [condition]`

```typescript
// ✅ Good test names
it('should save session with tabs and window bounds')
it('should filter localhost URLs when loading session')
it('should emit session:saved event after successful save')
it('should return null for non-existent session')
it('should reject invalid session IDs')

// ❌ Avoid vague names
it('should work')
it('test save')
it('handles errors')
```

### 5.3 Describe Block Organization

```typescript
describe('SessionManager', () => {
  describe('saveSession', () => {
    it('should save session with valid data');
    it('should emit event on save');
  });

  describe('loadSession', () => {
    it('should load existing session');
    it('should return null for non-existent');
  });

  describe('security', () => {
    describe('SSRF Prevention', () => {
      it('should filter localhost URLs');
      it('should filter AWS metadata URLs');
    });

    describe('XSS Prevention', () => {
      it('should sanitize session names');
      it('should sanitize tab titles');
    });
  });
});
```

---

## 6. Implementation Checklist

### 6.1 New Session Unit Tests Needed

Based on gaps identified in current coverage:

- [ ] `tests/unit/session-persistence.test.ts` - Session save/load persistence
- [ ] `tests/unit/session-templates.test.ts` - Session template management
- [ ] `tests/unit/session-migration.test.ts` - Session data migration
- [ ] `tests/unit/database/session.repository.test.ts` - Database operations

### 6.2 New Session Integration Tests Needed

- [ ] `tests/integration/session-tab-restoration.test.ts` - Full tab restore flow
- [ ] `tests/integration/session-proxy-restoration.test.ts` - Proxy config restore

### 6.3 New Session E2E Tests Needed

- [ ] `tests/e2e/session-save-restore.spec.ts` - Complete save/restore flow
- [ ] `tests/e2e/session-templates.spec.ts` - Template UI workflow

---

## 7. Summary

The proposed structure ensures:

1. **Consistency** - All session tests follow the same patterns
2. **Maintainability** - Clear organization makes tests easy to find and update
3. **Coverage** - Comprehensive testing across unit, integration, and E2E levels
4. **Security Focus** - Dedicated security test categories (aligned with existing patterns)
5. **Reusability** - Shared fixtures and helpers reduce duplication

This structure aligns with the existing codebase patterns found in:
- `tests/unit/tab-manager.test.ts` (comprehensive unit test structure)
- `tests/unit/database/proxy-repository.test.ts` (database test patterns)
- `tests/e2e/session-isolation.spec.ts` (E2E patterns with Page Objects)
- `tests/fixtures/proxies.ts` (fixture factory patterns)
