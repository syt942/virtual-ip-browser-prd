/**
 * Tab Suspension Manager
 * Automatically suspends idle tabs to reduce memory usage.
 * Restores on user interaction.
 */

import type { Tab } from './types';

export interface TabSuspensionConfig {
  idleTimeout: number; // Milliseconds before suspension
  checkInterval: number; // How often to check for idle tabs
  executor: {
    suspendTab: (tabId: string) => Promise<boolean>;
    restoreTab: (tabId: string) => Promise<boolean>;
  };
}

export interface TabStatus {
  tabId: string;
  suspended: boolean;
  lastActivityTime: number;
  suspensionTime?: number;
}

export interface TabSuspensionMetrics {
  totalTracked: number;
  suspendedCount: number;
  suspensionCount: number;
  restorationCount: number;
  estimatedMemorySaved: number;
}

export class TabSuspension {
  private static readonly ESTIMATED_MEMORY_PER_TAB_MB = 50;

  private config: TabSuspensionConfig;
  private tabStates: Map<string, TabStatus> = new Map();
  private restoringTabs: Set<string> = new Set(); // Prevent concurrent restore operations
  private checkIntervalId?: NodeJS.Timeout;
  private metrics = {
    suspensionCount: 0,
    restorationCount: 0,
    memoryEstimate: 0, // MB
  };

  constructor(config: TabSuspensionConfig) {
    this.config = config;
    this.startIdleDetector();
  }

  /**
   * Register a tab for idle tracking.
   */
  registerTab(tab: Tab): void {
    this.tabStates.set(tab.id, {
      tabId: tab.id,
      suspended: false,
      lastActivityTime: Date.now(),
    });
  }

  /**
   * Unregister a tab from idle tracking.
   */
  unregisterTab(tabId: string): void {
    this.tabStates.delete(tabId);
  }

  /**
   * Record user activity on a tab.
   */
  async recordActivity(tabId: string): Promise<void> {
    if (this.restoringTabs.has(tabId)) return; // Already restoring, skip concurrent calls

    const status = this.tabStates.get(tabId);
    if (!status) return;

    status.lastActivityTime = Date.now();

    if (status.suspended) {
      this.restoringTabs.add(tabId);
      try {
        const restored = await this.config.executor.restoreTab(tabId);
        if (restored) {
          status.suspended = false;
          this.metrics.restorationCount++;
          this.metrics.memoryEstimate = Math.max(
            0,
            this.metrics.memoryEstimate - TabSuspension.ESTIMATED_MEMORY_PER_TAB_MB
          );
        }
      } finally {
        this.restoringTabs.delete(tabId);
      }
    }
  }

  /**
   * Get status of a tracked tab.
   */
  getTabStatus(tabId: string): TabStatus | undefined {
    return this.tabStates.get(tabId);
  }

  /**
   * Get current configuration.
   */
  getConfig(): TabSuspensionConfig {
    return this.config;
  }

  /**
   * Get current metrics.
   */
  getMetrics(): TabSuspensionMetrics {
    const suspendedCount = Array.from(this.tabStates.values()).filter((s) => s.suspended).length;

    return {
      totalTracked: this.tabStates.size,
      suspendedCount,
      suspensionCount: this.metrics.suspensionCount,
      restorationCount: this.metrics.restorationCount,
      estimatedMemorySaved: this.metrics.memoryEstimate,
    };
  }

  /**
   * Start the idle detection loop.
   */
  private startIdleDetector(): void {
    this.checkIntervalId = setInterval(() => {
      this.detectIdleTabs();
    }, this.config.checkInterval);
  }

  /**
   * Detect and suspend idle tabs.
   */
  private async detectIdleTabs(): Promise<void> {
    const now = Date.now();

    for (const [tabId, status] of this.tabStates.entries()) {
      if (status.suspended) continue;

      const idleTime = now - status.lastActivityTime;
      if (idleTime > this.config.idleTimeout) {
        await this.suspendTab(tabId);
      }
    }
  }

  /**
   * Suspend a specific tab.
   */
  private async suspendTab(tabId: string): Promise<void> {
    const status = this.tabStates.get(tabId);
    if (!status) return;

    const suspended = await this.config.executor.suspendTab(tabId);
    if (suspended) {
      status.suspended = true;
      status.suspensionTime = Date.now();
      this.metrics.suspensionCount++;
      this.metrics.memoryEstimate += TabSuspension.ESTIMATED_MEMORY_PER_TAB_MB;
    }
  }

  /**
   * Destroy the suspension manager and cleanup.
   */
  async destroy(): Promise<void> {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }

    this.tabStates.clear();
    this.restoringTabs.clear();
    this.metrics = {
      suspensionCount: 0,
      restorationCount: 0,
      memoryEstimate: 0,
    };
  }
}
