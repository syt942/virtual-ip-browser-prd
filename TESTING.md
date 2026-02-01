# Virtual IP Browser - Testing Documentation

**Last Updated:** 2025-02-01  
**Version:** 1.3.0  
**Total Tests:** 2,850+

## Overview

The Virtual IP Browser uses a comprehensive testing strategy with three testing tiers:
- **Unit Tests**: Fast, isolated tests for individual functions and classes
- **Integration Tests**: Tests for module interactions and IPC communication
- **E2E Tests**: Full application tests using Playwright

## Test Statistics

| Category | Test Files | Test Cases | Coverage Target |
|----------|------------|------------|-----------------|
| Unit Tests | 50+ | ~2,000 | 80%+ |
| Integration Tests | 10+ | ~300 | Core flows |
| E2E Tests | 24 | ~550 | Critical paths |
| **Total** | **92** | **2,850+** | - |

### Test Count Breakdown

```
Unit Tests:
├── stores/           ~200 tests (4 store files)
├── privacy/          ~400 tests (11 test files)
├── resilience/       ~150 tests (2 test files)
├── automation/       ~300 tests (domain, search, scheduling)
├── proxy/            ~250 tests (rotation strategies)
├── security/         ~200 tests (validation, sanitization)
└── other/            ~500 tests (session, tabs, etc.)

Integration Tests:
├── ipc-communication.test.ts    ~100 tests
├── ipc-handlers.test.ts         ~150 tests
└── ipc/missing-handlers.test.ts ~50 tests

E2E Tests:
├── navigation.spec.ts           ~30 tests
├── proxy-management.spec.ts     ~40 tests
├── proxy-rotation.spec.ts       ~35 tests
├── privacy-protection.spec.ts   ~40 tests
├── privacy-verification.spec.ts ~25 tests
├── automation.spec.ts           ~35 tests
├── scheduling-system.spec.ts    ~30 tests
├── creator-support.spec.ts      ~25 tests
├── error-handling.spec.ts       ~40 tests
├── magic-ui-components.spec.ts  ~45 tests
├── magic-ui-ux.spec.ts          ~35 tests
├── performance-benchmarks.spec.ts ~30 tests
├── circuit-breaker.spec.ts      ~25 tests
├── activity-log.spec.ts         ~30 tests
├── database-migration-004.spec.ts ~25 tests
├── encryption-migration.spec.ts ~30 tests
└── others                       ~80 tests
```

## Test Organization

```
tests/
├── unit/                           # Unit tests (Vitest)
│   ├── stores/                     # Zustand store tests
│   │   ├── proxyStore.test.ts
│   │   ├── privacyStore.test.ts
│   │   ├── automationStore.test.ts
│   │   └── animationStore.test.ts
│   ├── privacy/                    # Privacy module tests
│   │   ├── canvas.test.ts
│   │   ├── webgl.test.ts
│   │   ├── audio.test.ts
│   │   ├── navigator.test.ts
│   │   ├── timezone.test.ts
│   │   ├── webrtc.test.ts
│   │   ├── tracker-blocker.test.ts
│   │   ├── pattern-matcher.test.ts
│   │   ├── detection-vectors.test.ts
│   │   ├── privacy-manager-integration.test.ts
│   │   └── index.test.ts
│   ├── resilience/                 # Circuit breaker tests
│   │   ├── circuit-breaker.test.ts
│   │   └── circuit-breaker-registry.test.ts
│   ├── rotation-strategies.test.ts # Proxy rotation tests
│   ├── domain-targeting.test.ts    # Domain targeting tests
│   ├── cron-parser.test.ts         # Scheduler tests
│   ├── self-healing-engine.test.ts # Self-healing tests
│   ├── resource-monitor.test.ts    # Resource monitoring
│   ├── session-manager.test.ts     # Session management
│   ├── tab-manager.test.ts         # Tab management
│   ├── comprehensive-security.test.ts # Security tests
│   └── code-review-fixes.test.ts   # Regression tests
├── integration/                    # Integration tests (Vitest)
│   ├── ipc-communication.test.ts   # IPC message flow
│   ├── ipc-handlers.test.ts        # Handler validation
│   └── ipc/
│       └── missing-handlers.test.ts
├── e2e/                            # E2E tests (Playwright)
│   ├── navigation.spec.ts
│   ├── proxy-management.spec.ts
│   ├── proxy-rotation.spec.ts
│   ├── privacy-protection.spec.ts
│   ├── privacy-verification.spec.ts
│   ├── automation.spec.ts
│   ├── scheduling-system.spec.ts
│   ├── creator-support.spec.ts
│   ├── error-handling.spec.ts
│   ├── magic-ui-components.spec.ts
│   ├── magic-ui-ux.spec.ts
│   ├── performance-benchmarks.spec.ts
│   ├── circuit-breaker.spec.ts
│   ├── activity-log.spec.ts
│   ├── stats-panel.spec.ts
│   ├── tab-management.spec.ts
│   ├── session-isolation.spec.ts
│   ├── database-migration-004.spec.ts
│   ├── encryption-migration.spec.ts
│   ├── captcha-detection.spec.ts
│   └── security-fixes-validation.spec.ts
├── fixtures/                       # Test fixtures
├── helpers/                        # Test utilities
├── mocks/                          # Mock implementations
├── templates/                      # Test templates
└── setup.ts                        # Test setup
```

## Running Tests

### All Tests

```bash
# Run all unit and integration tests
npm run test:run

# Run all tests including E2E
npm run test:all

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx vitest run tests/unit/privacy/canvas.test.ts

# Run tests matching pattern
npx vitest run -t "canvas spoofing"
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npx vitest run tests/integration/ipc-handlers.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser UI
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/proxy-management.spec.ts

# View test report
npm run test:e2e:report
```

### Coverage

```bash
# Generate coverage report
npm run test:coverage

# View coverage report in browser
npm run test:coverage:report
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './test-reports/coverage',
      exclude: ['node_modules', 'tests', '**/*.d.ts'],
    },
    setupFiles: ['tests/setup.ts'],
    testTimeout: 10000,
  },
});
```

### Playwright Configuration (`playwright.config.ts`)

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
```

## Writing Tests

### Unit Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ModuleName', () => {
  let instance: ModuleClass;

  beforeEach(() => {
    instance = new ModuleClass();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('methodName', () => {
    it('should handle valid input correctly', () => {
      const result = instance.methodName('valid-input');
      expect(result).toBe('expected-output');
    });

    it('should throw error for invalid input', () => {
      expect(() => instance.methodName(null)).toThrow('Invalid input');
    });

    it('should call dependency with correct arguments', () => {
      const spy = vi.spyOn(dependency, 'method');
      instance.methodName('input');
      expect(spy).toHaveBeenCalledWith('expected-arg');
    });
  });
});
```

### Integration Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Integration: ModuleA + ModuleB', () => {
  let moduleA: ModuleA;
  let moduleB: ModuleB;

  beforeAll(async () => {
    moduleA = new ModuleA();
    moduleB = new ModuleB(moduleA);
    await moduleA.initialize();
  });

  afterAll(async () => {
    await moduleA.cleanup();
  });

  it('should integrate correctly when condition X', async () => {
    const result = await moduleB.operationThatUsesA();
    expect(result).toMatchObject({
      status: 'success',
      data: expect.any(Object),
    });
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display correct UI elements', async ({ page }) => {
    await expect(page.locator('[data-testid="element"]')).toBeVisible();
  });

  test('should handle user interaction', async ({ page }) => {
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toHaveText('Expected');
  });

  test('should persist state after action', async ({ page }) => {
    await page.fill('[data-testid="input"]', 'test-value');
    await page.click('[data-testid="save"]');
    await page.reload();
    await expect(page.locator('[data-testid="input"]')).toHaveValue('test-value');
  });
});
```

## Test Categories

### Security Tests

Located in `tests/unit/comprehensive-security.test.ts` and `tests/e2e/security-fixes-validation.spec.ts`:

- Input validation (XSS, SSRF, injection)
- Rate limiting enforcement
- Credential encryption
- CSP header validation
- Channel whitelist verification

### Privacy Tests

Located in `tests/unit/privacy/`:

- Canvas fingerprint spoofing
- WebGL fingerprint spoofing
- Audio context spoofing
- Navigator property spoofing
- Timezone spoofing
- WebRTC leak prevention
- Tracker blocking effectiveness

### Automation Tests

Located in `tests/unit/` and `tests/e2e/automation.spec.ts`:

- Search engine execution
- Domain targeting accuracy
- Human-like behavior simulation
- Scheduling (cron parsing)
- Self-healing recovery
- Circuit breaker behavior

### Performance Tests

Located in `tests/e2e/performance-benchmarks.spec.ts`:

- Application launch time (<3s)
- Tab creation time (<500ms)
- Memory usage per tab (<200MB)
- UI responsiveness (<100ms)
- Animation frame rate (>30 FPS)

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Reports

```bash
# Unit test coverage report
test-reports/coverage/index.html

# E2E test report  
playwright-report/index.html

# JUnit XML (for CI)
test-results/junit.xml
```

## Best Practices

### Do's

- ✅ Write tests before or alongside code (TDD)
- ✅ Use descriptive test names that explain expected behavior
- ✅ Mock external dependencies
- ✅ Test edge cases and error conditions
- ✅ Keep tests independent and isolated
- ✅ Use data-testid attributes for E2E selectors
- ✅ Clean up resources in afterEach/afterAll

### Don'ts

- ❌ Don't test implementation details
- ❌ Don't share state between tests
- ❌ Don't use hardcoded timeouts (use waitFor)
- ❌ Don't ignore flaky tests (fix root cause)
- ❌ Don't test external services directly

## Debugging Tests

### Vitest

```bash
# Run with verbose output
npx vitest run --reporter=verbose

# Run single test in isolation
npx vitest run -t "specific test name"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/vitest run
```

### Playwright

```bash
# Run with debug mode
npx playwright test --debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip

# Run headed with slow motion
npx playwright test --headed --slow-mo=1000
```

---

**Related Documentation:**
- [Development Guide](./DEVELOPMENT_GUIDE.md) - Developer workflow
- [Architecture](./docs/ARCHITECTURE.md) - System architecture
- [Security](./docs/SECURITY.md) - Security testing
