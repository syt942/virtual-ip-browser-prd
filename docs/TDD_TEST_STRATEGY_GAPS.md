# TDD Test Strategy - Gap Analysis & Implementation Plan

## Executive Summary

This document identifies test coverage gaps and provides a TDD-based implementation strategy to achieve 80%+ coverage across unit, integration, and E2E tests.

**Current State:**
- Unit Tests: ~65% coverage (estimated)
- Integration Tests: ~40% coverage
- E2E Tests: ~70% coverage of critical paths

**Target:** 80%+ coverage across all test types

---

## 1. Unit Test Gaps (Priority Order)

### 1.1 P0 - Critical (Must Have) - Week 1-2

#### Automation Engine (6 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `behavior-simulator.ts` | P0 | Medium | 4 |
| `executor.ts` | P0 | High | 6 |
| `page-interaction.ts` | P0 | Medium | 4 |
| `search-engine.ts` | P0 | High | 6 |
| `search-rate-limiter.ts` | P0 | Medium | 3 |
| `position-tracker.ts` | P0 | Low | 2 |

#### Search Module (3 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `result-extractor.ts` | P0 | High | 5 |
| `search-executor.ts` | P0 | High | 6 |
| `translation-handler.ts` | P1 | Medium | 3 |

#### Proxy Engine (2 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `credential-store.ts` | P0 | Medium | 4 |
| `validator.ts` | P0 | Medium | 3 |

### 1.2 P1 - High Priority - Week 2-3

#### Proxy Rotation Strategies (10 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `base-strategy.ts` | P1 | Low | 2 |
| `round-robin.ts` | P1 | Low | 2 |
| `random.ts` | P1 | Low | 1 |
| `weighted.ts` | P1 | Medium | 3 |
| `least-used.ts` | P1 | Medium | 2 |
| `fastest.ts` | P1 | Medium | 3 |
| `geographic.ts` | P1 | Medium | 3 |
| `time-based.ts` | P1 | Medium | 2 |
| `failure-aware.ts` | P1 | Medium | 3 |
| `custom-rules.ts` | P1 | High | 4 |

#### Creator Support (5 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `ad-viewer.ts` | P1 | High | 5 |
| `creator-scheduler.ts` | P1 | Medium | 4 |
| `creator-tracker.ts` | P1 | Medium | 3 |
| `platform-detection.ts` | P1 | Medium | 3 |
| `support-tracker.ts` | P1 | Low | 2 |

### 1.3 P2 - Medium Priority - Week 3-4

#### Translation Module (5 files missing)

| File | Priority | Complexity | Est. Hours |
|------|----------|------------|------------|
| `translator.ts` | P2 | Medium | 4 |
| `language-detector.ts` | P2 | Medium | 3 |
| `translation-cache.ts` | P2 | Low | 2 |
| `language-mappings.ts` | P2 | Low | 1 |
| `basic-translations.ts` | P2 | Low | 1 |

---

## 2. Unit Test Implementation Templates

### 2.1 behavior-simulator.test.ts (RED-GREEN-REFACTOR)

```typescript
// tests/unit/behavior-simulator.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSimulator, ActionType } from '@/electron/core/automation/behavior-simulator';

describe('BehaviorSimulator', () => {
  let simulator: BehaviorSimulator;

  beforeEach(() => {
    simulator = new BehaviorSimulator();
  });

  describe('generateHumanDelay', () => {
    it('returns delay within configured bounds', () => {
      // RED: Write test first
      const delay = simulator.generateHumanDelay(1000, 3000);
      
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(3000);
    });

    it('uses gaussian distribution for natural variation', () => {
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(simulator.generateHumanDelay(1000, 3000));
      }
      
      // Most values should cluster around the mean
      const mean = delays.reduce((a, b) => a + b) / delays.length;
      expect(mean).toBeGreaterThan(1500);
      expect(mean).toBeLessThan(2500);
    });

    it('throws error for invalid bounds', () => {
      expect(() => simulator.generateHumanDelay(3000, 1000)).toThrow();
      expect(() => simulator.generateHumanDelay(-100, 1000)).toThrow();
    });
  });

  describe('generateBrowsingPattern', () => {
    it('generates sequence of actions', () => {
      const pattern = simulator.generateBrowsingPattern({ duration: 60 });
      
      expect(pattern.actions).toBeInstanceOf(Array);
      expect(pattern.actions.length).toBeGreaterThan(0);
    });

    it('includes required action types', () => {
      const pattern = simulator.generateBrowsingPattern({ duration: 120 });
      const actionTypes = pattern.actions.map(a => a.type);
      
      expect(actionTypes).toContain('scroll');
      expect(actionTypes).toContain('pause');
    });

    it('respects total duration constraint', () => {
      const pattern = simulator.generateBrowsingPattern({ duration: 60 });
      const totalDuration = pattern.actions.reduce((sum, a) => sum + a.duration, 0);
      
      // Allow 10% tolerance
      expect(totalDuration).toBeGreaterThan(54000); // 54s
      expect(totalDuration).toBeLessThan(66000);    // 66s
    });
  });

  describe('generateScrollBehavior', () => {
    it('generates scroll events for page height', () => {
      const events = simulator.generateScrollBehavior(5000);
      
      expect(events.length).toBeGreaterThan(0);
      events.forEach(event => {
        expect(event.position).toBeGreaterThanOrEqual(0);
        expect(event.position).toBeLessThanOrEqual(5000);
      });
    });

    it('includes pauses at reading points', () => {
      const events = simulator.generateScrollBehavior(10000);
      const pauses = events.filter(e => e.duration > 2000);
      
      expect(pauses.length).toBeGreaterThan(0);
    });
  });

  describe('generateMouseMovement', () => {
    it('generates smooth path between points', () => {
      const path = simulator.generateMouseMovement(
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      
      expect(path.length).toBeGreaterThan(2);
      expect(path[0]).toEqual({ x: 0, y: 0 });
      expect(path[path.length - 1].x).toBeCloseTo(100, 0);
      expect(path[path.length - 1].y).toBeCloseTo(100, 0);
    });

    it('uses bezier curves for natural movement', () => {
      const path = simulator.generateMouseMovement(
        { x: 0, y: 0 },
        { x: 200, y: 0 }
      );
      
      // Path should not be perfectly straight
      const yValues = path.map(p => p.y);
      const hasVariation = yValues.some(y => y !== 0);
      expect(hasVariation).toBe(true);
    });
  });
});
```

### 2.2 search-rate-limiter.test.ts

```typescript
// tests/unit/search-rate-limiter.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchRateLimiter } from '@/electron/core/automation/search-rate-limiter';

describe('SearchRateLimiter', () => {
  let rateLimiter: SearchRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    rateLimiter = new SearchRateLimiter({
      maxRequestsPerMinute: 10,
      maxRequestsPerHour: 100,
      cooldownPeriod: 60000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('canProceed', () => {
    it('allows requests under rate limit', () => {
      expect(rateLimiter.canProceed('google')).toBe(true);
    });

    it('blocks requests exceeding per-minute limit', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest('google');
      }
      
      expect(rateLimiter.canProceed('google')).toBe(false);
    });

    it('resets after cooldown period', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest('google');
      }
      
      expect(rateLimiter.canProceed('google')).toBe(false);
      
      vi.advanceTimersByTime(60001);
      
      expect(rateLimiter.canProceed('google')).toBe(true);
    });

    it('tracks limits per search engine separately', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest('google');
      }
      
      expect(rateLimiter.canProceed('google')).toBe(false);
      expect(rateLimiter.canProceed('bing')).toBe(true);
    });
  });

  describe('getWaitTime', () => {
    it('returns 0 when under limit', () => {
      expect(rateLimiter.getWaitTime('google')).toBe(0);
    });

    it('returns remaining cooldown time when over limit', () => {
      for (let i = 0; i < 10; i++) {
        rateLimiter.recordRequest('google');
      }
      
      const waitTime = rateLimiter.getWaitTime('google');
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(60000);
    });
  });

  describe('recordRequest', () => {
    it('increments request count', () => {
      rateLimiter.recordRequest('google');
      rateLimiter.recordRequest('google');
      
      const stats = rateLimiter.getStats('google');
      expect(stats.requestsThisMinute).toBe(2);
    });

    it('tracks timestamp of each request', () => {
      const now = Date.now();
      vi.setSystemTime(now);
      
      rateLimiter.recordRequest('google');
      
      const stats = rateLimiter.getStats('google');
      expect(stats.lastRequestTime).toBe(now);
    });
  });

  describe('exponential backoff', () => {
    it('increases wait time after repeated rate limit hits', () => {
      // Hit rate limit multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < 10; i++) {
          rateLimiter.recordRequest('google');
        }
        vi.advanceTimersByTime(60001);
      }
      
      const waitTime = rateLimiter.getWaitTime('google');
      expect(waitTime).toBeGreaterThan(60000); // Should be longer due to backoff
    });
  });
});
```


### 2.3 result-extractor.test.ts

```typescript
// tests/unit/search/result-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResultExtractor, SearchResult } from '@/electron/core/automation/search/result-extractor';

describe('ResultExtractor', () => {
  let extractor: ResultExtractor;

  beforeEach(() => {
    extractor = new ResultExtractor();
  });

  describe('extractGoogleResults', () => {
    it('extracts title, URL, and description from Google SERP', () => {
      const mockHtml = `
        <div class="g">
          <h3>Test Title</h3>
          <a href="https://example.com/page">
            <cite>example.com</cite>
          </a>
          <span class="st">This is the description snippet.</span>
        </div>
      `;
      
      const results = extractor.extractGoogleResults(mockHtml);
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Title');
      expect(results[0].url).toBe('https://example.com/page');
      expect(results[0].description).toContain('description snippet');
    });

    it('assigns correct position to each result', () => {
      const mockHtml = generateMultipleResults(10);
      const results = extractor.extractGoogleResults(mockHtml);
      
      results.forEach((result, index) => {
        expect(result.position).toBe(index + 1);
      });
    });

    it('handles missing description gracefully', () => {
      const mockHtml = `
        <div class="g">
          <h3>Title Only</h3>
          <a href="https://example.com"></a>
        </div>
      `;
      
      const results = extractor.extractGoogleResults(mockHtml);
      expect(results[0].description).toBe('');
    });

    it('filters out ad results', () => {
      const mockHtml = `
        <div class="g" data-ad="true">
          <h3>Ad Result</h3>
        </div>
        <div class="g">
          <h3>Organic Result</h3>
          <a href="https://organic.com"></a>
        </div>
      `;
      
      const results = extractor.extractGoogleResults(mockHtml);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Organic Result');
    });
  });

  describe('findTargetDomain', () => {
    it('finds target domain in results', () => {
      const results: SearchResult[] = [
        { position: 1, title: 'Other', url: 'https://other.com', description: '' },
        { position: 2, title: 'Target', url: 'https://target.com/page', description: '' },
        { position: 3, title: 'Another', url: 'https://another.com', description: '' },
      ];
      
      const found = extractor.findTargetDomain(results, 'target.com');
      
      expect(found).not.toBeNull();
      expect(found?.position).toBe(2);
    });

    it('returns null when target not found', () => {
      const results: SearchResult[] = [
        { position: 1, title: 'Other', url: 'https://other.com', description: '' },
      ];
      
      const found = extractor.findTargetDomain(results, 'notfound.com');
      expect(found).toBeNull();
    });

    it('supports wildcard domain matching', () => {
      const results: SearchResult[] = [
        { position: 1, title: 'Sub', url: 'https://sub.example.com/page', description: '' },
      ];
      
      const found = extractor.findTargetDomain(results, '*.example.com');
      expect(found).not.toBeNull();
    });
  });
});
```

### 2.4 ad-viewer.test.ts

```typescript
// tests/unit/creator-support/ad-viewer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdViewer, AdDetectionResult } from '@/electron/core/creator-support/ad-viewer';

describe('AdViewer', () => {
  let adViewer: AdViewer;

  beforeEach(() => {
    adViewer = new AdViewer({
      minWatchTime: 5,
      maxWatchTime: 30,
      engagementProbability: 0.3,
      skipAfterMinTime: true,
    });
  });

  describe('detectAds', () => {
    it('detects YouTube video ads', () => {
      const mockDom = {
        querySelector: vi.fn((selector) => {
          if (selector === '.ytp-ad-player-overlay') return { tagName: 'DIV' };
          return null;
        }),
      };
      
      const result = adViewer.detectAds(mockDom as any, 'youtube');
      
      expect(result.detected).toBe(true);
      expect(result.adType).toBe('video');
    });

    it('detects banner ads', () => {
      const mockDom = {
        querySelector: vi.fn((selector) => {
          if (selector.includes('banner')) return { tagName: 'DIV' };
          return null;
        }),
      };
      
      const result = adViewer.detectAds(mockDom as any, 'youtube');
      expect(result.adType).toBe('banner');
    });

    it('returns none when no ads detected', () => {
      const mockDom = {
        querySelector: vi.fn(() => null),
      };
      
      const result = adViewer.detectAds(mockDom as any, 'youtube');
      
      expect(result.detected).toBe(false);
      expect(result.adType).toBe('none');
    });

    it('detects skip button availability', () => {
      const mockDom = {
        querySelector: vi.fn((selector) => {
          if (selector === '.ytp-ad-skip-button') return { tagName: 'BUTTON' };
          if (selector === '.ytp-ad-player-overlay') return { tagName: 'DIV' };
          return null;
        }),
      };
      
      const result = adViewer.detectAds(mockDom as any, 'youtube');
      expect(result.skipAvailable).toBe(true);
    });
  });

  describe('calculateWatchTime', () => {
    it('returns time within configured bounds', () => {
      const watchTime = adViewer.calculateWatchTime(30);
      
      expect(watchTime).toBeGreaterThanOrEqual(5);
      expect(watchTime).toBeLessThanOrEqual(30);
    });

    it('respects ad duration when shorter than max', () => {
      const watchTime = adViewer.calculateWatchTime(10);
      expect(watchTime).toBeLessThanOrEqual(10);
    });

    it('watches full short ads', () => {
      const watchTime = adViewer.calculateWatchTime(3);
      expect(watchTime).toBe(3);
    });
  });

  describe('generateEngagementActions', () => {
    it('generates engagement actions based on probability', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Below 0.3 threshold
      
      const actions = adViewer.generateEngagementActions();
      
      expect(actions.length).toBeGreaterThan(0);
    });

    it('returns empty when probability not met', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // Above 0.3 threshold
      
      const actions = adViewer.generateEngagementActions();
      
      expect(actions.length).toBe(0);
    });

    it('includes mouse movements in engagement', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      
      const actions = adViewer.generateEngagementActions();
      const hasMouseMove = actions.some(a => a.type === 'mousemove');
      
      expect(hasMouseMove).toBe(true);
    });
  });
});
```

---

## 3. Integration Test Gaps

### 3.1 Missing Integration Tests

| Test Scenario | Priority | Files Involved | Est. Hours |
|---------------|----------|----------------|------------|
| Proxy + Tab Integration | P0 | proxy-engine, tabs | 4 |
| Search + Result Extraction | P0 | search-executor, result-extractor | 5 |
| Creator Support Full Flow | P1 | creator-support/* | 6 |
| Translation + Search | P1 | translation, search | 3 |
| Scheduler + Automation | P0 | scheduler, executor | 5 |
| Privacy + Session Isolation | P0 | privacy/*, session | 4 |
| Rotation Strategy + Proxy | P1 | strategies/*, proxy-engine | 4 |

### 3.2 Integration Test Templates

```typescript
// tests/integration/search-result-extraction.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SearchExecutor } from '@/electron/core/automation/search/search-executor';
import { ResultExtractor } from '@/electron/core/automation/search/result-extractor';
import { SearchRateLimiter } from '@/electron/core/automation/search-rate-limiter';
import { ProxyManager } from '@/electron/core/proxy-engine/manager';

describe('Search + Result Extraction Integration', () => {
  let searchExecutor: SearchExecutor;
  let resultExtractor: ResultExtractor;
  let rateLimiter: SearchRateLimiter;
  let proxyManager: ProxyManager;

  beforeEach(() => {
    proxyManager = new ProxyManager();
    rateLimiter = new SearchRateLimiter({ maxRequestsPerMinute: 10 });
    resultExtractor = new ResultExtractor();
    searchExecutor = new SearchExecutor({
      proxyManager,
      rateLimiter,
      resultExtractor,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('full search flow', () => {
    it('executes search and extracts results', async () => {
      const mockBrowserView = createMockBrowserView({
        html: generateMockSERP('test keyword', 10),
      });
      
      const results = await searchExecutor.executeSearch({
        keyword: 'test keyword',
        engine: 'google',
        browserView: mockBrowserView,
      });
      
      expect(results.success).toBe(true);
      expect(results.data.length).toBe(10);
      expect(results.data[0].position).toBe(1);
    });

    it('finds target domain in extracted results', async () => {
      const mockBrowserView = createMockBrowserView({
        html: generateMockSERPWithTarget('test', 'target.com', 5),
      });
      
      const results = await searchExecutor.executeSearch({
        keyword: 'test',
        engine: 'google',
        browserView: mockBrowserView,
        targetDomains: ['target.com'],
      });
      
      expect(results.targetFound).toBe(true);
      expect(results.targetPosition).toBe(5);
    });

    it('respects rate limiting', async () => {
      for (let i = 0; i < 10; i++) {
        await searchExecutor.executeSearch({
          keyword: `keyword ${i}`,
          engine: 'google',
          browserView: createMockBrowserView(),
        });
      }
      
      const result = await searchExecutor.executeSearch({
        keyword: 'rate limited',
        engine: 'google',
        browserView: createMockBrowserView(),
      });
      
      expect(result.rateLimited).toBe(true);
    });

    it('rotates proxy per search', async () => {
      await proxyManager.addProxy({ host: '1.1.1.1', port: 8080 });
      await proxyManager.addProxy({ host: '2.2.2.2', port: 8080 });
      
      const proxiesUsed: string[] = [];
      
      for (let i = 0; i < 4; i++) {
        const result = await searchExecutor.executeSearch({
          keyword: `keyword ${i}`,
          engine: 'google',
          browserView: createMockBrowserView(),
        });
        proxiesUsed.push(result.proxyUsed);
      }
      
      expect(new Set(proxiesUsed).size).toBeGreaterThan(1);
    });
  });
});
```

```typescript
// tests/integration/creator-support-flow.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreatorScheduler } from '@/electron/core/creator-support/creator-scheduler';
import { AdViewer } from '@/electron/core/creator-support/ad-viewer';
import { SupportTracker } from '@/electron/core/creator-support/support-tracker';
import { PlatformDetector } from '@/electron/core/creator-support/platform-detection';

describe('Creator Support Full Flow Integration', () => {
  let scheduler: CreatorScheduler;
  let adViewer: AdViewer;
  let tracker: SupportTracker;
  let platformDetector: PlatformDetector;

  beforeEach(() => {
    platformDetector = new PlatformDetector();
    adViewer = new AdViewer();
    tracker = new SupportTracker();
    scheduler = new CreatorScheduler({ adViewer, tracker, platformDetector });
  });

  describe('end-to-end creator support', () => {
    it('detects platform, views ad, and tracks support', async () => {
      const creatorUrl = 'https://www.youtube.com/watch?v=test123';
      
      const platform = platformDetector.detect(creatorUrl);
      expect(platform).toBe('youtube');
      
      const mockPage = createMockYouTubePage({ hasAd: true, adDuration: 15 });
      const viewResult = await adViewer.viewAd(mockPage);
      
      expect(viewResult.watched).toBe(true);
      expect(viewResult.duration).toBeGreaterThan(0);
      
      tracker.recordSupport({
        creatorId: 'test-creator',
        platform: 'youtube',
        adViewed: true,
        duration: viewResult.duration,
      });
      
      const stats = tracker.getStats('test-creator');
      expect(stats.totalAdsViewed).toBe(1);
    });

    it('schedules and executes support sessions', async () => {
      const creator = {
        id: 'creator-1',
        url: 'https://youtube.com/c/testcreator',
        platform: 'youtube' as const,
        enabled: true,
        priority: 1,
      };
      
      scheduler.addCreator(creator);
      scheduler.schedule({ type: 'continuous', intervalMinutes: 30 });
      
      const session = await scheduler.executeNext();
      
      expect(session.creatorId).toBe('creator-1');
      expect(session.status).toBe('completed');
    });
  });
});
```

---

## 4. E2E Test Gaps

### 4.1 Missing E2E Scenarios

| Scenario | Priority | User Story | Est. Hours |
|----------|----------|------------|------------|
| Full Search Automation Cycle | P0 | SA-001, SA-002, SA-003 | 6 |
| Domain Click + Dwell Time | P0 | DT-002, DT-003 | 4 |
| Proxy Rotation During Automation | P0 | PM-004, PM-005 | 4 |
| Creator Support Session | P1 | CS-001, CS-002 | 5 |
| Session Save/Restore | P1 | Session persistence | 3 |
| Multi-Tab Isolation Verification | P0 | TM-001, TM-002 | 4 |
| WebRTC Leak Prevention Verification | P0 | PP-001 | 3 |
| Fingerprint Uniqueness Per Tab | P0 | PP-002, PP-003 | 4 |

### 4.2 E2E Test Templates

```typescript
// tests/e2e/full-search-automation.spec.ts
import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('Full Search Automation Cycle', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    page = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('executes complete search automation workflow', async () => {
    await page.click('[data-testid="automation-panel-toggle"]');
    await expect(page.locator('[data-testid="automation-panel"]')).toBeVisible();

    const keywords = ['test keyword 1', 'test keyword 2', 'test keyword 3'];
    for (const keyword of keywords) {
      await page.fill('[data-testid="keyword-input"]', keyword);
      await page.click('[data-testid="add-keyword-button"]');
    }
    
    await expect(page.locator('[data-testid="keyword-count"]')).toHaveText('3');

    await page.fill('[data-testid="target-domain-input"]', 'example.com');
    await page.click('[data-testid="add-domain-button"]');

    await page.selectOption('[data-testid="search-engine-select"]', 'google');

    await page.click('[data-testid="start-automation-button"]');
    
    await expect(page.locator('[data-testid="automation-status"]')).toHaveText('Running');
    
    await expect(page.locator('[data-testid="progress-completed"]'))
      .toHaveText(/[1-3]/, { timeout: 30000 });

    await expect(page.locator('[data-testid="results-panel"]')).toBeVisible();
  });

  test('handles automation pause and resume', async () => {
    await page.click('[data-testid="automation-panel-toggle"]');
    await page.fill('[data-testid="keyword-input"]', 'pause test');
    await page.click('[data-testid="add-keyword-button"]');
    
    await page.click('[data-testid="start-automation-button"]');
    await expect(page.locator('[data-testid="automation-status"]')).toHaveText('Running');
    
    await page.click('[data-testid="pause-automation-button"]');
    await expect(page.locator('[data-testid="automation-status"]')).toHaveText('Paused');
    
    await page.click('[data-testid="resume-automation-button"]');
    await expect(page.locator('[data-testid="automation-status"]')).toHaveText('Running');
  });
});
```

```typescript
// tests/e2e/fingerprint-isolation.spec.ts
import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('Fingerprint Isolation Per Tab', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    page = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('each tab has unique canvas fingerprint', async () => {
    const fingerprints: string[] = [];

    for (let i = 0; i < 3; i++) {
      if (i > 0) {
        await page.click('[data-testid="new-tab-button"]');
      }
      
      await page.fill('[data-testid="address-bar"]', 'about:blank');
      await page.press('[data-testid="address-bar"]', 'Enter');
      
      const fingerprint = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = '14px Arial';
          ctx.fillText('fingerprint test', 2, 2);
          return canvas.toDataURL();
        }
        return '';
      });
      
      fingerprints.push(fingerprint);
    }

    const uniqueFingerprints = new Set(fingerprints);
    expect(uniqueFingerprints.size).toBe(3);
  });

  test('WebRTC does not leak real IP', async () => {
    const candidates = await page.evaluate(() => {
      return new Promise((resolve) => {
        const pc = new RTCPeerConnection({ iceServers: [] });
        const results: string[] = [];
        
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            results.push(e.candidate.candidate);
          } else {
            resolve(results);
          }
        };
        
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        setTimeout(() => resolve(results), 5000);
      });
    }) as string[];
    
    const localIpPattern = /192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\./;
    candidates.forEach(candidate => {
      expect(candidate).not.toMatch(localIpPattern);
    });
  });
});
```

---

## 5. Implementation Roadmap

### Week 1: Foundation (P0 Unit Tests)

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | behavior-simulator.test.ts, page-interaction.test.ts | 2 test files, ~30 tests |
| 3-4 | search-rate-limiter.test.ts, result-extractor.test.ts | 2 test files, ~25 tests |
| 5 | executor.test.ts (partial), search-engine.test.ts (partial) | 2 test files started |

### Week 2: Core Automation (P0 Unit + Integration)

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | Complete executor.test.ts, search-engine.test.ts | 2 test files, ~40 tests |
| 3-4 | credential-store.test.ts, validator.test.ts | 2 test files, ~20 tests |
| 5 | Integration: search-result-extraction.test.ts | 1 integration test file |

### Week 3: Proxy Strategies + Creator Support (P1)

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | All proxy strategy tests (10 files) | 10 test files, ~50 tests |
| 3-4 | Creator support tests (5 files) | 5 test files, ~35 tests |
| 5 | Integration: creator-support-flow.test.ts | 1 integration test file |

### Week 4: E2E + Translation (P2)

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| 1-2 | E2E: full-search-automation.spec.ts | 1 E2E test file |
| 3 | E2E: fingerprint-isolation.spec.ts | 1 E2E test file |
| 4 | Translation module tests (5 files) | 5 test files, ~20 tests |
| 5 | Coverage verification, documentation | Final report |

---

## 6. TDD Checklist Per Test File

Before marking any test file complete:

- [ ] **RED**: All tests written first and failing
- [ ] **GREEN**: Minimal implementation to pass
- [ ] **REFACTOR**: Code cleaned up, tests still pass
- [ ] Edge cases covered (null, empty, invalid types)
- [ ] Error paths tested (not just happy path)
- [ ] Mocks used for external dependencies
- [ ] Tests are independent (no shared state)
- [ ] Test names describe behavior being tested
- [ ] Assertions are specific and meaningful
- [ ] Coverage for file is 80%+

---

## 7. Coverage Targets Summary

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Unit Tests (electron/core) | ~55% | 80% | 25% |
| Unit Tests (frontend) | ~40% | 80% | 40% |
| Integration Tests | ~40% | 60% | 20% |
| E2E Tests | ~70% | 80% | 10% |
| **Overall** | **~52%** | **80%** | **28%** |

---

## 8. Quick Reference Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/behavior-simulator.test.ts

# Run tests in watch mode (TDD)
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage -- --reporter=html
open coverage/index.html
```

---

## 9. Files to Create (Summary)

### Unit Tests (31 files needed)
```
tests/unit/
├── automation/
│   ├── behavior-simulator.test.ts       # NEW
│   ├── executor.test.ts                 # NEW
│   ├── page-interaction.test.ts         # NEW
│   ├── search-engine.test.ts            # NEW
│   └── search-rate-limiter.test.ts      # NEW
├── automation/search/
│   ├── result-extractor.test.ts         # NEW
│   ├── search-executor.test.ts          # NEW
│   └── translation-handler.test.ts      # NEW
├── creator-support/
│   ├── ad-viewer.test.ts                # NEW
│   ├── creator-scheduler.test.ts        # NEW
│   ├── creator-tracker.test.ts          # NEW
│   ├── platform-detection.test.ts       # NEW
│   └── support-tracker.test.ts          # NEW
├── proxy-engine/
│   ├── credential-store.test.ts         # NEW
│   └── validator.test.ts                # NEW
├── proxy-engine/strategies/
│   ├── base-strategy.test.ts            # NEW
│   ├── round-robin.test.ts              # NEW
│   ├── random.test.ts                   # NEW
│   ├── weighted.test.ts                 # NEW
│   ├── least-used.test.ts               # NEW
│   ├── fastest.test.ts                  # NEW
│   ├── geographic.test.ts               # NEW
│   ├── time-based.test.ts               # NEW
│   ├── failure-aware.test.ts            # NEW
│   └── custom-rules.test.ts             # NEW
└── translation/
    ├── translator.test.ts               # NEW
    ├── language-detector.test.ts        # NEW
    ├── translation-cache.test.ts        # NEW
    ├── language-mappings.test.ts        # NEW
    └── basic-translations.test.ts       # NEW
```

### Integration Tests (4 files needed)
```
tests/integration/
├── search-result-extraction.test.ts     # NEW
├── creator-support-flow.test.ts         # NEW
├── proxy-rotation-integration.test.ts   # NEW
└── privacy-session-isolation.test.ts    # NEW
```

### E2E Tests (4 files needed)
```
tests/e2e/
├── full-search-automation.spec.ts       # NEW
├── domain-click-dwell.spec.ts           # NEW
├── fingerprint-isolation.spec.ts        # NEW
└── session-save-restore.spec.ts         # NEW
```

### Frontend Component Tests (18 files needed)
```
tests/unit/components/
├── browser/
│   ├── AddressBar.test.tsx              # NEW
│   ├── EnhancedAutomationPanel.test.tsx # NEW (partial exists)
│   ├── EnhancedProxyPanel.test.tsx      # NEW (partial exists)
│   └── TabBar.test.tsx                  # NEW
├── dashboard/
│   ├── ActivityLog.test.tsx             # NEW
│   └── EnhancedStatsPanel.test.tsx      # NEW
├── panels/
│   ├── ActivityLogPanel.test.tsx        # NEW
│   ├── CreatorSupportPanel.test.tsx     # NEW
│   ├── PrivacyPanel.test.tsx            # NEW
│   ├── SettingsPanel.test.tsx           # NEW
│   └── StatsPanel.test.tsx              # NEW
└── ui/
    ├── ErrorBoundary.test.tsx           # NEW
    ├── animated-gradient-text.test.tsx  # NEW
    ├── border-beam.test.tsx             # NEW
    ├── neon-gradient-card.test.tsx      # NEW
    ├── number-ticker.test.tsx           # NEW
    ├── pulsating-button.test.tsx        # NEW
    └── shimmer-button.test.tsx          # NEW
```

**Total: 57 new test files needed**

---

## 10. Priority Matrix

```
                    IMPACT
                 High    Low
              ┌────────┬────────┐
         High │   P0   │   P2   │
   EFFORT     │ Do Now │ Review │
              ├────────┼────────┤
         Low  │   P1   │   P3   │
              │ Quick  │ Defer  │
              └────────┴────────┘
```

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 15 | Critical path, high impact, do immediately |
| P1 | 20 | Important, schedule for Week 2-3 |
| P2 | 15 | Nice to have, Week 4 |
| P3 | 7 | Defer to next sprint |

---

*Document generated: TDD Test Strategy Gap Analysis*
*Last updated: Based on codebase analysis*
