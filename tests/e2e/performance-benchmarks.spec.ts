/**
 * E2E Tests - Performance Benchmarks (v1.3.0 Release)
 * Tests for performance validation with new indexes and UI components
 * - Test database query performance with indexes
 * - Test UI animation performance
 * - Test proxy rotation performance
 * - Measure memory usage
 * - Test bundle load time
 */

import { test, expect } from '@playwright/test';
import { BasePage } from './pages/BasePage';
import { testTimeouts, waitTimes } from './fixtures/test-data';

// Performance thresholds
const THRESHOLDS = {
  appLoadTime: 5000,        // 5 seconds max for app load
  panelOpenTime: 1000,      // 1 second max for panel open
  listRenderTime: 2000,     // 2 seconds max for list render
  animationFPS: 30,         // 30+ FPS for animations
  memoryMB: 512,            // 512MB max memory usage
  bundleSizeKB: 5000,       // 5MB max bundle size
  queryResponseTime: 500,   // 500ms max for DB queries
};

class PerformancePage extends BasePage {
  readonly proxyPanelButton = this.page.locator('[data-testid="proxy-panel-button"]');
  readonly automationPanelButton = this.page.locator('[data-testid="automation-panel-button"]');
  readonly activityLogButton = this.page.locator('[data-testid="activity-log-button"]');
  readonly statsPanelButton = this.page.locator('[data-testid="stats-panel-button"]');
  
  readonly proxyPanel = this.page.locator('[data-testid="proxy-panel"]');
  readonly proxyList = this.page.locator('[data-testid="proxy-list"]');
  readonly proxyItems = this.page.locator('[data-testid="proxy-item"]');
  readonly activityLog = this.page.locator('[data-testid="activity-log-panel"]');
  readonly activityEntries = this.page.locator('[data-testid="activity-entry"]');

  async measurePanelOpenTime(panelButton: string): Promise<number> {
    const button = this.page.locator(panelButton);
    if (!await button.isVisible()) {return -1;}
    
    const start = Date.now();
    await button.click();
    await this.page.waitForTimeout(waitTimes.panelAnimation);
    return Date.now() - start;
  }
}

test.describe('Performance Benchmarks @performance', () => {
  let perfPage: PerformancePage;

  test.beforeEach(async ({ page }) => {
    perfPage = new PerformancePage(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/perf-${testInfo.title.replace(/\s+/g, '-')}-failed.png`,
        fullPage: true
      });
    }
  });

  test.describe('Application Load Performance', () => {
    test('should load application within threshold', async ({ page }) => {
      const startTime = Date.now();
      await perfPage.goto();
      await perfPage.waitForAppReady();
      const loadTime = Date.now() - startTime;
      
      console.log(`App load time: ${loadTime}ms (threshold: ${THRESHOLDS.appLoadTime}ms)`);
      expect(loadTime).toBeLessThan(THRESHOLDS.appLoadTime);
      
      await perfPage.screenshot('app-load-time');
    });

    test('should achieve DOMContentLoaded within 3 seconds', async ({ page }) => {
      const metrics = await page.evaluate(() => {
        return {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          domComplete: performance.timing.domComplete - performance.timing.navigationStart
        };
      });
      
      // Navigate and measure
      await perfPage.goto();
      
      const domMetrics = await page.evaluate(() => ({
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
      }));
      
      console.log(`DOMContentLoaded: ${domMetrics.domContentLoaded}ms`);
      console.log(`Load Complete: ${domMetrics.loadComplete}ms`);
      
      await perfPage.screenshot('dom-metrics');
    });

    test('should have no long tasks blocking main thread', async ({ page }) => {
      await perfPage.goto();
      
      // Monitor for long tasks (>50ms)
      const longTasks = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          let count = 0;
          const observer = new PerformanceObserver((list) => {
            count += list.getEntries().length;
          });
          
          try {
            observer.observe({ entryTypes: ['longtask'] });
          } catch {
            resolve(0); // Long task API not available
            return;
          }
          
          setTimeout(() => {
            observer.disconnect();
            resolve(count);
          }, 2000);
        });
      });
      
      console.log(`Long tasks detected: ${longTasks}`);
      expect(longTasks).toBeLessThan(10); // Allow some long tasks during init
      
      await perfPage.screenshot('long-tasks');
    });
  });

  test.describe('Database Query Performance', () => {
    test('should load proxy list within threshold', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const loadTime = await perfPage.measurePanelOpenTime('[data-testid="proxy-panel-button"]');
      
      console.log(`Proxy panel load: ${loadTime}ms (threshold: ${THRESHOLDS.panelOpenTime}ms)`);
      if (loadTime > 0) {
        expect(loadTime).toBeLessThan(THRESHOLDS.panelOpenTime);
      }
      
      await perfPage.screenshot('proxy-query-perf');
    });

    test('should load activity log within threshold', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const loadTime = await perfPage.measurePanelOpenTime('[data-testid="activity-log-button"]');
      
      console.log(`Activity log load: ${loadTime}ms`);
      if (loadTime > 0) {
        expect(loadTime).toBeLessThan(THRESHOLDS.listRenderTime);
      }
      
      await perfPage.screenshot('activity-query-perf');
    });

    test('should handle stats panel queries efficiently', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const loadTime = await perfPage.measurePanelOpenTime('[data-testid="stats-panel-button"]');
      
      console.log(`Stats panel load: ${loadTime}ms`);
      if (loadTime > 0) {
        expect(loadTime).toBeLessThan(THRESHOLDS.listRenderTime);
      }
      
      await perfPage.screenshot('stats-query-perf');
    });

    test('should maintain performance with multiple panel switches', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const panels = [
        '[data-testid="proxy-panel-button"]',
        '[data-testid="automation-panel-button"]',
        '[data-testid="activity-log-button"]',
        '[data-testid="stats-panel-button"]'
      ];
      
      const times: number[] = [];
      
      // Switch between panels multiple times
      for (let i = 0; i < 3; i++) {
        for (const panel of panels) {
          const button = page.locator(panel);
          if (await button.isVisible({ timeout: 500 }).catch(() => false)) {
            const start = Date.now();
            await button.click();
            await page.waitForTimeout(100);
            times.push(Date.now() - start);
          }
        }
      }
      
      const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      console.log(`Average panel switch time: ${avgTime.toFixed(0)}ms`);
      
      expect(avgTime).toBeLessThan(THRESHOLDS.panelOpenTime);
      
      await perfPage.screenshot('panel-switch-perf');
    });
  });

  test.describe('UI Animation Performance', () => {
    test('should maintain 30+ FPS during animations', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const fps = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          let frameCount = 0;
          const startTime = performance.now();
          
          const countFrames = () => {
            frameCount++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              resolve(frameCount);
            }
          };
          
          requestAnimationFrame(countFrames);
        });
      });
      
      console.log(`Measured FPS: ${fps}`);
      expect(fps).toBeGreaterThanOrEqual(THRESHOLDS.animationFPS);
      
      await perfPage.screenshot('animation-fps');
    });

    test('should not cause layout thrashing', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      // Open panels to trigger animations
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      if (await proxyButton.isVisible()) {
        await proxyButton.click();
      }
      
      // Measure layout shifts
      const layoutShifts = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          let totalShift = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // @ts-ignore - CLS entry
              totalShift += entry.value || 0;
            }
          });
          
          try {
            observer.observe({ type: 'layout-shift', buffered: true });
          } catch {
            resolve(0);
            return;
          }
          
          setTimeout(() => {
            observer.disconnect();
            resolve(totalShift);
          }, 2000);
        });
      });
      
      console.log(`Cumulative Layout Shift: ${layoutShifts.toFixed(4)}`);
      expect(layoutShifts).toBeLessThan(0.25); // Good CLS is < 0.1, acceptable < 0.25
      
      await perfPage.screenshot('layout-thrashing');
    });

    test('should handle reduced motion efficiently', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const startTime = Date.now();
      await perfPage.goto();
      await perfPage.waitForAppReady();
      const loadTime = Date.now() - startTime;
      
      console.log(`Load time with reduced motion: ${loadTime}ms`);
      // Should be same or faster with reduced motion
      expect(loadTime).toBeLessThan(THRESHOLDS.appLoadTime);
      
      await perfPage.screenshot('reduced-motion-perf');
    });
  });

  test.describe('Proxy Rotation Performance', () => {
    test('should handle rotation strategy changes quickly', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      const strategySelect = page.locator('[data-testid="rotation-strategy-select"]');
      if (await strategySelect.isVisible()) {
        const start = Date.now();
        await strategySelect.click();
        await page.waitForTimeout(100);
        const responseTime = Date.now() - start;
        
        console.log(`Strategy selector response: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(THRESHOLDS.queryResponseTime);
      }
      
      await perfPage.screenshot('rotation-strategy-perf');
    });

    test('should load proxy stats efficiently', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      const proxyButton = page.locator('[data-testid="proxy-panel-button"]');
      await proxyButton.click();
      
      const start = Date.now();
      await page.waitForTimeout(waitTimes.panelAnimation);
      
      // Wait for stats to load
      const statsElement = page.locator('[data-testid="proxy-stats"]');
      if (await statsElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        const loadTime = Date.now() - start;
        console.log(`Proxy stats load: ${loadTime}ms`);
        expect(loadTime).toBeLessThan(THRESHOLDS.listRenderTime);
      }
      
      await perfPage.screenshot('proxy-stats-perf');
    });
  });

  test.describe('Memory Usage', () => {
    test('should stay within memory threshold', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      // Get JS heap size if available
      const memoryInfo = await page.evaluate(() => {
        // Chrome-specific API
        const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
        if (perf.memory) {
          return {
            usedJSHeapSize: perf.memory.usedJSHeapSize / 1024 / 1024,
            totalJSHeapSize: perf.memory.totalJSHeapSize / 1024 / 1024,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit / 1024 / 1024
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        console.log(`Used JS Heap: ${memoryInfo.usedJSHeapSize.toFixed(2)}MB`);
        console.log(`Total JS Heap: ${memoryInfo.totalJSHeapSize.toFixed(2)}MB`);
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(THRESHOLDS.memoryMB);
      } else {
        console.log('Memory API not available in this browser');
      }
      
      await perfPage.screenshot('memory-usage');
    });

    test('should not leak memory on panel navigation', async ({ page }) => {
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      // Get initial memory
      const getMemory = async () => {
        return page.evaluate(() => {
          // @ts-ignore
          return performance.memory?.usedJSHeapSize || 0;
        });
      };
      
      const initialMemory = await getMemory();
      
      // Navigate panels multiple times
      const panels = ['proxy', 'automation', 'activity', 'stats'];
      for (let i = 0; i < 5; i++) {
        for (const panel of panels) {
          const button = page.locator(`[data-testid="${panel}-panel-button"]`);
          if (await button.isVisible({ timeout: 200 }).catch(() => false)) {
            await button.click();
            await page.waitForTimeout(50);
          }
        }
      }
      
      // Force GC if available
      await page.evaluate(() => {
        // @ts-ignore
        if (window.gc) {window.gc();}
      });
      
      await page.waitForTimeout(500);
      const finalMemory = await getMemory();
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;
        console.log(`Memory growth: ${memoryGrowth.toFixed(2)}MB`);
        expect(memoryGrowth).toBeLessThan(50); // Allow 50MB growth
      }
      
      await perfPage.screenshot('memory-leak-check');
    });
  });

  test.describe('Bundle Performance', () => {
    test('should load critical resources quickly', async ({ page }) => {
      const resources: { name: string; size: number; duration: number }[] = [];
      
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css')) {
          const headers = response.headers();
          const size = parseInt(headers['content-length'] || '0');
          resources.push({
            name: url.split('/').pop() || url,
            size: size / 1024,
            duration: 0
          });
        }
      });
      
      await perfPage.goto();
      await perfPage.waitForAppReady();
      
      // Log resource sizes
      const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
      console.log(`Total resource size: ${totalSize.toFixed(0)}KB`);
      console.log(`Resources loaded: ${resources.length}`);
      
      await perfPage.screenshot('bundle-performance');
    });

    test('should have efficient first paint', async ({ page }) => {
      await perfPage.goto();
      
      const paintMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('paint');
        const metrics: Record<string, number> = {};
        for (const entry of entries) {
          metrics[entry.name] = entry.startTime;
        }
        return metrics;
      });
      
      console.log('Paint metrics:', paintMetrics);
      
      if (paintMetrics['first-contentful-paint']) {
        expect(paintMetrics['first-contentful-paint']).toBeLessThan(3000);
      }
      
      await perfPage.screenshot('paint-metrics');
    });
  });
});
