/**
 * Creator Support Statistics Module (EP-007)
 * 
 * Tracks and analyzes creator support activities including:
 * - Per-creator statistics (ads viewed, visits, sessions)
 * - Global aggregated statistics with caching
 * - Time-based reports (daily, weekly, monthly)
 * - Platform breakdown analytics
 * - Export capabilities (CSV, JSON)
 * 
 * @module electron/core/automation/creator-support-stats
 */

import { EventEmitter } from 'events';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Cache TTL for global stats in milliseconds */
const GLOBAL_STATS_CACHE_TTL_MS = 5000;

/** Cache TTL for platform stats in milliseconds */
const PLATFORM_STATS_CACHE_TTL_MS = 5000;

/** Maximum activities to keep in memory */
const MAX_ACTIVITIES_SIZE = 10000;

/** Default recent activity limit */
const DEFAULT_RECENT_LIMIT = 50;

/** Default top creators limit */
const DEFAULT_TOP_LIMIT = 10;

/** Milliseconds in a day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Milliseconds in a week */
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Milliseconds in a year */
const MS_PER_YEAR = 365 * MS_PER_DAY;

/** Milestone thresholds for events */
const MILESTONES = [10, 50, 100, 500, 1000, 5000, 10000];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Supported platforms for creator support */
export type Platform = 'youtube' | 'twitch' | 'blog' | 'website';

/** Types of support activities */
export type ActivityType = 'ad-view' | 'video-watch' | 'page-visit' | 'engagement';

/** Time period for reports */
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

/** Export format options */
export type ExportFormat = 'csv' | 'json';

/**
 * Represents a single support activity record
 */
export interface SupportActivity {
  id: string;
  creatorId: string;
  creatorName: string;
  platform: Platform;
  activityType: ActivityType;
  duration: number;
  adCount: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Input for recording a support activity
 */
export interface RecordActivityInput {
  creatorId: string;
  creatorName: string;
  platform: Platform;
  activityType: ActivityType;
  duration: number;
  adCount: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Statistics for a specific creator
 */
export interface CreatorStats {
  creatorId: string;
  creatorName: string;
  platform: string;
  totalSessions: number;
  successfulSessions: number;
  totalAdsViewed: number;
  totalWatchTime: number;
  totalEngagements: number;
  avgSessionDuration: number;
  lastSupportedAt: Date | null;
  firstSupportedAt: Date | null;
  supportStreak: number;
}

/**
 * Global statistics across all creators
 */
export interface GlobalStats {
  totalCreatorsSupported: number;
  totalSessions: number;
  totalAdsViewed: number;
  totalWatchTime: number;
  successRate: number;
  mostSupportedCreator: { id: string; name: string; sessions: number } | null;
  activityByPlatform: Record<string, number>;
  activityByDay: Record<string, number>;
}

/**
 * Platform-specific statistics
 */
export interface PlatformStats {
  platform: Platform;
  totalSessions: number;
  totalAdsViewed: number;
  totalWatchTime: number;
  successRate: number;
  creatorCount: number;
}

/**
 * Filter options for querying activities
 */
export interface StatsFilter {
  creatorId?: string;
  platform?: Platform | string;
  startDate?: Date;
  endDate?: Date;
  activityType?: ActivityType | string;
  successOnly?: boolean;
}

/**
 * Summary statistics for a date range
 */
export interface StatsSummary {
  totalSessions: number;
  totalAds: number;
  totalWatchTime: number;
  uniqueCreators: number;
  dailyAverage: number;
}

/**
 * Time-based report data
 */
export interface TimeReport {
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  data: TimeReportEntry[];
  totals: StatsSummary;
}

/**
 * Single entry in time report
 */
export interface TimeReportEntry {
  date: string;
  sessions: number;
  adsViewed: number;
  watchTime: number;
  uniqueCreators: number;
}

/**
 * Exported statistics report
 */
export interface ExportedStats {
  format: ExportFormat;
  generatedAt: Date;
  data: string;
  summary: GlobalStats;
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

/**
 * Generic cache with TTL support
 */
class StatsCache<T> {
  private data: T | null = null;
  private timestamp: number = 0;
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(): T | null {
    if (this.data && Date.now() - this.timestamp < this.ttlMs) {
      return this.data;
    }
    return null;
  }

  set(data: T): void {
    this.data = data;
    this.timestamp = Date.now();
  }

  invalidate(): void {
    this.data = null;
    this.timestamp = 0;
  }
}

// ============================================================================
// INDEX STRUCTURES
// ============================================================================

/**
 * Maintains indexes for efficient querying
 */
class ActivityIndex {
  private byCreator: Map<string, SupportActivity[]> = new Map();
  private byPlatform: Map<Platform, SupportActivity[]> = new Map();
  private byDate: Map<string, SupportActivity[]> = new Map();

  add(activity: SupportActivity): void {
    // Index by creator
    if (!this.byCreator.has(activity.creatorId)) {
      this.byCreator.set(activity.creatorId, []);
    }
    this.byCreator.get(activity.creatorId)!.push(activity);

    // Index by platform
    if (!this.byPlatform.has(activity.platform)) {
      this.byPlatform.set(activity.platform, []);
    }
    this.byPlatform.get(activity.platform)!.push(activity);

    // Index by date
    const dateKey = activity.timestamp.toISOString().split('T')[0];
    if (!this.byDate.has(dateKey)) {
      this.byDate.set(dateKey, []);
    }
    this.byDate.get(dateKey)!.push(activity);
  }

  getByCreator(creatorId: string): SupportActivity[] {
    return this.byCreator.get(creatorId) ?? [];
  }

  getByPlatform(platform: Platform): SupportActivity[] {
    return this.byPlatform.get(platform) ?? [];
  }

  getByDate(dateKey: string): SupportActivity[] {
    return this.byDate.get(dateKey) ?? [];
  }

  getCreatorIds(): string[] {
    return Array.from(this.byCreator.keys());
  }

  getPlatforms(): Platform[] {
    return Array.from(this.byPlatform.keys());
  }

  clear(): void {
    this.byCreator.clear();
    this.byPlatform.clear();
    this.byDate.clear();
  }
}

// ============================================================================
// STATISTICS CALCULATOR
// ============================================================================

/**
 * Calculates statistics from activity data
 */
class StatisticsCalculator {
  /**
   * Calculate creator stats from activities
   */
  static calculateCreatorStats(
    creatorId: string,
    activities: SupportActivity[]
  ): CreatorStats | null {
    if (activities.length === 0) return null;

    const firstActivity = activities[0];
    const successful = activities.filter(a => a.success);
    const totalWatchTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const totalAds = activities.reduce((sum, a) => sum + a.adCount, 0);
    const engagements = activities.filter(a => a.activityType === 'engagement').length;

    const sorted = [...activities].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    return {
      creatorId,
      creatorName: firstActivity.creatorName,
      platform: firstActivity.platform,
      totalSessions: activities.length,
      successfulSessions: successful.length,
      totalAdsViewed: totalAds,
      totalWatchTime,
      totalEngagements: engagements,
      avgSessionDuration: totalWatchTime / activities.length,
      lastSupportedAt: sorted[sorted.length - 1].timestamp,
      firstSupportedAt: sorted[0].timestamp,
      supportStreak: this.calculateStreak(activities),
    };
  }

  /**
   * Calculate consecutive days streak
   */
  static calculateStreak(activities: SupportActivity[]): number {
    const successfulActivities = activities.filter(a => a.success);
    if (successfulActivities.length === 0) return 0;

    const days = new Set<string>();
    successfulActivities.forEach(a => {
      days.add(a.timestamp.toISOString().split('T')[0]);
    });

    const sortedDays = Array.from(days).sort().reverse();
    if (sortedDays.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const current = new Date(sortedDays[i - 1]);
      const previous = new Date(sortedDays[i]);
      const diffDays = (current.getTime() - previous.getTime()) / MS_PER_DAY;
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculate platform stats from activities
   */
  static calculatePlatformStats(
    platform: Platform,
    activities: SupportActivity[]
  ): PlatformStats {
    const successful = activities.filter(a => a.success);
    const uniqueCreators = new Set(activities.map(a => a.creatorId));

    return {
      platform,
      totalSessions: activities.length,
      totalAdsViewed: activities.reduce((sum, a) => sum + a.adCount, 0),
      totalWatchTime: activities.reduce((sum, a) => sum + a.duration, 0),
      successRate: activities.length > 0
        ? (successful.length / activities.length) * 100
        : 0,
      creatorCount: uniqueCreators.size,
    };
  }

  /**
   * Calculate summary for a date range
   */
  static calculateSummary(activities: SupportActivity[], daysDiff: number): StatsSummary {
    const uniqueCreators = new Set(activities.map(a => a.creatorId));
    const totalAds = activities.reduce((sum, a) => sum + a.adCount, 0);
    const totalWatchTime = activities.reduce((sum, a) => sum + a.duration, 0);
    const effectiveDays = Math.max(1, daysDiff);

    return {
      totalSessions: activities.length,
      totalAds,
      totalWatchTime,
      uniqueCreators: uniqueCreators.size,
      dailyAverage: Math.round((activities.length / effectiveDays) * 100) / 100,
    };
  }
}

// ============================================================================
// CREATOR SUPPORT STATS CLASS
// ============================================================================

/**
 * CreatorSupportStats manages tracking and analytics for creator support activities.
 * 
 * Features:
 * - Efficient indexing for fast queries
 * - Cached aggregations for performance
 * - Time-based reports with flexible grouping
 * - Export capabilities (CSV, JSON)
 * - Event-driven milestone notifications
 * 
 * @example
 * ```typescript
 * const stats = new CreatorSupportStats();
 * 
 * // Record a support activity
 * stats.record({
 *   creatorId: 'creator-123',
 *   creatorName: 'Tech Channel',
 *   platform: 'youtube',
 *   activityType: 'ad-view',
 *   duration: 120,
 *   adCount: 2,
 *   success: true
 * });
 * 
 * // Get creator statistics (uses index)
 * const creatorStats = stats.getCreatorStats('creator-123');
 * 
 * // Get global statistics (uses cache)
 * const globalStats = stats.getGlobalStats();
 * ```
 */
export class CreatorSupportStats extends EventEmitter {
  private activities: SupportActivity[] = [];
  private index: ActivityIndex = new ActivityIndex();
  private globalStatsCache: StatsCache<GlobalStats>;
  private platformStatsCache: StatsCache<PlatformStats[]>;

  constructor() {
    super();
    this.globalStatsCache = new StatsCache(GLOBAL_STATS_CACHE_TTL_MS);
    this.platformStatsCache = new StatsCache(PLATFORM_STATS_CACHE_TTL_MS);
  }

  // --------------------------------------------------------------------------
  // Recording Methods
  // --------------------------------------------------------------------------

  /**
   * Record a support activity
   * 
   * @param data - Activity data to record
   * @returns The created activity record
   */
  record(data: RecordActivityInput): SupportActivity {
    const activity: SupportActivity = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.activities.push(activity);
    this.index.add(activity);
    this.invalidateCaches();

    // Enforce max size
    this.enforceMaxSize();

    this.emit('activity:recorded', activity);
    this.checkMilestones(data.creatorId);

    return activity;
  }

  /**
   * Record multiple activities in batch
   * 
   * @param activities - Array of activities to record
   * @returns Array of created activity records
   */
  recordBatch(activities: RecordActivityInput[]): SupportActivity[] {
    const recorded: SupportActivity[] = [];

    for (const data of activities) {
      const activity: SupportActivity = {
        ...data,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };
      this.activities.push(activity);
      this.index.add(activity);
      recorded.push(activity);
      
      // Emit event for each activity
      this.emit('activity:recorded', activity);
    }

    this.invalidateCaches();
    this.enforceMaxSize();

    return recorded;
  }

  // --------------------------------------------------------------------------
  // Creator Statistics Methods
  // --------------------------------------------------------------------------

  /**
   * Get statistics for a specific creator (uses index for efficiency)
   * 
   * @param creatorId - The creator's unique identifier
   * @returns Creator statistics or null if not found
   */
  getCreatorStats(creatorId: string): CreatorStats | null {
    const creatorActivities = this.index.getByCreator(creatorId);
    return StatisticsCalculator.calculateCreatorStats(creatorId, creatorActivities);
  }

  /**
   * Get statistics for all creators
   * 
   * @returns Array of all creator statistics
   */
  getAllCreatorStats(): CreatorStats[] {
    const creatorIds = this.index.getCreatorIds();
    const stats: CreatorStats[] = [];

    for (const id of creatorIds) {
      const creatorStats = this.getCreatorStats(id);
      if (creatorStats) {
        stats.push(creatorStats);
      }
    }

    return stats;
  }

  // --------------------------------------------------------------------------
  // Global Statistics Methods (Cached)
  // --------------------------------------------------------------------------

  /**
   * Get global statistics across all creators (cached)
   * 
   * @returns Aggregated global statistics
   */
  getGlobalStats(): GlobalStats {
    const cached = this.globalStatsCache.get();
    if (cached) return cached;

    const stats = this.calculateGlobalStats();
    this.globalStatsCache.set(stats);
    return stats;
  }

  /**
   * Calculate global statistics (internal)
   */
  private calculateGlobalStats(): GlobalStats {
    const uniqueCreators = new Set(this.activities.map(a => a.creatorId));
    const successfulActivities = this.activities.filter(a => a.success);
    const totalAds = this.activities.reduce((sum, a) => sum + a.adCount, 0);
    const totalWatchTime = this.activities.reduce((sum, a) => sum + a.duration, 0);

    // Activity by platform (use index)
    const activityByPlatform: Record<string, number> = {};
    for (const platform of this.index.getPlatforms()) {
      activityByPlatform[platform] = this.index.getByPlatform(platform).length;
    }

    // Activity by day
    const activityByDay: Record<string, number> = {};
    this.activities.forEach(a => {
      const day = a.timestamp.toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] ?? 0) + 1;
    });

    // Most supported creator
    const creatorCounts = new Map<string, { name: string; count: number }>();
    this.activities.forEach(a => {
      const current = creatorCounts.get(a.creatorId) ?? { name: a.creatorName, count: 0 };
      current.count++;
      creatorCounts.set(a.creatorId, current);
    });

    let mostSupported: GlobalStats['mostSupportedCreator'] = null;
    creatorCounts.forEach((value, key) => {
      if (!mostSupported || value.count > mostSupported.sessions) {
        mostSupported = { id: key, name: value.name, sessions: value.count };
      }
    });

    return {
      totalCreatorsSupported: uniqueCreators.size,
      totalSessions: this.activities.length,
      totalAdsViewed: totalAds,
      totalWatchTime,
      successRate: this.activities.length > 0 
        ? (successfulActivities.length / this.activities.length) * 100 
        : 0,
      mostSupportedCreator: mostSupported,
      activityByPlatform,
      activityByDay,
    };
  }

  // --------------------------------------------------------------------------
  // Platform Statistics Methods (Cached)
  // --------------------------------------------------------------------------

  /**
   * Get statistics broken down by platform (cached)
   * 
   * @returns Array of platform-specific statistics
   */
  getStatsByPlatform(): PlatformStats[] {
    const cached = this.platformStatsCache.get();
    if (cached) return cached;

    const stats = this.calculatePlatformStats();
    this.platformStatsCache.set(stats);
    return stats;
  }

  /**
   * Calculate platform statistics (internal)
   */
  private calculatePlatformStats(): PlatformStats[] {
    const platforms = this.index.getPlatforms();
    const result: PlatformStats[] = [];

    for (const platform of platforms) {
      const activities = this.index.getByPlatform(platform);
      result.push(StatisticsCalculator.calculatePlatformStats(platform, activities));
    }

    return result.sort((a, b) => b.totalSessions - a.totalSessions);
  }

  // --------------------------------------------------------------------------
  // Activity Query Methods
  // --------------------------------------------------------------------------

  /**
   * Get activities with optional filtering
   * 
   * @param filter - Optional filter criteria
   * @returns Filtered array of activities
   */
  getActivities(filter?: StatsFilter): SupportActivity[] {
    // Use index for single-field queries
    if (filter?.creatorId && !filter.platform && !filter.startDate && !filter.endDate) {
      let activities = this.index.getByCreator(filter.creatorId);
      if (filter.activityType) {
        activities = activities.filter(a => a.activityType === filter.activityType);
      }
      if (filter.successOnly) {
        activities = activities.filter(a => a.success);
      }
      return activities;
    }

    if (filter?.platform && !filter.creatorId && !filter.startDate && !filter.endDate) {
      let activities = this.index.getByPlatform(filter.platform as Platform);
      if (filter.activityType) {
        activities = activities.filter(a => a.activityType === filter.activityType);
      }
      if (filter.successOnly) {
        activities = activities.filter(a => a.success);
      }
      return activities;
    }

    // Fall back to full scan for complex queries
    return this.filterActivities(filter);
  }

  /**
   * Filter activities (full scan)
   */
  private filterActivities(filter?: StatsFilter): SupportActivity[] {
    if (!filter) return [...this.activities];

    let filtered = this.activities;

    if (filter.creatorId) {
      filtered = filtered.filter(a => a.creatorId === filter.creatorId);
    }
    if (filter.platform) {
      filtered = filtered.filter(a => a.platform === filter.platform);
    }
    if (filter.startDate) {
      filtered = filtered.filter(a => a.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(a => a.timestamp <= filter.endDate!);
    }
    if (filter.activityType) {
      filtered = filtered.filter(a => a.activityType === filter.activityType);
    }
    if (filter.successOnly) {
      filtered = filtered.filter(a => a.success);
    }

    return filtered;
  }

  /**
   * Get recent support activities
   * 
   * @param limit - Maximum number of activities to return
   * @returns Array of recent activities sorted by timestamp descending
   */
  getRecentActivity(limit: number = DEFAULT_RECENT_LIMIT): SupportActivity[] {
    return [...this.activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Ranking Methods
  // --------------------------------------------------------------------------

  /**
   * Get top creators by various metrics
   * 
   * @param metric - Metric to rank by
   * @param limit - Number of creators to return
   * @returns Array of creator stats with ranking
   */
  getTopCreators(
    metric: 'sessions' | 'ads' | 'watchTime',
    limit: number = DEFAULT_TOP_LIMIT
  ): Array<CreatorStats & { rank: number }> {
    const stats = this.getAllCreatorStats();

    stats.sort((a, b) => {
      switch (metric) {
        case 'sessions':
          return b.totalSessions - a.totalSessions;
        case 'ads':
          return b.totalAdsViewed - a.totalAdsViewed;
        case 'watchTime':
          return b.totalWatchTime - a.totalWatchTime;
      }
    });

    return stats.slice(0, limit).map((s, i) => ({ ...s, rank: i + 1 }));
  }

  // --------------------------------------------------------------------------
  // Time-Based Report Methods
  // --------------------------------------------------------------------------

  /**
   * Get activity summary for a date range
   * 
   * @param startDate - Start of the date range
   * @param endDate - End of the date range
   * @returns Summary statistics for the period
   */
  getSummary(startDate: Date, endDate: Date): StatsSummary {
    const filtered = this.activities.filter(
      a => a.timestamp >= startDate && a.timestamp <= endDate
    );

    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / MS_PER_DAY
    );

    return StatisticsCalculator.calculateSummary(filtered, daysDiff);
  }

  /**
   * Generate a time-based report
   * 
   * @param period - Time period for grouping
   * @param startDate - Optional start date
   * @param endDate - Optional end date
   * @returns Time report with aggregated data
   */
  getTimeReport(
    period: TimePeriod,
    startDate?: Date,
    endDate?: Date
  ): TimeReport {
    const now = new Date();
    const end = endDate ?? now;
    const start = startDate ?? this.getDefaultStartDate(period, now);

    const filtered = this.activities.filter(
      a => a.timestamp >= start && a.timestamp <= end
    );

    const grouped = this.groupByPeriod(filtered, period);
    const data = this.convertToReportEntries(grouped);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY);

    return {
      period,
      startDate: start,
      endDate: end,
      data,
      totals: StatisticsCalculator.calculateSummary(filtered, daysDiff),
    };
  }

  /**
   * Get default start date based on period
   */
  private getDefaultStartDate(period: TimePeriod, now: Date): Date {
    switch (period) {
      case 'daily':
        return new Date(now.getTime() - 7 * MS_PER_DAY);
      case 'weekly':
        return new Date(now.getTime() - 4 * MS_PER_WEEK);
      case 'monthly':
        return new Date(now.getTime() - MS_PER_YEAR);
      case 'all-time':
        return this.activities.length > 0
          ? this.activities.reduce((min, a) => 
              a.timestamp < min ? a.timestamp : min, 
              this.activities[0].timestamp
            )
          : now;
    }
  }

  /**
   * Group activities by time period
   */
  private groupByPeriod(
    activities: SupportActivity[],
    period: TimePeriod
  ): Map<string, SupportActivity[]> {
    const grouped = new Map<string, SupportActivity[]>();
    
    for (const activity of activities) {
      const key = this.getPeriodKey(activity.timestamp, period);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(activity);
    }

    return grouped;
  }

  /**
   * Get period key for a date
   */
  private getPeriodKey(date: Date, period: TimePeriod): string {
    switch (period) {
      case 'daily':
      case 'all-time':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        return monday.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  /**
   * Convert grouped activities to report entries
   */
  private convertToReportEntries(grouped: Map<string, SupportActivity[]>): TimeReportEntry[] {
    return Array.from(grouped.entries())
      .map(([date, activities]) => ({
        date,
        sessions: activities.length,
        adsViewed: activities.reduce((sum, a) => sum + a.adCount, 0),
        watchTime: activities.reduce((sum, a) => sum + a.duration, 0),
        uniqueCreators: new Set(activities.map(a => a.creatorId)).size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --------------------------------------------------------------------------
  // Export Methods
  // --------------------------------------------------------------------------

  /**
   * Export statistics as CSV format
   * 
   * @returns CSV string of all creator statistics
   */
  exportCSV(): string {
    const headers = [
      'Creator ID',
      'Creator Name',
      'Platform',
      'Total Sessions',
      'Successful Sessions',
      'Total Ads',
      'Total Watch Time (s)',
      'Avg Duration (s)',
      'Last Supported',
    ];

    const stats = this.getAllCreatorStats();
    const rows: string[] = [headers.join(',')];

    for (const stat of stats) {
      rows.push([
        stat.creatorId,
        `"${stat.creatorName.replace(/"/g, '""')}"`,
        stat.platform,
        stat.totalSessions,
        stat.successfulSessions,
        stat.totalAdsViewed,
        stat.totalWatchTime,
        Math.round(stat.avgSessionDuration),
        stat.lastSupportedAt?.toISOString() ?? '',
      ].join(','));
    }

    return rows.join('\n');
  }

  /**
   * Export statistics in specified format
   * 
   * @param format - Export format
   * @returns Exported statistics report
   */
  exportStats(format: ExportFormat = 'json'): ExportedStats {
    const globalStats = this.getGlobalStats();
    let data: string;

    if (format === 'csv') {
      data = this.exportCSV();
    } else {
      const exportData = {
        global: globalStats,
        creators: this.getAllCreatorStats(),
        platforms: this.getStatsByPlatform(),
        recentActivity: this.getRecentActivity(100),
      };
      data = JSON.stringify(exportData, null, 2);
    }

    return {
      format,
      generatedAt: new Date(),
      data,
      summary: globalStats,
    };
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Clear all recorded data
   */
  clear(): void {
    this.activities = [];
    this.index.clear();
    this.invalidateCaches();
    this.emit('stats:cleared');
  }

  /**
   * Get the total number of recorded activities
   */
  getActivityCount(): number {
    return this.activities.length;
  }

  /**
   * Check if there are any recorded activities
   */
  hasActivities(): boolean {
    return this.activities.length > 0;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Invalidate all caches
   */
  private invalidateCaches(): void {
    this.globalStatsCache.invalidate();
    this.platformStatsCache.invalidate();
  }

  /**
   * Enforce maximum activities size
   */
  private enforceMaxSize(): void {
    if (this.activities.length > MAX_ACTIVITIES_SIZE) {
      const excess = this.activities.length - MAX_ACTIVITIES_SIZE;
      this.activities.splice(0, excess);
      // Rebuild index after trimming
      this.rebuildIndex();
    }
  }

  /**
   * Rebuild the index from activities
   */
  private rebuildIndex(): void {
    this.index.clear();
    for (const activity of this.activities) {
      this.index.add(activity);
    }
  }

  /**
   * Check and emit milestone events
   */
  private checkMilestones(creatorId: string): void {
    const stats = this.getCreatorStats(creatorId);
    if (!stats) return;

    if (MILESTONES.includes(stats.totalSessions)) {
      this.emit('milestone:sessions', { 
        creatorId, 
        sessions: stats.totalSessions 
      });
    }

    if (MILESTONES.includes(stats.totalAdsViewed)) {
      this.emit('milestone:ads', { 
        creatorId, 
        ads: stats.totalAdsViewed 
      });
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default singleton instance of CreatorSupportStats
 */
export const creatorSupportStats = new CreatorSupportStats();

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default CreatorSupportStats;
