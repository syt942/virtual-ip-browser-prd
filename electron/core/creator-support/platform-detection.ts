/**
 * Platform Detection Module (EP-007)
 * Detects creator platforms (YouTube, Twitch, Medium) from URLs
 */

export type Platform = 'youtube' | 'twitch' | 'medium' | 'unknown';

export interface PlatformConfig {
  adSelectors: string[];
  minWatchTime: number;
  maxWatchTime: number;
  videoSelectors: string[];
  creatorIdPatterns: RegExp[];
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  youtube: {
    adSelectors: [
      '.ytp-ad-player-overlay',
      '.ytp-ad-overlay-container',
      '.video-ads',
      '.ytp-ad-module',
      '.ytp-ad-text',
      '.ad-showing',
      '[class*="ad-interrupting"]'
    ],
    minWatchTime: 5,
    maxWatchTime: 30,
    videoSelectors: [
      '.html5-video-player',
      'video.html5-main-video',
      '#movie_player'
    ],
    creatorIdPatterns: [
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/user\/([^\/\?]+)/
    ]
  },
  twitch: {
    adSelectors: [
      '.stream-ad',
      '[data-a-target="video-ad-label"]',
      '.ad-banner',
      '[class*="ad-overlay"]',
      '.video-player__ad-container'
    ],
    minWatchTime: 5,
    maxWatchTime: 30,
    videoSelectors: [
      '.video-player',
      'video',
      '[data-a-target="video-player"]'
    ],
    creatorIdPatterns: [
      /twitch\.tv\/([^\/\?]+)/
    ]
  },
  medium: {
    adSelectors: [
      '.branch-journeys-top',
      '[class*="meteredContent"]',
      '.overlay-base'
    ],
    minWatchTime: 5,
    maxWatchTime: 30,
    videoSelectors: [],
    creatorIdPatterns: [
      /medium\.com\/@([^\/\?]+)/,
      /([^\.]+)\.medium\.com/
    ]
  },
  unknown: {
    adSelectors: [],
    minWatchTime: 5,
    maxWatchTime: 30,
    videoSelectors: [],
    creatorIdPatterns: []
  }
};

export class PlatformDetector {
  private platformPatterns: Map<Platform, RegExp[]>;

  constructor() {
    this.platformPatterns = new Map([
      ['youtube', [
        /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i
      ]],
      ['twitch', [
        /^https?:\/\/(www\.)?twitch\.tv/i
      ]],
      ['medium', [
        /^https?:\/\/(www\.)?medium\.com/i,
        /^https?:\/\/[^\/]*\.medium\.com/i
      ]]
    ]);
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): Platform {
    if (!url || typeof url !== 'string') {
      return 'unknown';
    }

    try {
      // Validate URL format
      new URL(url);
    } catch (error) {
      // Invalid URL format - return unknown platform
      console.debug('[PlatformDetection] Invalid URL format:', url.substring(0, 50),
        error instanceof Error ? error.message : 'Parse error');
      return 'unknown';
    }

    for (const [platform, patterns] of this.platformPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(url)) {
          return platform;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Extract creator ID from URL
   */
  extractCreatorId(url: string): string | null {
    const platform = this.detectPlatform(url);
    if (platform === 'unknown') {
      return null;
    }

    const config = PLATFORM_CONFIGS[platform];
    for (const pattern of config.creatorIdPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // For YouTube @ handles, preserve the @ symbol
        if (platform === 'youtube' && url.includes('/@')) {
          return '@' + match[1];
        }
        // For Medium @ authors, preserve the @ symbol
        if (platform === 'medium' && url.includes('/@')) {
          return '@' + match[1];
        }
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(platform: Platform | string): PlatformConfig {
    if (platform in PLATFORM_CONFIGS) {
      return { ...PLATFORM_CONFIGS[platform as Platform] };
    }
    return { ...PLATFORM_CONFIGS.unknown };
  }

  /**
   * Check if URL is a video/stream page
   */
  isVideoPage(url: string): boolean {
    const platform = this.detectPlatform(url);

    switch (platform) {
      case 'youtube':
        // YouTube video pages contain /watch?v=
        return /youtube\.com\/watch\?v=/.test(url) || /youtu\.be\//.test(url);
      
      case 'twitch':
        // Twitch stream pages are direct channel URLs (not /directory, /settings, etc.)
        if (/twitch\.tv\/(directory|settings|subscriptions|inventory|drops|wallet)/i.test(url)) {
          return false;
        }
        return /twitch\.tv\/[^\/]+\/?$/.test(url);
      
      case 'medium':
        // Medium article pages
        return /medium\.com\/@[^\/]+\/[^\/]+/.test(url) || 
               /[^\.]+\.medium\.com\/[^\/]+/.test(url);
      
      default:
        return false;
    }
  }

  /**
   * Get list of supported platforms
   */
  getSupportedPlatforms(): Platform[] {
    return ['youtube', 'twitch', 'medium'];
  }

  /**
   * Validate if a URL belongs to a supported platform
   */
  isSupportedPlatform(url: string): boolean {
    return this.detectPlatform(url) !== 'unknown';
  }

  /**
   * Get ad selectors for a platform
   */
  getAdSelectors(platform: Platform): string[] {
    return [...PLATFORM_CONFIGS[platform].adSelectors];
  }

  /**
   * Get video selectors for a platform
   */
  getVideoSelectors(platform: Platform): string[] {
    return [...PLATFORM_CONFIGS[platform].videoSelectors];
  }
}

export { PLATFORM_CONFIGS };
