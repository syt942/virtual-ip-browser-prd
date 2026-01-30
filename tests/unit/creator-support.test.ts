/**
 * Creator Support Module Tests - TDD
 * Tests written FIRST before implementation (EP-007)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// PLATFORM DETECTION TESTS
// ============================================================================

describe('PlatformDetector', () => {
  // Import will be added after implementation
  let detector: any;

  beforeEach(async () => {
    const { PlatformDetector } = await import('../../electron/core/creator-support/platform-detection');
    detector = new PlatformDetector();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(detector).toBeDefined();
    });
  });

  describe('detectPlatform', () => {
    it('should detect YouTube from URL', () => {
      const result = detector.detectPlatform('https://www.youtube.com/watch?v=abc123');
      expect(result).toBe('youtube');
    });

    it('should detect YouTube from youtu.be short URL', () => {
      const result = detector.detectPlatform('https://youtu.be/abc123');
      expect(result).toBe('youtube');
    });

    it('should detect Twitch from URL', () => {
      const result = detector.detectPlatform('https://www.twitch.tv/streamer');
      expect(result).toBe('twitch');
    });

    it('should detect Medium from URL', () => {
      const result = detector.detectPlatform('https://medium.com/@author/article');
      expect(result).toBe('medium');
    });

    it('should detect Medium from custom domain', () => {
      const result = detector.detectPlatform('https://blog.example.medium.com/article');
      expect(result).toBe('medium');
    });

    it('should return unknown for unrecognized platforms', () => {
      const result = detector.detectPlatform('https://example.com/page');
      expect(result).toBe('unknown');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = detector.detectPlatform('not-a-valid-url');
      expect(result).toBe('unknown');
    });

    it('should handle empty string', () => {
      const result = detector.detectPlatform('');
      expect(result).toBe('unknown');
    });
  });

  describe('extractCreatorId', () => {
    it('should extract YouTube channel ID', () => {
      const result = detector.extractCreatorId('https://www.youtube.com/channel/UCxyz123');
      expect(result).toBe('UCxyz123');
    });

    it('should extract YouTube username', () => {
      const result = detector.extractCreatorId('https://www.youtube.com/@username');
      expect(result).toBe('@username');
    });

    it('should extract Twitch username', () => {
      const result = detector.extractCreatorId('https://www.twitch.tv/streamer_name');
      expect(result).toBe('streamer_name');
    });

    it('should extract Medium author', () => {
      const result = detector.extractCreatorId('https://medium.com/@authorname/article-title');
      expect(result).toBe('@authorname');
    });

    it('should return null for unrecognized URLs', () => {
      const result = detector.extractCreatorId('https://example.com/page');
      expect(result).toBeNull();
    });
  });

  describe('getPlatformConfig', () => {
    it('should return YouTube config with ad selectors', () => {
      const config = detector.getPlatformConfig('youtube');
      expect(config).toBeDefined();
      expect(config.adSelectors).toBeDefined();
      expect(config.adSelectors.length).toBeGreaterThan(0);
      expect(config.minWatchTime).toBeGreaterThanOrEqual(5);
      expect(config.maxWatchTime).toBeLessThanOrEqual(30);
    });

    it('should return Twitch config with ad selectors', () => {
      const config = detector.getPlatformConfig('twitch');
      expect(config).toBeDefined();
      expect(config.adSelectors).toBeDefined();
      expect(config.minWatchTime).toBeGreaterThanOrEqual(5);
    });

    it('should return Medium config', () => {
      const config = detector.getPlatformConfig('medium');
      expect(config).toBeDefined();
      expect(config.minWatchTime).toBeGreaterThanOrEqual(5);
    });

    it('should return default config for unknown platform', () => {
      const config = detector.getPlatformConfig('unknown');
      expect(config).toBeDefined();
      expect(config.minWatchTime).toBe(5);
      expect(config.maxWatchTime).toBe(30);
    });
  });

  describe('isVideoPage', () => {
    it('should identify YouTube video page', () => {
      expect(detector.isVideoPage('https://www.youtube.com/watch?v=abc123')).toBe(true);
    });

    it('should not identify YouTube channel page as video', () => {
      expect(detector.isVideoPage('https://www.youtube.com/channel/UCxyz')).toBe(false);
    });

    it('should identify Twitch live stream', () => {
      expect(detector.isVideoPage('https://www.twitch.tv/streamer')).toBe(true);
    });

    it('should not identify Twitch directory as video', () => {
      expect(detector.isVideoPage('https://www.twitch.tv/directory')).toBe(false);
    });
  });

  describe('getSupportedPlatforms', () => {
    it('should return list of supported platforms', () => {
      const platforms = detector.getSupportedPlatforms();
      expect(platforms).toContain('youtube');
      expect(platforms).toContain('twitch');
      expect(platforms).toContain('medium');
      expect(platforms.length).toBe(3);
    });
  });
});

// ============================================================================
// AD VIEWER TESTS
// ============================================================================

describe('AdViewer', () => {
  let adViewer: any;

  beforeEach(async () => {
    const { AdViewer } = await import('../../electron/core/creator-support/ad-viewer');
    adViewer = new AdViewer();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(adViewer).toBeDefined();
    });

    it('should accept custom config', async () => {
      const { AdViewer } = await import('../../electron/core/creator-support/ad-viewer');
      const custom = new AdViewer({
        minWatchTime: 10,
        maxWatchTime: 20,
        engagementProbability: 0.5
      });
      expect(custom).toBeDefined();
      expect(custom.getConfig().minWatchTime).toBe(10);
    });
  });

  describe('generateWatchTime', () => {
    it('should generate time within bounds (5-30s)', () => {
      for (let i = 0; i < 100; i++) {
        const time = adViewer.generateWatchTime();
        expect(time).toBeGreaterThanOrEqual(5);
        expect(time).toBeLessThanOrEqual(30);
      }
    });

    it('should generate varied times', () => {
      const times = new Set<number>();
      for (let i = 0; i < 50; i++) {
        times.add(Math.round(adViewer.generateWatchTime()));
      }
      expect(times.size).toBeGreaterThan(5);
    });

    it('should accept custom min/max', () => {
      const time = adViewer.generateWatchTime(10, 15);
      expect(time).toBeGreaterThanOrEqual(10);
      expect(time).toBeLessThanOrEqual(15);
    });
  });

  describe('detectAds', () => {
    it('should return ad detection result', () => {
      const mockPageContent = {
        selectors: ['.video-ads', '.ad-container'],
        html: '<div class="video-ads">Ad Content</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'youtube');
      expect(result).toHaveProperty('detected');
      expect(result).toHaveProperty('adType');
      expect(result).toHaveProperty('selectors');
    });

    it('should detect YouTube pre-roll ads', () => {
      const mockPageContent = {
        selectors: ['.ytp-ad-player-overlay'],
        html: '<div class="ytp-ad-player-overlay">Ad</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'youtube');
      expect(result.detected).toBe(true);
      expect(result.adType).toBe('video');
    });

    it('should detect Twitch ads', () => {
      const mockPageContent = {
        selectors: ['.stream-ad'],
        html: '<div class="stream-ad">Ad</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'twitch');
      expect(result.detected).toBe(true);
    });

    it('should return false when no ads detected', () => {
      const mockPageContent = {
        selectors: [],
        html: '<div>Regular content</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'youtube');
      expect(result.detected).toBe(false);
    });
  });

  describe('simulateEngagement', () => {
    it('should return engagement actions', () => {
      const actions = adViewer.simulateEngagement('youtube');
      expect(Array.isArray(actions)).toBe(true);
    });

    it('should include mouse movements', () => {
      const actions = adViewer.simulateEngagement('youtube');
      const hasMouseMove = actions.some((a: any) => a.type === 'mousemove');
      expect(hasMouseMove).toBe(true);
    });

    it('should include focus events', () => {
      const actions = adViewer.simulateEngagement('youtube');
      const hasFocus = actions.some((a: any) => a.type === 'focus');
      expect(hasFocus).toBe(true);
    });

    it('should have realistic timing', () => {
      const actions = adViewer.simulateEngagement('youtube');
      actions.forEach((action: any) => {
        expect(action.delay).toBeGreaterThan(0);
        expect(action.delay).toBeLessThan(5000);
      });
    });
  });

  describe('shouldSkipAd', () => {
    it('should respect minimum watch time', () => {
      // Should not skip before min time
      expect(adViewer.shouldSkipAd(3, 5)).toBe(false);
      expect(adViewer.shouldSkipAd(4, 5)).toBe(false);
    });

    it('should allow skip after min time', () => {
      // May skip after min time (probabilistic)
      let skipped = false;
      for (let i = 0; i < 100; i++) {
        if (adViewer.shouldSkipAd(6, 5)) {
          skipped = true;
          break;
        }
      }
      expect(skipped).toBe(true);
    });

    it('should always skip if skip available and past max time', () => {
      expect(adViewer.shouldSkipAd(35, 5)).toBe(true);
    });
  });

  describe('getAdMetrics', () => {
    it('should return metrics object', () => {
      const metrics = adViewer.getAdMetrics();
      expect(metrics).toHaveProperty('totalAdsViewed');
      expect(metrics).toHaveProperty('totalWatchTime');
      expect(metrics).toHaveProperty('avgWatchTime');
      expect(metrics).toHaveProperty('engagementRate');
    });

    it('should track viewed ads', () => {
      adViewer.recordAdView(10, true);
      adViewer.recordAdView(15, false);
      const metrics = adViewer.getAdMetrics();
      expect(metrics.totalAdsViewed).toBe(2);
      expect(metrics.totalWatchTime).toBe(25);
    });
  });

  describe('recordAdView', () => {
    it('should record ad view with watch time', () => {
      adViewer.recordAdView(12, true);
      const metrics = adViewer.getAdMetrics();
      expect(metrics.totalAdsViewed).toBe(1);
      expect(metrics.totalWatchTime).toBe(12);
    });

    it('should track engagement', () => {
      adViewer.recordAdView(10, true);
      adViewer.recordAdView(10, false);
      const metrics = adViewer.getAdMetrics();
      expect(metrics.engagementRate).toBe(50);
    });
  });
});

// ============================================================================
// SUPPORT TRACKER TESTS
// ============================================================================

describe('SupportTracker', () => {
  let tracker: any;

  beforeEach(async () => {
    const { SupportTracker } = await import('../../electron/core/creator-support/support-tracker');
    tracker = new SupportTracker();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(tracker).toBeDefined();
    });
  });

  describe('addCreator', () => {
    it('should add a new creator', () => {
      const creator = tracker.addCreator({
        name: 'Test Creator',
        platform: 'youtube',
        url: 'https://youtube.com/@testcreator'
      });
      expect(creator).toBeDefined();
      expect(creator.id).toBeDefined();
      expect(creator.name).toBe('Test Creator');
      expect(creator.platform).toBe('youtube');
    });

    it('should set default values', () => {
      const creator = tracker.addCreator({
        name: 'Test',
        platform: 'twitch',
        url: 'https://twitch.tv/test'
      });
      expect(creator.viewCount).toBe(0);
      expect(creator.adImpressions).toBe(0);
      expect(creator.enabled).toBe(true);
    });

    it('should generate unique IDs', () => {
      const c1 = tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      const c2 = tracker.addCreator({ name: 'C2', platform: 'youtube', url: 'url2' });
      expect(c1.id).not.toBe(c2.id);
    });
  });

  describe('getCreator', () => {
    it('should return creator by ID', () => {
      const added = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      const found = tracker.getCreator(added.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Test');
    });

    it('should return undefined for unknown ID', () => {
      const found = tracker.getCreator('unknown-id');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllCreators', () => {
    it('should return all creators', () => {
      tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      tracker.addCreator({ name: 'C2', platform: 'twitch', url: 'url2' });
      const all = tracker.getAllCreators();
      expect(all.length).toBe(2);
    });

    it('should return empty array initially', () => {
      const all = tracker.getAllCreators();
      expect(all).toEqual([]);
    });
  });

  describe('getCreatorsByPlatform', () => {
    it('should filter by platform', () => {
      tracker.addCreator({ name: 'YT1', platform: 'youtube', url: 'url1' });
      tracker.addCreator({ name: 'TW1', platform: 'twitch', url: 'url2' });
      tracker.addCreator({ name: 'YT2', platform: 'youtube', url: 'url3' });

      const youtube = tracker.getCreatorsByPlatform('youtube');
      expect(youtube.length).toBe(2);
      expect(youtube.every((c: any) => c.platform === 'youtube')).toBe(true);
    });
  });

  describe('recordView', () => {
    it('should increment view count', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordView(creator.id);
      const updated = tracker.getCreator(creator.id);
      expect(updated.viewCount).toBe(1);
    });

    it('should update lastSupported timestamp', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      const before = Date.now();
      tracker.recordView(creator.id);
      const updated = tracker.getCreator(creator.id);
      expect(updated.lastSupported.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should throw for unknown creator', () => {
      expect(() => tracker.recordView('unknown')).toThrow();
    });
  });

  describe('recordAdImpression', () => {
    it('should increment ad impressions', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordAdImpression(creator.id, 15);
      const updated = tracker.getCreator(creator.id);
      expect(updated.adImpressions).toBe(1);
    });

    it('should track watch time', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordAdImpression(creator.id, 10);
      tracker.recordAdImpression(creator.id, 20);
      const updated = tracker.getCreator(creator.id);
      expect(updated.totalAdWatchTime).toBe(30);
    });
  });

  describe('updateCreator', () => {
    it('should update creator properties', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.updateCreator(creator.id, { name: 'Updated Name' });
      const updated = tracker.getCreator(creator.id);
      expect(updated.name).toBe('Updated Name');
    });

    it('should preserve other properties', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordView(creator.id);
      tracker.updateCreator(creator.id, { name: 'Updated' });
      const updated = tracker.getCreator(creator.id);
      expect(updated.viewCount).toBe(1);
    });
  });

  describe('removeCreator', () => {
    it('should remove creator', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      const removed = tracker.removeCreator(creator.id);
      expect(removed).toBe(true);
      expect(tracker.getCreator(creator.id)).toBeUndefined();
    });

    it('should return false for unknown creator', () => {
      const removed = tracker.removeCreator('unknown');
      expect(removed).toBe(false);
    });
  });

  describe('enableCreator / disableCreator', () => {
    it('should enable creator', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.disableCreator(creator.id);
      tracker.enableCreator(creator.id);
      const updated = tracker.getCreator(creator.id);
      expect(updated.enabled).toBe(true);
    });

    it('should disable creator', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.disableCreator(creator.id);
      const updated = tracker.getCreator(creator.id);
      expect(updated.enabled).toBe(false);
    });
  });

  describe('getEnabledCreators', () => {
    it('should return only enabled creators', () => {
      const c1 = tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      tracker.addCreator({ name: 'C2', platform: 'youtube', url: 'url2' });
      tracker.disableCreator(c1.id);

      const enabled = tracker.getEnabledCreators();
      expect(enabled.length).toBe(1);
      expect(enabled[0].name).toBe('C2');
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics summary', () => {
      tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      tracker.addCreator({ name: 'C2', platform: 'twitch', url: 'url2' });

      const analytics = tracker.getAnalytics();
      expect(analytics).toHaveProperty('totalCreators');
      expect(analytics).toHaveProperty('totalViews');
      expect(analytics).toHaveProperty('totalAdImpressions');
      expect(analytics).toHaveProperty('estimatedRevenue');
      expect(analytics).toHaveProperty('platformBreakdown');
    });

    it('should calculate totals correctly', () => {
      const c1 = tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      const c2 = tracker.addCreator({ name: 'C2', platform: 'twitch', url: 'url2' });

      tracker.recordView(c1.id);
      tracker.recordView(c1.id);
      tracker.recordView(c2.id);
      tracker.recordAdImpression(c1.id, 10);
      tracker.recordAdImpression(c2.id, 15);

      const analytics = tracker.getAnalytics();
      expect(analytics.totalCreators).toBe(2);
      expect(analytics.totalViews).toBe(3);
      expect(analytics.totalAdImpressions).toBe(2);
    });

    it('should calculate estimated revenue', () => {
      const creator = tracker.addCreator({ name: 'C1', platform: 'youtube', url: 'url1' });
      tracker.recordAdImpression(creator.id, 30);
      tracker.recordAdImpression(creator.id, 30);

      const analytics = tracker.getAnalytics();
      // Revenue calculation: ad impressions * CPM rate
      expect(analytics.estimatedRevenue).toBeGreaterThan(0);
    });

    it('should provide platform breakdown', () => {
      tracker.addCreator({ name: 'YT1', platform: 'youtube', url: 'url1' });
      tracker.addCreator({ name: 'YT2', platform: 'youtube', url: 'url2' });
      tracker.addCreator({ name: 'TW1', platform: 'twitch', url: 'url3' });

      const analytics = tracker.getAnalytics();
      expect(analytics.platformBreakdown.youtube).toBe(2);
      expect(analytics.platformBreakdown.twitch).toBe(1);
    });
  });

  describe('getCreatorAnalytics', () => {
    it('should return analytics for specific creator', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordView(creator.id);
      tracker.recordAdImpression(creator.id, 15);

      const analytics = tracker.getCreatorAnalytics(creator.id);
      expect(analytics).toHaveProperty('viewCount');
      expect(analytics).toHaveProperty('adImpressions');
      expect(analytics).toHaveProperty('avgAdWatchTime');
      expect(analytics).toHaveProperty('estimatedRevenue');
      expect(analytics.viewCount).toBe(1);
      expect(analytics.adImpressions).toBe(1);
    });
  });
});

// ============================================================================
// SCHEDULER INTEGRATION TESTS
// ============================================================================

describe('CreatorSupportScheduler', () => {
  let scheduler: any;

  beforeEach(async () => {
    const { CreatorSupportScheduler } = await import('../../electron/core/creator-support/support-tracker');
    scheduler = new CreatorSupportScheduler();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(scheduler).toBeDefined();
    });
  });

  describe('addSupportSchedule', () => {
    it('should add recurring schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'creator-1',
        type: 'recurring',
        intervalMinutes: 60
      });
      expect(schedule).toBeDefined();
      expect(schedule.id).toBeDefined();
      expect(schedule.type).toBe('recurring');
    });

    it('should add daily schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'creator-1',
        type: 'daily',
        timeOfDay: '10:00'
      });
      expect(schedule.type).toBe('daily');
    });
  });

  describe('getSupportSchedules', () => {
    it('should return all schedules', () => {
      scheduler.addSupportSchedule({ creatorId: 'c1', type: 'recurring', intervalMinutes: 30 });
      scheduler.addSupportSchedule({ creatorId: 'c2', type: 'daily', timeOfDay: '12:00' });

      const schedules = scheduler.getSupportSchedules();
      expect(schedules.length).toBe(2);
    });
  });

  describe('getSchedulesForCreator', () => {
    it('should return schedules for specific creator', () => {
      scheduler.addSupportSchedule({ creatorId: 'c1', type: 'recurring', intervalMinutes: 30 });
      scheduler.addSupportSchedule({ creatorId: 'c1', type: 'daily', timeOfDay: '12:00' });
      scheduler.addSupportSchedule({ creatorId: 'c2', type: 'recurring', intervalMinutes: 60 });

      const schedules = scheduler.getSchedulesForCreator('c1');
      expect(schedules.length).toBe(2);
    });
  });

  describe('removeSupportSchedule', () => {
    it('should remove schedule', () => {
      const schedule = scheduler.addSupportSchedule({ creatorId: 'c1', type: 'recurring', intervalMinutes: 30 });
      const removed = scheduler.removeSupportSchedule(schedule.id);
      expect(removed).toBe(true);
      expect(scheduler.getSupportSchedules().length).toBe(0);
    });
  });

  describe('enableSchedule / disableSchedule', () => {
    it('should enable/disable schedules', () => {
      const schedule = scheduler.addSupportSchedule({ creatorId: 'c1', type: 'recurring', intervalMinutes: 30 });
      
      scheduler.disableSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id).enabled).toBe(false);
      
      scheduler.enableSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id).enabled).toBe(true);
    });
  });

  describe('calculateNextRun', () => {
    it('should calculate next run for recurring schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'recurring',
        intervalMinutes: 60
      });
      
      const nextRun = scheduler.calculateNextRun(schedule.id);
      expect(nextRun).toBeInstanceOf(Date);
      expect(nextRun.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for unknown schedule', () => {
      const nextRun = scheduler.calculateNextRun('unknown-id');
      expect(nextRun).toBeNull();
    });

    it('should calculate next run for daily schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'daily',
        timeOfDay: '23:59'
      });
      
      const nextRun = scheduler.calculateNextRun(schedule.id);
      expect(nextRun).toBeInstanceOf(Date);
    });

    it('should calculate next run for weekly schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'weekly',
        timeOfDay: '10:00',
        daysOfWeek: [1, 3, 5] // Mon, Wed, Fri
      });
      
      const nextRun = scheduler.calculateNextRun(schedule.id);
      expect(nextRun).toBeInstanceOf(Date);
    });

    it('should handle one-time schedule', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'one-time'
      });
      
      const nextRun = scheduler.calculateNextRun(schedule.id);
      expect(nextRun).toBeInstanceOf(Date);
    });
  });

  describe('updateSchedule', () => {
    it('should update schedule properties', () => {
      const schedule = scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'recurring',
        intervalMinutes: 30
      });
      
      const updated = scheduler.updateSchedule(schedule.id, {
        intervalMinutes: 60
      });
      
      expect(updated).toBeDefined();
      expect(updated?.intervalMinutes).toBe(60);
    });

    it('should return undefined for unknown schedule', () => {
      const updated = scheduler.updateSchedule('unknown', { intervalMinutes: 60 });
      expect(updated).toBeUndefined();
    });
  });

  describe('start / stop', () => {
    it('should start the scheduler', () => {
      scheduler.addSupportSchedule({
        creatorId: 'c1',
        type: 'recurring',
        intervalMinutes: 60
      });
      
      scheduler.start();
      // Starting again should be no-op
      scheduler.start();
      
      scheduler.stop();
    });

    it('should stop the scheduler', () => {
      scheduler.start();
      scheduler.stop();
      // Stopping again should be no-op
      scheduler.stop();
    });
  });
});

// ============================================================================
// ADDITIONAL EDGE CASE TESTS
// ============================================================================

describe('PlatformDetector Edge Cases', () => {
  let detector: any;

  beforeEach(async () => {
    const { PlatformDetector } = await import('../../electron/core/creator-support/platform-detection');
    detector = new PlatformDetector();
  });

  describe('isSupportedPlatform', () => {
    it('should return true for supported platforms', () => {
      expect(detector.isSupportedPlatform('https://youtube.com/watch?v=abc')).toBe(true);
      expect(detector.isSupportedPlatform('https://twitch.tv/streamer')).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(detector.isSupportedPlatform('https://example.com')).toBe(false);
    });
  });

  describe('getAdSelectors', () => {
    it('should return ad selectors for youtube', () => {
      const selectors = detector.getAdSelectors('youtube');
      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors.length).toBeGreaterThan(0);
    });
  });

  describe('getVideoSelectors', () => {
    it('should return video selectors for youtube', () => {
      const selectors = detector.getVideoSelectors('youtube');
      expect(Array.isArray(selectors)).toBe(true);
      expect(selectors.length).toBeGreaterThan(0);
    });
  });
});

describe('AdViewer Edge Cases', () => {
  let adViewer: any;

  beforeEach(async () => {
    const { AdViewer } = await import('../../electron/core/creator-support/ad-viewer');
    adViewer = new AdViewer();
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      adViewer.recordAdView(10, true);
      adViewer.recordAdView(15, false);
      adViewer.resetMetrics();
      
      const metrics = adViewer.getAdMetrics();
      expect(metrics.totalAdsViewed).toBe(0);
      expect(metrics.totalWatchTime).toBe(0);
    });
  });

  describe('generateViewingSequence', () => {
    it('should generate viewing sequence for ad', () => {
      const sequence = adViewer.generateViewingSequence(30);
      expect(Array.isArray(sequence)).toBe(true);
      expect(sequence.length).toBeGreaterThan(0);
      expect(sequence[0].action).toBe('start');
    });

    it('should include skip action for long ads', () => {
      const sequence = adViewer.generateViewingSequence(60);
      expect(sequence.some((s: any) => s.action === 'skip' || s.action === 'complete')).toBe(true);
    });
  });

  describe('detectAds with banner type', () => {
    it('should detect banner ads', () => {
      const mockPageContent = {
        selectors: ['.ad-banner'],
        html: '<div class="ad-banner">Banner Ad</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'twitch');
      expect(result.detected).toBe(true);
      expect(result.adType).toBe('banner');
    });

    it('should detect overlay ads', () => {
      const mockPageContent = {
        selectors: ['[class*="ad-overlay"]'],
        html: '<div class="ad-overlay-container">Overlay</div>'
      };
      const result = adViewer.detectAds(mockPageContent, 'twitch');
      expect(result.detected).toBe(true);
      expect(result.adType).toBe('overlay');
    });
  });
});

describe('SupportTracker Edge Cases', () => {
  let tracker: any;

  beforeEach(async () => {
    const { SupportTracker } = await import('../../electron/core/creator-support/support-tracker');
    tracker = new SupportTracker();
  });

  describe('reset', () => {
    it('should reset all tracking data', () => {
      tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.reset();
      expect(tracker.getAllCreators().length).toBe(0);
    });
  });

  describe('getCreatorAnalytics', () => {
    it('should return undefined for unknown creator', () => {
      const analytics = tracker.getCreatorAnalytics('unknown');
      expect(analytics).toBeUndefined();
    });

    it('should calculate avg watch time correctly', () => {
      const creator = tracker.addCreator({ name: 'Test', platform: 'youtube', url: 'url' });
      tracker.recordAdImpression(creator.id, 10);
      tracker.recordAdImpression(creator.id, 20);
      
      const analytics = tracker.getCreatorAnalytics(creator.id);
      expect(analytics?.avgAdWatchTime).toBe(15);
    });
  });

  describe('recordAdImpression error handling', () => {
    it('should throw for unknown creator', () => {
      expect(() => tracker.recordAdImpression('unknown', 10)).toThrow();
    });
  });

  describe('enable/disable non-existent creator', () => {
    it('should return false when enabling unknown creator', () => {
      expect(tracker.enableCreator('unknown')).toBe(false);
    });

    it('should return false when disabling unknown creator', () => {
      expect(tracker.disableCreator('unknown')).toBe(false);
    });
  });

  describe('updateCreator error handling', () => {
    it('should return undefined for unknown creator', () => {
      const result = tracker.updateCreator('unknown', { name: 'New Name' });
      expect(result).toBeUndefined();
    });
  });
});
