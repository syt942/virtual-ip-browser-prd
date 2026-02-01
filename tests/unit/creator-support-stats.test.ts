/**
 * Creator Support Statistics Unit Tests
 * Tests for tracking and analyzing creator support activities
 * 
 * Following TDD pattern: Tests written first, implementation verified
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreatorSupportStats,
  type SupportActivity,
  type CreatorStats,
  type GlobalStats,
  type StatsFilter,
  type PlatformStats,
  type RecordActivityInput,
  type Platform,
  type ActivityType,
} from '../../electron/core/automation/creator-support-stats';

// Using CreatorSupportStats imported from module

// ============================================================================
// TESTS
// ============================================================================

describe('CreatorSupportStats', () => {
  let stats: CreatorSupportStats;

  beforeEach(() => {
    stats = new CreatorSupportStats();
  });

  // --------------------------------------------------------------------------
  // Recording Tests
  // --------------------------------------------------------------------------
  describe('record', () => {
    it('should record a support activity', () => {
      const activity = stats.record({
        creatorId: 'creator-1',
        creatorName: 'Test Creator',
        platform: 'youtube',
        activityType: 'ad-view',
        duration: 120,
        adCount: 2,
        success: true,
      });

      expect(activity.id).toBeDefined();
      expect(activity.creatorName).toBe('Test Creator');
      expect(activity.adCount).toBe(2);
      expect(activity.timestamp).toBeInstanceOf(Date);
    });

    it('should emit activity:recorded event', () => {
      const spy = vi.fn();
      stats.on('activity:recorded', spy);

      stats.record({
        creatorId: 'creator-1',
        creatorName: 'Test Creator',
        platform: 'youtube',
        activityType: 'ad-view',
        duration: 60,
        adCount: 1,
        success: true,
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should emit milestone events', () => {
      const spy = vi.fn();
      stats.on('milestone:sessions', spy);

      // Record 10 sessions to trigger milestone
      for (let i = 0; i < 10; i++) {
        stats.record({
          creatorId: 'creator-1',
          creatorName: 'Test Creator',
          platform: 'youtube',
          activityType: 'ad-view',
          duration: 60,
          adCount: 1,
          success: true,
        });
      }

      expect(spy).toHaveBeenCalledWith({ creatorId: 'creator-1', sessions: 10 });
    });
  });

  // --------------------------------------------------------------------------
  // Creator Stats Tests
  // --------------------------------------------------------------------------
  describe('getCreatorStats', () => {
    it('should return null for unknown creator', () => {
      const result = stats.getCreatorStats('unknown');
      expect(result).toBeNull();
    });

    it('should calculate creator statistics', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 120, adCount: 2, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 180, adCount: 3, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: false });

      const result = stats.getCreatorStats('c1');

      expect(result).not.toBeNull();
      expect(result?.totalSessions).toBe(3);
      expect(result?.successfulSessions).toBe(2);
      expect(result?.totalAdsViewed).toBe(6);
      expect(result?.totalWatchTime).toBe(360);
      expect(result?.avgSessionDuration).toBe(120);
    });

    it('should track first and last support dates', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const result = stats.getCreatorStats('c1');

      expect(result?.firstSupportedAt).toBeInstanceOf(Date);
      expect(result?.lastSupportedAt).toBeInstanceOf(Date);
      expect(result?.lastSupportedAt!.getTime()).toBeGreaterThanOrEqual(
        result?.firstSupportedAt!.getTime()
      );
    });

    it('should count engagements', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'engagement', duration: 10, adCount: 0, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'engagement', duration: 5, adCount: 0, success: true });

      const result = stats.getCreatorStats('c1');

      expect(result?.totalEngagements).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Global Stats Tests
  // --------------------------------------------------------------------------
  describe('getGlobalStats', () => {
    it('should return empty stats initially', () => {
      const result = stats.getGlobalStats();

      expect(result.totalCreatorsSupported).toBe(0);
      expect(result.totalSessions).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('should calculate global statistics', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 90, adCount: 3, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'Creator 2', platform: 'twitch', activityType: 'ad-view', duration: 120, adCount: 4, success: false });

      const result = stats.getGlobalStats();

      expect(result.totalCreatorsSupported).toBe(2);
      expect(result.totalSessions).toBe(3);
      expect(result.totalAdsViewed).toBe(9);
      expect(result.totalWatchTime).toBe(270);
      expect(result.successRate).toBeCloseTo(66.67, 1);
    });

    it('should track activity by platform', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c3', creatorName: 'C3', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const result = stats.getGlobalStats();

      expect(result.activityByPlatform['youtube']).toBe(2);
      expect(result.activityByPlatform['twitch']).toBe(1);
    });

    it('should identify most supported creator', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Popular', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Popular', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Popular', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'Other', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const result = stats.getGlobalStats();

      expect(result.mostSupportedCreator?.id).toBe('c1');
      expect(result.mostSupportedCreator?.name).toBe('Popular');
      expect(result.mostSupportedCreator?.sessions).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Filtering Tests
  // --------------------------------------------------------------------------
  describe('getActivities', () => {
    beforeEach(() => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'engagement', duration: 10, adCount: 0, success: true });
    });

    it('should return all activities without filter', () => {
      const result = stats.getActivities();
      expect(result).toHaveLength(3);
    });

    it('should filter by creator', () => {
      const result = stats.getActivities({ creatorId: 'c1' });
      expect(result).toHaveLength(2);
    });

    it('should filter by platform', () => {
      const result = stats.getActivities({ platform: 'twitch' });
      expect(result).toHaveLength(1);
    });

    it('should filter by activity type', () => {
      const result = stats.getActivities({ activityType: 'engagement' });
      expect(result).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      const result = stats.getActivities({ 
        creatorId: 'c1',
        activityType: 'ad-view' 
      });
      expect(result).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Top Creators Tests
  // --------------------------------------------------------------------------
  describe('getTopCreators', () => {
    beforeEach(() => {
      // Creator 1: 3 sessions, 6 ads, 300s
      stats.record({ creatorId: 'c1', creatorName: 'Top Ads', platform: 'youtube', activityType: 'ad-view', duration: 100, adCount: 2, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Top Ads', platform: 'youtube', activityType: 'ad-view', duration: 100, adCount: 2, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'Top Ads', platform: 'youtube', activityType: 'ad-view', duration: 100, adCount: 2, success: true });
      
      // Creator 2: 5 sessions, 5 ads, 250s
      for (let i = 0; i < 5; i++) {
        stats.record({ creatorId: 'c2', creatorName: 'Top Sessions', platform: 'youtube', activityType: 'ad-view', duration: 50, adCount: 1, success: true });
      }

      // Creator 3: 2 sessions, 2 ads, 400s
      stats.record({ creatorId: 'c3', creatorName: 'Top Watch', platform: 'youtube', activityType: 'video-watch', duration: 200, adCount: 1, success: true });
      stats.record({ creatorId: 'c3', creatorName: 'Top Watch', platform: 'youtube', activityType: 'video-watch', duration: 200, adCount: 1, success: true });
    });

    it('should rank by sessions', () => {
      const result = stats.getTopCreators('sessions', 3);
      
      expect(result[0].creatorName).toBe('Top Sessions');
      expect(result[0].rank).toBe(1);
    });

    it('should rank by ads', () => {
      const result = stats.getTopCreators('ads', 3);
      
      expect(result[0].creatorName).toBe('Top Ads');
    });

    it('should rank by watch time', () => {
      const result = stats.getTopCreators('watchTime', 3);
      
      expect(result[0].creatorName).toBe('Top Watch');
    });

    it('should respect limit', () => {
      const result = stats.getTopCreators('sessions', 2);
      
      expect(result).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Summary Tests
  // --------------------------------------------------------------------------
  describe('getSummary', () => {
    it('should calculate summary for date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 120, adCount: 3, success: true });

      const summary = stats.getSummary(weekAgo, now);

      expect(summary.totalSessions).toBe(2);
      expect(summary.totalAds).toBe(5);
      expect(summary.totalWatchTime).toBe(180);
      expect(summary.uniqueCreators).toBe(2);
    });

    it('should calculate daily average', () => {
      // Record activities first
      for (let i = 0; i < 14; i++) {
        stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      }

      // Set date range to include all recorded activities
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000); // Use future date to ensure all activities are included

      const summary = stats.getSummary(weekAgo, tomorrow);

      // 14 sessions over ~8 days
      // dailyAverage is rounded to 2 decimal places
      expect(summary.totalSessions).toBe(14);
      expect(summary.dailyAverage).toBeGreaterThanOrEqual(1.5);
      expect(summary.dailyAverage).toBeLessThanOrEqual(2.5);
    });
  });

  // --------------------------------------------------------------------------
  // Export Tests
  // --------------------------------------------------------------------------
  describe('exportCSV', () => {
    it('should export data as CSV', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Test Creator', platform: 'youtube', activityType: 'ad-view', duration: 120, adCount: 3, success: true });

      const csv = stats.exportCSV();

      expect(csv).toContain('Creator ID');
      expect(csv).toContain('c1');
      expect(csv).toContain('"Test Creator"');
      expect(csv).toContain('youtube');
    });

    it('should include all creators', () => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'Creator 2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const csv = stats.exportCSV();
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3); // Header + 2 creators
    });
  });

  // --------------------------------------------------------------------------
  // Clear Tests
  // --------------------------------------------------------------------------
  describe('clear', () => {
    it('should clear all data', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      stats.clear();

      expect(stats.getGlobalStats().totalSessions).toBe(0);
      expect(stats.getActivities()).toHaveLength(0);
    });

    it('should emit stats:cleared event', () => {
      const spy = vi.fn();
      stats.on('stats:cleared', spy);

      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.clear();

      expect(spy).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Recent Activity Tests
  // --------------------------------------------------------------------------
  describe('getRecentActivity', () => {
    it('should return recent activities with limit applied', () => {
      stats.record({ creatorId: 'c1', creatorName: 'First', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'Second', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c3', creatorName: 'Third', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const recent = stats.getRecentActivity(2);

      expect(recent).toHaveLength(2);
      // All activities have timestamps, order depends on exact timing
      expect(recent.every(a => a.timestamp instanceof Date)).toBe(true);
    });

    it('should return activities sorted by timestamp descending', () => {
      // Record activities and verify they are sorted
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c3', creatorName: 'C3', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const recent = stats.getRecentActivity();

      // Verify sorted by timestamp descending (most recent first)
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(recent[i].timestamp.getTime());
      }
    });

    it('should return all activities if limit exceeds count', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const recent = stats.getRecentActivity(100);

      expect(recent).toHaveLength(2);
    });

    it('should use default limit of 50', () => {
      for (let i = 0; i < 60; i++) {
        stats.record({ creatorId: `c${i}`, creatorName: `C${i}`, platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      }

      const recent = stats.getRecentActivity();

      expect(recent).toHaveLength(50);
    });
  });

  // --------------------------------------------------------------------------
  // Platform Stats Tests
  // --------------------------------------------------------------------------
  describe('getStatsByPlatform', () => {
    beforeEach(() => {
      // YouTube: 3 sessions, 6 ads, 180s, 2 successful
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: false });

      // Twitch: 2 sessions, 4 ads, 120s, 2 successful
      stats.record({ creatorId: 'c3', creatorName: 'C3', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c3', creatorName: 'C3', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
    });

    it('should return platform statistics', () => {
      const platformStats = stats.getStatsByPlatform();

      expect(platformStats).toHaveLength(2);
    });

    it('should calculate correct totals per platform', () => {
      const platformStats = stats.getStatsByPlatform();
      const youtube = platformStats.find(p => p.platform === 'youtube');
      const twitch = platformStats.find(p => p.platform === 'twitch');

      expect(youtube?.totalSessions).toBe(3);
      expect(youtube?.totalAdsViewed).toBe(6);
      expect(youtube?.totalWatchTime).toBe(180);

      expect(twitch?.totalSessions).toBe(2);
      expect(twitch?.totalAdsViewed).toBe(4);
      expect(twitch?.totalWatchTime).toBe(120);
    });

    it('should calculate success rate per platform', () => {
      const platformStats = stats.getStatsByPlatform();
      const youtube = platformStats.find(p => p.platform === 'youtube');
      const twitch = platformStats.find(p => p.platform === 'twitch');

      expect(youtube?.successRate).toBeCloseTo(66.67, 1);
      expect(twitch?.successRate).toBe(100);
    });

    it('should count unique creators per platform', () => {
      const platformStats = stats.getStatsByPlatform();
      const youtube = platformStats.find(p => p.platform === 'youtube');
      const twitch = platformStats.find(p => p.platform === 'twitch');

      expect(youtube?.creatorCount).toBe(2);
      expect(twitch?.creatorCount).toBe(1);
    });

    it('should sort by total sessions descending', () => {
      const platformStats = stats.getStatsByPlatform();

      expect(platformStats[0].platform).toBe('youtube');
      expect(platformStats[1].platform).toBe('twitch');
    });
  });

  // --------------------------------------------------------------------------
  // Export Stats Tests
  // --------------------------------------------------------------------------
  describe('exportStats', () => {
    beforeEach(() => {
      stats.record({ creatorId: 'c1', creatorName: 'Creator 1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'Creator 2', platform: 'twitch', activityType: 'ad-view', duration: 120, adCount: 3, success: true });
    });

    it('should export as JSON by default', () => {
      const exported = stats.exportStats();

      expect(exported.format).toBe('json');
      expect(exported.generatedAt).toBeInstanceOf(Date);
      expect(exported.summary).toBeDefined();
      expect(exported.summary.totalSessions).toBe(2);
    });

    it('should export as CSV when specified', () => {
      const exported = stats.exportStats('csv');

      expect(exported.format).toBe('csv');
      expect(exported.data).toContain('Creator ID');
      expect(exported.data).toContain('Creator 1');
    });

    it('should include all data in JSON export', () => {
      const exported = stats.exportStats('json');
      const data = JSON.parse(exported.data);

      expect(data.global).toBeDefined();
      expect(data.creators).toBeDefined();
      expect(data.platforms).toBeDefined();
      expect(data.recentActivity).toBeDefined();
      expect(data.creators).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Batch Recording Tests
  // --------------------------------------------------------------------------
  describe('recordBatch', () => {
    it('should record multiple activities', () => {
      const activities: RecordActivityInput[] = [
        { creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true },
        { creatorId: 'c2', creatorName: 'C2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true },
        { creatorId: 'c3', creatorName: 'C3', platform: 'blog', activityType: 'page-visit', duration: 30, adCount: 0, success: true },
      ];

      const recorded = stats.recordBatch(activities);

      expect(recorded).toHaveLength(3);
      expect(stats.getGlobalStats().totalSessions).toBe(3);
    });

    it('should emit events for each activity', () => {
      const spy = vi.fn();
      stats.on('activity:recorded', spy);

      const activities: RecordActivityInput[] = [
        { creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true },
        { creatorId: 'c2', creatorName: 'C2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true },
      ];

      stats.recordBatch(activities);

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should return activities with generated IDs and timestamps', () => {
      const activities: RecordActivityInput[] = [
        { creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true },
      ];

      const recorded = stats.recordBatch(activities);

      expect(recorded[0].id).toBeDefined();
      expect(recorded[0].timestamp).toBeInstanceOf(Date);
    });
  });

  // --------------------------------------------------------------------------
  // Time Report Tests
  // --------------------------------------------------------------------------
  describe('getTimeReport', () => {
    beforeEach(() => {
      // Record some activities
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 120, adCount: 3, success: true });
    });

    it('should generate daily report', () => {
      const report = stats.getTimeReport('daily');

      expect(report.period).toBe('daily');
      expect(report.startDate).toBeInstanceOf(Date);
      expect(report.endDate).toBeInstanceOf(Date);
      expect(report.data).toBeDefined();
      expect(report.totals).toBeDefined();
    });

    it('should generate weekly report', () => {
      const report = stats.getTimeReport('weekly');

      expect(report.period).toBe('weekly');
      expect(report.data).toBeDefined();
    });

    it('should generate monthly report', () => {
      const report = stats.getTimeReport('monthly');

      expect(report.period).toBe('monthly');
      expect(report.data).toBeDefined();
    });

    it('should include totals in report', () => {
      const report = stats.getTimeReport('daily');

      expect(report.totals.totalSessions).toBe(2);
      expect(report.totals.totalAds).toBe(5);
      expect(report.totals.totalWatchTime).toBe(180);
    });

    it('should respect custom date range', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const report = stats.getTimeReport('daily', twoDaysAgo, now);

      expect(report.startDate.getTime()).toBe(twoDaysAgo.getTime());
      expect(report.endDate.getTime()).toBe(now.getTime());
    });
  });

  // --------------------------------------------------------------------------
  // Utility Method Tests
  // --------------------------------------------------------------------------
  describe('utility methods', () => {
    it('should return activity count', () => {
      expect(stats.getActivityCount()).toBe(0);

      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      expect(stats.getActivityCount()).toBe(2);
    });

    it('should check if has activities', () => {
      expect(stats.hasActivities()).toBe(false);

      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      expect(stats.hasActivities()).toBe(true);
    });

    it('should get all creator stats', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'twitch', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const allStats = stats.getAllCreatorStats();

      expect(allStats).toHaveLength(2);
      expect(allStats.find(s => s.creatorId === 'c1')?.totalSessions).toBe(2);
      expect(allStats.find(s => s.creatorId === 'c2')?.totalSessions).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Filter with successOnly Tests
  // --------------------------------------------------------------------------
  describe('getActivities with successOnly filter', () => {
    beforeEach(() => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: false });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
    });

    it('should filter only successful activities', () => {
      const result = stats.getActivities({ successOnly: true });

      expect(result).toHaveLength(2);
      expect(result.every(a => a.success)).toBe(true);
    });

    it('should combine successOnly with other filters', () => {
      const result = stats.getActivities({ 
        creatorId: 'c1',
        successOnly: true 
      });

      expect(result).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Metadata Tests
  // --------------------------------------------------------------------------
  describe('activity metadata', () => {
    it('should store and retrieve metadata', () => {
      const activity = stats.record({
        creatorId: 'c1',
        creatorName: 'C1',
        platform: 'youtube',
        activityType: 'ad-view',
        duration: 60,
        adCount: 1,
        success: true,
        metadata: {
          videoId: 'abc123',
          adType: 'skippable',
          watchedFully: true,
        },
      });

      expect(activity.metadata).toBeDefined();
      expect(activity.metadata?.videoId).toBe('abc123');
      expect(activity.metadata?.adType).toBe('skippable');
      expect(activity.metadata?.watchedFully).toBe(true);
    });

    it('should work without metadata', () => {
      const activity = stats.record({
        creatorId: 'c1',
        creatorName: 'C1',
        platform: 'youtube',
        activityType: 'ad-view',
        duration: 60,
        adCount: 1,
        success: true,
      });

      expect(activity.metadata).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // All-Time Report Tests
  // --------------------------------------------------------------------------
  describe('getTimeReport all-time', () => {
    it('should generate all-time report with activities', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 2, success: true });
      stats.record({ creatorId: 'c2', creatorName: 'C2', platform: 'youtube', activityType: 'ad-view', duration: 120, adCount: 3, success: true });

      const report = stats.getTimeReport('all-time');

      expect(report.period).toBe('all-time');
      expect(report.totals.totalSessions).toBe(2);
      expect(report.startDate).toBeInstanceOf(Date);
    });

    it('should handle all-time report with no activities', () => {
      const report = stats.getTimeReport('all-time');

      expect(report.period).toBe('all-time');
      expect(report.totals.totalSessions).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Support Streak Tests
  // --------------------------------------------------------------------------
  describe('support streak calculation', () => {
    it('should return 0 for no successful activities', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: false });

      const creatorStats = stats.getCreatorStats('c1');
      
      expect(creatorStats?.supportStreak).toBe(0);
    });

    it('should calculate streak of 1 for single day', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const creatorStats = stats.getCreatorStats('c1');
      
      expect(creatorStats?.supportStreak).toBe(1);
    });

    it('should count multiple activities on same day as streak of 1', () => {
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });
      stats.record({ creatorId: 'c1', creatorName: 'C1', platform: 'youtube', activityType: 'ad-view', duration: 60, adCount: 1, success: true });

      const creatorStats = stats.getCreatorStats('c1');
      
      expect(creatorStats?.supportStreak).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Case Tests
  // --------------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle empty platform stats', () => {
      const platformStats = stats.getStatsByPlatform();
      expect(platformStats).toHaveLength(0);
    });

    it('should handle getTopCreators with no data', () => {
      const topCreators = stats.getTopCreators('sessions', 10);
      expect(topCreators).toHaveLength(0);
    });

    it('should handle getAllCreatorStats with no data', () => {
      const allStats = stats.getAllCreatorStats();
      expect(allStats).toHaveLength(0);
    });

    it('should handle getRecentActivity with no data', () => {
      const recent = stats.getRecentActivity();
      expect(recent).toHaveLength(0);
    });

    it('should handle exportStats with no data', () => {
      const exported = stats.exportStats('json');
      const data = JSON.parse(exported.data);
      
      expect(data.creators).toHaveLength(0);
      expect(data.global.totalSessions).toBe(0);
    });
  });
});
