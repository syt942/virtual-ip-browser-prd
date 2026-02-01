/**
 * Creator Test Fixtures
 * Reusable test data for creator support tests
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Platform = 'youtube' | 'twitch' | 'blog' | 'website';
export type SupportMethod = 'ads' | 'visits' | 'content';

export interface Creator {
  id: string;
  name: string;
  url: string;
  platform: Platform;
  thumbnailUrl?: string;
  supportMethods: SupportMethod[];
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
  startTime: Date;
  endTime?: Date;
  adsViewed: number;
  pagesVisited: number;
  totalDuration: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// SAMPLE CREATORS
// ============================================================================

export const sampleCreators: Omit<Creator, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'TechChannel',
    url: 'https://youtube.com/@techchannel',
    platform: 'youtube',
    thumbnailUrl: 'https://example.com/thumb1.jpg',
    supportMethods: ['ads', 'content'],
    enabled: true,
    priority: 10,
    totalSupports: 50,
    totalAdsViewed: 150,
  },
  {
    name: 'GamingStreamer',
    url: 'https://twitch.tv/gamingstreamer',
    platform: 'twitch',
    thumbnailUrl: 'https://example.com/thumb2.jpg',
    supportMethods: ['ads', 'visits'],
    enabled: true,
    priority: 8,
    totalSupports: 30,
    totalAdsViewed: 90,
  },
  {
    name: 'DevBlog',
    url: 'https://devblog.example.com',
    platform: 'blog',
    supportMethods: ['ads', 'visits'],
    enabled: true,
    priority: 5,
    totalSupports: 20,
    totalAdsViewed: 40,
  },
  {
    name: 'Portfolio Site',
    url: 'https://portfolio.example.com',
    platform: 'website',
    supportMethods: ['visits'],
    enabled: false,
    priority: 1,
    totalSupports: 5,
    totalAdsViewed: 0,
  },
];

// ============================================================================
// PLATFORM-SPECIFIC URLS
// ============================================================================

export const platformUrls = {
  youtube: [
    'https://youtube.com/@channel1',
    'https://www.youtube.com/channel/UC123456',
    'https://youtube.com/c/ChannelName',
    'https://youtu.be/video123',
  ],
  twitch: [
    'https://twitch.tv/streamer1',
    'https://www.twitch.tv/streamer2',
    'https://twitch.tv/videos/123456',
  ],
  blog: [
    'https://blog.example.com',
    'https://medium.com/@author',
    'https://dev.to/username',
    'https://hashnode.dev/@user',
  ],
  website: [
    'https://example.com',
    'https://portfolio.dev',
    'https://mysite.io',
  ],
};

// ============================================================================
// INVALID URLS (for validation tests)
// ============================================================================

export const invalidCreatorUrls = [
  { url: '', reason: 'Empty URL' },
  { url: 'not-a-url', reason: 'Invalid format' },
  { url: 'http://', reason: 'No host' },
  { url: 'javascript:alert(1)', reason: 'JavaScript protocol' },
  { url: 'file:///etc/passwd', reason: 'File protocol' },
  { url: 'ftp://example.com', reason: 'FTP protocol' },
];

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let creatorIdCounter = 0;
let sessionIdCounter = 0;

/**
 * Create a mock creator with optional overrides
 */
export function createMockCreator(overrides: Partial<Creator> = {}): Creator {
  const id = overrides.id || `creator-${Date.now()}-${creatorIdCounter++}`;
  const now = new Date();
  
  return {
    id,
    name: `Test Creator ${creatorIdCounter}`,
    url: `https://youtube.com/@testcreator${creatorIdCounter}`,
    platform: 'youtube',
    supportMethods: ['ads', 'visits'],
    enabled: true,
    priority: 5,
    totalSupports: 0,
    totalAdsViewed: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple mock creators
 */
export function createMockCreators(
  count: number,
  overrides: Partial<Creator> = {}
): Creator[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCreator({
      name: `Creator ${i + 1}`,
      priority: count - i, // Higher priority for earlier creators
      ...overrides,
    })
  );
}

/**
 * Create creators for each platform
 */
export function createPlatformCreators(): Creator[] {
  const platforms: Platform[] = ['youtube', 'twitch', 'blog', 'website'];
  return platforms.map((platform, i) =>
    createMockCreator({
      name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Creator`,
      platform,
      url: platformUrls[platform][0],
      priority: 4 - i,
    })
  );
}

/**
 * Create a mock support session
 */
export function createMockSupportSession(
  creatorId: string,
  overrides: Partial<SupportSession> = {}
): SupportSession {
  const id = `session-${Date.now()}-${sessionIdCounter++}`;
  const startTime = new Date(Date.now() - 60000);
  const endTime = new Date();
  
  return {
    id,
    creatorId,
    startTime,
    endTime,
    adsViewed: 2,
    pagesVisited: 3,
    totalDuration: 60,
    success: true,
    ...overrides,
  };
}

/**
 * Create a failed support session
 */
export function createFailedSupportSession(
  creatorId: string,
  error: string
): SupportSession {
  return createMockSupportSession(creatorId, {
    adsViewed: 0,
    pagesVisited: 1,
    totalDuration: 10,
    success: false,
    error,
  });
}

/**
 * Reset creator ID counter (call in beforeEach)
 */
export function resetCreatorFixtures(): void {
  creatorIdCounter = 0;
  sessionIdCounter = 0;
}

// ============================================================================
// AD DETECTION PATTERNS (for testing ad detection)
// ============================================================================

export const adPatterns = {
  youtube: {
    videoAd: '.ytp-ad-player-overlay',
    displayAd: '.ytd-display-ad-renderer',
    skipButton: '.ytp-ad-skip-button',
    adBadge: '.ytp-ad-badge',
  },
  twitch: {
    videoAd: '.video-player__ad-container',
    preroll: '[data-a-target="video-ad-label"]',
  },
  generic: {
    iframe: 'iframe[src*="ad"]',
    googleAd: 'ins.adsbygoogle',
    banner: '[class*="ad-banner"]',
  },
};

// ============================================================================
// SUPPORT SCENARIOS
// ============================================================================

export const supportScenarios = [
  {
    name: 'Successful YouTube ad view',
    platform: 'youtube' as Platform,
    adsExpected: 2,
    durationExpected: 45,
    success: true,
  },
  {
    name: 'Twitch stream with pre-roll',
    platform: 'twitch' as Platform,
    adsExpected: 1,
    durationExpected: 30,
    success: true,
  },
  {
    name: 'Blog page visit',
    platform: 'blog' as Platform,
    adsExpected: 3,
    durationExpected: 20,
    success: true,
  },
  {
    name: 'Ad blocker detected',
    platform: 'youtube' as Platform,
    adsExpected: 0,
    durationExpected: 5,
    success: false,
    error: 'Ad blocker detected on page',
  },
  {
    name: 'Page load timeout',
    platform: 'website' as Platform,
    adsExpected: 0,
    durationExpected: 30,
    success: false,
    error: 'Page load timeout',
  },
];
