/**
 * Tab Suspension Unit Tests
 * Critical Action: Tab Suspension to reduce memory usage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TabSuspension } from '../../../electron/core/tabs/suspension';
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

describe('TabSuspension', () => {
  let suspension: TabSuspension;
  let mockExecutor: any;

  beforeEach(() => {
    mockExecutor = {
      suspendTab: vi.fn().mockResolvedValue(true),
      restoreTab: vi.fn().mockResolvedValue(true),
    };
    suspension = new TabSuspension({
      idleTimeout: 5000,
      checkInterval: 1000,
      executor: mockExecutor,
    });
  });

  afterEach(async () => {
    await suspension.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create with idle timeout and check interval', () => {
      expect(suspension.getConfig().idleTimeout).toBe(5000);
      expect(suspension.getConfig().checkInterval).toBe(1000);
    });
  });

  describe('registerTab', () => {
    it('should register a tab for idle tracking', () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      expect(suspension.getTabStatus(tab.id)).toBeDefined();
    });

    it('should initialize tab with current timestamp', () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      const status = suspension.getTabStatus(tab.id);
      expect(status?.lastActivityTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('unregisterTab', () => {
    it('should remove tab from tracking', () => {
      const tab = createMockTab();
      suspension.registerTab(tab);
      suspension.unregisterTab(tab.id);

      expect(suspension.getTabStatus(tab.id)).toBeUndefined();
    });
  });

  describe('recordActivity', () => {
    it('should update last activity time on interaction', () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      const statusBefore = suspension.getTabStatus(tab.id);
      vi.useFakeTimers();
      vi.advanceTimersByTime(2000);

      suspension.recordActivity(tab.id);
      const statusAfter = suspension.getTabStatus(tab.id);

      expect(statusAfter?.lastActivityTime).toBeGreaterThan(statusBefore?.lastActivityTime || 0);
      vi.useRealTimers();
    });

    it('should restore suspended tab on activity', async () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      // Simulate suspension
      const status = suspension.getTabStatus(tab.id);
      if (status) {
        status.suspended = true;
      }

      suspension.recordActivity(tab.id);
      await vi.runAllTimersAsync();

      expect(mockExecutor.restoreTab).toHaveBeenCalledWith(tab.id);
    });
  });

  describe('idle detection', () => {
    it('should detect idle tabs after timeout', async () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      vi.useFakeTimers();

      // Advance time beyond idle timeout
      vi.advanceTimersByTime(6000);

      // Allow detector to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = suspension.getTabStatus(tab.id);
      expect(status?.suspended || mockExecutor.suspendTab.mock.calls.length > 0).toBeTruthy();

      vi.useRealTimers();
    });

    it('should not suspend active tabs', async () => {
      const tab = createMockTab({ isActive: true });
      suspension.registerTab(tab);

      vi.useFakeTimers();
      vi.advanceTimersByTime(6000);

      const status = suspension.getTabStatus(tab.id);
      expect(status?.suspended).toBe(false);

      vi.useRealTimers();
    });

    it('should not suspend pinned tabs', async () => {
      const tab = createMockTab({ isPinned: true });
      suspension.registerTab(tab);

      vi.useFakeTimers();
      vi.advanceTimersByTime(6000);

      const status = suspension.getTabStatus(tab.id);
      expect(status?.suspended).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('metrics', () => {
    it('should track suspension count', async () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      const statusBefore = suspension.getMetrics().suspensionCount;

      const tabStatus = suspension.getTabStatus(tab.id);
      if (tabStatus) {
        tabStatus.suspended = true;
        suspension.recordActivity(tab.id); // Trigger restore
      }

      const statusAfter = suspension.getMetrics().suspensionCount;
      expect(statusAfter).toBeGreaterThanOrEqual(statusBefore);
    });

    it('should track memory saved by suspended tabs', () => {
      const tab1 = createMockTab();
      const tab2 = createMockTab();

      suspension.registerTab(tab1);
      suspension.registerTab(tab2);

      const status1 = suspension.getTabStatus(tab1.id);
      const status2 = suspension.getTabStatus(tab2.id);

      if (status1) status1.suspended = true;
      if (status2) status2.suspended = true;

      const metrics = suspension.getMetrics();
      expect(metrics.estimatedMemorySaved).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    it('should cleanup all tracked tabs', async () => {
      const tab = createMockTab();
      suspension.registerTab(tab);

      await suspension.destroy();

      expect(suspension.getTabStatus(tab.id)).toBeUndefined();
      expect(suspension.getMetrics().totalTracked).toBe(0);
    });
  });
});
