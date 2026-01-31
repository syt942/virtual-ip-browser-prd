/**
 * E2E Test Fixtures
 * Reusable test data for E2E tests
 */

/**
 * Test proxy configurations
 */
export const testProxies = {
  http: {
    host: 'proxy.test.com',
    port: 8080,
    type: 'http' as const,
    name: 'Test HTTP Proxy',
  },
  socks5: {
    host: 'socks.test.com',
    port: 1080,
    type: 'socks5' as const,
    name: 'Test SOCKS5 Proxy',
  },
  authenticated: {
    host: 'auth-proxy.test.com',
    port: 8080,
    type: 'http' as const,
    name: 'Authenticated Proxy',
    username: 'testuser',
    password: 'testpass',
  },
};

/**
 * Test keywords for automation
 */
export const testKeywords = [
  'test keyword 1',
  'test keyword 2',
  'test keyword 3',
  'automation test',
  'search query example',
];

/**
 * Test domains for targeting
 */
export const testDomains = [
  'example.com',
  'test.com',
  'demo.example.org',
  'sample-site.net',
];

/**
 * Creator platform domains
 */
export const creatorDomains = [
  'youtube.com',
  'twitch.tv',
  'patreon.com',
  'ko-fi.com',
];

/**
 * Rotation strategies
 */
export const rotationStrategies = [
  'round-robin',
  'random',
  'least-used',
  'fastest',
  'failure-aware',
  'weighted',
] as const;

export type RotationStrategy = typeof rotationStrategies[number];

/**
 * Search engines
 */
export const searchEngines = [
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'brave',
] as const;

export type SearchEngine = typeof searchEngines[number];

/**
 * Privacy protection options
 */
export const privacyOptions = {
  fingerprint: ['canvas', 'webgl', 'audio', 'navigator'] as const,
  protection: ['webrtc', 'tracker', 'timezone'] as const,
};

/**
 * Log levels for activity log filtering
 */
export const logLevels = [
  'all',
  'debug',
  'info',
  'warning',
  'error',
  'success',
] as const;

/**
 * Log categories for activity log filtering
 */
export const logCategories = [
  'all',
  'proxy',
  'automation',
  'privacy',
  'system',
  'navigation',
] as const;

/**
 * Panel types
 */
export const panelTypes = [
  'proxy',
  'privacy',
  'automation',
  'activity',
  'stats',
  'settings',
] as const;

export type PanelType = typeof panelTypes[number];

/**
 * Test timeouts (in milliseconds)
 */
export const testTimeouts = {
  short: 1000,
  medium: 5000,
  long: 10000,
  navigation: 30000,
  animation: 300,
};

/**
 * Generate unique test data with timestamp
 */
export function generateUniqueKeyword(prefix = 'keyword'): string {
  return `${prefix}-${Date.now()}`;
}

export function generateUniqueDomain(prefix = 'test'): string {
  return `${prefix}-${Date.now()}.com`;
}

/**
 * Wait helpers for consistent timing
 */
export const waitTimes = {
  panelAnimation: 200,
  networkIdle: 500,
  stateUpdate: 100,
  chartRender: 1000,
};
