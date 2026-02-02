/**
 * IPC Handlers for Performance Monitoring
 * Exposes metrics and monitoring data to the renderer process
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { getIPCRateLimiter } from '../rate-limiter';
import { IPC_CHANNELS } from '../channels';
import { validateInput } from '../validation';
import type { Metrics } from '../../core/monitoring/metrics';

export function setupMonitoringHandlers(metricsManager: Metrics): void {
  const rateLimiter = getIPCRateLimiter();

  /**
   * Get current system metrics snapshot
   */
  ipcMain.handle(IPC_CHANNELS.MONITORING_METRICS, async (_event) => {
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.MONITORING_METRICS);
    if (!rateCheck.allowed) {
      return { success: false, error: `Rate limit exceeded: ${rateCheck.retryAfter}ms` };
    }

    try {
      const metrics = metricsManager.getSystemMetrics();
      return {
        success: true,
        metrics: {
          timestamp: metrics.timestamp.toISOString(),
          tabPool: metrics.tabPool,
          tabSuspension: metrics.tabSuspension,
          dbBatch: metrics.dbBatch,
          ipcBatch: metrics.ipcBatch,
          compositeScore: metrics.compositeScore,
          recommendations: metrics.recommendations,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  /**
   * Get performance alerts
   */
  ipcMain.handle(IPC_CHANNELS.MONITORING_ALERTS, async (_event) => {
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.MONITORING_ALERTS);
    if (!rateCheck.allowed) {
      return { success: false, error: `Rate limit exceeded: ${rateCheck.retryAfter}ms` };
    }

    try {
      const alerts = metricsManager.getAlerts();
      return {
        success: true,
        alerts: alerts.map((alert) => ({
          ...alert,
          timestamp: alert.timestamp.toISOString(),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  /**
   * Clear performance alerts
   */
  ipcMain.handle(IPC_CHANNELS.MONITORING_CLEAR_ALERTS, async (_event) => {
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.MONITORING_CLEAR_ALERTS);
    if (!rateCheck.allowed) {
      return { success: false, error: `Rate limit exceeded: ${rateCheck.retryAfter}ms` };
    }

    try {
      metricsManager.clearAlerts();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });

  /**
   * Get metrics history
   */
  const HistoryLimitSchema = z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(500, 'Limit must not exceed 500')
    .default(100);

  ipcMain.handle(IPC_CHANNELS.MONITORING_HISTORY, async (_event, limit?: number) => {
    const rateCheck = rateLimiter.checkLimit(IPC_CHANNELS.MONITORING_HISTORY);
    if (!rateCheck.allowed) {
      return { success: false, error: `Rate limit exceeded: ${rateCheck.retryAfter}ms` };
    }

    const validation = validateInput(HistoryLimitSchema, limit ?? 100);
    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    try {
      const history = metricsManager.getHistory(validation.data);
      return {
        success: true,
        history: history.map((item) => ({
          ...item,
          timestamp: item.timestamp.toISOString(),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  });
}
