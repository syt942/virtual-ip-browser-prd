/**
 * IPC Handlers for Analytics
 * Position history and keyword performance analytics
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { IPC_CHANNELS } from '../channels';
import { validateInput } from '../validation';
import { IPCRateLimiter } from '../rate-limiter';
import type { PositionHistoryRepository } from '../../database/repositories/position-history.repository';
import type { SearchEngine } from '../../core/automation/types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const GetPositionHistorySchema = z.object({
  keyword: z.string().min(1),
  domain: z.string().min(1),
  engine: z.enum(['google', 'bing', 'duckduckgo', 'yahoo', 'brave']),
  limit: z.number().int().min(1).max(1000).optional(),
});

const GetKeywordSummariesSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

const GetAnalyticsStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PositionDataPoint {
  timestamp: Date;
  position: number | null;
  keyword: string;
  domain: string;
  engine: string;
  url?: string;
  title?: string;
}

interface KeywordSummary {
  keyword: string;
  domain: string;
  engine: string;
  currentPosition: number | null;
  change: number | null;
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date;
  dataPoints: number;
}

interface AnalyticsStats {
  totalKeywords: number;
  totalPositions: number;
  avgPosition: number | null;
  improving: number;
  declining: number;
  stable: number;
}

// ============================================================================
// HANDLER REGISTRATION
// ============================================================================

/**
 * Register all analytics IPC handlers
 */
export function registerAnalyticsHandlers(
  positionHistoryRepo: PositionHistoryRepository
): void {
  const rateLimiter = new IPCRateLimiter();

  // --------------------------------------------------------------------------
  // analytics:get-position-history
  // --------------------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_GET_POSITION_HISTORY,
    async (event, input: unknown) => {
      try {
        // Rate limiting
        const senderId = `${event.sender.id}`;
        const rateLimitCheck = rateLimiter.checkLimit(
          IPC_CHANNELS.ANALYTICS_GET_POSITION_HISTORY,
          senderId
        );

        if (!rateLimitCheck.allowed) {
          return {
            success: false,
            error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter}ms`,
          };
        }

        // Validation
        const validation = validateInput(GetPositionHistorySchema, input);
        if (!validation.success) {
          return {
            success: false,
            error: validation.error,
          };
        }

        const { keyword, domain, engine, limit = 100 } = validation.data;

        // Fetch history from repository
        const records = positionHistoryRepo.findByKeywordDomainEngine(
          keyword,
          domain,
          engine as SearchEngine,
          limit
        );

        // Transform to DTO
        const data: PositionDataPoint[] = records.map(record => ({
          timestamp: record.timestamp,
          position: record.position,
          keyword: record.keyword,
          domain: record.domain,
          engine: record.engine,
          url: record.url,
          title: record.title,
        }));

        return {
          success: true,
          data,
        };
      } catch (error) {
        console.error('[Analytics IPC] Get position history error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get position history',
        };
      }
    }
  );

  // --------------------------------------------------------------------------
  // analytics:get-keyword-summaries
  // --------------------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_GET_KEYWORD_SUMMARIES,
    async (event, input: unknown) => {
      try {
        // Rate limiting
        const senderId = `${event.sender.id}`;
        const rateLimitCheck = rateLimiter.checkLimit(
          IPC_CHANNELS.ANALYTICS_GET_KEYWORD_SUMMARIES,
          senderId
        );

        if (!rateLimitCheck.allowed) {
          return {
            success: false,
            error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter}ms`,
          };
        }

        // Validation
        const validation = validateInput(GetKeywordSummariesSchema, input);
        if (!validation.success) {
          return {
            success: false,
            error: validation.error,
          };
        }

        const { limit = 50 } = validation.data;

        // Get all tracked pairs
        const pairs = positionHistoryRepo.getTrackedPairs();

        // Build summaries for each pair
        const summaries: KeywordSummary[] = [];

        for (const pair of pairs.slice(0, limit)) {
          const stats = positionHistoryRepo.getAggregateStats(
            pair.keyword,
            pair.domain,
            pair.engine as SearchEngine
          );

          // Get last two positions to calculate change
          const recentHistory = positionHistoryRepo.findByKeywordDomainEngine(
            pair.keyword,
            pair.domain,
            pair.engine as SearchEngine,
            2
          );

          let change: number | null = null;
          let trend: 'up' | 'down' | 'stable' = 'stable';

          if (recentHistory.length >= 2) {
            const current = recentHistory[0].position;
            const previous = recentHistory[1].position;

            if (current !== null && previous !== null) {
              change = previous - current; // Positive = improved
              trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
            }
          }

          summaries.push({
            keyword: pair.keyword,
            domain: pair.domain,
            engine: pair.engine,
            currentPosition: recentHistory[0]?.position ?? null,
            change,
            trend,
            lastChecked: stats.lastRecordedAt ?? new Date(0),
            dataPoints: stats.recordCount,
          });
        }

        // Sort by last checked (most recent first)
        summaries.sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());

        return {
          success: true,
          data: summaries,
        };
      } catch (error) {
        console.error('[Analytics IPC] Get keyword summaries error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get keyword summaries',
        };
      }
    }
  );

  // --------------------------------------------------------------------------
  // analytics:get-stats
  // --------------------------------------------------------------------------
  ipcMain.handle(
    IPC_CHANNELS.ANALYTICS_GET_STATS,
    async (event, input: unknown) => {
      try {
        // Rate limiting
        const senderId = `${event.sender.id}`;
        const rateLimitCheck = rateLimiter.checkLimit(
          IPC_CHANNELS.ANALYTICS_GET_STATS,
          senderId
        );

        if (!rateLimitCheck.allowed) {
          return {
            success: false,
            error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfter}ms`,
          };
        }

        // Validation
        const validation = validateInput(GetAnalyticsStatsSchema, input);
        if (!validation.success) {
          return {
            success: false,
            error: validation.error,
          };
        }

        // Get all tracked pairs
        const pairs = positionHistoryRepo.getTrackedPairs();
        const totalKeywords = pairs.length;

        let totalPositions = 0;
        let sumPositions = 0;
        let positionCount = 0;
        let improving = 0;
        let declining = 0;
        let stable = 0;

        // Calculate stats across all keywords
        for (const pair of pairs) {
          const stats = positionHistoryRepo.getAggregateStats(
            pair.keyword,
            pair.domain,
            pair.engine as SearchEngine
          );

          totalPositions += stats.recordCount;

          if (stats.avgPosition !== null) {
            sumPositions += stats.avgPosition;
            positionCount++;
          }

          // Get trend
          const recentHistory = positionHistoryRepo.findByKeywordDomainEngine(
            pair.keyword,
            pair.domain,
            pair.engine as SearchEngine,
            2
          );

          if (recentHistory.length >= 2) {
            const current = recentHistory[0].position;
            const previous = recentHistory[1].position;

            if (current !== null && previous !== null) {
              const change = previous - current;
              if (change > 0) improving++;
              else if (change < 0) declining++;
              else stable++;
            } else {
              stable++;
            }
          } else {
            stable++;
          }
        }

        const avgPosition = positionCount > 0 
          ? Math.round((sumPositions / positionCount) * 10) / 10
          : null;

        const analyticsStats: AnalyticsStats = {
          totalKeywords,
          totalPositions,
          avgPosition,
          improving,
          declining,
          stable,
        };

        return {
          success: true,
          data: analyticsStats,
        };
      } catch (error) {
        console.error('[Analytics IPC] Get stats error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get analytics stats',
        };
      }
    }
  );

  console.log('[Analytics IPC] Handlers registered');
}

/**
 * Unregister analytics IPC handlers
 */
export function unregisterAnalyticsHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_POSITION_HISTORY);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_KEYWORD_SUMMARIES);
  ipcMain.removeHandler(IPC_CHANNELS.ANALYTICS_GET_STATS);
  console.log('[Analytics IPC] Handlers unregistered');
}
