/**
 * Comprehensive Metrics & Monitoring
 * Tracks all performance optimizations: Tab Pool, Suspension, DB Batching, IPC Batching
 */

import type { TabPoolMetrics } from '../tabs/pool';
import type { TabSuspensionMetrics } from '../tabs/suspension';
import type { WriteBatchMetrics } from '../../database/write-batch';
import type { EventBatchMetrics } from '../../ipc/event-batch';

export interface SystemMetrics {
  timestamp: Date;
  tabPool: TabPoolMetrics;
  tabSuspension: TabSuspensionMetrics;
  dbBatch: WriteBatchMetrics;
  ipcBatch: EventBatchMetrics;
  compositeScore: number; // 0-100
  recommendations: string[];
}

export interface PerformanceAlert {
  level: 'info' | 'warning' | 'critical';
  component: 'tabPool' | 'tabSuspension' | 'dbBatch' | 'ipcBatch' | 'system';
  message: string;
  timestamp: Date;
}

export class Metrics {
  private tabPoolMetrics?: TabPoolMetrics;
  private tabSuspensionMetrics?: TabSuspensionMetrics;
  private dbBatchMetrics?: WriteBatchMetrics;
  private ipcBatchMetrics?: EventBatchMetrics;
  private alerts: PerformanceAlert[] = [];
  private history: SystemMetrics[] = [];
  private maxHistorySize = 1000;

  /**
   * Update tab pool metrics.
   */
  updateTabPool(metrics: TabPoolMetrics): void {
    this.tabPoolMetrics = metrics;
    this.checkTabPoolHealth();
  }

  /**
   * Update tab suspension metrics.
   */
  updateTabSuspension(metrics: TabSuspensionMetrics): void {
    this.tabSuspensionMetrics = metrics;
    this.checkSuspensionHealth();
  }

  /**
   * Update database batch metrics.
   */
  updateDbBatch(metrics: WriteBatchMetrics): void {
    this.dbBatchMetrics = metrics;
    this.checkDbBatchHealth();
  }

  /**
   * Update IPC batch metrics.
   */
  updateIpcBatch(metrics: EventBatchMetrics): void {
    this.ipcBatchMetrics = metrics;
    this.checkIpcBatchHealth();
  }

  /**
   * Get current system metrics snapshot.
   */
  getSystemMetrics(): SystemMetrics {
    const snapshot: SystemMetrics = {
      timestamp: new Date(),
      tabPool: this.tabPoolMetrics || {
        totalTabs: 0,
        availableTabs: 0,
        inUseTabs: 0,
        recycleCount: 0,
        avgRecycleTime: 0,
      },
      tabSuspension: this.tabSuspensionMetrics || {
        totalTracked: 0,
        suspendedCount: 0,
        suspensionCount: 0,
        restorationCount: 0,
        estimatedMemorySaved: 0,
      },
      dbBatch: this.dbBatchMetrics || {
        queuedOperations: 0,
        totalProcessed: 0,
        flushCount: 0,
        avgBatchSize: 0,
        failedOperations: 0,
      },
      ipcBatch: this.ipcBatchMetrics || {
        queuedEvents: 0,
        totalEmitted: 0,
        batchCount: 0,
        avgBatchSize: 0,
      },
      compositeScore: 0,
      recommendations: [],
    };

    snapshot.compositeScore = this.calculateCompositeScore(snapshot);
    snapshot.recommendations = this.generateRecommendations(snapshot);

    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    return snapshot;
  }

  /**
   * Get performance alerts.
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts.
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get metrics history.
   */
  getHistory(limit: number = 100): SystemMetrics[] {
    return this.history.slice(-limit);
  }

  /**
   * Calculate composite performance score (0-100).
   */
  private calculateCompositeScore(metrics: SystemMetrics): number {
    let score = 100;

    // Tab pool efficiency (available vs total)
    const poolUtilization = metrics.tabPool.totalTabs > 0
      ? (metrics.tabPool.inUseTabs / metrics.tabPool.totalTabs) * 100
      : 0;
    if (poolUtilization > 90) score -= 20;
    if (poolUtilization > 95) score -= 10;

    // Suspension effectiveness
    const suspensionRate = metrics.tabSuspension.totalTracked > 0
      ? (metrics.tabSuspension.suspendedCount / metrics.tabSuspension.totalTracked) * 100
      : 0;
    if (suspensionRate < 10) score -= 10; // Not suspending enough idle tabs

    // DB batch efficiency
    if (metrics.dbBatch.flushCount > 0) {
      if (metrics.dbBatch.avgBatchSize < 5) score -= 10; // Too many small batches
      if (metrics.dbBatch.failedOperations > 0) score -= 15;
    }

    // IPC batch efficiency
    if (metrics.ipcBatch.batchCount > 0) {
      if (metrics.ipcBatch.avgBatchSize < 3) score -= 10; // Too many small batches
    }

    return Math.max(0, score);
  }

  /**
   * Generate performance recommendations.
   */
  private generateRecommendations(metrics: SystemMetrics): string[] {
    const recommendations: string[] = [];

    // Tab pool recommendations
    if (metrics.tabPool.totalTabs === 0) {
      recommendations.push('Enable tab pool for better performance');
    } else if (metrics.tabPool.inUseTabs > metrics.tabPool.totalTabs * 0.9) {
      recommendations.push('Consider increasing tab pool size (high utilization)');
    }

    // Suspension recommendations
    if (metrics.tabSuspension.suspensionCount === 0 && metrics.tabSuspension.totalTracked > 5) {
      recommendations.push('Enable tab suspension to reduce memory usage');
    }

    // DB batch recommendations
    if (metrics.dbBatch.avgBatchSize > 0 && metrics.dbBatch.avgBatchSize < 5) {
      recommendations.push('Increase database batch size or flush interval');
    }
    if (metrics.dbBatch.failedOperations > 0) {
      recommendations.push('Check database errors in logs');
    }

    // IPC batch recommendations
    if (metrics.ipcBatch.avgBatchSize > 0 && metrics.ipcBatch.avgBatchSize < 3) {
      recommendations.push('Increase IPC batch window or reduce event frequency');
    }

    return recommendations;
  }

  /**
   * Check tab pool health and alert if needed.
   */
  private checkTabPoolHealth(): void {
    if (!this.tabPoolMetrics) return;

    const utilization = this.tabPoolMetrics.totalTabs > 0
      ? (this.tabPoolMetrics.inUseTabs / this.tabPoolMetrics.totalTabs) * 100
      : 0;

    if (utilization > 95) {
      this.addAlert({
        level: 'critical',
        component: 'tabPool',
        message: `Tab pool critically high (${utilization.toFixed(1)}% utilized)`,
      });
    } else if (utilization > 80) {
      this.addAlert({
        level: 'warning',
        component: 'tabPool',
        message: `Tab pool usage high (${utilization.toFixed(1)}% utilized)`,
      });
    }
  }

  /**
   * Check suspension health and alert if needed.
   */
  private checkSuspensionHealth(): void {
    if (!this.tabSuspensionMetrics) return;

    if (this.tabSuspensionMetrics.totalTracked > 5 && this.tabSuspensionMetrics.suspensionCount === 0) {
      this.addAlert({
        level: 'info',
        component: 'tabSuspension',
        message: 'No idle tabs detected yet',
      });
    }
  }

  /**
   * Check database batch health and alert if needed.
   */
  private checkDbBatchHealth(): void {
    if (!this.dbBatchMetrics) return;

    if (this.dbBatchMetrics.avgBatchSize > 0 && this.dbBatchMetrics.avgBatchSize < 5) {
      this.addAlert({
        level: 'warning',
        component: 'dbBatch',
        message: `Low average batch size (${this.dbBatchMetrics.avgBatchSize.toFixed(1)})`,
      });
    }

    if (this.dbBatchMetrics.failedOperations > 0) {
      this.addAlert({
        level: 'critical',
        component: 'dbBatch',
        message: `Database batch failures detected (${this.dbBatchMetrics.failedOperations} failed)`,
      });
    }
  }

  /**
   * Check IPC batch health and alert if needed.
   */
  private checkIpcBatchHealth(): void {
    if (!this.ipcBatchMetrics) return;

    if (this.ipcBatchMetrics.avgBatchSize > 0 && this.ipcBatchMetrics.avgBatchSize < 3) {
      this.addAlert({
        level: 'info',
        component: 'ipcBatch',
        message: `Low average IPC batch size (${this.ipcBatchMetrics.avgBatchSize.toFixed(1)})`,
      });
    }
  }

  /**
   * Add an alert (with deduplication).
   */
  private addAlert(alert: Omit<PerformanceAlert, 'timestamp'>): void {
    const duplicate = this.alerts.find(
      (a) => a.component === alert.component && a.message === alert.message
    );

    if (!duplicate) {
      this.alerts.push({
        ...alert,
        timestamp: new Date(),
      });
    }
  }
}
