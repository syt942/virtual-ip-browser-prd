/**
 * Tab Pool Unit Tests
 * Critical Action: Tab Pool for performance optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabPool } from '../../../electron/core/tabs/pool';
import type { Tab } from '../../../electron/core/tabs/types';

const createMockTab = (overrides: Partial<Tab> = {}): Tab => ({
  id: `tab-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Test Page',
  url: 'https://example.com',
  partition: 'persist:default',
  status: 'active',
  isActive: false,
  isPinned: false,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  createdAt: new Date(),
  lastActiveAt: new Date(),
  ...overrides,
});

describe('TabPool', () => {
  let pool: TabPool;

  beforeEach(() => {
    pool = new TabPool({ minSize: 2, maxSize: 10, timeout: 5000 });
  });

  afterEach(async () => {
    await pool.destroy();
  });

  describe('initialization', () => {
    it('should create pool with correct size constraints', () => {
      expect(pool.getMetrics().totalTabs).toBeGreaterThanOrEqual(2);
      expect(pool.getMetrics().availableTabs).toBeGreaterThanOrEqual(2);
    });

    it('should pre-create minimum number of tabs', () => {
      expect(pool.getMetrics().availableTabs).toBe(2);
    });
  });

  describe('acquire', () => {
    it('should return an available tab', async () => {
      const tab = await pool.acquire();
      expect(tab).toBeDefined();
      expect(tab?.id).toBeDefined();
    });

    it('should decrease available count after acquire', async () => {
      const beforeCount = pool.getMetrics().availableTabs;
      await pool.acquire();
      expect(pool.getMetrics().availableTabs).toBe(beforeCount - 1);
    });

    it('should create new tab if available pool exhausted', async () => {
      const totalBefore = pool.getMetrics().totalTabs;
      const tab1 = await pool.acquire();
      const tab2 = await pool.acquire();
      const tab3 = await pool.acquire();

      expect(pool.getMetrics().totalTabs).toBeGreaterThan(totalBefore);
      expect(tab1).toBeDefined();
      expect(tab2).toBeDefined();
      expect(tab3).toBeDefined();
    });

    it('should not exceed maxSize', async () => {
      const tabs = [];
      for (let i = 0; i < 12; i++) {
        const tab = await pool.acquire();
        if (tab) tabs.push(tab);
      }

      expect(pool.getMetrics().totalTabs).toBeLessThanOrEqual(10);
    });

    it('should return null when pool full and no room to create', async () => {
      const tabs = [];
      for (let i = 0; i < 10; i++) {
        const tab = await pool.acquire();
        if (tab) tabs.push(tab);
      }

      const extraTab = await pool.acquire();
      expect(extraTab).toBeNull();
    });
  });

  describe('release', () => {
    it('should return tab to available pool', async () => {
      const tab = await pool.acquire();
      expect(tab).toBeDefined();

      if (tab) {
        const beforeRelease = pool.getMetrics().availableTabs;
        await pool.release(tab.id);
        expect(pool.getMetrics().availableTabs).toBe(beforeRelease + 1);
      }
    });

    it('should recycle tab (clear state) before returning to pool', async () => {
      const tab = await pool.acquire();
      expect(tab).toBeDefined();

      if (tab) {
        const recycledTab = await pool.release(tab.id);
        expect(recycledTab.url).not.toBe(tab.url);
      }
    });

    it('should handle release of non-existent tab gracefully', async () => {
      await expect(pool.release('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('metrics', () => {
    it('should track total, available, and in-use tabs', async () => {
      const beforeMetrics = pool.getMetrics();
      const tab = await pool.acquire();

      const afterMetrics = pool.getMetrics();
      expect(afterMetrics.totalTabs).toBe(beforeMetrics.totalTabs);
      expect(afterMetrics.availableTabs).toBe(beforeMetrics.availableTabs - 1);
      expect(afterMetrics.inUseTabs).toBe(beforeMetrics.inUseTabs + 1);
    });

    it('should track recycle count', async () => {
      const beforeRecycles = pool.getMetrics().recycleCount;
      const tab = await pool.acquire();

      if (tab) {
        await pool.release(tab.id);
        expect(pool.getMetrics().recycleCount).toBeGreaterThan(beforeRecycles);
      }
    });

    it('should track average recycle time', async () => {
      const tab = await pool.acquire();

      if (tab) {
        await pool.release(tab.id);
        const metrics = pool.getMetrics();
        expect(metrics.avgRecycleTime).toBeGreaterThan(0);
      }
    });
  });

  describe('destroy', () => {
    it('should cleanup all tabs', async () => {
      const tab1 = await pool.acquire();
      const tab2 = await pool.acquire();

      await pool.destroy();

      const metrics = pool.getMetrics();
      expect(metrics.totalTabs).toBe(0);
      expect(metrics.availableTabs).toBe(0);
    });
  });
});
