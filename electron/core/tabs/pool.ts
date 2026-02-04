/**
 * Tab Pool Manager
 * Efficiently manages a pool of pre-created isolated tabs for performance optimization.
 * Implements acquire/release pattern with automatic recycling.
 */

import { randomUUID } from 'crypto';
import type { Tab } from './types';

export interface TabPoolConfig {
  minSize: number;
  maxSize: number;
  timeout: number; // Recycle timeout in ms
}

export interface TabPoolMetrics {
  totalTabs: number;
  availableTabs: number;
  inUseTabs: number;
  recycleCount: number;
  avgRecycleTime: number;
}

export class TabPool {
  private static readonly MAX_METRIC_SAMPLES = 1000;

  private availableTabs: Map<string, Tab> = new Map();
  private inUseTabs: Map<string, Tab> = new Map(); // Changed from Set to Map to track tab objects
  private config: TabPoolConfig;
  private metrics = {
    recycleCount: 0,
    totalRecycleTime: 0,
    recycleTimings: [] as number[],
  };

  constructor(config: TabPoolConfig) {
    this.config = config;
    this.initializePool();
  }

  private initializePool() {
    for (let i = 0; i < this.config.minSize; i++) {
      const tab = this.createTab();
      this.availableTabs.set(tab.id, tab);
    }
  }

  private createTab(): Tab {
    return {
      id: `tab-${randomUUID()}`,
      title: '',
      url: 'about:blank',
      partition: `persist:tab-${randomUUID()}`,
      status: 'created',
      isActive: false,
      isPinned: false,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };
  }

  /**
   * Acquire a tab from the pool.
   * If pool is exhausted, creates a new tab (up to maxSize).
   * Returns null if maxSize reached and no tabs available.
   */
  async acquire(): Promise<Tab | null> {
    // Try to get from available pool
    const available = this.availableTabs.values().next().value;
    if (available) {
      this.availableTabs.delete(available.id);
      this.inUseTabs.set(available.id, available);
      return available;
    }

    // Check if we can create a new tab
    const totalTabs = this.availableTabs.size + this.inUseTabs.size;
    if (totalTabs < this.config.maxSize) {
      const newTab = this.createTab();
      this.inUseTabs.set(newTab.id, newTab);
      return newTab;
    }

    return null;
  }

  /**
   * Release a tab back to the pool.
   * Recycles the tab (clears state) before returning to available pool.
   */
  async release(tabId: string): Promise<Tab> {
    const tab = this.inUseTabs.get(tabId);
    if (!tab) {
      const available = this.availableTabs.get(tabId);
      if (available) {
        return available;
      }

      return this.createTab();
    }

    this.inUseTabs.delete(tabId);

    const startTime = Date.now();
    const recycledTab = this.recycleTab(tab);
    const recycleTime = Date.now() - startTime;

    this.metrics.recycleCount++;
    this.metrics.totalRecycleTime += recycleTime;
    this.addRecycleTiming(recycleTime);

    this.availableTabs.set(recycledTab.id, recycledTab);
    return recycledTab;
  }

  /**
   * Recycle a tab by clearing its state.
   */
  private recycleTab(tab: Tab): Tab {
    return {
      ...tab,
      title: '',
      url: 'about:blank',
      status: 'created',
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      lastActiveAt: new Date(),
    };
  }

  /**
   * Add recycle timing to metrics with bounded history.
   */
  private addRecycleTiming(timing: number): void {
    this.metrics.recycleTimings.push(timing);
    if (this.metrics.recycleTimings.length > TabPool.MAX_METRIC_SAMPLES) {
      this.metrics.recycleTimings.shift();
    }
  }

  /**
   * Get current pool metrics.
   */
  getMetrics(): TabPoolMetrics {
    const recycleTimings = this.metrics.recycleTimings;
    const avgRecycleTime =
      recycleTimings.length > 0
        ? recycleTimings.reduce((a, b) => a + b, 0) / recycleTimings.length
        : 0;

    return {
      totalTabs: this.availableTabs.size + this.inUseTabs.size,
      availableTabs: this.availableTabs.size,
      inUseTabs: this.inUseTabs.size,
      recycleCount: this.metrics.recycleCount,
      avgRecycleTime,
    };
  }

  /**
   * Destroy the pool and cleanup all tabs.
   */
  async destroy(): Promise<void> {
    this.availableTabs.clear();
    this.inUseTabs.clear();
    this.metrics = {
      recycleCount: 0,
      totalRecycleTime: 0,
      recycleTimings: [],
    };
  }
}
