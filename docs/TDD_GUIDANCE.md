# Test-Driven Development (TDD) Guidance
# Virtual IP Browser - Remaining Features

## Table of Contents

1. [TDD Philosophy & Red-Green-Refactor Cycle](#1-tdd-philosophy--red-green-refactor-cycle)
2. [Test Structure & Conventions](#2-test-structure--conventions)
3. [Coverage Targets & Quality Gates](#3-coverage-targets--quality-gates)
4. [Feature-Specific TDD Guides](#4-feature-specific-tdd-guides)
5. [Test Examples & Patterns](#5-test-examples--patterns)

---

## 1. TDD Philosophy & Red-Green-Refactor Cycle

### 1.1 The TDD Mantra

**"No code without tests. Tests are not optional."**

TDD follows a strict discipline:

```
┌─────────┐     ┌─────────┐     ┌──────────┐
│   RED   │────▶│  GREEN  │────▶│ REFACTOR │
│  Write  │     │  Write  │     │  Clean   │
│ Failing │     │ Minimal │     │   Code   │
│  Test   │     │  Code   │     │          │
└─────────┘     └─────────┘     └──────────┘
     ▲                               │
     └───────────────────────────────┘
```

### 1.2 Step-by-Step Process

#### Step 1: RED - Write a Failing Test First

```typescript
// ❌ Test MUST fail initially
describe('KeywordQueue', () => {
  it('should add keyword to queue', () => {
    const queue = new KeywordQueue();
    queue.add('test keyword');
    expect(queue.size()).toBe(1);
  });
});
```

Run the test:
```bash
npm test -- --run keyword-queue
# Expected: FAIL - KeywordQueue is not defined
```

#### Step 2: GREEN - Write Minimal Code to Pass

```typescript
// ✅ Write ONLY enough code to pass the test
export class KeywordQueue {
  private keywords: string[] = [];
  
  add(keyword: string): void {
    this.keywords.push(keyword);
  }
  
  size(): number {
    return this.keywords.length;
  }
}
```

Run the test:
```bash
npm test -- --run keyword-queue
# Expected: PASS
```

#### Step 3: REFACTOR - Improve Without Changing Behavior

```typescript
// 🔄 Clean up, but tests must still pass
export class KeywordQueue {
  private readonly keywords: Set<string> = new Set();
  
  add(keyword: string): void {
    const trimmed = keyword.trim();
    if (trimmed) {
      this.keywords.add(trimmed);
    }
  }
  
  size(): number {
    return this.keywords.size;
  }
}
```

### 1.3 TDD Benefits

| Benefit | Description |
|---------|-------------|
| **Design-First** | Tests force you to think about API before implementation |
| **Documentation** | Tests serve as living documentation |
| **Confidence** | Refactor fearlessly with test safety net |
| **Bug Prevention** | Catch issues before they reach production |
| **Simpler Code** | Write only what's needed to pass tests |

---

## 2. Test Structure & Conventions

### 2.1 Test File Organization

```
tests/
├── unit/                          # Unit tests (70% of tests)
│   ├── automation/
│   │   ├── keyword-queue.test.ts
│   │   ├── position-tracker.test.ts
│   │   └── self-healing.test.ts
│   ├── resilience/
│   │   ├── circuit-breaker.test.ts
│   │   └── resource-monitor.test.ts
│   └── creator-support/
│       └── support-statistics.test.ts
├── integration/                   # Integration tests (20% of tests)
│   ├── automation-flow.test.ts
│   └── database-operations.test.ts
├── e2e/                          # E2E tests (10% of tests)
│   ├── automation.spec.ts
│   └── creator-support.spec.ts
└── fixtures/                     # Shared test data
    ├── keywords.ts
    ├── proxies.ts
    └── creators.ts
```

### 2.2 Test Naming Conventions

Use descriptive names following the pattern: `should [expected behavior] when [condition]`

```typescript
// ✅ Good test names
describe('KeywordQueue', () => {
  it('should add keyword to queue when valid string provided', () => {});
  it('should reject duplicate keywords when same keyword exists', () => {});
  it('should trim whitespace when keyword has leading/trailing spaces', () => {});
  it('should throw error when keyword exceeds max length', () => {});
});

// ❌ Bad test names
describe('KeywordQueue', () => {
  it('test add', () => {});           // Too vague
  it('works', () => {});              // No information
  it('keyword stuff', () => {});      // Meaningless
});
```

### 2.3 Test Structure (Arrange-Act-Assert)

```typescript
it('should remove keyword from queue', () => {
  // Arrange - Set up test data and dependencies
  const queue = new KeywordQueue();
  queue.add('keyword1');
  queue.add('keyword2');
  
  // Act - Perform the action being tested
  const removed = queue.remove('keyword1');
  
  // Assert - Verify the expected outcome
  expect(removed).toBe(true);
  expect(queue.size()).toBe(1);
  expect(queue.has('keyword1')).toBe(false);
});
```

### 2.4 One Assertion Per Test (When Possible)

```typescript
// ✅ Preferred: Single focused assertion
it('should return true when keyword is removed', () => {
  const queue = new KeywordQueue();
  queue.add('keyword1');
  expect(queue.remove('keyword1')).toBe(true);
});

it('should decrease size when keyword is removed', () => {
  const queue = new KeywordQueue();
  queue.add('keyword1');
  queue.remove('keyword1');
  expect(queue.size()).toBe(0);
});

// ✅ Also acceptable: Multiple related assertions
it('should correctly remove keyword from queue', () => {
  const queue = new KeywordQueue();
  queue.add('keyword1');
  
  const removed = queue.remove('keyword1');
  
  expect(removed).toBe(true);
  expect(queue.has('keyword1')).toBe(false);
});
```

### 2.5 Test Independence

```typescript
// ❌ BAD: Tests depend on each other
let sharedQueue: KeywordQueue;

it('adds keyword', () => {
  sharedQueue = new KeywordQueue();
  sharedQueue.add('test');
  expect(sharedQueue.size()).toBe(1);
});

it('removes keyword added in previous test', () => {
  // FAILS if run alone!
  sharedQueue.remove('test');
  expect(sharedQueue.size()).toBe(0);
});

// ✅ GOOD: Independent tests
describe('KeywordQueue', () => {
  let queue: KeywordQueue;
  
  beforeEach(() => {
    queue = new KeywordQueue();
  });
  
  it('adds keyword', () => {
    queue.add('test');
    expect(queue.size()).toBe(1);
  });
  
  it('removes keyword', () => {
    queue.add('test');
    queue.remove('test');
    expect(queue.size()).toBe(0);
  });
});
```

---

## 3. Coverage Targets & Quality Gates

### 3.1 Coverage Requirements

| Test Type | Coverage Target | Priority |
|-----------|-----------------|----------|
| Unit Tests | ≥ 80% | P0 |
| Integration Tests | ≥ 60% | P1 |
| E2E Tests | Critical paths | P1 |

### 3.2 Running Coverage Reports

```bash
# Run tests with coverage
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

### 3.3 Quality Gates (CI/CD)

All of these must pass before merge:

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - name: Run Unit Tests
      run: npm run test:unit -- --coverage
      
    - name: Check Coverage Thresholds
      run: |
        npm run test:coverage -- --coverage.thresholds.lines=80
        npm run test:coverage -- --coverage.thresholds.functions=80
        npm run test:coverage -- --coverage.thresholds.branches=80
        
    - name: Run E2E Tests
      run: npm run test:e2e
```

### 3.4 No Skipped Tests Rule

```typescript
// ❌ NOT ALLOWED without justification
it.skip('should handle edge case', () => {});

// ✅ If skip is necessary, document why
it.skip('should handle edge case - BLOCKED: waiting for API update #123', () => {});
```

---

## 4. Feature-Specific TDD Guides

### 4.1 Keyword Queue Enhancement (Phase 4 - 3 days)

#### Requirements
- CRUD operations for keywords
- Bulk import/export
- Persistence to database
- Duplicate detection
- Maximum queue size (10,000+)

#### Test File: `tests/unit/automation/keyword-queue.test.ts`

```typescript
/**
 * Keyword Queue Enhancement Tests - TDD
 * Write these tests FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Type definitions (define expected interface first)
interface KeywordQueueConfig {
  maxSize?: number;
  allowDuplicates?: boolean;
}

describe('KeywordQueue', () => {
  let queue: any; // Will be typed after implementation
  let mockDb: any;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
    };
    
    const { KeywordQueue } = await import(
      '../../../electron/core/automation/keyword-queue'
    );
    queue = new KeywordQueue(mockDb);
  });

  // =========================================
  // CRUD OPERATIONS
  // =========================================
  describe('add', () => {
    it('should add single keyword to queue', () => {
      queue.add('test keyword');
      expect(queue.size()).toBe(1);
      expect(queue.has('test keyword')).toBe(true);
    });

    it('should trim whitespace from keyword', () => {
      queue.add('  trimmed keyword  ');
      expect(queue.has('trimmed keyword')).toBe(true);
    });

    it('should reject empty string', () => {
      queue.add('');
      expect(queue.size()).toBe(0);
    });

    it('should reject whitespace-only string', () => {
      queue.add('   ');
      expect(queue.size()).toBe(0);
    });

    it('should detect and reject duplicates by default', () => {
      queue.add('duplicate');
      queue.add('duplicate');
      expect(queue.size()).toBe(1);
    });

    it('should return false when duplicate rejected', () => {
      queue.add('duplicate');
      const result = queue.add('duplicate');
      expect(result).toBe(false);
    });

    it('should enforce max queue size', () => {
      const smallQueue = new queue.constructor(mockDb, { maxSize: 3 });
      smallQueue.add('one');
      smallQueue.add('two');
      smallQueue.add('three');
      const result = smallQueue.add('four');
      
      expect(result).toBe(false);
      expect(smallQueue.size()).toBe(3);
    });
  });

  describe('remove', () => {
    it('should remove existing keyword', () => {
      queue.add('to-remove');
      const removed = queue.remove('to-remove');
      
      expect(removed).toBe(true);
      expect(queue.has('to-remove')).toBe(false);
    });

    it('should return false for non-existent keyword', () => {
      const removed = queue.remove('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all keywords', () => {
      queue.add('one');
      queue.add('two');
      queue.add('three');
      
      queue.clear();
      
      expect(queue.size()).toBe(0);
    });
  });

  describe('getAll', () => {
    it('should return all keywords as array', () => {
      queue.add('first');
      queue.add('second');
      
      const keywords = queue.getAll();
      
      expect(keywords).toEqual(['first', 'second']);
    });

    it('should return empty array when queue is empty', () => {
      expect(queue.getAll()).toEqual([]);
    });
  });

  // =========================================
  // BULK OPERATIONS
  // =========================================
  describe('addBulk', () => {
    it('should add multiple keywords at once', () => {
      const result = queue.addBulk(['kw1', 'kw2', 'kw3']);
      
      expect(result.added).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(queue.size()).toBe(3);
    });

    it('should report duplicates in bulk add', () => {
      queue.add('existing');
      const result = queue.addBulk(['existing', 'new1', 'new2']);
      
      expect(result.added).toBe(2);
      expect(result.duplicates).toBe(1);
    });

    it('should handle newline-separated string', () => {
      const result = queue.addBulk('kw1\nkw2\nkw3');
      expect(result.added).toBe(3);
    });

    it('should skip empty lines in bulk import', () => {
      const result = queue.addBulk('kw1\n\nkw2\n  \nkw3');
      expect(result.added).toBe(3);
    });
  });

  describe('export', () => {
    it('should export keywords as newline-separated string', () => {
      queue.add('export1');
      queue.add('export2');
      
      const exported = queue.export();
      
      expect(exported).toBe('export1\nexport2');
    });

    it('should export as JSON when format specified', () => {
      queue.add('json1');
      queue.add('json2');
      
      const exported = queue.export('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toEqual(['json1', 'json2']);
    });

    it('should export as CSV when format specified', () => {
      queue.add('csv1');
      queue.add('csv2');
      
      const exported = queue.export('csv');
      
      expect(exported).toBe('"csv1","csv2"');
    });
  });

  // =========================================
  // PERSISTENCE
  // =========================================
  describe('save', () => {
    it('should persist keywords to database', async () => {
      queue.add('persist1');
      queue.add('persist2');
      
      await queue.save();
      
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe('load', () => {
    it('should load keywords from database', async () => {
      mockDb.query.mockResolvedValue([
        { keyword: 'loaded1' },
        { keyword: 'loaded2' },
      ]);
      
      await queue.load();
      
      expect(queue.size()).toBe(2);
      expect(queue.has('loaded1')).toBe(true);
    });
  });

  // =========================================
  // EDGE CASES
  // =========================================
  describe('edge cases', () => {
    it('should handle special characters in keywords', () => {
      queue.add('café & résumé');
      expect(queue.has('café & résumé')).toBe(true);
    });

    it('should handle unicode characters', () => {
      queue.add('日本語キーワード');
      expect(queue.has('日本語キーワード')).toBe(true);
    });

    it('should handle very long keywords', () => {
      const longKeyword = 'a'.repeat(500);
      queue.add(longKeyword);
      expect(queue.has(longKeyword)).toBe(true);
    });

    it('should handle 10,000+ keywords efficiently', () => {
      const keywords = Array.from(
        { length: 10000 }, 
        (_, i) => `keyword-${i}`
      );
      
      const start = performance.now();
      queue.addBulk(keywords);
      const duration = performance.now() - start;
      
      expect(queue.size()).toBe(10000);
      expect(duration).toBeLessThan(1000); // < 1 second
    });
  });
});
```

---

### 4.2 Position Tracking & History (Phase 4 - 2 days)

#### Requirements
- Store position history for keywords
- Track position changes over time
- Calculate trends (improving/declining)
- Generate historical reports

#### Test File: `tests/unit/automation/position-tracker.test.ts`

```typescript
/**
 * Position Tracking Tests - TDD
 * Write these tests FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface PositionRecord {
  keyword: string;
  domain: string;
  position: number;
  engine: string;
  timestamp: Date;
}

interface PositionTrend {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
}

describe('PositionTracker', () => {
  let tracker: any;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      queryOne: vi.fn(),
    };
    
    const { PositionTracker } = await import(
      '../../../electron/core/automation/position-tracker'
    );
    tracker = new PositionTracker(mockDb);
  });

  // =========================================
  // RECORDING POSITIONS
  // =========================================
  describe('recordPosition', () => {
    it('should record position for keyword-domain pair', async () => {
      await tracker.recordPosition({
        keyword: 'test keyword',
        domain: 'example.com',
        position: 5,
        engine: 'google',
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.objectContaining({
          keyword: 'test keyword',
          domain: 'example.com',
          position: 5,
        })
      );
    });

    it('should auto-set timestamp if not provided', async () => {
      const before = new Date();
      await tracker.recordPosition({
        keyword: 'test',
        domain: 'test.com',
        position: 1,
        engine: 'google',
      });
      const after = new Date();

      const call = mockDb.execute.mock.calls[0];
      const timestamp = call[1].timestamp;
      
      expect(new Date(timestamp).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(new Date(timestamp).getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle position not found (null/undefined)', async () => {
      await tracker.recordPosition({
        keyword: 'test',
        domain: 'test.com',
        position: null,
        engine: 'google',
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ position: -1 }) // -1 indicates not found
      );
    });
  });

  // =========================================
  // RETRIEVING HISTORY
  // =========================================
  describe('getHistory', () => {
    it('should retrieve position history for keyword', async () => {
      mockDb.query.mockResolvedValue([
        { position: 5, timestamp: '2024-01-01' },
        { position: 3, timestamp: '2024-01-02' },
        { position: 2, timestamp: '2024-01-03' },
      ]);

      const history = await tracker.getHistory('test keyword', 'example.com');

      expect(history).toHaveLength(3);
      expect(history[0].position).toBe(5);
    });

    it('should limit history to specified days', async () => {
      await tracker.getHistory('test', 'test.com', { days: 7 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp'),
        expect.objectContaining({ days: 7 })
      );
    });

    it('should filter by search engine', async () => {
      await tracker.getHistory('test', 'test.com', { engine: 'bing' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('engine'),
        expect.objectContaining({ engine: 'bing' })
      );
    });
  });

  // =========================================
  // TREND ANALYSIS
  // =========================================
  describe('calculateTrend', () => {
    it('should identify improving trend', async () => {
      mockDb.query.mockResolvedValue([
        { position: 10, timestamp: '2024-01-01' },
        { position: 7, timestamp: '2024-01-02' },
        { position: 3, timestamp: '2024-01-03' },
      ]);

      const trend = await tracker.calculateTrend('test', 'test.com');

      expect(trend.trend).toBe('improving');
      expect(trend.change).toBe(7); // Improved by 7 positions
    });

    it('should identify declining trend', async () => {
      mockDb.query.mockResolvedValue([
        { position: 3, timestamp: '2024-01-01' },
        { position: 7, timestamp: '2024-01-02' },
        { position: 15, timestamp: '2024-01-03' },
      ]);

      const trend = await tracker.calculateTrend('test', 'test.com');

      expect(trend.trend).toBe('declining');
      expect(trend.change).toBe(-12); // Declined by 12 positions
    });

    it('should identify stable trend', async () => {
      mockDb.query.mockResolvedValue([
        { position: 5, timestamp: '2024-01-01' },
        { position: 5, timestamp: '2024-01-02' },
        { position: 5, timestamp: '2024-01-03' },
      ]);

      const trend = await tracker.calculateTrend('test', 'test.com');

      expect(trend.trend).toBe('stable');
      expect(trend.change).toBe(0);
    });

    it('should handle insufficient data gracefully', async () => {
      mockDb.query.mockResolvedValue([]);

      const trend = await tracker.calculateTrend('test', 'test.com');

      expect(trend).toBeNull();
    });
  });

  // =========================================
  // REPORTING
  // =========================================
  describe('generateReport', () => {
    it('should generate summary report for all tracked keywords', async () => {
      mockDb.query.mockResolvedValue([
        { keyword: 'kw1', domain: 'test.com', avg_position: 5.2 },
        { keyword: 'kw2', domain: 'test.com', avg_position: 12.8 },
      ]);

      const report = await tracker.generateReport('test.com');

      expect(report.keywords).toHaveLength(2);
      expect(report.averagePosition).toBeCloseTo(9.0, 1);
    });

    it('should include trend data in report', async () => {
      mockDb.query
        .mockResolvedValueOnce([
          { keyword: 'kw1', domain: 'test.com', current: 3, previous: 5 },
        ])
        .mockResolvedValueOnce([
          { position: 5 }, { position: 4 }, { position: 3 }
        ]);

      const report = await tracker.generateReport('test.com', { 
        includeTrends: true 
      });

      expect(report.keywords[0].trend).toBeDefined();
    });

    it('should export report as CSV', async () => {
      mockDb.query.mockResolvedValue([
        { keyword: 'kw1', position: 5, timestamp: '2024-01-01' },
      ]);

      const csv = await tracker.exportReport('test.com', 'csv');

      expect(csv).toContain('keyword,position,timestamp');
      expect(csv).toContain('kw1,5');
    });
  });

  // =========================================
  // DATA CLEANUP
  // =========================================
  describe('cleanup', () => {
    it('should remove records older than retention period', async () => {
      await tracker.cleanup({ retentionDays: 90 });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE'),
        expect.objectContaining({ days: 90 })
      );
    });
  });
});
```

---

### 4.3 Self-Healing Enhancement (Phase 4 - 4 days)

#### Requirements
- Automatic retry with exponential backoff
- Circuit breaker integration
- Proxy failover on failure
- Rate limit detection and backoff
- Error categorization
- Recovery success rate > 95%

#### Test File: `tests/unit/resilience/self-healing.test.ts`

```typescript
/**
 * Self-Healing Enhancement Tests - TDD
 * Write these tests FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Types
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface ErrorCategory {
  type: 'network' | 'proxy' | 'rateLimit' | 'captcha' | 'timeout' | 'unknown';
  recoverable: boolean;
  suggestedAction: 'retry' | 'failover' | 'backoff' | 'abort';
}

describe('SelfHealingExecutor', () => {
  let executor: any;
  let mockCircuitBreaker: any;
  let mockProxyManager: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    
    mockCircuitBreaker = {
      isOpen: vi.fn().mockReturnValue(false),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
      getState: vi.fn().mockReturnValue('closed'),
    };
    
    mockProxyManager = {
      getNext: vi.fn().mockResolvedValue({ id: 'proxy-1', host: 'proxy.com' }),
      markFailed: vi.fn(),
      markSuccess: vi.fn(),
    };
    
    const { SelfHealingExecutor } = await import(
      '../../../electron/core/resilience/self-healing'
    );
    executor = new SelfHealingExecutor({
      circuitBreaker: mockCircuitBreaker,
      proxyManager: mockProxyManager,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================
  // RETRY LOGIC
  // =========================================
  describe('retry with exponential backoff', () => {
    it('should retry failed operation up to maxRetries', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const promise = executor.execute(operation, { maxRetries: 3 });
      
      // Fast-forward through retries
      await vi.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff between retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const config: RetryConfig = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
      };

      executor.execute(operation, config).catch(() => {});

      // First retry after 1000ms
      await vi.advanceTimersByTimeAsync(999);
      expect(operation).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(operation).toHaveBeenCalledTimes(2);

      // Second retry after 2000ms (1000 * 2)
      await vi.advanceTimersByTimeAsync(2000);
      expect(operation).toHaveBeenCalledTimes(3);

      // Third retry after 4000ms (2000 * 2)
      await vi.advanceTimersByTimeAsync(4000);
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should cap delay at maxDelayMs', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));
      
      executor.execute(operation, {
        maxRetries: 5,
        baseDelayMs: 5000,
        maxDelayMs: 10000,
        backoffMultiplier: 3,
      }).catch(() => {});

      // After base delay
      await vi.advanceTimersByTimeAsync(5000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Next would be 15000ms but capped at 10000ms
      await vi.advanceTimersByTimeAsync(10000);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should add jitter to prevent thundering herd', async () => {
      const operations: number[] = [];
      const operation = vi.fn().mockImplementation(() => {
        operations.push(Date.now());
        return Promise.reject(new Error('Fail'));
      });

      // Run multiple executors
      const promises = [
        executor.execute(operation, { maxRetries: 1, jitter: true }),
        executor.execute(operation, { maxRetries: 1, jitter: true }),
      ];

      await vi.runAllTimersAsync();
      await Promise.allSettled(promises);

      // Delays should not be identical due to jitter
      // This is a probabilistic test
    });
  });

  // =========================================
  // CIRCUIT BREAKER INTEGRATION
  // =========================================
  describe('circuit breaker integration', () => {
    it('should fail fast when circuit is open', async () => {
      mockCircuitBreaker.isOpen.mockReturnValue(true);
      
      const operation = vi.fn().mockResolvedValue('success');
      
      await expect(executor.execute(operation))
        .rejects.toThrow('Circuit breaker is open');
      
      expect(operation).not.toHaveBeenCalled();
    });

    it('should record success to circuit breaker', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      await executor.execute(operation);
      
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it('should record failure to circuit breaker after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Fail'));
      
      await executor.execute(operation, { maxRetries: 2 }).catch(() => {});
      await vi.runAllTimersAsync();
      
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });

    it('should respect half-open state for probe requests', async () => {
      mockCircuitBreaker.getState.mockReturnValue('half-open');
      const operation = vi.fn().mockResolvedValue('success');
      
      await executor.execute(operation);
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });
  });

  // =========================================
  // PROXY FAILOVER
  // =========================================
  describe('proxy failover', () => {
    it('should switch proxy on proxy failure', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Proxy connection failed'))
        .mockResolvedValueOnce('success');

      mockProxyManager.getNext
        .mockResolvedValueOnce({ id: 'proxy-1' })
        .mockResolvedValueOnce({ id: 'proxy-2' });

      const promise = executor.execute(operation, { 
        maxRetries: 2,
        failoverOnProxyError: true 
      });
      
      await vi.runAllTimersAsync();
      await promise;

      expect(mockProxyManager.markFailed).toHaveBeenCalledWith('proxy-1');
      expect(mockProxyManager.getNext).toHaveBeenCalledTimes(2);
    });

    it('should not failover for non-proxy errors', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Page not found'))
        .mockResolvedValueOnce('success');

      const promise = executor.execute(operation, { maxRetries: 2 });
      await vi.runAllTimersAsync();
      await promise;

      expect(mockProxyManager.markFailed).not.toHaveBeenCalled();
    });

    it('should exhaust proxy pool before final failure', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Proxy failed'));
      
      mockProxyManager.getNext
        .mockResolvedValueOnce({ id: 'proxy-1' })
        .mockResolvedValueOnce({ id: 'proxy-2' })
        .mockResolvedValueOnce({ id: 'proxy-3' })
        .mockResolvedValueOnce(null); // Pool exhausted

      await executor.execute(operation, {
        maxRetries: 10,
        failoverOnProxyError: true,
      }).catch(() => {});

      await vi.runAllTimersAsync();

      expect(mockProxyManager.getNext).toHaveBeenCalledTimes(4);
    });
  });

  // =========================================
  // ERROR CATEGORIZATION
  // =========================================
  describe('error categorization', () => {
    it('should categorize network errors as recoverable', () => {
      const error = new Error('ECONNREFUSED');
      const category = executor.categorizeError(error);
      
      expect(category.type).toBe('network');
      expect(category.recoverable).toBe(true);
      expect(category.suggestedAction).toBe('retry');
    });

    it('should categorize rate limit errors', () => {
      const error = new Error('429 Too Many Requests');
      const category = executor.categorizeError(error);
      
      expect(category.type).toBe('rateLimit');
      expect(category.recoverable).toBe(true);
      expect(category.suggestedAction).toBe('backoff');
    });

    it('should categorize captcha errors', () => {
      const error = new Error('Captcha detected');
      const category = executor.categorizeError(error);
      
      expect(category.type).toBe('captcha');
      expect(category.recoverable).toBe(false);
      expect(category.suggestedAction).toBe('abort');
    });

    it('should categorize timeout errors', () => {
      const error = new Error('ETIMEDOUT');
      const category = executor.categorizeError(error);
      
      expect(category.type).toBe('timeout');
      expect(category.recoverable).toBe(true);
      expect(category.suggestedAction).toBe('retry');
    });

    it('should categorize proxy errors for failover', () => {
      const error = new Error('Proxy authentication failed');
      const category = executor.categorizeError(error);
      
      expect(category.type).toBe('proxy');
      expect(category.recoverable).toBe(true);
      expect(category.suggestedAction).toBe('failover');
    });
  });

  // =========================================
  // RATE LIMIT HANDLING
  // =========================================
  describe('rate limit handling', () => {
    it('should apply longer backoff for rate limits', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce('success');

      const promise = executor.execute(operation, {
        maxRetries: 2,
        rateLimitBackoffMs: 60000,
      });

      // Should wait 60 seconds for rate limit
      await vi.advanceTimersByTimeAsync(59999);
      expect(operation).toHaveBeenCalledTimes(1);
      
      await vi.advanceTimersByTimeAsync(1);
      expect(operation).toHaveBeenCalledTimes(2);

      await promise;
    });

    it('should respect Retry-After header', async () => {
      const rateLimitError = new Error('429');
      (rateLimitError as any).retryAfter = 30; // 30 seconds
      
      const operation = vi.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce('success');

      const promise = executor.execute(operation);

      await vi.advanceTimersByTimeAsync(30000);
      await promise;

      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================
  // RECOVERY METRICS
  // =========================================
  describe('recovery metrics', () => {
    it('should track recovery success rate', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      await executor.execute(operation, { maxRetries: 2 });
      await vi.runAllTimersAsync();

      const metrics = executor.getMetrics();
      expect(metrics.recoverySuccessRate).toBeGreaterThan(0);
    });

    it('should maintain > 95% recovery rate target', async () => {
      // Simulate 100 operations with 5% unrecoverable
      for (let i = 0; i < 95; i++) {
        const op = vi.fn()
          .mockRejectedValueOnce(new Error('Recoverable'))
          .mockResolvedValueOnce('success');
        await executor.execute(op, { maxRetries: 2 }).catch(() => {});
        await vi.runAllTimersAsync();
      }

      const metrics = executor.getMetrics();
      expect(metrics.recoverySuccessRate).toBeGreaterThanOrEqual(0.95);
    });
  });
});
```

---

### 4.4 Resource Monitoring (Phase 4 - 2 days)

#### Requirements
- CPU usage monitoring (threshold: 80%)
- Memory usage monitoring (threshold: 80%)
- Automatic throttling when thresholds exceeded
- Tab count reduction on high memory
- Resource usage graphs in dashboard
- Alert notifications on high usage

#### Test File: `tests/unit/resilience/resource-monitor.test.ts`

```typescript
/**
 * Resource Monitor Tests - TDD
 * Write these tests FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventEmitter } from 'events';

interface ResourceThresholds {
  cpuPercent: number;
  memoryPercent: number;
  maxTabs: number;
}

interface ResourceMetrics {
  cpu: number;
  memory: number;
  heapUsed: number;
  heapTotal: number;
  tabCount: number;
  timestamp: Date;
}

describe('ResourceMonitor', () => {
  let monitor: any;
  let mockTabManager: any;
  let mockAutomationEngine: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    
    mockTabManager = {
      getTabCount: vi.fn().mockReturnValue(10),
      suspendIdleTabs: vi.fn(),
      closeLeastRecentTab: vi.fn(),
    };
    
    mockAutomationEngine = {
      throttle: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
    };
    
    const { ResourceMonitor } = await import(
      '../../../electron/core/resilience/resource-monitor'
    );
    monitor = new ResourceMonitor({
      tabManager: mockTabManager,
      automationEngine: mockAutomationEngine,
      thresholds: {
        cpuPercent: 80,
        memoryPercent: 80,
        maxTabs: 50,
      },
    });
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  // =========================================
  // MONITORING LIFECYCLE
  // =========================================
  describe('lifecycle', () => {
    it('should start monitoring at specified interval', () => {
      monitor.start(5000);
      
      expect(monitor.isRunning()).toBe(true);
    });

    it('should stop monitoring', () => {
      monitor.start(5000);
      monitor.stop();
      
      expect(monitor.isRunning()).toBe(false);
    });

    it('should collect metrics at each interval', async () => {
      const collectSpy = vi.spyOn(monitor, 'collectMetrics');
      
      monitor.start(1000);
      
      await vi.advanceTimersByTimeAsync(3000);
      
      expect(collectSpy).toHaveBeenCalledTimes(3);
    });
  });

  // =========================================
  // METRIC COLLECTION
  // =========================================
  describe('collectMetrics', () => {
    it('should return current CPU usage', async () => {
      const metrics = await monitor.collectMetrics();
      
      expect(metrics.cpu).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu).toBeLessThanOrEqual(100);
    });

    it('should return current memory usage', async () => {
      const metrics = await monitor.collectMetrics();
      
      expect(metrics.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.memory).toBeLessThanOrEqual(100);
    });

    it('should return heap statistics', async () => {
      const metrics = await monitor.collectMetrics();
      
      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.heapUsed).toBeLessThanOrEqual(metrics.heapTotal);
    });

    it('should include tab count', async () => {
      const metrics = await monitor.collectMetrics();
      
      expect(metrics.tabCount).toBe(10);
    });

    it('should include timestamp', async () => {
      const before = new Date();
      const metrics = await monitor.collectMetrics();
      const after = new Date();
      
      expect(metrics.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metrics.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // =========================================
  // THRESHOLD DETECTION
  // =========================================
  describe('threshold detection', () => {
    it('should detect CPU threshold exceeded', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 85,
        memory: 50,
        heapUsed: 100,
        heapTotal: 200,
        tabCount: 10,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(monitor.isThresholdExceeded('cpu')).toBe(true);
    });

    it('should detect memory threshold exceeded', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 50,
        memory: 85,
        heapUsed: 170,
        heapTotal: 200,
        tabCount: 10,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(monitor.isThresholdExceeded('memory')).toBe(true);
    });

    it('should not trigger threshold for normal usage', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 30,
        memory: 40,
        heapUsed: 80,
        heapTotal: 200,
        tabCount: 10,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(monitor.isThresholdExceeded('cpu')).toBe(false);
      expect(monitor.isThresholdExceeded('memory')).toBe(false);
    });
  });

  // =========================================
  // AUTOMATIC THROTTLING
  // =========================================
  describe('automatic throttling', () => {
    it('should throttle automation on high CPU', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 90,
        memory: 50,
        heapUsed: 100,
        heapTotal: 200,
        tabCount: 10,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockAutomationEngine.throttle).toHaveBeenCalled();
    });

    it('should suspend idle tabs on high memory', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 50,
        memory: 90,
        heapUsed: 180,
        heapTotal: 200,
        tabCount: 20,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTabManager.suspendIdleTabs).toHaveBeenCalled();
    });

    it('should reduce tab count when memory critical', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 50,
        memory: 95, // Critical
        heapUsed: 190,
        heapTotal: 200,
        tabCount: 30,
        timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockTabManager.closeLeastRecentTab).toHaveBeenCalled();
    });

    it('should resume automation when resources free', async () => {
      const collectMock = vi.spyOn(monitor, 'collectMetrics');
      
      // First: high CPU
      collectMock.mockResolvedValueOnce({
        cpu: 90, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });
      
      // Second: normal CPU
      collectMock.mockResolvedValueOnce({
        cpu: 40, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockAutomationEngine.throttle).toHaveBeenCalled();
      
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockAutomationEngine.resume).toHaveBeenCalled();
    });
  });

  // =========================================
  // EVENTS & ALERTS
  // =========================================
  describe('events and alerts', () => {
    it('should emit threshold:exceeded event', async () => {
      const handler = vi.fn();
      monitor.on('threshold:exceeded', handler);
      
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 85, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cpu', value: 85 })
      );
    });

    it('should emit threshold:recovered event', async () => {
      const handler = vi.fn();
      monitor.on('threshold:recovered', handler);
      
      const collectMock = vi.spyOn(monitor, 'collectMetrics');
      collectMock.mockResolvedValueOnce({
        cpu: 85, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });
      collectMock.mockResolvedValueOnce({
        cpu: 40, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(2000);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cpu' })
      );
    });
  });

  // =========================================
  // HISTORY & TRENDS
  // =========================================
  describe('history and trends', () => {
    it('should maintain metric history', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 50, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(5000);

      const history = monitor.getHistory();
      expect(history).toHaveLength(5);
    });

    it('should limit history size', async () => {
      vi.spyOn(monitor, 'collectMetrics').mockResolvedValue({
        cpu: 50, memory: 50, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });

      monitor.start(100); // Fast interval
      await vi.advanceTimersByTimeAsync(100000); // 1000 samples

      const history = monitor.getHistory();
      expect(history.length).toBeLessThanOrEqual(500); // Max history
    });

    it('should calculate average metrics', async () => {
      const collectMock = vi.spyOn(monitor, 'collectMetrics');
      collectMock.mockResolvedValueOnce({
        cpu: 30, memory: 40, heapUsed: 100, heapTotal: 200,
        tabCount: 10, timestamp: new Date(),
      });
      collectMock.mockResolvedValueOnce({
        cpu: 50, memory: 60, heapUsed: 120, heapTotal: 200,
        tabCount: 12, timestamp: new Date(),
      });

      monitor.start(1000);
      await vi.advanceTimersByTimeAsync(2000);

      const avg = monitor.getAverages();
      expect(avg.cpu).toBe(40);
      expect(avg.memory).toBe(50);
    });
  });
});
```

---

### 4.5 Support Statistics (Phase 4 - 2 days)

#### Requirements
- Aggregate support data per creator
- Track total ads viewed, visits, support sessions
- Calculate support value estimates
- Generate reports by time period
- Export statistics

#### Test File: `tests/unit/creator-support/support-statistics.test.ts`

```typescript
/**
 * Support Statistics Tests - TDD
 * Write these tests FIRST before implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface CreatorStats {
  creatorId: string;
  creatorName: string;
  totalAdsViewed: number;
  totalVisits: number;
  totalSupportSessions: number;
  estimatedValue: number;
  lastSupportedAt: Date;
  platform: string;
}

interface SupportReport {
  period: { start: Date; end: Date };
  totalCreatorsSupported: number;
  totalAdsViewed: number;
  totalVisits: number;
  estimatedTotalValue: number;
  topCreators: CreatorStats[];
  byPlatform: Record<string, number>;
}

describe('SupportStatistics', () => {
  let stats: any;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: vi.fn(),
      execute: vi.fn(),
      queryOne: vi.fn(),
    };
    
    const { SupportStatistics } = await import(
      '../../../electron/core/creator-support/support-statistics'
    );
    stats = new SupportStatistics(mockDb);
  });

  // =========================================
  // RECORDING SUPPORT EVENTS
  // =========================================
  describe('recordSupport', () => {
    it('should record ad view event', async () => {
      await stats.recordSupport({
        creatorId: 'creator-1',
        type: 'ad_view',
        platform: 'youtube',
        metadata: { adDuration: 30 },
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        expect.objectContaining({
          creatorId: 'creator-1',
          type: 'ad_view',
        })
      );
    });

    it('should record page visit event', async () => {
      await stats.recordSupport({
        creatorId: 'creator-1',
        type: 'visit',
        platform: 'twitch',
        metadata: { duration: 120 },
      });

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should auto-increment session count', async () => {
      mockDb.queryOne.mockResolvedValue({ sessions: 5 });
      
      await stats.recordSupport({
        creatorId: 'creator-1',
        type: 'session_start',
        platform: 'youtube',
      });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.objectContaining({ sessions: 6 })
      );
    });
  });

  // =========================================
  // AGGREGATION
  // =========================================
  describe('getCreatorStats', () => {
    it('should return aggregated stats for creator', async () => {
      mockDb.queryOne.mockResolvedValue({
        creator_id: 'creator-1',
        creator_name: 'Test Creator',
        total_ads: 150,
        total_visits: 50,
        total_sessions: 20,
        platform: 'youtube',
        last_supported: '2024-01-15',
      });

      const creatorStats = await stats.getCreatorStats('creator-1');

      expect(creatorStats.totalAdsViewed).toBe(150);
      expect(creatorStats.totalVisits).toBe(50);
      expect(creatorStats.totalSupportSessions).toBe(20);
    });

    it('should calculate estimated value', async () => {
      mockDb.queryOne.mockResolvedValue({
        creator_id: 'creator-1',
        total_ads: 100,
        total_visits: 50,
        platform: 'youtube',
      });

      const creatorStats = await stats.getCreatorStats('creator-1');

      // Estimated value based on platform rates
      // YouTube: ~$0.01 per ad view, $0.001 per visit
      expect(creatorStats.estimatedValue).toBeGreaterThan(0);
      expect(creatorStats.estimatedValue).toBeCloseTo(1.05, 1); // $1.00 + $0.05
    });

    it('should return null for non-existent creator', async () => {
      mockDb.queryOne.mockResolvedValue(null);

      const creatorStats = await stats.getCreatorStats('non-existent');

      expect(creatorStats).toBeNull();
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all supported creators', async () => {
      mockDb.query.mockResolvedValue([
        { creator_id: '1', total_ads: 100 },
        { creator_id: '2', total_ads: 200 },
        { creator_id: '3', total_ads: 50 },
      ]);

      const allStats = await stats.getAllStats();

      expect(allStats).toHaveLength(3);
    });

    it('should sort by total support by default', async () => {
      mockDb.query.mockResolvedValue([
        { creator_id: '1', total_ads: 100, total_visits: 50 },
        { creator_id: '2', total_ads: 200, total_visits: 100 },
      ]);

      const allStats = await stats.getAllStats();

      expect(allStats[0].creatorId).toBe('2'); // Highest support first
    });

    it('should support pagination', async () => {
      await stats.getAllStats({ page: 2, limit: 10 });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.objectContaining({ offset: 10, limit: 10 })
      );
    });
  });

  // =========================================
  // REPORTING
  // =========================================
  describe('generateReport', () => {
    it('should generate summary report for period', async () => {
      mockDb.query.mockResolvedValue([
        { creator_id: '1', total_ads: 100, total_visits: 50, platform: 'youtube' },
        { creator_id: '2', total_ads: 200, total_visits: 75, platform: 'twitch' },
      ]);

      const report = await stats.generateReport({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(report.totalCreatorsSupported).toBe(2);
      expect(report.totalAdsViewed).toBe(300);
      expect(report.totalVisits).toBe(125);
    });

    it('should include top creators in report', async () => {
      mockDb.query.mockResolvedValue([
        { creator_id: '1', total_ads: 500, creator_name: 'Top Creator' },
        { creator_id: '2', total_ads: 200, creator_name: 'Second Creator' },
      ]);

      const report = await stats.generateReport({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
        topN: 5,
      });

      expect(report.topCreators).toHaveLength(2);
      expect(report.topCreators[0].creatorName).toBe('Top Creator');
    });

    it('should break down by platform', async () => {
      mockDb.query.mockResolvedValue([
        { platform: 'youtube', total_ads: 300 },
        { platform: 'twitch', total_ads: 150 },
        { platform: 'medium', total_ads: 50 },
      ]);

      const report = await stats.generateReport({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(report.byPlatform.youtube).toBe(300);
      expect(report.byPlatform.twitch).toBe(150);
      expect(report.byPlatform.medium).toBe(50);
    });

    it('should calculate estimated total value', async () => {
      mockDb.query.mockResolvedValue([
        { platform: 'youtube', total_ads: 1000, total_visits: 500 },
      ]);

      const report = await stats.generateReport({
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(report.estimatedTotalValue).toBeGreaterThan(0);
    });
  });

  // =========================================
  // EXPORT
  // =========================================
  describe('export', () => {
    it('should export stats as CSV', async () => {
      mockDb.query.mockResolvedValue([
        { creator_name: 'Creator 1', total_ads: 100, platform: 'youtube' },
        { creator_name: 'Creator 2', total_ads: 200, platform: 'twitch' },
      ]);

      const csv = await stats.export('csv');

      expect(csv).toContain('creator_name,total_ads,platform');
      expect(csv).toContain('Creator 1,100,youtube');
      expect(csv).toContain('Creator 2,200,twitch');
    });

    it('should export stats as JSON', async () => {
      mockDb.query.mockResolvedValue([
        { creator_name: 'Creator 1', total_ads: 100 },
      ]);

      const json = await stats.export('json');
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].creator_name).toBe('Creator 1');
    });

    it('should filter export by date range', async () => {
      await stats.export('csv', {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.objectContaining({ start: expect.any(Date) })
      );
    });
  });

  // =========================================
  // TRENDS
  // =========================================
  describe('trends', () => {
    it('should calculate daily support trend', async () => {
      mockDb.query.mockResolvedValue([
        { date: '2024-01-01', total_ads: 50 },
        { date: '2024-01-02', total_ads: 75 },
        { date: '2024-01-03', total_ads: 100 },
      ]);

      const trend = await stats.getDailyTrend('creator-1', 7);

      expect(trend).toHaveLength(3);
      expect(trend[2].total_ads).toBe(100);
    });

    it('should identify trending creators', async () => {
      mockDb.query.mockResolvedValue([
        { creator_id: '1', growth_rate: 1.5 }, // 50% growth
        { creator_id: '2', growth_rate: 1.2 }, // 20% growth
      ]);

      const trending = await stats.getTrendingCreators(7);

      expect(trending[0].creatorId).toBe('1');
    });
  });
});
```

---

### 4.6 Phase 5: Performance Verification (3 days)

#### Requirements
- Verify all performance NFRs are met
- Launch time < 3 seconds
- Tab creation < 500ms
- Memory per tab < 200MB average
- UI responsiveness < 100ms

#### Test File: `tests/unit/performance/benchmarks.test.ts`

```typescript
/**
 * Performance Benchmark Tests
 * Verify Non-Functional Requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Performance Benchmarks', () => {
  // =========================================
  // LAUNCH TIME (NFR-P-001)
  // =========================================
  describe('Application Launch', () => {
    it('should launch within 3 seconds', async () => {
      const { measureLaunchTime } = await import(
        '../../../electron/utils/performance'
      );
      
      const launchTime = await measureLaunchTime();
      
      expect(launchTime).toBeLessThan(3000); // 3 seconds
    });

    it('should reach interactive state within 2 seconds', async () => {
      const { measureTimeToInteractive } = await import(
        '../../../electron/utils/performance'
      );
      
      const tti = await measureTimeToInteractive();
      
      expect(tti).toBeLessThan(2000);
    });
  });

  // =========================================
  // TAB CREATION (NFR-P-002)
  // =========================================
  describe('Tab Creation', () => {
    it('should create tab within 500ms', async () => {
      const { TabManager } = await import(
        '../../../electron/core/tabs/manager'
      );
      const manager = new TabManager({} as any);
      
      const start = performance.now();
      await manager.createTab({ url: 'about:blank' });
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(500);
    });

    it('should create 10 tabs within 5 seconds', async () => {
      const { TabManager } = await import(
        '../../../electron/core/tabs/manager'
      );
      const manager = new TabManager({} as any);
      
      const start = performance.now();
      const promises = Array.from({ length: 10 }, () => 
        manager.createTab({ url: 'about:blank' })
      );
      await Promise.all(promises);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(5000);
    });
  });

  // =========================================
  // MEMORY USAGE (NFR-P-004)
  // =========================================
  describe('Memory Usage', () => {
    it('should use less than 200MB per tab average', async () => {
      const { measureTabMemory } = await import(
        '../../../electron/utils/performance'
      );
      
      // Create 5 tabs and measure
      const memoryPerTab = await measureTabMemory(5);
      const average = memoryPerTab.reduce((a, b) => a + b, 0) / memoryPerTab.length;
      
      expect(average).toBeLessThan(200 * 1024 * 1024); // 200MB in bytes
    });

    it('should release memory on tab close', async () => {
      const { measureMemoryAfterClose } = await import(
        '../../../electron/utils/performance'
      );
      
      const { before, after } = await measureMemoryAfterClose();
      
      // Memory should decrease after closing tabs
      expect(after).toBeLessThan(before);
    });
  });

  // =========================================
  // UI RESPONSIVENESS (NFR-P-003)
  // =========================================
  describe('UI Responsiveness', () => {
    it('should respond to user input within 100ms', async () => {
      const { measureInputLatency } = await import(
        '../../../electron/utils/performance'
      );
      
      const latency = await measureInputLatency();
      
      expect(latency).toBeLessThan(100);
    });

    it('should render panel switch within 100ms', async () => {
      const { measurePanelSwitch } = await import(
        '../../../electron/utils/performance'
      );
      
      const switchTime = await measurePanelSwitch();
      
      expect(switchTime).toBeLessThan(100);
    });
  });

  // =========================================
  // PROXY OPERATIONS (NFR-P-006)
  // =========================================
  describe('Proxy Operations', () => {
    it('should rotate proxy within 100ms', async () => {
      const { ProxyManager } = await import(
        '../../../electron/core/proxy-engine/manager'
      );
      const manager = new ProxyManager({} as any);
      
      // Add test proxies
      for (let i = 0; i < 10; i++) {
        await manager.addProxy({
          host: `proxy${i}.test.com`,
          port: 8080,
          protocol: 'http',
        });
      }
      
      const start = performance.now();
      await manager.getNextProxy();
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100);
    });
  });

  // =========================================
  // DATABASE OPERATIONS (NFR-P-008)
  // =========================================
  describe('Database Operations', () => {
    it('should complete query within 10ms', async () => {
      const { measureQueryTime } = await import(
        '../../../electron/utils/performance'
      );
      
      const queryTime = await measureQueryTime('SELECT * FROM proxies LIMIT 100');
      
      expect(queryTime).toBeLessThan(10);
    });

    it('should handle 1000 inserts within 1 second', async () => {
      const { measureBulkInsert } = await import(
        '../../../electron/utils/performance'
      );
      
      const insertTime = await measureBulkInsert(1000);
      
      expect(insertTime).toBeLessThan(1000);
    });
  });
});
```

---

### 4.7 Phase 5: E2E Test Completion (4 days)

#### Requirements
- Complete critical path coverage
- All user journeys tested
- Cross-browser compatibility (Chromium)
- Visual regression testing

#### Test File: `tests/e2e/complete-workflow.spec.ts`

```typescript
/**
 * Complete Workflow E2E Tests
 * Tests full user journeys from start to finish
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  ProxyPanelPage,
  AutomationPanelPage,
  PrivacyPanelPage 
} from './pages';

test.describe('Complete Automation Workflow', () => {
  test('should complete full search automation cycle', async ({ page }) => {
    const navigation = new NavigationPage(page);
    const proxyPanel = new ProxyPanelPage(page);
    const automationPanel = new AutomationPanelPage(page);
    const privacyPanel = new PrivacyPanelPage(page);

    // Step 1: Launch and verify app
    await navigation.goto();
    await expect(navigation.mainContainer).toBeVisible();

    // Step 2: Configure privacy settings
    await privacyPanel.openPanel();
    await privacyPanel.enableAllProtections();
    await expect(privacyPanel.protectionStatus).toContainText('PROTECTED');

    // Step 3: Add proxies
    await proxyPanel.openPanel();
    await proxyPanel.addProxy({
      name: 'Test Proxy',
      host: 'proxy.example.com',
      port: 8080,
      protocol: 'http',
    });
    await expect(proxyPanel.proxyList).toHaveCount(1);

    // Step 4: Configure automation
    await automationPanel.openPanel();
    await automationPanel.addKeyword('test automation keyword');
    await automationPanel.addDomain('example.com');
    await automationPanel.setSearchEngine('google');
    
    // Step 5: Verify configuration
    await expect(automationPanel.keywordsCount).toContainText('1 added');
    await expect(automationPanel.domainsCount).toContainText('1 added');

    // Step 6: Start button should be enabled
    const isEnabled = await automationPanel.isStartButtonEnabled();
    expect(isEnabled).toBe(true);
  });

  test('should handle error recovery gracefully', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    
    await automationPanel.goto();
    await automationPanel.openPanel();
    
    // Simulate error condition
    await automationPanel.addKeyword('error-trigger-keyword');
    
    // App should remain stable
    await expect(automationPanel.panelTitle).toBeVisible();
    
    // Error should be logged but not crash
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toHaveClass(/error-state/);
  });

  test('should persist state across panel switches', async ({ page }) => {
    const automationPanel = new AutomationPanelPage(page);
    const proxyPanel = new ProxyPanelPage(page);

    await automationPanel.goto();
    
    // Add data in automation panel
    await automationPanel.openPanel();
    await automationPanel.addKeyword('persistent keyword');
    
    // Switch to proxy panel
    await proxyPanel.openPanel();
    await expect(proxyPanel.panelTitle).toBeVisible();
    
    // Switch back
    await automationPanel.openPanel();
    
    // Data should persist
    await expect(automationPanel.keywordItems.first())
      .toContainText('persistent keyword');
  });
});

test.describe('Privacy Protection Verification', () => {
  test('should prevent WebRTC leaks', async ({ page }) => {
    const privacyPanel = new PrivacyPanelPage(page);
    
    await privacyPanel.goto();
    await privacyPanel.openPanel();
    await privacyPanel.setWebRTCPolicy('disable');
    
    // Navigate to leak test
    // Note: In real E2E, you'd navigate to a test page
    // and verify the WebRTC API is blocked
    
    await expect(privacyPanel.webrtcStatus).toContainText('Protected');
  });

  test('should spoof fingerprint consistently', async ({ page }) => {
    const privacyPanel = new PrivacyPanelPage(page);
    
    await privacyPanel.goto();
    await privacyPanel.openPanel();
    await privacyPanel.enableCanvasSpoofing();
    await privacyPanel.enableNavigatorSpoofing();
    
    // Fingerprint should be different from real
    await expect(privacyPanel.fingerprintStatus)
      .toContainText('Spoofed');
  });
});

test.describe('Performance Under Load', () => {
  test('should handle 20 concurrent tabs', async ({ page }) => {
    const navigation = new NavigationPage(page);
    
    await navigation.goto();
    
    // Create multiple tabs
    for (let i = 0; i < 20; i++) {
      await navigation.createNewTab();
    }
    
    // UI should remain responsive
    const tabCount = await navigation.getTabCount();
    expect(tabCount).toBe(21); // 1 initial + 20 new
    
    // Panel should still open quickly
    const start = Date.now();
    await navigation.openProxyPanel();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

---

## 5. Test Examples & Patterns

### 5.1 Mocking External Dependencies

#### Mock Database

```typescript
// tests/mocks/database.mock.ts
import { vi } from 'vitest';

export function createMockDatabase() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ changes: 1 }),
    close: vi.fn(),
    transaction: vi.fn((fn) => fn()),
  };
}

// Usage in tests
const mockDb = createMockDatabase();
mockDb.query.mockResolvedValueOnce([
  { id: '1', name: 'Test' }
]);
```

#### Mock Window API

```typescript
// tests/mocks/window-api.mock.ts
import { vi } from 'vitest';

export function createMockWindowApi() {
  return {
    proxy: {
      add: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ proxies: [] }),
      delete: vi.fn().mockResolvedValue({ success: true }),
      validate: vi.fn().mockResolvedValue({ status: 'active' }),
    },
    automation: {
      startSearch: vi.fn().mockResolvedValue({ success: true }),
      stopSearch: vi.fn().mockResolvedValue({ success: true }),
      addDomain: vi.fn().mockResolvedValue({ success: true }),
    },
    privacy: {
      setWebRTCPolicy: vi.fn().mockResolvedValue({ success: true }),
      setFingerprint: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

export function setupWindowApiMock(mock: ReturnType<typeof createMockWindowApi>) {
  (global as any).window = { api: mock };
}

export function resetWindowApiMock() {
  delete (global as any).window;
}
```

### 5.2 Test Fixtures Factory Pattern

```typescript
// tests/fixtures/factory.ts
let idCounter = 0;

export function createId(): string {
  return `00000000-0000-4000-a000-${String(idCounter++).padStart(12, '0')}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// Specific factories
export function createKeyword(overrides = {}): string {
  return `test-keyword-${idCounter++}`;
}

export function createSearchTask(overrides = {}) {
  return {
    id: createId(),
    sessionId: createId(),
    keyword: createKeyword(),
    engine: 'google' as const,
    status: 'queued' as const,
    retryCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

export function createCreator(overrides = {}) {
  return {
    id: createId(),
    name: `Creator ${idCounter}`,
    url: `https://youtube.com/c/creator${idCounter}`,
    platform: 'youtube' as const,
    enabled: true,
    priority: 0,
    totalSupports: 0,
    totalAdsViewed: 0,
    ...overrides,
  };
}
```

### 5.3 Async Testing Patterns

```typescript
// Testing async operations
describe('Async Operations', () => {
  it('should handle async success', async () => {
    const result = await asyncOperation();
    expect(result).toBeDefined();
  });

  it('should handle async rejection', async () => {
    await expect(failingOperation()).rejects.toThrow('Expected error');
  });

  it('should wait for event', async () => {
    const emitter = new EventEmitter();
    
    const eventPromise = new Promise((resolve) => {
      emitter.once('done', resolve);
    });
    
    // Trigger event
    setTimeout(() => emitter.emit('done', 'result'), 100);
    
    const result = await eventPromise;
    expect(result).toBe('result');
  });

  it('should timeout gracefully', async () => {
    vi.useFakeTimers();
    
    const promise = operationWithTimeout(5000);
    
    vi.advanceTimersByTime(5001);
    
    await expect(promise).rejects.toThrow('Timeout');
    
    vi.useRealTimers();
  });
});
```

### 5.4 Component Testing Patterns

```typescript
// Testing React components
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeywordInput } from '../../../src/components/KeywordInput';

describe('KeywordInput Component', () => {
  it('should render input field', () => {
    render(<KeywordInput onAdd={vi.fn()} />);
    
    expect(screen.getByPlaceholderText('Enter keyword')).toBeInTheDocument();
  });

  it('should call onAdd when button clicked', async () => {
    const onAdd = vi.fn();
    render(<KeywordInput onAdd={onAdd} />);
    
    const input = screen.getByPlaceholderText('Enter keyword');
    fireEvent.change(input, { target: { value: 'test keyword' } });
    
    const button = screen.getByRole('button', { name: /add/i });
    fireEvent.click(button);
    
    expect(onAdd).toHaveBeenCalledWith('test keyword');
  });

  it('should clear input after add', async () => {
    render(<KeywordInput onAdd={vi.fn()} />);
    
    const input = screen.getByPlaceholderText('Enter keyword') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });
});
```

---

## 6. TDD Checklist

### Before Implementation

- [ ] Requirements clearly defined
- [ ] Test file created with describe blocks
- [ ] All test cases written (RED phase)
- [ ] Tests verified to fail
- [ ] Edge cases identified and tested
- [ ] Error scenarios covered

### During Implementation

- [ ] Write minimal code to pass one test
- [ ] Run tests after each change
- [ ] No skipped tests without justification
- [ ] Refactor only after tests pass

### After Implementation

- [ ] All tests passing (GREEN phase)
- [ ] Code refactored for clarity
- [ ] Coverage meets targets (80%+ unit, 60%+ integration)
- [ ] No console.log statements
- [ ] Documentation updated
- [ ] PR includes test results

---

## 7. Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- keyword-queue.test.ts

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui

# Generate coverage report
npm run test:coverage -- --reporter=html
```

---

## Summary

This TDD guidance document provides comprehensive test specifications for all remaining Virtual IP Browser features. Follow the Red-Green-Refactor cycle strictly:

1. **Write failing tests first** - Define expected behavior
2. **Write minimal code to pass** - No over-engineering
3. **Refactor with confidence** - Tests are your safety net

**Remember: No code without tests. Tests are not optional.**

