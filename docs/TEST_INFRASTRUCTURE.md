# Virtual IP Browser - Test Infrastructure Documentation

## Overview

This document describes the comprehensive test infrastructure for Virtual IP Browser, following Test-Driven Development (TDD) best practices with a target of 80%+ code coverage.

## Test Architecture

```
tests/
├── setup.ts                    # Global test configuration
├── unit/                       # Unit tests (Vitest)
│   ├── database/              # Database repository tests
│   ├── privacy/               # Privacy module tests
│   ├── resilience/            # Circuit breaker tests
│   ├── stores/                # Zustand store tests
│   ├── ipc/                   # IPC handler tests
│   └── ui/                    # UI component tests
├── integration/               # Integration tests (Vitest)
│   ├── ipc-communication.test.ts
│   ├── ipc-handlers.test.ts
│   └── magic-ui-integration.test.tsx
├── e2e/                       # End-to-end tests (Playwright)
│   ├── fixtures/              # E2E test data
│   ├── pages/                 # Page object models
│   └── *.spec.ts              # E2E test specs
├── fixtures/                  # Shared test fixtures
│   ├── proxies.ts             # Proxy test data
│   ├── automation.ts          # Automation test data
│   ├── search-tasks.ts        # Search task test data
│   ├── creators.ts            # Creator support test data
│   └── credentials.ts         # Credential test data
├── helpers/                   # Test utilities
│   ├── electron-mocks.ts      # Electron API mocks
│   ├── test-helpers.ts        # Common test utilities
│   └── window-api.mock.ts     # Window API mocks
├── mocks/                     # Mock implementations
│   └── window-api.mock.ts     # IPC mock for renderer
└── templates/                 # Test templates
    ├── unit-test.template.ts
    └── integration-test.template.ts
```

## Running Tests

### Unit & Integration Tests (Vitest)

```bash
# Run all unit/integration tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### E2E Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### CI/CD Testing

```bash
# Run all tests with coverage (for CI)
npm run test:ci

# Run all tests
npm run test:all
```

## Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 80% | TBD |
| Branches | 75% | TBD |
| Functions | 80% | TBD |
| Lines | 80% | TBD |

### Coverage by Module

| Module | Target | Priority |
|--------|--------|----------|
| `electron/core/proxy-engine/` | 85% | P0 |
| `electron/core/privacy/` | 85% | P0 |
| `electron/core/automation/` | 80% | P0 |
| `electron/core/tabs/` | 80% | P1 |
| `electron/database/` | 80% | P0 |
| `src/stores/` | 80% | P0 |
| `src/components/` | 70% | P1 |

## Test Types

### Unit Tests

Unit tests verify individual functions, classes, and modules in isolation.

**Characteristics:**
- Fast execution (< 50ms per test)
- No external dependencies (all mocked)
- Single responsibility per test
- AAA pattern (Arrange-Act-Assert)

**Example:**
```typescript
describe('ProxyValidator', () => {
  it('should validate proxy with correct format', () => {
    // Arrange
    const proxy = { host: 'example.com', port: 8080 };
    
    // Act
    const result = validator.validate(proxy);
    
    // Assert
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests

Integration tests verify interactions between modules and real dependencies.

**Characteristics:**
- May use real database (in-memory SQLite)
- Tests data flow between modules
- Verifies side effects
- May be slower than unit tests

**Example:**
```typescript
describe('Proxy + Database Integration', () => {
  let db: Database.Database;
  
  beforeEach(() => {
    db = createTestDatabaseWithSchema();
  });
  
  it('should persist proxy to database', async () => {
    const manager = new ProxyManager(db);
    await manager.add({ host: 'example.com', port: 8080 });
    
    const proxies = db.prepare('SELECT * FROM proxies').all();
    expect(proxies).toHaveLength(1);
  });
});
```

### E2E Tests

End-to-end tests verify complete user workflows through the UI.

**Characteristics:**
- Uses Playwright for browser automation
- Tests real user scenarios
- Slower execution
- Uses page object model pattern

**Example:**
```typescript
test('user can add and validate proxy', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="proxy-panel-toggle"]');
  await page.fill('[data-testid="proxy-host"]', 'example.com');
  await page.fill('[data-testid="proxy-port"]', '8080');
  await page.click('[data-testid="add-proxy-button"]');
  
  await expect(page.locator('[data-testid="proxy-item"]')).toBeVisible();
});
```

## Test Fixtures

### Using Fixtures

```typescript
import { createMockProxy, createMockProxies, resetProxyFixtures } from '../fixtures/proxies';
import { createMockSearchTask, createSearchConfig } from '../fixtures/search-tasks';
import { createMockCreator } from '../fixtures/creators';

describe('MyModule', () => {
  beforeEach(() => {
    resetProxyFixtures();
  });
  
  it('should process proxy', () => {
    const proxy = createMockProxy({ status: 'active' });
    // ... test logic
  });
});
```

### Available Fixtures

| Fixture | Location | Factory Functions |
|---------|----------|-------------------|
| Proxies | `tests/fixtures/proxies.ts` | `createMockProxy`, `createMockProxies`, `createMixedStatusProxies` |
| Search Tasks | `tests/fixtures/search-tasks.ts` | `createMockSearchTask`, `createSearchConfig`, `createCompletedTask` |
| Creators | `tests/fixtures/creators.ts` | `createMockCreator`, `createMockSupportSession` |
| Automation | `tests/fixtures/automation.ts` | `createMockSession`, `createMockTask` |

## Mocking

### Electron Mocks

```typescript
import {
  createMockBrowserView,
  createMockWebContents,
  createMockSession,
  createMockIpcMain,
  setupElectronMocks,
} from '../helpers/electron-mocks';

describe('TabManager', () => {
  it('should create BrowserView', () => {
    const mockView = createMockBrowserView();
    // ... test logic
  });
});
```

### Window API Mock

```typescript
import {
  createMockWindowApi,
  setupWindowApiMock,
  mockApiError,
} from '../mocks/window-api.mock';

describe('ProxyStore', () => {
  let api: MockWindowApi;
  
  beforeEach(() => {
    api = setupWindowApiMock();
  });
  
  it('should handle API errors', async () => {
    mockApiError(api, 'proxy', 'add', 'Network error');
    // ... test error handling
  });
});
```

### Database Mock

```typescript
import {
  createTestDatabase,
  createTestDatabaseWithSchema,
  insertTestProxy,
  cleanupDatabase,
} from '../helpers/test-helpers';

describe('ProxyRepository', () => {
  let db: Database.Database;
  
  beforeEach(() => {
    db = createTestDatabaseWithSchema();
  });
  
  afterEach(() => {
    cleanupDatabase(db);
  });
});
```

## Test Templates

Use the templates in `tests/templates/` when creating new tests:

- `unit-test.template.ts` - For new unit tests
- `integration-test.template.ts` - For new integration tests

## TDD Workflow

1. **Write Test First (Red)**
   ```typescript
   it('should calculate position change correctly', () => {
     const tracker = new PositionTracker();
     tracker.record({ keyword: 'test', position: 5 });
     tracker.record({ keyword: 'test', position: 3 });
     
     const change = tracker.getLatestChange('test');
     expect(change.direction).toBe('up');
     expect(change.difference).toBe(2);
   });
   ```

2. **Run Test (Fails)**
   ```bash
   npm test -- --run position-tracking
   ```

3. **Implement Feature (Green)**
   - Write minimal code to make test pass

4. **Refactor (Refactor)**
   - Improve code quality
   - Keep tests passing

5. **Verify Coverage**
   ```bash
   npm run test:coverage
   ```

## Best Practices

### Do's

✅ Write tests before implementation (TDD)
✅ One assertion per test (when practical)
✅ Use descriptive test names
✅ Clean up resources in afterEach
✅ Use fixtures for test data
✅ Mock external dependencies in unit tests
✅ Test edge cases and error paths
✅ Keep tests fast and isolated

### Don'ts

❌ Test implementation details
❌ Share state between tests
❌ Use arbitrary timeouts (use fake timers)
❌ Skip tests without TODO comments
❌ Ignore flaky tests
❌ Test third-party code

## CI/CD Integration

### GitHub Actions Workflow

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npm run test:ci
    - uses: codecov/codecov-action@v3
      with:
        files: ./test-reports/coverage/lcov.info
```

### Coverage Reporting

Coverage reports are generated in:
- `test-reports/coverage/` - Vitest coverage
- `playwright-report/` - Playwright report
- `test-results/` - Test artifacts

## Troubleshooting

### Common Issues

**Tests timing out:**
```typescript
// Increase timeout for specific test
it('should handle slow operation', async () => {
  // ... test
}, 30000);
```

**Mock not working:**
```typescript
// Ensure mock is defined before import
vi.mock('@/module', () => ({
  default: vi.fn(),
}));

// Then import
import module from '@/module';
```

**Flaky E2E tests:**
```typescript
// Use explicit waits instead of arbitrary delays
await page.waitForSelector('[data-testid="result"]');
// Not: await page.waitForTimeout(1000);
```

## New Test Checklist

When adding new tests:

- [ ] Follow AAA pattern (Arrange-Act-Assert)
- [ ] Use descriptive test names
- [ ] Add to appropriate directory (unit/integration/e2e)
- [ ] Use fixtures for test data
- [ ] Mock external dependencies
- [ ] Test both success and error paths
- [ ] Test edge cases
- [ ] Verify coverage impact
- [ ] Update this documentation if needed
