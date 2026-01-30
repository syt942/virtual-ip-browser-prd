# Implementation Plan: Creator Support Module (EP-007)

## Overview

The Creator Support module enables users to ethically support content creators by automatically viewing ads on their channels/videos across YouTube, Twitch, and Medium platforms. This module integrates with the existing TabManager for session isolation, leverages domain-targeting patterns for navigation, and tracks all support activities in SQLite.

## Requirements

### Functional Requirements
- **FR-001**: Add creators by URL with automatic platform detection
- **FR-002**: Auto-fetch creator metadata (name, thumbnail, platform)
- **FR-003**: Support YouTube videos/channels with ad viewing
- **FR-004**: Support Twitch streams with ad viewing
- **FR-005**: Support Medium articles with ad engagement
- **FR-006**: Detect and wait for video ads (no skip)
- **FR-007**: Simulate natural engagement (scroll, hover, dwell time)
- **FR-008**: Track support sessions per creator (view counts, ad impressions)
- **FR-009**: Schedule recurring support sessions
- **FR-010**: Analytics dashboard for support statistics

### Non-Functional Requirements
- **NFR-001**: Ad detection latency < 500ms
- **NFR-002**: Support 100+ creators
- **NFR-003**: Human-like behavior to avoid detection
- **NFR-004**: Graceful error handling with retry logic

## Architecture Changes

### New Files to Create
```
electron/core/creator-support/
├── index.ts                    # Module exports
├── types.ts                    # TypeScript interfaces
├── platform-detection.ts       # URL parsing & platform detection
├── ad-viewer.ts               # Ad detection & viewing automation
├── support-tracker.ts         # Session & statistics tracking
├── support-manager.ts         # Main orchestration class
└── platforms/
    ├── index.ts               # Platform handler exports
    ├── base-platform.ts       # Abstract platform handler
    ├── youtube-handler.ts     # YouTube-specific logic
    ├── twitch-handler.ts      # Twitch-specific logic
    └── medium-handler.ts      # Medium-specific logic
```

### Files to Modify
- `electron/database/schema.sql` - Add new tables (already has `creators` table)
- `electron/database/index.ts` - Add new repository
- `electron/ipc/channels.ts` - Add creator support IPC channels
- `electron/ipc/handlers/index.ts` - Register new handlers
- `electron/core/automation/types.ts` - Extend Creator interface
- `src/stores/` - Add creatorSupportStore.ts
- `src/components/panels/` - Add CreatorSupportPanel.tsx

## Database Schema

### New Tables

```sql
-- Support Sessions Table (tracks each support session)
CREATE TABLE IF NOT EXISTS support_sessions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  tab_id TEXT,
  proxy_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'medium')),
  content_url TEXT NOT NULL,
  content_title TEXT,
  ads_detected INTEGER DEFAULT 0,
  ads_viewed INTEGER DEFAULT 0,
  ads_skipped INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,  -- in seconds
  engagement_score REAL DEFAULT 0,
  error TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_support_sessions_creator ON support_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_status ON support_sessions(status);
CREATE INDEX IF NOT EXISTS idx_support_sessions_platform ON support_sessions(platform);

-- Ad Impressions Table (tracks individual ad views)
CREATE TABLE IF NOT EXISTS ad_impressions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('video_pre', 'video_mid', 'video_post', 'display', 'overlay', 'banner')),
  ad_duration INTEGER,  -- in seconds, null for display ads
  watch_duration INTEGER,  -- actual time watched
  was_skipped INTEGER DEFAULT 0,
  engagement_actions TEXT,  -- JSON array of actions taken
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (session_id) REFERENCES support_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ad_impressions_session ON ad_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_creator ON ad_impressions(creator_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_type ON ad_impressions(ad_type);

-- Creator Support Schedules Table
CREATE TABLE IF NOT EXISTS creator_support_schedules (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('one-time', 'recurring', 'continuous')),
  interval_minutes INTEGER,
  max_sessions_per_day INTEGER DEFAULT 10,
  preferred_content_type TEXT CHECK (preferred_content_type IN ('latest', 'popular', 'random', 'specific')),
  specific_urls TEXT,  -- JSON array for specific content URLs
  enabled INTEGER DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  run_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_schedules_enabled ON creator_support_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_creator_schedules_next_run ON creator_support_schedules(next_run);
```

### Update Existing Creators Table
The existing `creators` table in `schema.sql` needs to be extended:

```sql
-- Add new columns to creators table (via migration)
ALTER TABLE creators ADD COLUMN channel_id TEXT;
ALTER TABLE creators ADD COLUMN subscriber_count INTEGER;
ALTER TABLE creators ADD COLUMN avg_video_duration INTEGER;
ALTER TABLE creators ADD COLUMN estimated_revenue_per_view REAL DEFAULT 0.001;
ALTER TABLE creators ADD COLUMN last_content_fetch DATETIME;
ALTER TABLE creators ADD COLUMN content_cache TEXT;  -- JSON cache of recent content
```


## Implementation Steps

### Phase 1: Core Types & Platform Detection (2-3 days)

#### Step 1.1: Create Type Definitions
**File:** `electron/core/creator-support/types.ts`

```typescript
/**
 * Creator Support Module Types
 */

export type SupportPlatform = 'youtube' | 'twitch' | 'medium';
export type SupportSessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AdType = 'video_pre' | 'video_mid' | 'video_post' | 'display' | 'overlay' | 'banner';
export type ContentSelectionStrategy = 'latest' | 'popular' | 'random' | 'specific';

export interface CreatorInfo {
  id: string;
  name: string;
  url: string;
  platform: SupportPlatform;
  channelId?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  avgVideoDuration?: number;
  estimatedRevenuePerView: number;
  enabled: boolean;
  priority: number;
  lastSupported?: Date;
  totalSupports: number;
  totalAdsViewed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportSession {
  id: string;
  creatorId: string;
  tabId?: string;
  proxyId?: string;
  status: SupportSessionStatus;
  platform: SupportPlatform;
  contentUrl: string;
  contentTitle?: string;
  adsDetected: number;
  adsViewed: number;
  adsSkipped: number;
  totalWatchTime: number;
  engagementScore: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface AdImpression {
  id: string;
  sessionId: string;
  creatorId: string;
  adType: AdType;
  adDuration?: number;
  watchDuration?: number;
  wasSkipped: boolean;
  engagementActions: string[];
  detectedAt: Date;
  completedAt?: Date;
}

export interface SupportSchedule {
  id: string;
  creatorId: string;
  scheduleType: 'one-time' | 'recurring' | 'continuous';
  intervalMinutes?: number;
  maxSessionsPerDay: number;
  preferredContentType: ContentSelectionStrategy;
  specificUrls?: string[];
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformContent {
  url: string;
  title: string;
  duration?: number;
  publishedAt?: Date;
  viewCount?: number;
  thumbnailUrl?: string;
}

export interface AdDetectionResult {
  detected: boolean;
  adType?: AdType;
  duration?: number;
  skippableAfter?: number;
  element?: string;
}

export interface SupportConfig {
  maxConcurrentSessions: number;
  minWatchTime: number;
  maxWatchTime: number;
  enableEngagement: boolean;
  respectRateLimits: boolean;
  rotateProxies: boolean;
  useUniqueFingerprints: boolean;
}

export interface SupportStatistics {
  totalCreatorsSupported: number;
  totalSessionsCompleted: number;
  totalAdsViewed: number;
  totalWatchTimeSeconds: number;
  estimatedRevenueGenerated: number;
  averageSessionDuration: number;
  successRate: number;
  statsByPlatform: Record<SupportPlatform, PlatformStats>;
  statsByCreator: CreatorStats[];
}

export interface PlatformStats {
  sessions: number;
  adsViewed: number;
  watchTime: number;
  estimatedRevenue: number;
}

export interface CreatorStats {
  creatorId: string;
  creatorName: string;
  platform: SupportPlatform;
  sessions: number;
  adsViewed: number;
  watchTime: number;
  estimatedRevenue: number;
  lastSupported?: Date;
}
```

**Why:** Establishes all type definitions upfront for type safety across the module.
**Dependencies:** None
**Risk:** Low


#### Step 1.2: Implement Platform Detection
**File:** `electron/core/creator-support/platform-detection.ts`

```typescript
/**
 * Platform Detection
 * Parses URLs and detects platform type, extracts creator/content IDs
 */

import type { SupportPlatform, CreatorInfo, PlatformContent } from './types';

export interface ParsedUrl {
  platform: SupportPlatform;
  creatorId?: string;
  creatorName?: string;
  contentId?: string;
  contentType: 'channel' | 'video' | 'stream' | 'article' | 'profile';
  originalUrl: string;
  normalizedUrl: string;
}

export interface PlatformPatterns {
  platform: SupportPlatform;
  patterns: RegExp[];
  extractors: {
    creatorId: (url: string, match: RegExpMatchArray) => string | undefined;
    contentId: (url: string, match: RegExpMatchArray) => string | undefined;
    contentType: (url: string, match: RegExpMatchArray) => ParsedUrl['contentType'];
  };
}

const PLATFORM_PATTERNS: PlatformPatterns[] = [
  {
    platform: 'youtube',
    patterns: [
      /^https?:\/\/(www\.)?youtube\.com\/(watch\?v=|shorts\/|live\/)([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(www\.)?youtube\.com\/(channel\/|c\/|@)([a-zA-Z0-9_-]+)/,
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ],
    extractors: {
      creatorId: (url, match) => {
        if (url.includes('/channel/') || url.includes('/c/') || url.includes('/@')) {
          return match[3];
        }
        return undefined;
      },
      contentId: (url, match) => {
        if (url.includes('watch?v=') || url.includes('/shorts/') || url.includes('/live/') || url.includes('youtu.be/')) {
          return match[3] || match[1];
        }
        return undefined;
      },
      contentType: (url) => {
        if (url.includes('watch?v=') || url.includes('/shorts/') || url.includes('/live/') || url.includes('youtu.be/')) {
          return 'video';
        }
        return 'channel';
      },
    },
  },
  {
    platform: 'twitch',
    patterns: [
      /^https?:\/\/(www\.)?twitch\.tv\/([a-zA-Z0-9_]+)(\/videos?\/(\d+))?/,
      /^https?:\/\/(www\.)?twitch\.tv\/videos\/(\d+)/,
    ],
    extractors: {
      creatorId: (url, match) => match[2],
      contentId: (url, match) => match[4] || match[2],
      contentType: (url, match) => {
        if (url.includes('/videos/') || match[4]) return 'video';
        return 'stream';
      },
    },
  },
  {
    platform: 'medium',
    patterns: [
      /^https?:\/\/(www\.)?medium\.com\/@([a-zA-Z0-9_.-]+)(\/[a-zA-Z0-9-]+)?/,
      /^https?:\/\/([a-zA-Z0-9-]+)\.medium\.com(\/[a-zA-Z0-9-]+)?/,
    ],
    extractors: {
      creatorId: (url, match) => match[2] || match[1],
      contentId: (url, match) => {
        const pathMatch = url.match(/\/([a-f0-9]{8,})/);
        return pathMatch ? pathMatch[1] : undefined;
      },
      contentType: (url, match) => {
        if (match[3] || url.split('/').length > 4) return 'article';
        return 'profile';
      },
    },
  },
];

export class PlatformDetection {
  /**
   * Parse URL and detect platform
   */
  parseUrl(url: string): ParsedUrl | null {
    const normalizedUrl = this.normalizeUrl(url);
    
    for (const platformConfig of PLATFORM_PATTERNS) {
      for (const pattern of platformConfig.patterns) {
        const match = normalizedUrl.match(pattern);
        if (match) {
          return {
            platform: platformConfig.platform,
            creatorId: platformConfig.extractors.creatorId(normalizedUrl, match),
            contentId: platformConfig.extractors.contentId(normalizedUrl, match),
            contentType: platformConfig.extractors.contentType(normalizedUrl, match),
            originalUrl: url,
            normalizedUrl,
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Normalize URL for consistent parsing
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove tracking parameters
      const cleanParams = new URLSearchParams();
      const keepParams = ['v', 'list', 't'];
      parsed.searchParams.forEach((value, key) => {
        if (keepParams.includes(key)) {
          cleanParams.set(key, value);
        }
      });
      parsed.search = cleanParams.toString();
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if URL is supported
   */
  isSupportedUrl(url: string): boolean {
    return this.parseUrl(url) !== null;
  }

  /**
   * Get platform from URL
   */
  getPlatform(url: string): SupportPlatform | null {
    const parsed = this.parseUrl(url);
    return parsed?.platform ?? null;
  }

  /**
   * Build channel URL from creator ID
   */
  buildChannelUrl(platform: SupportPlatform, creatorId: string): string {
    switch (platform) {
      case 'youtube':
        return `https://www.youtube.com/channel/${creatorId}`;
      case 'twitch':
        return `https://www.twitch.tv/${creatorId}`;
      case 'medium':
        return `https://medium.com/@${creatorId}`;
    }
  }

  /**
   * Build content URL
   */
  buildContentUrl(platform: SupportPlatform, contentId: string): string {
    switch (platform) {
      case 'youtube':
        return `https://www.youtube.com/watch?v=${contentId}`;
      case 'twitch':
        return `https://www.twitch.tv/videos/${contentId}`;
      case 'medium':
        return `https://medium.com/p/${contentId}`;
    }
  }
}

export const platformDetection = new PlatformDetection();
```

**Why:** Central URL parsing logic for all supported platforms with extensible pattern system.
**Dependencies:** Step 1.1 (types)
**Risk:** Low


### Phase 2: Platform Handlers (3-4 days)

#### Step 2.1: Create Base Platform Handler
**File:** `electron/core/creator-support/platforms/base-platform.ts`

```typescript
/**
 * Base Platform Handler
 * Abstract class defining the interface for platform-specific handlers
 */

import { EventEmitter } from 'events';
import type { BrowserView } from 'electron';
import type { 
  SupportPlatform, 
  CreatorInfo, 
  PlatformContent, 
  AdDetectionResult,
  AdType 
} from '../types';
import { BehaviorSimulator } from '../../automation/behavior-simulator';
import { PageInteraction } from '../../automation/page-interaction';

export interface PlatformHandlerConfig {
  minAdWatchTime: number;
  maxAdWatchTime: number;
  enableEngagement: boolean;
  scrollBehavior: boolean;
  mouseMovement: boolean;
}

export abstract class BasePlatformHandler extends EventEmitter {
  protected platform: SupportPlatform;
  protected config: PlatformHandlerConfig;
  protected behaviorSimulator: BehaviorSimulator;
  protected pageInteraction: PageInteraction;

  constructor(platform: SupportPlatform, config: Partial<PlatformHandlerConfig> = {}) {
    super();
    this.platform = platform;
    this.config = {
      minAdWatchTime: 5,
      maxAdWatchTime: 120,
      enableEngagement: true,
      scrollBehavior: true,
      mouseMovement: true,
      ...config,
    };
    this.behaviorSimulator = new BehaviorSimulator();
    this.pageInteraction = new PageInteraction();
  }

  /**
   * Fetch creator metadata from platform
   */
  abstract fetchCreatorInfo(url: string): Promise<Partial<CreatorInfo>>;

  /**
   * Fetch available content from creator
   */
  abstract fetchCreatorContent(creatorId: string, limit?: number): Promise<PlatformContent[]>;

  /**
   * Detect if an ad is currently playing/displayed
   */
  abstract detectAd(view: BrowserView): Promise<AdDetectionResult>;

  /**
   * Wait for ad to complete (or handle skip logic)
   */
  abstract waitForAdCompletion(view: BrowserView, adResult: AdDetectionResult): Promise<void>;

  /**
   * Get injection script for ad detection
   */
  abstract getAdDetectionScript(): string;

  /**
   * Get injection script for engagement simulation
   */
  abstract getEngagementScript(): string;

  /**
   * Navigate to content and prepare for viewing
   */
  async navigateToContent(view: BrowserView, url: string): Promise<boolean> {
    try {
      await view.webContents.loadURL(url);
      
      // Wait for page load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Navigation timeout')), 30000);
        view.webContents.once('did-finish-load', () => {
          clearTimeout(timeout);
          resolve();
        });
        view.webContents.once('did-fail-load', (_, errorCode, errorDesc) => {
          clearTimeout(timeout);
          reject(new Error(`Navigation failed: ${errorDesc}`));
        });
      });

      // Inject detection scripts
      await view.webContents.executeJavaScript(this.getAdDetectionScript());
      
      this.emit('navigation:complete', { url });
      return true;
    } catch (error) {
      this.emit('navigation:error', { url, error });
      return false;
    }
  }

  /**
   * Simulate human-like engagement with content
   */
  async simulateEngagement(view: BrowserView, duration: number): Promise<void> {
    if (!this.config.enableEngagement) return;

    const actions = this.behaviorSimulator.generateActionSequence(duration * 1000);
    
    for (const action of actions) {
      switch (action.type) {
        case 'scroll':
          await this.performScroll(view, action.duration);
          break;
        case 'mousemove':
          await this.performMouseMove(view, action.duration);
          break;
        case 'pause':
          await this.delay(action.duration);
          break;
        case 'read':
          await this.delay(action.duration);
          break;
      }
      
      this.emit('engagement:action', { type: action.type, duration: action.duration });
    }
  }

  /**
   * Perform scroll action
   */
  protected async performScroll(view: BrowserView, duration: number): Promise<void> {
    const scrollScript = `
      (function() {
        const scrollAmount = Math.floor(Math.random() * 300) + 100;
        const direction = Math.random() > 0.3 ? 1 : -1;
        window.scrollBy({ top: scrollAmount * direction, behavior: 'smooth' });
      })();
    `;
    await view.webContents.executeJavaScript(scrollScript);
    await this.delay(duration);
  }

  /**
   * Perform mouse movement
   */
  protected async performMouseMove(view: BrowserView, duration: number): Promise<void> {
    const bounds = view.getBounds();
    const startX = Math.floor(Math.random() * bounds.width);
    const startY = Math.floor(Math.random() * bounds.height);
    const endX = Math.floor(Math.random() * bounds.width);
    const endY = Math.floor(Math.random() * bounds.height);

    const path = this.pageInteraction.generateMousePath(
      { x: startX, y: startY },
      { x: endX, y: endY },
      10
    );

    for (const point of path) {
      view.webContents.sendInputEvent({
        type: 'mouseMove',
        x: point.x,
        y: point.y,
      });
      await this.delay(point.delay);
    }
  }

  /**
   * Utility delay function
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate human-like delay
   */
  protected humanDelay(baseMs: number, variance: number = 0.3): Promise<void> {
    const delay = this.behaviorSimulator.generateHumanDelay(baseMs, variance);
    return this.delay(delay);
  }
}
```

**Why:** Provides common functionality and interface for all platform handlers.
**Dependencies:** Step 1.1, existing BehaviorSimulator and PageInteraction
**Risk:** Low


#### Step 2.2: Implement YouTube Handler
**File:** `electron/core/creator-support/platforms/youtube-handler.ts`

```typescript
/**
 * YouTube Platform Handler
 * Handles YouTube-specific ad detection, viewing, and engagement
 */

import type { BrowserView } from 'electron';
import { BasePlatformHandler } from './base-platform';
import type { CreatorInfo, PlatformContent, AdDetectionResult, AdType } from '../types';

export class YouTubeHandler extends BasePlatformHandler {
  constructor() {
    super('youtube', {
      minAdWatchTime: 5,
      maxAdWatchTime: 120,
      enableEngagement: true,
    });
  }

  /**
   * Fetch creator info from YouTube channel
   */
  async fetchCreatorInfo(url: string): Promise<Partial<CreatorInfo>> {
    // This would ideally use YouTube Data API, but for privacy we scrape
    // In production, consider using yt-dlp or similar for metadata
    return {
      name: '', // Will be populated from page scrape
      platform: 'youtube',
      url,
    };
  }

  /**
   * Fetch recent videos from creator
   */
  async fetchCreatorContent(creatorId: string, limit: number = 10): Promise<PlatformContent[]> {
    // Would fetch from channel's videos page
    // Returns list of video URLs for support sessions
    return [];
  }

  /**
   * Detect YouTube ads
   */
  async detectAd(view: BrowserView): Promise<AdDetectionResult> {
    const result = await view.webContents.executeJavaScript(`
      (function() {
        // Check for video ads
        const adOverlay = document.querySelector('.ytp-ad-player-overlay');
        const adText = document.querySelector('.ytp-ad-text');
        const adModule = document.querySelector('.ytp-ad-module');
        const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
        const adPreview = document.querySelector('.ytp-ad-preview-container');
        
        // Check for display ads
        const displayAds = document.querySelectorAll('#player-ads, .ytd-player-legacy-desktop-watch-ads-renderer');
        const bannerAds = document.querySelectorAll('.ytd-banner-promo-renderer, .ytd-statement-banner-renderer');
        
        const isVideoAd = !!(adOverlay || adText || adModule || adPreview);
        const isDisplayAd = displayAds.length > 0 || bannerAds.length > 0;
        
        if (isVideoAd) {
          // Get ad duration if available
          const durationEl = document.querySelector('.ytp-ad-duration-remaining');
          const duration = durationEl ? parseInt(durationEl.textContent?.replace(/[^0-9]/g, '') || '0') : null;
          
          // Check if skippable
          const skipCountdown = document.querySelector('.ytp-ad-skip-button-container');
          const skippableAfter = skipCountdown ? 5 : null;
          
          return {
            detected: true,
            adType: adPreview ? 'video_pre' : 'video_mid',
            duration,
            skippableAfter,
            element: 'video-ad',
          };
        }
        
        if (isDisplayAd) {
          return {
            detected: true,
            adType: 'display',
            duration: null,
            element: 'display-ad',
          };
        }
        
        return { detected: false };
      })();
    `);
    
    return result as AdDetectionResult;
  }

  /**
   * Wait for ad to complete without skipping
   */
  async waitForAdCompletion(view: BrowserView, adResult: AdDetectionResult): Promise<void> {
    if (!adResult.detected) return;

    this.emit('ad:started', { type: adResult.adType, duration: adResult.duration });

    if (adResult.adType === 'display') {
      // For display ads, just ensure visibility for minimum time
      await this.humanDelay(3000);
      this.emit('ad:viewed', { type: 'display' });
      return;
    }

    // For video ads, wait for completion
    const startTime = Date.now();
    const maxWaitTime = (adResult.duration || 30) * 1000 + 5000;

    while (Date.now() - startTime < maxWaitTime) {
      const stillPlaying = await this.isAdStillPlaying(view);
      
      if (!stillPlaying) {
        this.emit('ad:completed', { 
          type: adResult.adType, 
          watchTime: (Date.now() - startTime) / 1000 
        });
        return;
      }

      // Simulate engagement during ad
      if (this.config.enableEngagement && Math.random() < 0.1) {
        await this.performMouseMove(view, 500);
      }

      await this.delay(1000);
    }

    this.emit('ad:timeout', { type: adResult.adType });
  }

  /**
   * Check if ad is still playing
   */
  private async isAdStillPlaying(view: BrowserView): Promise<boolean> {
    return await view.webContents.executeJavaScript(`
      (function() {
        const adOverlay = document.querySelector('.ytp-ad-player-overlay');
        const adModule = document.querySelector('.ytp-ad-module');
        return !!(adOverlay || adModule);
      })();
    `);
  }

  /**
   * Get ad detection injection script
   */
  getAdDetectionScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      window.__creatorSupport.adObserver = new MutationObserver((mutations) => {
        const adContainer = document.querySelector('.ytp-ad-player-overlay, .ytp-ad-module');
        if (adContainer) {
          window.postMessage({ type: 'CREATOR_SUPPORT_AD_DETECTED' }, '*');
        }
      });
      
      const player = document.querySelector('#movie_player');
      if (player) {
        window.__creatorSupport.adObserver.observe(player, { 
          childList: true, 
          subtree: true 
        });
      }
    `;
  }

  /**
   * Get engagement simulation script
   */
  getEngagementScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      window.__creatorSupport.simulateLike = function() {
        // Just hover over like button, don't click (ethical)
        const likeBtn = document.querySelector('#top-level-buttons-computed ytd-toggle-button-renderer');
        if (likeBtn) {
          likeBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      };
      window.__creatorSupport.scrollToComments = function() {
        const comments = document.querySelector('#comments');
        if (comments) {
          comments.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
    `;
  }
}

export const youtubeHandler = new YouTubeHandler();
```

**Why:** YouTube-specific implementation for ad detection and viewing automation.
**Dependencies:** Step 2.1 (BasePlatformHandler)
**Risk:** Medium - YouTube frequently changes DOM structure, requires maintenance


#### Step 2.3: Implement Twitch Handler
**File:** `electron/core/creator-support/platforms/twitch-handler.ts`

```typescript
/**
 * Twitch Platform Handler
 * Handles Twitch-specific ad detection, viewing, and stream engagement
 */

import type { BrowserView } from 'electron';
import { BasePlatformHandler } from './base-platform';
import type { CreatorInfo, PlatformContent, AdDetectionResult } from '../types';

export class TwitchHandler extends BasePlatformHandler {
  constructor() {
    super('twitch', {
      minAdWatchTime: 15,
      maxAdWatchTime: 180,
      enableEngagement: true,
    });
  }

  async fetchCreatorInfo(url: string): Promise<Partial<CreatorInfo>> {
    return {
      platform: 'twitch',
      url,
    };
  }

  async fetchCreatorContent(creatorId: string, limit: number = 10): Promise<PlatformContent[]> {
    return [];
  }

  async detectAd(view: BrowserView): Promise<AdDetectionResult> {
    const result = await view.webContents.executeJavaScript(`
      (function() {
        // Twitch ad indicators
        const adBanner = document.querySelector('[data-a-target="video-ad-label"]');
        const adCountdown = document.querySelector('[data-a-target="video-ad-countdown"]');
        const adOverlay = document.querySelector('.video-player__ad-overlay');
        const commercialLabel = document.querySelector('.tw-c-text-overlay');
        
        const isAd = !!(adBanner || adCountdown || adOverlay || 
          (commercialLabel && commercialLabel.textContent?.toLowerCase().includes('ad')));
        
        if (isAd) {
          const countdownEl = document.querySelector('[data-a-target="video-ad-countdown"]');
          const durationMatch = countdownEl?.textContent?.match(/(\d+)/);
          const duration = durationMatch ? parseInt(durationMatch[1]) : null;
          
          return {
            detected: true,
            adType: 'video_mid',
            duration,
            element: 'twitch-ad',
          };
        }
        
        return { detected: false };
      })();
    `);
    
    return result as AdDetectionResult;
  }

  async waitForAdCompletion(view: BrowserView, adResult: AdDetectionResult): Promise<void> {
    if (!adResult.detected) return;

    this.emit('ad:started', { type: adResult.adType, duration: adResult.duration });
    
    const startTime = Date.now();
    const maxWaitTime = (adResult.duration || 60) * 1000 + 10000;

    while (Date.now() - startTime < maxWaitTime) {
      const stillPlaying = await view.webContents.executeJavaScript(`
        !!(document.querySelector('[data-a-target="video-ad-label"]') ||
           document.querySelector('[data-a-target="video-ad-countdown"]'))
      `);
      
      if (!stillPlaying) {
        this.emit('ad:completed', { 
          type: adResult.adType, 
          watchTime: (Date.now() - startTime) / 1000 
        });
        return;
      }
      
      await this.delay(1000);
    }

    this.emit('ad:timeout', { type: adResult.adType });
  }

  getAdDetectionScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      window.__creatorSupport.twitchAdObserver = new MutationObserver(() => {
        const adLabel = document.querySelector('[data-a-target="video-ad-label"]');
        if (adLabel) {
          window.postMessage({ type: 'CREATOR_SUPPORT_AD_DETECTED', platform: 'twitch' }, '*');
        }
      });
      
      const player = document.querySelector('.video-player');
      if (player) {
        window.__creatorSupport.twitchAdObserver.observe(player, { 
          childList: true, 
          subtree: true,
          attributes: true 
        });
      }
    `;
  }

  getEngagementScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      window.__creatorSupport.openChat = function() {
        const chatToggle = document.querySelector('[data-a-target="right-column-chat-bar"]');
        if (chatToggle) chatToggle.click();
      };
    `;
  }
}

export const twitchHandler = new TwitchHandler();
```

**Why:** Twitch-specific handler for stream ad detection.
**Dependencies:** Step 2.1
**Risk:** Medium - Twitch also changes DOM frequently

#### Step 2.4: Implement Medium Handler  
**File:** `electron/core/creator-support/platforms/medium-handler.ts`

```typescript
/**
 * Medium Platform Handler
 * Handles Medium article viewing with ad engagement
 */

import type { BrowserView } from 'electron';
import { BasePlatformHandler } from './base-platform';
import type { CreatorInfo, PlatformContent, AdDetectionResult } from '../types';

export class MediumHandler extends BasePlatformHandler {
  constructor() {
    super('medium', {
      minAdWatchTime: 10,
      maxAdWatchTime: 60,
      enableEngagement: true,
      scrollBehavior: true,
    });
  }

  async fetchCreatorInfo(url: string): Promise<Partial<CreatorInfo>> {
    return {
      platform: 'medium',
      url,
    };
  }

  async fetchCreatorContent(creatorId: string, limit: number = 10): Promise<PlatformContent[]> {
    return [];
  }

  async detectAd(view: BrowserView): Promise<AdDetectionResult> {
    const result = await view.webContents.executeJavaScript(`
      (function() {
        // Medium partner program ads and display ads
        const ads = document.querySelectorAll(
          '[data-testid*="ad"], ' +
          '.branch-journeys-top, ' +
          '[class*="advertisement"], ' +
          'iframe[src*="ads"], ' +
          '[id*="google_ads"]'
        );
        
        if (ads.length > 0) {
          return {
            detected: true,
            adType: 'display',
            element: 'medium-ad',
          };
        }
        
        return { detected: false };
      })();
    `);
    
    return result as AdDetectionResult;
  }

  async waitForAdCompletion(view: BrowserView, adResult: AdDetectionResult): Promise<void> {
    if (!adResult.detected) return;

    this.emit('ad:started', { type: 'display' });
    
    // For Medium, engagement means reading the article
    // Simulate scrolling through and viewing ads
    await this.simulateReading(view);
    
    this.emit('ad:completed', { type: 'display', watchTime: 30 });
  }

  private async simulateReading(view: BrowserView): Promise<void> {
    const readingBehavior = this.behaviorSimulator.simulateReadingBehavior(5000);
    
    for (let i = 0; i < readingBehavior.scrollEvents; i++) {
      await this.performScroll(view, 2000);
      await this.humanDelay(3000);
    }
  }

  getAdDetectionScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      // Track scroll depth for engagement metrics
      window.__creatorSupport.scrollDepth = 0;
      window.addEventListener('scroll', () => {
        const depth = (window.scrollY / document.body.scrollHeight) * 100;
        window.__creatorSupport.scrollDepth = Math.max(window.__creatorSupport.scrollDepth, depth);
      });
    `;
  }

  getEngagementScript(): string {
    return `
      window.__creatorSupport = window.__creatorSupport || {};
      window.__creatorSupport.getReadingProgress = function() {
        return window.__creatorSupport.scrollDepth || 0;
      };
    `;
  }
}

export const mediumHandler = new MediumHandler();
```

**Why:** Medium handler focuses on article reading engagement.
**Dependencies:** Step 2.1
**Risk:** Low - Medium is more stable than video platforms


### Phase 3: Ad Viewer & Support Tracker (3-4 days)

#### Step 3.1: Implement Ad Viewer
**File:** `electron/core/creator-support/ad-viewer.ts`

```typescript
/**
 * Ad Viewer
 * Orchestrates ad detection and viewing across platforms
 */

import { EventEmitter } from 'events';
import type { BrowserView } from 'electron';
import type { 
  SupportPlatform, 
  AdDetectionResult, 
  AdImpression,
  SupportSession 
} from './types';
import { BasePlatformHandler } from './platforms/base-platform';
import { youtubeHandler } from './platforms/youtube-handler';
import { twitchHandler } from './platforms/twitch-handler';
import { mediumHandler } from './platforms/medium-handler';

export interface AdViewerConfig {
  pollInterval: number;
  maxAdWaitTime: number;
  engagementEnabled: boolean;
  skipAdsEnabled: boolean;  // Should always be false for ethical support
}

const DEFAULT_CONFIG: AdViewerConfig = {
  pollInterval: 1000,
  maxAdWaitTime: 180000,
  engagementEnabled: true,
  skipAdsEnabled: false,
};

export class AdViewer extends EventEmitter {
  private config: AdViewerConfig;
  private handlers: Map<SupportPlatform, BasePlatformHandler>;
  private activeViewers: Map<string, { view: BrowserView; session: SupportSession }>;
  private isRunning: boolean = false;

  constructor(config: Partial<AdViewerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handlers = new Map([
      ['youtube', youtubeHandler],
      ['twitch', twitchHandler],
      ['medium', mediumHandler],
    ]);
    this.activeViewers = new Map();

    this.setupHandlerListeners();
  }

  private setupHandlerListeners(): void {
    for (const [platform, handler] of this.handlers) {
      handler.on('ad:started', (data) => {
        this.emit('ad:started', { platform, ...data });
      });
      handler.on('ad:completed', (data) => {
        this.emit('ad:completed', { platform, ...data });
      });
      handler.on('ad:timeout', (data) => {
        this.emit('ad:timeout', { platform, ...data });
      });
      handler.on('engagement:action', (data) => {
        this.emit('engagement:action', { platform, ...data });
      });
    }
  }

  /**
   * Get handler for platform
   */
  getHandler(platform: SupportPlatform): BasePlatformHandler | undefined {
    return this.handlers.get(platform);
  }

  /**
   * Start viewing session for a creator's content
   */
  async startViewingSession(
    view: BrowserView,
    session: SupportSession
  ): Promise<AdImpression[]> {
    const handler = this.handlers.get(session.platform);
    if (!handler) {
      throw new Error(`No handler for platform: ${session.platform}`);
    }

    const impressions: AdImpression[] = [];
    this.activeViewers.set(session.id, { view, session });
    this.isRunning = true;

    try {
      // Navigate to content
      const navigated = await handler.navigateToContent(view, session.contentUrl);
      if (!navigated) {
        throw new Error('Failed to navigate to content');
      }

      this.emit('session:started', { sessionId: session.id });

      // Main viewing loop
      const startTime = Date.now();
      const maxViewTime = this.config.maxAdWaitTime;

      while (this.isRunning && (Date.now() - startTime) < maxViewTime) {
        // Check for ads
        const adResult = await handler.detectAd(view);

        if (adResult.detected) {
          const impression = await this.handleAdDetected(view, session, handler, adResult);
          if (impression) {
            impressions.push(impression);
          }
        }

        // Simulate engagement if enabled
        if (this.config.engagementEnabled && Math.random() < 0.05) {
          await handler.simulateEngagement(view, 5);
        }

        await this.delay(this.config.pollInterval);
      }

      this.emit('session:completed', { sessionId: session.id, impressions });
      return impressions;

    } catch (error) {
      this.emit('session:error', { sessionId: session.id, error });
      throw error;
    } finally {
      this.activeViewers.delete(session.id);
    }
  }

  /**
   * Handle detected ad
   */
  private async handleAdDetected(
    view: BrowserView,
    session: SupportSession,
    handler: BasePlatformHandler,
    adResult: AdDetectionResult
  ): Promise<AdImpression | null> {
    const impressionId = crypto.randomUUID();
    const startTime = Date.now();

    const impression: AdImpression = {
      id: impressionId,
      sessionId: session.id,
      creatorId: session.creatorId,
      adType: adResult.adType!,
      adDuration: adResult.duration,
      watchDuration: 0,
      wasSkipped: false,
      engagementActions: [],
      detectedAt: new Date(),
    };

    this.emit('ad:detected', { impression, adResult });

    try {
      // Wait for ad to complete (no skipping!)
      await handler.waitForAdCompletion(view, adResult);

      impression.watchDuration = Math.floor((Date.now() - startTime) / 1000);
      impression.completedAt = new Date();

      this.emit('impression:recorded', impression);
      return impression;

    } catch (error) {
      this.emit('impression:error', { impression, error });
      return null;
    }
  }

  /**
   * Stop viewing session
   */
  stopSession(sessionId: string): void {
    const viewer = this.activeViewers.get(sessionId);
    if (viewer) {
      this.isRunning = false;
      this.emit('session:stopped', { sessionId });
    }
  }

  /**
   * Stop all sessions
   */
  stopAll(): void {
    this.isRunning = false;
    for (const [sessionId] of this.activeViewers) {
      this.emit('session:stopped', { sessionId });
    }
    this.activeViewers.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const adViewer = new AdViewer();
```

**Why:** Central orchestration for ad viewing across all platforms.
**Dependencies:** Steps 2.1-2.4 (Platform handlers)
**Risk:** Medium


#### Step 3.2: Implement Support Tracker
**File:** `electron/core/creator-support/support-tracker.ts`

```typescript
/**
 * Support Tracker
 * Tracks support sessions, ad impressions, and statistics
 */

import { EventEmitter } from 'events';
import type { DatabaseManager } from '../../database';
import type {
  CreatorInfo,
  SupportSession,
  AdImpression,
  SupportStatistics,
  SupportPlatform,
  PlatformStats,
  CreatorStats,
  SupportSessionStatus
} from './types';

export class SupportTracker extends EventEmitter {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    super();
    this.db = db;
  }

  // ============================================================
  // Session Management
  // ============================================================

  /**
   * Create a new support session
   */
  createSession(session: Omit<SupportSession, 'id' | 'createdAt'>): SupportSession {
    const id = crypto.randomUUID();
    const now = new Date();

    const newSession: SupportSession = {
      ...session,
      id,
      createdAt: now,
    };

    const sql = `
      INSERT INTO support_sessions (
        id, creator_id, tab_id, proxy_id, status, platform,
        content_url, content_title, ads_detected, ads_viewed,
        ads_skipped, total_watch_time, engagement_score, error,
        started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      newSession.id,
      newSession.creatorId,
      newSession.tabId || null,
      newSession.proxyId || null,
      newSession.status,
      newSession.platform,
      newSession.contentUrl,
      newSession.contentTitle || null,
      newSession.adsDetected,
      newSession.adsViewed,
      newSession.adsSkipped,
      newSession.totalWatchTime,
      newSession.engagementScore,
      newSession.error || null,
      newSession.startedAt || null,
      newSession.completedAt || null,
      newSession.createdAt,
    ]);

    this.emit('session:created', newSession);
    return newSession;
  }

  /**
   * Update session status and metrics
   */
  updateSession(
    sessionId: string, 
    updates: Partial<SupportSession>
  ): SupportSession | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const updated = { ...session, ...updates };

    const sql = `
      UPDATE support_sessions SET
        status = ?, tab_id = ?, proxy_id = ?, content_title = ?,
        ads_detected = ?, ads_viewed = ?, ads_skipped = ?,
        total_watch_time = ?, engagement_score = ?, error = ?,
        started_at = ?, completed_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      updated.status,
      updated.tabId || null,
      updated.proxyId || null,
      updated.contentTitle || null,
      updated.adsDetected,
      updated.adsViewed,
      updated.adsSkipped,
      updated.totalWatchTime,
      updated.engagementScore,
      updated.error || null,
      updated.startedAt || null,
      updated.completedAt || null,
      sessionId,
    ]);

    // Update creator stats if session completed
    if (updates.status === 'completed') {
      this.updateCreatorStats(updated.creatorId, updated);
    }

    this.emit('session:updated', updated);
    return updated;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SupportSession | null {
    const sql = 'SELECT * FROM support_sessions WHERE id = ?';
    const row = this.db.queryOne(sql, [sessionId]);
    return row ? this.mapRowToSession(row) : null;
  }

  /**
   * Get sessions for creator
   */
  getCreatorSessions(creatorId: string, limit: number = 50): SupportSession[] {
    const sql = `
      SELECT * FROM support_sessions 
      WHERE creator_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const rows = this.db.query(sql, [creatorId, limit]);
    return rows.map(row => this.mapRowToSession(row));
  }

  // ============================================================
  // Ad Impression Tracking
  // ============================================================

  /**
   * Record ad impression
   */
  recordImpression(impression: AdImpression): void {
    const sql = `
      INSERT INTO ad_impressions (
        id, session_id, creator_id, ad_type, ad_duration,
        watch_duration, was_skipped, engagement_actions,
        detected_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      impression.id,
      impression.sessionId,
      impression.creatorId,
      impression.adType,
      impression.adDuration || null,
      impression.watchDuration || null,
      impression.wasSkipped ? 1 : 0,
      JSON.stringify(impression.engagementActions),
      impression.detectedAt,
      impression.completedAt || null,
    ]);

    this.emit('impression:recorded', impression);
  }

  /**
   * Get impressions for session
   */
  getSessionImpressions(sessionId: string): AdImpression[] {
    const sql = 'SELECT * FROM ad_impressions WHERE session_id = ?';
    const rows = this.db.query(sql, [sessionId]);
    return rows.map(row => this.mapRowToImpression(row));
  }

  // ============================================================
  // Creator Stats
  // ============================================================

  /**
   * Update creator statistics after session
   */
  private updateCreatorStats(creatorId: string, session: SupportSession): void {
    const sql = `
      UPDATE creators SET
        last_supported = ?,
        total_supports = total_supports + 1,
        total_ads_viewed = total_ads_viewed + ?,
        updated_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      new Date(),
      session.adsViewed,
      new Date(),
      creatorId,
    ]);
  }

  // ============================================================
  // Statistics & Analytics
  // ============================================================

  /**
   * Get comprehensive support statistics
   */
  getStatistics(dateRange?: { from: Date; to: Date }): SupportStatistics {
    const whereClause = dateRange 
      ? 'WHERE created_at >= ? AND created_at <= ?' 
      : '';
    const params = dateRange ? [dateRange.from, dateRange.to] : [];

    // Overall stats
    const overallSql = `
      SELECT 
        COUNT(DISTINCT creator_id) as total_creators,
        COUNT(*) as total_sessions,
        SUM(ads_viewed) as total_ads,
        SUM(total_watch_time) as total_watch_time,
        AVG(total_watch_time) as avg_session_duration,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM support_sessions
      ${whereClause}
    `;
    const overall = this.db.queryOne(overallSql, params);

    // Stats by platform
    const platformSql = `
      SELECT 
        platform,
        COUNT(*) as sessions,
        SUM(ads_viewed) as ads_viewed,
        SUM(total_watch_time) as watch_time
      FROM support_sessions
      ${whereClause}
      GROUP BY platform
    `;
    const platformRows = this.db.query(platformSql, params);
    
    const statsByPlatform: Record<SupportPlatform, PlatformStats> = {
      youtube: { sessions: 0, adsViewed: 0, watchTime: 0, estimatedRevenue: 0 },
      twitch: { sessions: 0, adsViewed: 0, watchTime: 0, estimatedRevenue: 0 },
      medium: { sessions: 0, adsViewed: 0, watchTime: 0, estimatedRevenue: 0 },
    };

    for (const row of platformRows) {
      const platform = row.platform as SupportPlatform;
      statsByPlatform[platform] = {
        sessions: row.sessions || 0,
        adsViewed: row.ads_viewed || 0,
        watchTime: row.watch_time || 0,
        estimatedRevenue: (row.ads_viewed || 0) * 0.001,
      };
    }

    // Stats by creator
    const creatorSql = `
      SELECT 
        s.creator_id,
        c.name as creator_name,
        c.platform,
        COUNT(*) as sessions,
        SUM(s.ads_viewed) as ads_viewed,
        SUM(s.total_watch_time) as watch_time,
        MAX(s.completed_at) as last_supported
      FROM support_sessions s
      JOIN creators c ON s.creator_id = c.id
      ${whereClause}
      GROUP BY s.creator_id
      ORDER BY ads_viewed DESC
      LIMIT 20
    `;
    const creatorRows = this.db.query(creatorSql, params);
    
    const statsByCreator: CreatorStats[] = creatorRows.map(row => ({
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      platform: row.platform as SupportPlatform,
      sessions: row.sessions || 0,
      adsViewed: row.ads_viewed || 0,
      watchTime: row.watch_time || 0,
      estimatedRevenue: (row.ads_viewed || 0) * 0.001,
      lastSupported: row.last_supported ? new Date(row.last_supported) : undefined,
    }));

    return {
      totalCreatorsSupported: overall?.total_creators || 0,
      totalSessionsCompleted: overall?.total_sessions || 0,
      totalAdsViewed: overall?.total_ads || 0,
      totalWatchTimeSeconds: overall?.total_watch_time || 0,
      estimatedRevenueGenerated: (overall?.total_ads || 0) * 0.001,
      averageSessionDuration: overall?.avg_session_duration || 0,
      successRate: overall?.success_rate || 0,
      statsByPlatform,
      statsByCreator,
    };
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private mapRowToSession(row: any): SupportSession {
    return {
      id: row.id,
      creatorId: row.creator_id,
      tabId: row.tab_id,
      proxyId: row.proxy_id,
      status: row.status as SupportSessionStatus,
      platform: row.platform as SupportPlatform,
      contentUrl: row.content_url,
      contentTitle: row.content_title,
      adsDetected: row.ads_detected || 0,
      adsViewed: row.ads_viewed || 0,
      adsSkipped: row.ads_skipped || 0,
      totalWatchTime: row.total_watch_time || 0,
      engagementScore: row.engagement_score || 0,
      error: row.error,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRowToImpression(row: any): AdImpression {
    return {
      id: row.id,
      sessionId: row.session_id,
      creatorId: row.creator_id,
      adType: row.ad_type,
      adDuration: row.ad_duration,
      watchDuration: row.watch_duration,
      wasSkipped: !!row.was_skipped,
      engagementActions: JSON.parse(row.engagement_actions || '[]'),
      detectedAt: new Date(row.detected_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}
```

**Why:** Centralizes all tracking and statistics for support sessions.
**Dependencies:** Step 1.1, Database
**Risk:** Low


### Phase 4: Support Manager & Scheduler Integration (3-4 days)

#### Step 4.1: Implement Support Manager
**File:** `electron/core/creator-support/support-manager.ts`

```typescript
/**
 * Support Manager
 * Main orchestration class for creator support functionality
 */

import { EventEmitter } from 'events';
import type { BrowserView } from 'electron';
import type { DatabaseManager } from '../../database';
import type { TabManager } from '../tabs/manager';
import type { ProxyManager } from '../proxy-engine/manager';
import type { TaskScheduler } from '../automation/scheduler';
import type {
  CreatorInfo,
  SupportSession,
  SupportSchedule,
  SupportConfig,
  SupportStatistics,
  SupportPlatform,
  PlatformContent,
} from './types';
import { PlatformDetection, platformDetection } from './platform-detection';
import { AdViewer, adViewer } from './ad-viewer';
import { SupportTracker } from './support-tracker';

const DEFAULT_CONFIG: SupportConfig = {
  maxConcurrentSessions: 3,
  minWatchTime: 30,
  maxWatchTime: 300,
  enableEngagement: true,
  respectRateLimits: true,
  rotateProxies: true,
  useUniqueFingerprints: true,
};

export class SupportManager extends EventEmitter {
  private db: DatabaseManager;
  private tabManager: TabManager;
  private proxyManager: ProxyManager;
  private scheduler: TaskScheduler;
  private tracker: SupportTracker;
  private config: SupportConfig;
  private activeSessions: Map<string, SupportSession>;
  private isRunning: boolean = false;

  constructor(
    db: DatabaseManager,
    tabManager: TabManager,
    proxyManager: ProxyManager,
    scheduler: TaskScheduler,
    config: Partial<SupportConfig> = {}
  ) {
    super();
    this.db = db;
    this.tabManager = tabManager;
    this.proxyManager = proxyManager;
    this.scheduler = scheduler;
    this.tracker = new SupportTracker(db);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.activeSessions = new Map();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // AdViewer events
    adViewer.on('ad:detected', (data) => this.emit('ad:detected', data));
    adViewer.on('ad:completed', (data) => this.emit('ad:completed', data));
    adViewer.on('session:completed', (data) => this.emit('session:completed', data));

    // Tracker events
    this.tracker.on('session:created', (session) => this.emit('session:created', session));
    this.tracker.on('impression:recorded', (impression) => this.emit('impression:recorded', impression));

    // Scheduler events
    this.scheduler.on('task:execute', (schedule) => {
      if (schedule.taskConfig?.type === 'creator-support') {
        this.handleScheduledSupport(schedule);
      }
    });
  }

  // ============================================================
  // Creator Management
  // ============================================================

  /**
   * Add a creator by URL
   */
  async addCreator(url: string): Promise<CreatorInfo> {
    const parsed = platformDetection.parseUrl(url);
    if (!parsed) {
      throw new Error('Unsupported URL format');
    }

    // Check for existing creator
    const existing = await this.getCreatorByUrl(url);
    if (existing) {
      throw new Error('Creator already exists');
    }

    // Fetch creator metadata
    const handler = adViewer.getHandler(parsed.platform);
    const metadata = handler ? await handler.fetchCreatorInfo(url) : {};

    const creator: CreatorInfo = {
      id: crypto.randomUUID(),
      name: metadata.name || parsed.creatorId || 'Unknown Creator',
      url: parsed.normalizedUrl,
      platform: parsed.platform,
      channelId: parsed.creatorId,
      thumbnailUrl: metadata.thumbnailUrl,
      subscriberCount: metadata.subscriberCount,
      estimatedRevenuePerView: 0.001,
      enabled: true,
      priority: 0,
      totalSupports: 0,
      totalAdsViewed: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.saveCreator(creator);
    this.emit('creator:added', creator);
    return creator;
  }

  /**
   * Save creator to database
   */
  private async saveCreator(creator: CreatorInfo): Promise<void> {
    const sql = `
      INSERT INTO creators (
        id, name, url, platform, thumbnail_url, support_methods,
        enabled, priority, total_supports, total_ads_viewed,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      creator.id,
      creator.name,
      creator.url,
      creator.platform,
      creator.thumbnailUrl || null,
      JSON.stringify(['ads', 'visits']),
      creator.enabled ? 1 : 0,
      creator.priority,
      creator.totalSupports,
      creator.totalAdsViewed,
      creator.createdAt,
      creator.updatedAt,
    ]);
  }

  /**
   * Get creator by URL
   */
  async getCreatorByUrl(url: string): Promise<CreatorInfo | null> {
    const normalized = platformDetection.parseUrl(url)?.normalizedUrl || url;
    const sql = 'SELECT * FROM creators WHERE url = ?';
    const row = this.db.queryOne(sql, [normalized]);
    return row ? this.mapRowToCreator(row) : null;
  }

  /**
   * Get all enabled creators
   */
  async getEnabledCreators(): Promise<CreatorInfo[]> {
    const sql = 'SELECT * FROM creators WHERE enabled = 1 ORDER BY priority DESC';
    const rows = this.db.query(sql);
    return rows.map(row => this.mapRowToCreator(row));
  }

  /**
   * Update creator
   */
  async updateCreator(id: string, updates: Partial<CreatorInfo>): Promise<CreatorInfo | null> {
    const sql = `
      UPDATE creators SET
        name = COALESCE(?, name),
        enabled = COALESCE(?, enabled),
        priority = COALESCE(?, priority),
        updated_at = ?
      WHERE id = ?
    `;

    this.db.execute(sql, [
      updates.name ?? null,
      updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : null,
      updates.priority ?? null,
      new Date(),
      id,
    ]);

    const creator = await this.getCreatorById(id);
    if (creator) {
      this.emit('creator:updated', creator);
    }
    return creator;
  }

  /**
   * Delete creator
   */
  async deleteCreator(id: string): Promise<boolean> {
    const sql = 'DELETE FROM creators WHERE id = ?';
    const result = this.db.execute(sql, [id]);
    if (result.changes > 0) {
      this.emit('creator:deleted', { id });
      return true;
    }
    return false;
  }

  /**
   * Get creator by ID
   */
  async getCreatorById(id: string): Promise<CreatorInfo | null> {
    const sql = 'SELECT * FROM creators WHERE id = ?';
    const row = this.db.queryOne(sql, [id]);
    return row ? this.mapRowToCreator(row) : null;
  }

  // ============================================================
  // Support Session Execution
  // ============================================================

  /**
   * Start support session for a creator
   */
  async startSupportSession(creatorId: string, contentUrl?: string): Promise<SupportSession> {
    if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const creator = await this.getCreatorById(creatorId);
    if (!creator) {
      throw new Error('Creator not found');
    }

    // Determine content URL
    const targetUrl = contentUrl || creator.url;

    // Get proxy if rotation enabled
    let proxyId: string | undefined;
    if (this.config.rotateProxies) {
      const proxy = await this.proxyManager.getNextProxy();
      proxyId = proxy?.id;
    }

    // Create isolated tab
    const tab = await this.tabManager.createTab({
      url: 'about:blank',
      proxyId,
    });

    // Create session record
    const session = this.tracker.createSession({
      creatorId,
      tabId: tab.id,
      proxyId,
      status: 'pending',
      platform: creator.platform,
      contentUrl: targetUrl,
      adsDetected: 0,
      adsViewed: 0,
      adsSkipped: 0,
      totalWatchTime: 0,
      engagementScore: 0,
    });

    this.activeSessions.set(session.id, session);

    // Start viewing in background
    this.executeSession(session, tab.id).catch(error => {
      this.handleSessionError(session.id, error);
    });

    return session;
  }

  /**
   * Execute support session
   */
  private async executeSession(session: SupportSession, tabId: string): Promise<void> {
    const view = this.getTabView(tabId);
    if (!view) {
      throw new Error('Tab view not found');
    }

    // Update session status
    this.tracker.updateSession(session.id, {
      status: 'running',
      startedAt: new Date(),
    });

    try {
      // Run ad viewing
      const impressions = await adViewer.startViewingSession(view, session);

      // Calculate totals
      const totalWatchTime = impressions.reduce((sum, imp) => sum + (imp.watchDuration || 0), 0);
      const adsViewed = impressions.filter(imp => !imp.wasSkipped).length;

      // Record impressions
      for (const impression of impressions) {
        this.tracker.recordImpression(impression);
      }

      // Complete session
      this.tracker.updateSession(session.id, {
        status: 'completed',
        adsDetected: impressions.length,
        adsViewed,
        totalWatchTime,
        completedAt: new Date(),
      });

    } catch (error) {
      this.tracker.updateSession(session.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
      throw error;
    } finally {
      this.activeSessions.delete(session.id);
      // Close tab after session
      this.tabManager.closeTab(tabId);
    }
  }

  /**
   * Stop support session
   */
  stopSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      adViewer.stopSession(sessionId);
      this.tracker.updateSession(sessionId, {
        status: 'cancelled',
        completedAt: new Date(),
      });
      this.activeSessions.delete(sessionId);
      
      if (session.tabId) {
        this.tabManager.closeTab(session.tabId);
      }
    }
  }

  /**
   * Stop all active sessions
   */
  stopAllSessions(): void {
    for (const [sessionId] of this.activeSessions) {
      this.stopSession(sessionId);
    }
  }

  // ============================================================
  // Scheduling
  // ============================================================

  /**
   * Create support schedule for creator
   */
  async createSchedule(schedule: Omit<SupportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<SupportSchedule> {
    const id = crypto.randomUUID();
    const now = new Date();

    const newSchedule: SupportSchedule = {
      ...schedule,
      id,
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const sql = `
      INSERT INTO creator_support_schedules (
        id, creator_id, schedule_type, interval_minutes,
        max_sessions_per_day, preferred_content_type, specific_urls,
        enabled, next_run, run_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    this.db.execute(sql, [
      newSchedule.id,
      newSchedule.creatorId,
      newSchedule.scheduleType,
      newSchedule.intervalMinutes || null,
      newSchedule.maxSessionsPerDay,
      newSchedule.preferredContentType,
      newSchedule.specificUrls ? JSON.stringify(newSchedule.specificUrls) : null,
      newSchedule.enabled ? 1 : 0,
      newSchedule.nextRun || null,
      newSchedule.runCount,
      newSchedule.createdAt,
      newSchedule.updatedAt,
    ]);

    // Register with scheduler
    if (newSchedule.enabled) {
      this.registerWithScheduler(newSchedule);
    }

    this.emit('schedule:created', newSchedule);
    return newSchedule;
  }

  /**
   * Register schedule with TaskScheduler
   */
  private registerWithScheduler(schedule: SupportSchedule): void {
    this.scheduler.addSchedule({
      id: `creator-support-${schedule.id}`,
      name: `Creator Support: ${schedule.creatorId}`,
      type: schedule.scheduleType === 'one-time' ? 'one-time' : 'recurring',
      taskConfig: { type: 'creator-support', scheduleId: schedule.id } as any,
      intervalMinutes: schedule.intervalMinutes,
      enabled: schedule.enabled,
      runCount: schedule.runCount,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    });
  }

  /**
   * Handle scheduled support execution
   */
  private async handleScheduledSupport(taskSchedule: any): Promise<void> {
    const scheduleId = taskSchedule.taskConfig?.scheduleId;
    if (!scheduleId) return;

    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule || !schedule.enabled) return;

    try {
      await this.startSupportSession(schedule.creatorId);
    } catch (error) {
      this.emit('schedule:error', { scheduleId, error });
    }
  }

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string): Promise<SupportSchedule | null> {
    const sql = 'SELECT * FROM creator_support_schedules WHERE id = ?';
    const row = this.db.queryOne(sql, [id]);
    return row ? this.mapRowToSchedule(row) : null;
  }

  // ============================================================
  // Statistics & Analytics
  // ============================================================

  /**
   * Get support statistics
   */
  getStatistics(dateRange?: { from: Date; to: Date }): SupportStatistics {
    return this.tracker.getStatistics(dateRange);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): SupportSession[] {
    return Array.from(this.activeSessions.values());
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private getTabView(tabId: string): BrowserView | undefined {
    // Access internal views map from TabManager
    return (this.tabManager as any).views?.get(tabId);
  }

  private handleSessionError(sessionId: string, error: Error): void {
    this.emit('session:error', { sessionId, error: error.message });
    this.activeSessions.delete(sessionId);
  }

  private mapRowToCreator(row: any): CreatorInfo {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      platform: row.platform as SupportPlatform,
      channelId: row.channel_id,
      thumbnailUrl: row.thumbnail_url,
      subscriberCount: row.subscriber_count,
      estimatedRevenuePerView: row.estimated_revenue_per_view || 0.001,
      enabled: !!row.enabled,
      priority: row.priority || 0,
      lastSupported: row.last_supported ? new Date(row.last_supported) : undefined,
      totalSupports: row.total_supports || 0,
      totalAdsViewed: row.total_ads_viewed || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToSchedule(row: any): SupportSchedule {
    return {
      id: row.id,
      creatorId: row.creator_id,
      scheduleType: row.schedule_type,
      intervalMinutes: row.interval_minutes,
      maxSessionsPerDay: row.max_sessions_per_day || 10,
      preferredContentType: row.preferred_content_type || 'latest',
      specificUrls: row.specific_urls ? JSON.parse(row.specific_urls) : undefined,
      enabled: !!row.enabled,
      lastRun: row.last_run ? new Date(row.last_run) : undefined,
      nextRun: row.next_run ? new Date(row.next_run) : undefined,
      runCount: row.run_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
```

**Why:** Main orchestration class that ties together all components.
**Dependencies:** Steps 1-3, TabManager, ProxyManager, TaskScheduler
**Risk:** Medium - Complex integration


### Phase 5: IPC & Frontend Integration (3-4 days)

#### Step 5.1: Add IPC Channels
**File:** `electron/ipc/channels.ts` (modify existing)

```typescript
// Add to existing IPC_CHANNELS object:

  // Creator Support
  CREATOR_ADD: 'creator:add',
  CREATOR_REMOVE: 'creator:remove',
  CREATOR_UPDATE: 'creator:update',
  CREATOR_LIST: 'creator:list',
  CREATOR_GET: 'creator:get',
  
  SUPPORT_START_SESSION: 'support:start-session',
  SUPPORT_STOP_SESSION: 'support:stop-session',
  SUPPORT_STOP_ALL: 'support:stop-all',
  SUPPORT_GET_ACTIVE: 'support:get-active',
  SUPPORT_GET_HISTORY: 'support:get-history',
  
  SUPPORT_SCHEDULE_CREATE: 'support:schedule-create',
  SUPPORT_SCHEDULE_UPDATE: 'support:schedule-update',
  SUPPORT_SCHEDULE_DELETE: 'support:schedule-delete',
  SUPPORT_SCHEDULE_LIST: 'support:schedule-list',
  
  SUPPORT_GET_STATISTICS: 'support:get-statistics',
  
  // Events (Main -> Renderer)
  EVENT_SUPPORT_SESSION_UPDATE: 'event:support-session-update',
  EVENT_SUPPORT_AD_DETECTED: 'event:support-ad-detected',
  EVENT_SUPPORT_STATISTICS_UPDATE: 'event:support-statistics-update',
```

**Why:** Defines all IPC channels for creator support functionality.
**Dependencies:** None
**Risk:** Low

#### Step 5.2: Create IPC Handlers
**File:** `electron/ipc/handlers/creator-support.ts`

```typescript
/**
 * Creator Support IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../channels';
import type { SupportManager } from '../../core/creator-support/support-manager';

export function setupCreatorSupportHandlers(
  supportManager: SupportManager,
  mainWindow: BrowserWindow
) {
  // ============================================================
  // Creator Management
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.CREATOR_ADD, async (_event, url: string) => {
    try {
      const creator = await supportManager.addCreator(url);
      return { success: true, creator };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATOR_REMOVE, async (_event, id: string) => {
    try {
      const result = await supportManager.deleteCreator(id);
      return { success: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATOR_UPDATE, async (_event, id: string, updates: any) => {
    try {
      const creator = await supportManager.updateCreator(id, updates);
      return { success: true, creator };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATOR_LIST, async () => {
    try {
      const creators = await supportManager.getEnabledCreators();
      return { success: true, creators };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATOR_GET, async (_event, id: string) => {
    try {
      const creator = await supportManager.getCreatorById(id);
      return { success: true, creator };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================
  // Support Sessions
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.SUPPORT_START_SESSION, async (_event, creatorId: string, contentUrl?: string) => {
    try {
      const session = await supportManager.startSupportSession(creatorId, contentUrl);
      return { success: true, session };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPORT_STOP_SESSION, async (_event, sessionId: string) => {
    try {
      supportManager.stopSession(sessionId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPORT_STOP_ALL, async () => {
    try {
      supportManager.stopAllSessions();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SUPPORT_GET_ACTIVE, async () => {
    try {
      const sessions = supportManager.getActiveSessions();
      return { success: true, sessions };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================
  // Scheduling
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.SUPPORT_SCHEDULE_CREATE, async (_event, schedule: any) => {
    try {
      const created = await supportManager.createSchedule(schedule);
      return { success: true, schedule: created };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================
  // Statistics
  // ============================================================

  ipcMain.handle(IPC_CHANNELS.SUPPORT_GET_STATISTICS, async (_event, dateRange?: any) => {
    try {
      const statistics = supportManager.getStatistics(dateRange);
      return { success: true, statistics };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================================
  // Event Forwarding to Renderer
  // ============================================================

  supportManager.on('session:created', (session) => {
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_SUPPORT_SESSION_UPDATE, {
      type: 'created',
      session,
    });
  });

  supportManager.on('ad:detected', (data) => {
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_SUPPORT_AD_DETECTED, data);
  });

  supportManager.on('ad:completed', (data) => {
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_SUPPORT_SESSION_UPDATE, {
      type: 'ad-completed',
      data,
    });
  });

  supportManager.on('session:completed', (data) => {
    mainWindow.webContents.send(IPC_CHANNELS.EVENT_SUPPORT_SESSION_UPDATE, {
      type: 'completed',
      data,
    });
  });

  console.log('[Creator Support Handlers] Registered successfully');
}
```

**Why:** Exposes creator support functionality to renderer process.
**Dependencies:** Step 4.1 (SupportManager), Step 5.1 (channels)
**Risk:** Low

#### Step 5.3: Create Frontend Store
**File:** `src/stores/creatorSupportStore.ts`

```typescript
/**
 * Creator Support Store
 * Manages creator support state in the renderer
 */

import { create } from 'zustand';
import type { 
  CreatorInfo, 
  SupportSession, 
  SupportStatistics,
  SupportSchedule 
} from '../../electron/core/creator-support/types';

interface CreatorSupportState {
  // State
  creators: CreatorInfo[];
  activeSessions: SupportSession[];
  statistics: SupportStatistics | null;
  schedules: SupportSchedule[];
  isLoading: boolean;
  error: string | null;

  // Creator Actions
  addCreator: (url: string) => Promise<void>;
  removeCreator: (id: string) => Promise<void>;
  updateCreator: (id: string, updates: Partial<CreatorInfo>) => Promise<void>;
  loadCreators: () => Promise<void>;

  // Session Actions
  startSession: (creatorId: string, contentUrl?: string) => Promise<void>;
  stopSession: (sessionId: string) => Promise<void>;
  stopAllSessions: () => Promise<void>;

  // Schedule Actions
  createSchedule: (schedule: Omit<SupportSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Statistics
  loadStatistics: (dateRange?: { from: Date; to: Date }) => Promise<void>;

  // Internal
  setError: (error: string | null) => void;
  handleSessionUpdate: (update: any) => void;
}

export const useCreatorSupportStore = create<CreatorSupportState>((set, get) => ({
  creators: [],
  activeSessions: [],
  statistics: null,
  schedules: [],
  isLoading: false,
  error: null,

  addCreator: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.api.creatorSupport.addCreator(url);
      if (result.success && result.creator) {
        set((state) => ({
          creators: [...state.creators, result.creator],
          isLoading: false,
        }));
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeCreator: async (id: string) => {
    try {
      const result = await window.api.creatorSupport.removeCreator(id);
      if (result.success) {
        set((state) => ({
          creators: state.creators.filter((c) => c.id !== id),
        }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updateCreator: async (id: string, updates: Partial<CreatorInfo>) => {
    try {
      const result = await window.api.creatorSupport.updateCreator(id, updates);
      if (result.success && result.creator) {
        set((state) => ({
          creators: state.creators.map((c) =>
            c.id === id ? result.creator : c
          ),
        }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadCreators: async () => {
    set({ isLoading: true });
    try {
      const result = await window.api.creatorSupport.listCreators();
      if (result.success) {
        set({ creators: result.creators, isLoading: false });
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  startSession: async (creatorId: string, contentUrl?: string) => {
    try {
      const result = await window.api.creatorSupport.startSession(creatorId, contentUrl);
      if (result.success && result.session) {
        set((state) => ({
          activeSessions: [...state.activeSessions, result.session],
        }));
      } else {
        set({ error: result.error });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  stopSession: async (sessionId: string) => {
    try {
      await window.api.creatorSupport.stopSession(sessionId);
      set((state) => ({
        activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  stopAllSessions: async () => {
    try {
      await window.api.creatorSupport.stopAllSessions();
      set({ activeSessions: [] });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createSchedule: async (schedule) => {
    try {
      const result = await window.api.creatorSupport.createSchedule(schedule);
      if (result.success && result.schedule) {
        set((state) => ({
          schedules: [...state.schedules, result.schedule],
        }));
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadStatistics: async (dateRange) => {
    try {
      const result = await window.api.creatorSupport.getStatistics(dateRange);
      if (result.success) {
        set({ statistics: result.statistics });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setError: (error) => set({ error }),

  handleSessionUpdate: (update) => {
    switch (update.type) {
      case 'created':
        set((state) => ({
          activeSessions: [...state.activeSessions, update.session],
        }));
        break;
      case 'completed':
        set((state) => ({
          activeSessions: state.activeSessions.filter(
            (s) => s.id !== update.data.sessionId
          ),
        }));
        // Refresh statistics
        get().loadStatistics();
        break;
    }
  },
}));
```

**Why:** Manages creator support state in the React frontend.
**Dependencies:** Step 5.2 (IPC handlers)
**Risk:** Low


### Phase 6: UI Components (4-5 days)

#### Step 6.1: Create Creator Support Panel
**File:** `src/components/panels/CreatorSupportPanel.tsx`

```typescript
/**
 * Creator Support Panel
 * Main UI for managing creators and viewing support statistics
 */

import React, { useEffect, useState } from 'react';
import { useCreatorSupportStore } from '../../stores/creatorSupportStore';

type TabView = 'creators' | 'sessions' | 'schedules' | 'analytics';

export const CreatorSupportPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('creators');
  const [newCreatorUrl, setNewCreatorUrl] = useState('');
  
  const {
    creators,
    activeSessions,
    statistics,
    isLoading,
    error,
    loadCreators,
    addCreator,
    loadStatistics,
  } = useCreatorSupportStore();

  useEffect(() => {
    loadCreators();
    loadStatistics();
  }, []);

  const handleAddCreator = async () => {
    if (!newCreatorUrl.trim()) return;
    await addCreator(newCreatorUrl);
    setNewCreatorUrl('');
  };

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <h2 className="text-lg font-semibold text-text-primary">Creator Support</h2>
        <p className="text-sm text-text-secondary">
          Support your favorite creators by viewing their content with ads
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-default">
        {(['creators', 'sessions', 'schedules', 'analytics'] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="m-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'creators' && (
          <CreatorsTab
            creators={creators}
            isLoading={isLoading}
            newCreatorUrl={newCreatorUrl}
            setNewCreatorUrl={setNewCreatorUrl}
            onAddCreator={handleAddCreator}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab activeSessions={activeSessions} />
        )}
        {activeTab === 'schedules' && <SchedulesTab />}
        {activeTab === 'analytics' && (
          <AnalyticsTab statistics={statistics} />
        )}
      </div>
    </div>
  );
};

// Sub-components would be defined here or in separate files
const CreatorsTab: React.FC<{
  creators: any[];
  isLoading: boolean;
  newCreatorUrl: string;
  setNewCreatorUrl: (url: string) => void;
  onAddCreator: () => void;
}> = ({ creators, isLoading, newCreatorUrl, setNewCreatorUrl, onAddCreator }) => {
  const { startSession, removeCreator } = useCreatorSupportStore();

  return (
    <div className="space-y-4">
      {/* Add Creator Form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCreatorUrl}
          onChange={(e) => setNewCreatorUrl(e.target.value)}
          placeholder="Enter YouTube, Twitch, or Medium URL..."
          className="flex-1 px-3 py-2 border border-border-default rounded-lg 
                     bg-bg-secondary text-text-primary placeholder-text-muted"
        />
        <button
          onClick={onAddCreator}
          disabled={isLoading || !newCreatorUrl.trim()}
          className="px-4 py-2 bg-accent-primary text-white rounded-lg 
                     hover:bg-blue-600 disabled:opacity-50"
        >
          Add Creator
        </button>
      </div>

      {/* Creator List */}
      <div className="space-y-2">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="flex items-center gap-4 p-4 bg-bg-secondary rounded-lg"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
              {creator.thumbnailUrl ? (
                <img
                  src={creator.thumbnailUrl}
                  alt={creator.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-xl">
                  {creator.platform === 'youtube' && '📺'}
                  {creator.platform === 'twitch' && '🎮'}
                  {creator.platform === 'medium' && '📝'}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="font-medium text-text-primary">{creator.name}</h3>
              <p className="text-sm text-text-secondary capitalize">
                {creator.platform} • {creator.totalAdsViewed} ads viewed
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => startSession(creator.id)}
                className="px-3 py-1 text-sm bg-accent-success text-white rounded 
                           hover:bg-green-600"
              >
                Support Now
              </button>
              <button
                onClick={() => removeCreator(creator.id)}
                className="px-3 py-1 text-sm bg-accent-error text-white rounded 
                           hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {creators.length === 0 && !isLoading && (
          <div className="text-center py-8 text-text-muted">
            No creators added yet. Add a YouTube, Twitch, or Medium URL to get started.
          </div>
        )}
      </div>
    </div>
  );
};

const SessionsTab: React.FC<{ activeSessions: any[] }> = ({ activeSessions }) => {
  const { stopSession, stopAllSessions } = useCreatorSupportStore();

  return (
    <div className="space-y-4">
      {activeSessions.length > 0 && (
        <button
          onClick={stopAllSessions}
          className="px-4 py-2 bg-accent-error text-white rounded-lg"
        >
          Stop All Sessions
        </button>
      )}

      {activeSessions.map((session) => (
        <div
          key={session.id}
          className="p-4 bg-bg-secondary rounded-lg flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-text-primary">{session.contentUrl}</p>
            <p className="text-sm text-text-secondary">
              Status: {session.status} • Ads: {session.adsViewed}/{session.adsDetected}
            </p>
          </div>
          <button
            onClick={() => stopSession(session.id)}
            className="px-3 py-1 bg-accent-error text-white rounded"
          >
            Stop
          </button>
        </div>
      ))}

      {activeSessions.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          No active support sessions
        </div>
      )}
    </div>
  );
};

const SchedulesTab: React.FC = () => {
  // Schedule management UI
  return (
    <div className="text-center py-8 text-text-muted">
      Schedule management coming soon...
    </div>
  );
};

const AnalyticsTab: React.FC<{ statistics: any }> = ({ statistics }) => {
  if (!statistics) {
    return <div className="text-center py-8 text-text-muted">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Creators Supported"
          value={statistics.totalCreatorsSupported}
        />
        <StatCard
          label="Total Sessions"
          value={statistics.totalSessionsCompleted}
        />
        <StatCard
          label="Ads Viewed"
          value={statistics.totalAdsViewed}
        />
        <StatCard
          label="Est. Revenue"
          value={`$${statistics.estimatedRevenueGenerated.toFixed(2)}`}
        />
      </div>

      {/* Platform Breakdown */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <h3 className="font-medium text-text-primary mb-4">By Platform</h3>
        <div className="space-y-2">
          {Object.entries(statistics.statsByPlatform).map(([platform, stats]: [string, any]) => (
            <div key={platform} className="flex justify-between">
              <span className="capitalize text-text-secondary">{platform}</span>
              <span className="text-text-primary">
                {stats.adsViewed} ads • ${stats.estimatedRevenue.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Creators */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <h3 className="font-medium text-text-primary mb-4">Top Supported Creators</h3>
        <div className="space-y-2">
          {statistics.statsByCreator.slice(0, 5).map((creator: any) => (
            <div key={creator.creatorId} className="flex justify-between">
              <span className="text-text-secondary">{creator.creatorName}</span>
              <span className="text-text-primary">
                {creator.adsViewed} ads
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-bg-secondary rounded-lg p-4 text-center">
    <p className="text-2xl font-bold text-text-primary">{value}</p>
    <p className="text-sm text-text-secondary">{label}</p>
  </div>
);

export default CreatorSupportPanel;
```

**Why:** Complete UI for managing creators and viewing support analytics.
**Dependencies:** Step 5.3 (store)
**Risk:** Low


### Phase 7: Testing & Documentation (2-3 days)

#### Step 7.1: Unit Tests
**File:** `tests/unit/creator-support.test.ts`

```typescript
/**
 * Creator Support Module Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlatformDetection } from '../../electron/core/creator-support/platform-detection';

describe('PlatformDetection', () => {
  let detector: PlatformDetection;

  beforeEach(() => {
    detector = new PlatformDetection();
  });

  describe('parseUrl', () => {
    it('should detect YouTube video URLs', () => {
      const result = detector.parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('youtube');
      expect(result?.contentType).toBe('video');
      expect(result?.contentId).toBe('dQw4w9WgXcQ');
    });

    it('should detect YouTube channel URLs', () => {
      const result = detector.parseUrl('https://www.youtube.com/channel/UCtest123');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('youtube');
      expect(result?.contentType).toBe('channel');
      expect(result?.creatorId).toBe('UCtest123');
    });

    it('should detect YouTube shorts URLs', () => {
      const result = detector.parseUrl('https://www.youtube.com/shorts/abc123defgh');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('youtube');
      expect(result?.contentType).toBe('video');
    });

    it('should detect Twitch channel URLs', () => {
      const result = detector.parseUrl('https://www.twitch.tv/streamer123');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('twitch');
      expect(result?.contentType).toBe('stream');
      expect(result?.creatorId).toBe('streamer123');
    });

    it('should detect Twitch video URLs', () => {
      const result = detector.parseUrl('https://www.twitch.tv/videos/123456789');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('twitch');
      expect(result?.contentType).toBe('video');
    });

    it('should detect Medium profile URLs', () => {
      const result = detector.parseUrl('https://medium.com/@username');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('medium');
      expect(result?.contentType).toBe('profile');
    });

    it('should detect Medium article URLs', () => {
      const result = detector.parseUrl('https://medium.com/@username/article-title-abc123');
      expect(result).not.toBeNull();
      expect(result?.platform).toBe('medium');
      expect(result?.contentType).toBe('article');
    });

    it('should return null for unsupported URLs', () => {
      expect(detector.parseUrl('https://example.com')).toBeNull();
      expect(detector.parseUrl('https://facebook.com/user')).toBeNull();
    });
  });

  describe('isSupportedUrl', () => {
    it('should return true for supported platforms', () => {
      expect(detector.isSupportedUrl('https://youtube.com/watch?v=test')).toBe(true);
      expect(detector.isSupportedUrl('https://twitch.tv/streamer')).toBe(true);
      expect(detector.isSupportedUrl('https://medium.com/@user')).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      expect(detector.isSupportedUrl('https://vimeo.com/video')).toBe(false);
    });
  });
});

describe('SupportTracker', () => {
  // Mock database for testing
  const mockDb = {
    execute: vi.fn(),
    query: vi.fn(),
    queryOne: vi.fn(),
  };

  // Tests for session tracking, impression recording, statistics
});

describe('AdViewer', () => {
  // Tests for ad detection, viewing completion, engagement
});
```

**Why:** Ensures platform detection and core functionality works correctly.
**Dependencies:** All implementation steps
**Risk:** Low

#### Step 7.2: Integration Tests
**File:** `tests/integration/creator-support.test.ts`

```typescript
/**
 * Creator Support Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Creator Support Integration', () => {
  describe('Creator Management Flow', () => {
    it('should add a YouTube creator and fetch metadata', async () => {
      // Integration test implementation
    });

    it('should handle duplicate creator URLs', async () => {
      // Integration test implementation
    });
  });

  describe('Support Session Flow', () => {
    it('should create isolated tab for support session', async () => {
      // Integration test implementation
    });

    it('should track ad impressions during session', async () => {
      // Integration test implementation
    });
  });
});
```

**Why:** Tests end-to-end flows.
**Dependencies:** All implementation steps
**Risk:** Low

## Testing Strategy

### Unit Tests
| Component | Test Coverage Target | Priority |
|-----------|---------------------|----------|
| PlatformDetection | 100% | High |
| SupportTracker | 90% | High |
| AdViewer | 80% | Medium |
| Platform Handlers | 80% | Medium |
| SupportManager | 85% | High |

### Integration Tests  
| Flow | Description | Priority |
|------|-------------|----------|
| Add Creator | URL → Detection → Metadata → DB | High |
| Support Session | Creator → Tab → Ad Detection → Tracking | High |
| Scheduling | Schedule → Trigger → Session | Medium |
| Statistics | Sessions → Aggregation → Display | Medium |

### E2E Tests
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Full Support Flow | Add creator → Start session → View ads → Complete | Statistics updated |
| Schedule Execution | Create schedule → Wait → Auto-session | Session runs on time |

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Platform DOM changes** | High | High | Abstract selectors, implement fallback detection, regular maintenance |
| **Ad blocker interference** | Medium | Medium | Ensure tracker-blocker is disabled for support sessions |
| **Rate limiting by platforms** | Medium | High | Implement respectful delays, proxy rotation, session limits |
| **Memory leaks in long sessions** | Medium | Medium | Proper tab cleanup, session timeouts, resource monitoring |
| **Inconsistent ad detection** | Medium | Medium | Multiple detection methods, fallback strategies |

## Success Criteria

- [ ] Platform detection works for all 3 platforms (YouTube, Twitch, Medium)
- [ ] Ad detection accuracy > 90% on YouTube
- [ ] Support sessions complete without errors > 95% of the time
- [ ] Statistics accurately reflect all completed sessions
- [ ] Scheduled sessions execute within 1 minute of scheduled time
- [ ] UI is responsive and provides real-time session updates
- [ ] Memory usage per session < 300MB
- [ ] All unit tests pass with > 80% coverage

## API Reference

### IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `creator:add` | Renderer → Main | Add creator by URL |
| `creator:remove` | Renderer → Main | Remove creator |
| `creator:list` | Renderer → Main | Get all creators |
| `support:start-session` | Renderer → Main | Start support session |
| `support:stop-session` | Renderer → Main | Stop specific session |
| `support:get-statistics` | Renderer → Main | Get support statistics |
| `event:support-session-update` | Main → Renderer | Session status updates |
| `event:support-ad-detected` | Main → Renderer | Ad detection events |

### Database Tables

| Table | Purpose |
|-------|---------|
| `creators` | Store creator information |
| `support_sessions` | Track individual support sessions |
| `ad_impressions` | Record each ad view |
| `creator_support_schedules` | Store recurring schedules |

## Implementation Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Types & Detection | 2-3 days | URL parsing complete |
| Phase 2: Platform Handlers | 3-4 days | All 3 platforms implemented |
| Phase 3: Ad Viewer & Tracker | 3-4 days | Core functionality working |
| Phase 4: Support Manager | 3-4 days | Full orchestration |
| Phase 5: IPC & Frontend | 3-4 days | Frontend integration |
| Phase 6: UI Components | 4-5 days | Complete UI |
| Phase 7: Testing | 2-3 days | All tests passing |

**Total Estimated Time: 20-27 days**

---

## Appendix: Module Exports

**File:** `electron/core/creator-support/index.ts`

```typescript
/**
 * Creator Support Module Exports
 */

export * from './types';
export { PlatformDetection, platformDetection } from './platform-detection';
export { AdViewer, adViewer } from './ad-viewer';
export { SupportTracker } from './support-tracker';
export { SupportManager } from './support-manager';

// Platform handlers
export { BasePlatformHandler } from './platforms/base-platform';
export { YouTubeHandler, youtubeHandler } from './platforms/youtube-handler';
export { TwitchHandler, twitchHandler } from './platforms/twitch-handler';
export { MediumHandler, mediumHandler } from './platforms/medium-handler';
```

---

**END OF IMPLEMENTATION PLAN**
