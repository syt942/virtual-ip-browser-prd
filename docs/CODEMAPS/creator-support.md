# Creator Support Codemap (EP-007)

**Last Updated:** 2025-01-28  
**Location:** `electron/core/creator-support/`  
**Entry Point:** `index.ts`

## Overview

The Creator Support module (EP-007) enables users to support content creators on YouTube, Twitch, and Medium by intelligently viewing ads and simulating human-like engagement. This module detects platform-specific ad formats and generates realistic viewing patterns.

## Architecture

```
electron/core/creator-support/
├── index.ts              # Module exports
├── platform-detection.ts # Platform & creator ID detection
├── ad-viewer.ts          # Ad detection & viewing simulation
└── support-tracker.ts    # Creator tracking & scheduling
```

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Creator Support System                             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     PlatformDetector                              │   │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │   │
│  │  │ YouTube  │    │  Twitch  │    │  Medium  │    │ Unknown  │   │   │
│  │  │          │    │          │    │          │    │          │   │   │
│  │  │ Patterns │    │ Patterns │    │ Patterns │    │ Fallback │   │   │
│  │  │ Selectors│    │ Selectors│    │ Selectors│    │          │   │   │
│  │  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        AdViewer                                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │  Ad Detection   │  │  Watch Timer    │  │  Engagement     │   │   │
│  │  │                 │  │                 │  │  Simulation     │   │   │
│  │  │ - Video ads     │  │ - Gaussian time │  │ - Mouse moves   │   │   │
│  │  │ - Banner ads    │  │ - Skip logic    │  │ - Focus events  │   │   │
│  │  │ - Overlay ads   │  │ - Metrics       │  │ - Scroll        │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    SupportTracker & Scheduler                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │ Creator Mgmt    │  │   Analytics     │  │   Scheduling    │   │   │
│  │  │                 │  │                 │  │                 │   │   │
│  │  │ - Add/Remove    │  │ - Per-creator   │  │ - Recurring     │   │   │
│  │  │ - Platforms     │  │ - Aggregated    │  │ - Daily/Weekly  │   │   │
│  │  │ - History       │  │ - Time ranges   │  │ - One-time      │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Supported Platforms

| Platform | URL Patterns | Creator ID Extraction | Ad Types |
|----------|--------------|----------------------|----------|
| **YouTube** | `youtube.com`, `youtu.be` | `/@handle`, `/channel/`, `/c/`, `/user/` | Video, Overlay, Banner |
| **Twitch** | `twitch.tv` | `/username` | Stream ads, Banner |
| **Medium** | `medium.com`, `*.medium.com` | `/@author`, subdomain | Metered content |

## Platform Detection

### PlatformDetector Class

```typescript
type Platform = 'youtube' | 'twitch' | 'medium' | 'unknown';

interface PlatformConfig {
  adSelectors: string[];
  minWatchTime: number;
  maxWatchTime: number;
  videoSelectors: string[];
  creatorIdPatterns: RegExp[];
}

class PlatformDetector {
  // Detection
  detectPlatform(url: string): Platform;
  extractCreatorId(url: string): string | null;
  isVideoPage(url: string): boolean;
  isSupportedPlatform(url: string): boolean;
  
  // Configuration
  getPlatformConfig(platform: Platform): PlatformConfig;
  getSupportedPlatforms(): Platform[];
  getAdSelectors(platform: Platform): string[];
  getVideoSelectors(platform: Platform): string[];
}
```

### Platform-Specific Ad Selectors

```typescript
// YouTube
[
  '.ytp-ad-player-overlay',
  '.ytp-ad-overlay-container',
  '.video-ads',
  '.ytp-ad-module',
  '.ad-showing',
  '[class*="ad-interrupting"]'
]

// Twitch
[
  '.stream-ad',
  '[data-a-target="video-ad-label"]',
  '.ad-banner',
  '[class*="ad-overlay"]',
  '.video-player__ad-container'
]

// Medium
[
  '.branch-journeys-top',
  '[class*="meteredContent"]',
  '.overlay-base'
]
```

## Ad Viewer

### AdViewer Class

```typescript
interface AdViewerConfig {
  minWatchTime: number;           // Default: 5 seconds
  maxWatchTime: number;           // Default: 30 seconds
  engagementProbability: number;  // Default: 0.7 (70%)
  skipAfterMinTime: boolean;      // Default: true
}

interface AdDetectionResult {
  detected: boolean;
  adType: 'video' | 'banner' | 'overlay' | 'none';
  selectors: string[];
  skipAvailable: boolean;
}

interface EngagementAction {
  type: 'mousemove' | 'focus' | 'scroll' | 'hover' | 'click';
  delay: number;
  target?: string;
  data?: Record<string, any>;
}

interface AdMetrics {
  totalAdsViewed: number;
  totalWatchTime: number;
  avgWatchTime: number;
  engagementRate: number;
  skippedAds: number;
  completedAds: number;
}

class AdViewer {
  // Configuration
  getConfig(): AdViewerConfig;
  
  // Watch time generation (Gaussian distribution)
  generateWatchTime(min?: number, max?: number): number;
  
  // Ad detection
  detectAds(pageContent: PageContent, platform: Platform): AdDetectionResult;
  
  // Engagement simulation
  simulateEngagement(platform: Platform): EngagementAction[];
  
  // Skip logic
  shouldSkipAd(elapsedTime: number, minWatchTime: number): boolean;
  
  // Viewing sequence
  generateViewingSequence(adDuration: number): ViewingStep[];
  
  // Metrics
  recordAdView(watchTime: number, engaged: boolean, skipped?: boolean): void;
  getAdMetrics(): AdMetrics;
  resetMetrics(): void;
}
```

### Engagement Action Flow

```
Ad Detected
    │
    ▼
┌─────────────────┐
│ Initial Focus   │ (100-300ms delay)
│ target: window  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mouse Movements │ (3-7 movements, 500-2500ms each)
│ random positions│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Optional Hover  │ (40% probability, 300-800ms)
│ over video area │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Optional Scroll │ (30% probability, 1000-2500ms)
│ small amount    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Final Focus     │ (500-1500ms)
│ target: video   │
└─────────────────┘
```

## Support Tracker & Scheduler

### SupportTracker Class

```typescript
interface TrackedCreator {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  addedAt: Date;
  lastSupported?: Date;
  supportCount: number;
  totalWatchTime: number;
  notes?: string;
}

interface SupportAnalytics {
  totalCreators: number;
  totalSupportSessions: number;
  totalWatchTime: number;
  averageWatchTimePerSession: number;
  platformBreakdown: Record<Platform, number>;
}

class SupportTracker extends EventEmitter {
  // Creator management
  addCreator(input: CreatorInput): TrackedCreator;
  removeCreator(id: string): boolean;
  getCreator(id: string): TrackedCreator | undefined;
  getAllCreators(): TrackedCreator[];
  getCreatorsByPlatform(platform: Platform): TrackedCreator[];
  
  // Support recording
  recordSupport(creatorId: string, watchTime: number): void;
  
  // Analytics
  getAnalytics(): SupportAnalytics;
  getCreatorAnalytics(creatorId: string): CreatorAnalytics;
  
  // Events emitted:
  // - 'creator:added', 'creator:removed', 'support:recorded', 'tracker:reset'
}
```

### CreatorSupportScheduler Class

```typescript
type SupportScheduleType = 'recurring' | 'daily' | 'weekly' | 'one-time';

interface SupportSchedule {
  id: string;
  creatorId: string;
  type: SupportScheduleType;
  intervalMinutes?: number;    // For 'recurring'
  timeOfDay?: string;          // "HH:mm" for 'daily'/'weekly'
  daysOfWeek?: number[];       // 0-6 for 'weekly'
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
}

class CreatorSupportScheduler extends EventEmitter {
  // Schedule management
  addSupportSchedule(input: SupportScheduleInput): SupportSchedule;
  getSchedule(id: string): SupportSchedule | undefined;
  getSupportSchedules(): SupportSchedule[];
  getSchedulesForCreator(creatorId: string): SupportSchedule[];
  removeSupportSchedule(id: string): boolean;
  updateSchedule(id: string, updates: Partial<SupportScheduleInput>): SupportSchedule;
  
  // Enable/Disable
  enableSchedule(id: string): boolean;
  disableSchedule(id: string): boolean;
  
  // Timing
  calculateNextRun(scheduleId: string): Date | null;
  
  // Lifecycle
  start(): void;
  stop(): void;
  
  // Events emitted:
  // - 'schedule:added', 'schedule:removed', 'schedule:updated'
  // - 'schedule:enabled', 'schedule:disabled', 'schedule:execute'
  // - 'scheduler:started', 'scheduler:stopped'
}
```

## Usage Examples

### Basic Platform Detection
```typescript
const detector = new PlatformDetector();

// Detect platform
const platform = detector.detectPlatform('https://www.youtube.com/watch?v=abc123');
// Returns: 'youtube'

// Extract creator ID
const creatorId = detector.extractCreatorId('https://www.youtube.com/@MrBeast');
// Returns: '@MrBeast'

// Check if video page
const isVideo = detector.isVideoPage('https://www.twitch.tv/ninja');
// Returns: true
```

### Ad Detection & Viewing
```typescript
const adViewer = new AdViewer({
  minWatchTime: 5,
  maxWatchTime: 25,
  engagementProbability: 0.8
});

// Detect ads on page
const detection = adViewer.detectAds({
  selectors: ['.ytp-ad-player-overlay', '.video-ads'],
  html: '<div class="ad-showing">...</div>'
}, 'youtube');
// Returns: { detected: true, adType: 'video', ... }

// Generate engagement actions
const actions = adViewer.simulateEngagement('youtube');
// Returns array of engagement actions to execute

// Generate viewing sequence
const sequence = adViewer.generateViewingSequence(30);
// Returns: [{ action: 'start', timestamp: 0 }, { action: 'engagement', ... }]
```

### Creator Tracking
```typescript
const tracker = new SupportTracker();

// Add creator
const creator = tracker.addCreator({
  name: 'Tech Channel',
  platform: 'youtube',
  url: 'https://www.youtube.com/@TechChannel'
});

// Record support
tracker.recordSupport(creator.id, 25.5); // 25.5 seconds watched

// Get analytics
const analytics = tracker.getAnalytics();
// { totalCreators: 1, totalSupportSessions: 1, totalWatchTime: 25.5, ... }
```

### Scheduling Support
```typescript
const scheduler = new CreatorSupportScheduler();

// Daily support at 9 AM
scheduler.addSupportSchedule({
  creatorId: creator.id,
  type: 'daily',
  timeOfDay: '09:00',
  enabled: true
});

// Weekly support on weekdays
scheduler.addSupportSchedule({
  creatorId: creator.id,
  type: 'weekly',
  timeOfDay: '18:00',
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
  enabled: true
});

// Start scheduler
scheduler.start();

// Listen for execution
scheduler.on('schedule:execute', (schedule) => {
  console.log(`Supporting creator ${schedule.creatorId}`);
});
```

## Metrics & Analytics

### Per-Session Metrics
```typescript
const metrics = adViewer.getAdMetrics();
// {
//   totalAdsViewed: 15,
//   totalWatchTime: 287.5,
//   avgWatchTime: 19.2,
//   engagementRate: 73.3,
//   skippedAds: 4,
//   completedAds: 11
// }
```

### Platform Breakdown
```typescript
const analytics = tracker.getAnalytics();
// {
//   platformBreakdown: {
//     youtube: 10,
//     twitch: 3,
//     medium: 2
//   }
// }
```

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   URL       │────►│ PlatformDetector │────►│ Platform Config   │
│   Input     │     │                  │     │                   │
└─────────────┘     │ - detectPlatform │     │ - Ad selectors    │
                    │ - extractCreatorId│    │ - Video selectors │
                    └──────────────────┘     └─────────┬─────────┘
                                                       │
                    ┌──────────────────┐               │
                    │   Page Content   │◄──────────────┘
                    │   Analysis       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    AdViewer      │
                    │                  │
                    │ - Detect ads     │
                    │ - Generate time  │
                    │ - Simulate engage│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  SupportTracker  │
                    │                  │
                    │ - Record support │
                    │ - Analytics      │
                    └──────────────────┘
```

## Related Modules

- [Automation](./automation.md) - Behavior simulation for engagement
- [Proxy Engine](./proxy-engine.md) - Geographic proxy selection for platform access
- [Translation](./translation.md) - Multi-language platform support

---

*See `electron/core/creator-support/` for full implementation details.*
