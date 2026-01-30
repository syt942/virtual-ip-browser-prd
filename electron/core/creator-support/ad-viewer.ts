/**
 * Ad Viewer Module (EP-007)
 * Handles ad detection, viewing automation, and engagement simulation
 */

import { PlatformDetector, Platform } from './platform-detection';
// PLATFORM_CONFIGS is used internally by PlatformDetector

export interface AdViewerConfig {
  minWatchTime: number;
  maxWatchTime: number;
  engagementProbability: number;
  skipAfterMinTime: boolean;
}

export interface AdDetectionResult {
  detected: boolean;
  adType: 'video' | 'banner' | 'overlay' | 'none';
  selectors: string[];
  skipAvailable: boolean;
}

export interface EngagementAction {
  type: 'mousemove' | 'focus' | 'scroll' | 'hover' | 'click';
  delay: number;
  target?: string;
  data?: Record<string, any>;
}

export interface AdMetrics {
  totalAdsViewed: number;
  totalWatchTime: number;
  avgWatchTime: number;
  engagementRate: number;
  skippedAds: number;
  completedAds: number;
}

interface AdViewRecord {
  watchTime: number;
  engaged: boolean;
  skipped: boolean;
  timestamp: number;
}

const DEFAULT_CONFIG: AdViewerConfig = {
  minWatchTime: 5,
  maxWatchTime: 30,
  engagementProbability: 0.7,
  skipAfterMinTime: true
};

export class AdViewer {
  private config: AdViewerConfig;
  private platformDetector: PlatformDetector;
  private adViewHistory: AdViewRecord[];

  constructor(config: Partial<AdViewerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.platformDetector = new PlatformDetector();
    this.adViewHistory = [];
  }

  /**
   * Get current configuration
   */
  getConfig(): AdViewerConfig {
    return { ...this.config };
  }

  /**
   * Generate watch time within bounds
   */
  generateWatchTime(min?: number, max?: number): number {
    const minTime = min ?? this.config.minWatchTime;
    const maxTime = max ?? this.config.maxWatchTime;
    
    // Use gaussian distribution for more natural timing
    const mean = (minTime + maxTime) / 2;
    const stdDev = (maxTime - minTime) / 4;
    
    let time = this.gaussianRandom(mean, stdDev);
    time = Math.max(minTime, Math.min(maxTime, time));
    
    return time;
  }

  /**
   * Gaussian random number generator (Box-Muller transform)
   */
  private gaussianRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Detect ads in page content
   */
  detectAds(pageContent: { selectors: string[]; html: string }, platform: Platform | string): AdDetectionResult {
    const platformConfig = this.platformDetector.getPlatformConfig(platform as Platform);
    const detectedSelectors: string[] = [];
    let adType: AdDetectionResult['adType'] = 'none';
    let skipAvailable = false;

    // Check for ad selectors in page content
    for (const adSelector of platformConfig.adSelectors) {
      // Check if selector exists in the provided selectors array
      if (pageContent.selectors.some(s => s.includes(adSelector.replace('.', '')) || s === adSelector)) {
        detectedSelectors.push(adSelector);
      }
      // Check if selector class/id exists in HTML
      const selectorName = adSelector.replace(/^[.#]/, '');
      if (pageContent.html.includes(selectorName)) {
        if (!detectedSelectors.includes(adSelector)) {
          detectedSelectors.push(adSelector);
        }
      }
    }

    // Determine ad type based on detected selectors
    if (detectedSelectors.length > 0) {
      if (detectedSelectors.some(s => 
        s.includes('video') || 
        s.includes('player') || 
        s.includes('stream') ||
        s.includes('ad-showing') ||
        s.includes('ytp-ad')
      )) {
        adType = 'video';
      } else if (detectedSelectors.some(s => s.includes('overlay'))) {
        adType = 'overlay';
      } else {
        adType = 'banner';
      }

      // Check for skip button availability (YouTube specific)
      skipAvailable = pageContent.html.includes('ytp-ad-skip') || 
                      pageContent.html.includes('skip-button') ||
                      pageContent.selectors.some(s => s.includes('skip'));
    }

    return {
      detected: detectedSelectors.length > 0,
      adType,
      selectors: detectedSelectors,
      skipAvailable
    };
  }

  /**
   * Simulate user engagement during ad viewing
   */
  simulateEngagement(platform: Platform | string): EngagementAction[] {
    const actions: EngagementAction[] = [];
    let totalDelay = 0;

    // Initial focus event
    actions.push({
      type: 'focus',
      delay: 100 + Math.random() * 200,
      target: 'window'
    });
    totalDelay += actions[actions.length - 1].delay;

    // Add mouse movements (3-7 movements)
    const moveCount = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < moveCount; i++) {
      actions.push({
        type: 'mousemove',
        delay: 500 + Math.random() * 2000,
        data: {
          x: Math.floor(Math.random() * 800) + 100,
          y: Math.floor(Math.random() * 500) + 100
        }
      });
      totalDelay += actions[actions.length - 1].delay;
    }

    // Occasional hover over video area
    if (Math.random() < 0.4) {
      actions.push({
        type: 'hover',
        delay: 300 + Math.random() * 500,
        target: platform === 'youtube' ? '.ytp-chrome-bottom' : '.video-player'
      });
    }

    // Occasional scroll (simulating looking at related content)
    if (Math.random() < 0.3) {
      actions.push({
        type: 'scroll',
        delay: 1000 + Math.random() * 1500,
        data: {
          deltaY: 50 + Math.floor(Math.random() * 100)
        }
      });
    }

    // Another focus event to ensure engagement is tracked
    actions.push({
      type: 'focus',
      delay: 500 + Math.random() * 1000,
      target: 'video'
    });

    return actions;
  }

  /**
   * Determine if ad should be skipped
   */
  shouldSkipAd(elapsedTime: number, minWatchTime: number): boolean {
    // Never skip before minimum watch time
    if (elapsedTime < minWatchTime) {
      return false;
    }

    // Always skip if past max watch time
    if (elapsedTime >= this.config.maxWatchTime) {
      return true;
    }

    // After min time, probabilistically decide to skip
    // Probability increases as time goes on
    const timeRatio = (elapsedTime - minWatchTime) / (this.config.maxWatchTime - minWatchTime);
    const skipProbability = 0.3 + (timeRatio * 0.5);
    
    return Math.random() < skipProbability;
  }

  /**
   * Record an ad view
   */
  recordAdView(watchTime: number, engaged: boolean, skipped: boolean = false): void {
    this.adViewHistory.push({
      watchTime,
      engaged,
      skipped,
      timestamp: Date.now()
    });
  }

  /**
   * Get ad viewing metrics
   */
  getAdMetrics(): AdMetrics {
    const totalAdsViewed = this.adViewHistory.length;
    const totalWatchTime = this.adViewHistory.reduce((sum, record) => sum + record.watchTime, 0);
    const engagedAds = this.adViewHistory.filter(r => r.engaged).length;
    const skippedAds = this.adViewHistory.filter(r => r.skipped).length;
    const completedAds = this.adViewHistory.filter(r => !r.skipped).length;

    return {
      totalAdsViewed,
      totalWatchTime,
      avgWatchTime: totalAdsViewed > 0 ? totalWatchTime / totalAdsViewed : 0,
      engagementRate: totalAdsViewed > 0 ? (engagedAds / totalAdsViewed) * 100 : 0,
      skippedAds,
      completedAds
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.adViewHistory = [];
  }

  /**
   * Generate timing sequence for ad viewing
   */
  generateViewingSequence(adDuration: number): { action: string; timestamp: number }[] {
    const sequence: { action: string; timestamp: number }[] = [];
    const watchTime = Math.min(adDuration, this.generateWatchTime());

    sequence.push({ action: 'start', timestamp: 0 });

    // Add engagement checkpoints
    const checkpoints = [0.25, 0.5, 0.75].filter(p => p * watchTime >= 1);
    for (const checkpoint of checkpoints) {
      if (Math.random() < this.config.engagementProbability) {
        sequence.push({
          action: 'engagement',
          timestamp: Math.floor(checkpoint * watchTime * 1000)
        });
      }
    }

    // Add skip or complete
    if (watchTime < adDuration && this.config.skipAfterMinTime && watchTime >= this.config.minWatchTime) {
      sequence.push({ action: 'skip', timestamp: watchTime * 1000 });
    } else {
      sequence.push({ action: 'complete', timestamp: watchTime * 1000 });
    }

    return sequence.sort((a, b) => a.timestamp - b.timestamp);
  }
}
