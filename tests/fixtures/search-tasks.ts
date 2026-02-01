/**
 * Search Task Test Fixtures
 * Reusable test data for search automation tests
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'yahoo' | 'brave';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SearchTask {
  id: string;
  sessionId: string;
  keyword: string;
  engine: SearchEngine;
  status: TaskStatus;
  retryCount: number;
  results?: SearchResult[];
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  proxyId?: string;
  position?: number | null;
  createdAt: Date;
}

export interface SearchResult {
  position: number;
  title: string;
  url: string;
  description: string;
  isTargetDomain: boolean;
}

export interface SearchConfig {
  keywords: string[];
  engine: SearchEngine;
  targetDomains: string[];
  maxRetries: number;
  delayBetweenSearches: number;
  useRandomProxy: boolean;
  clickThrough: boolean;
  simulateHumanBehavior: boolean;
}

// ============================================================================
// VALID CONFIGURATIONS
// ============================================================================

export const validSearchConfigs: SearchConfig[] = [
  {
    keywords: ['best coffee shops', 'coffee near me', 'specialty coffee'],
    engine: 'google',
    targetDomains: ['coffeeshop.com', 'bestcoffee.com'],
    maxRetries: 3,
    delayBetweenSearches: 3000,
    useRandomProxy: true,
    clickThrough: true,
    simulateHumanBehavior: true,
  },
  {
    keywords: ['web development tutorial'],
    engine: 'bing',
    targetDomains: ['developer.mozilla.org'],
    maxRetries: 5,
    delayBetweenSearches: 5000,
    useRandomProxy: false,
    clickThrough: false,
    simulateHumanBehavior: true,
  },
  {
    keywords: ['privacy browser', 'anonymous browsing'],
    engine: 'duckduckgo',
    targetDomains: [],
    maxRetries: 2,
    delayBetweenSearches: 2000,
    useRandomProxy: true,
    clickThrough: false,
    simulateHumanBehavior: false,
  },
];

// ============================================================================
// SAMPLE KEYWORDS
// ============================================================================

export const sampleKeywords = {
  seo: [
    'best seo tools 2024',
    'keyword research guide',
    'backlink checker free',
    'site audit tool',
    'rank tracking software',
  ],
  ecommerce: [
    'best running shoes',
    'wireless earbuds review',
    'laptop deals 2024',
    'smartphone comparison',
    'gaming keyboard mechanical',
  ],
  local: [
    'pizza delivery near me',
    'dentist open saturday',
    'car repair shop reviews',
    'gym membership prices',
    'pet grooming services',
  ],
  longTail: [
    'how to fix slow computer windows 11',
    'best budget smartphone under 500 dollars',
    'learn python programming for beginners free',
    'healthy meal prep ideas for weight loss',
    'remote work from home jobs no experience',
  ],
};

// ============================================================================
// SAMPLE SEARCH RESULTS
// ============================================================================

export const sampleSearchResults: SearchResult[] = [
  {
    position: 1,
    title: 'Best Coffee Shops in Your Area - CoffeeShop.com',
    url: 'https://coffeeshop.com/best-near-you',
    description: 'Discover the best coffee shops with our comprehensive guide...',
    isTargetDomain: true,
  },
  {
    position: 2,
    title: 'Top 10 Coffee Places - CoffeeReviews',
    url: 'https://coffeereviews.com/top-10',
    description: 'Our expert reviewers tested hundreds of coffee shops...',
    isTargetDomain: false,
  },
  {
    position: 3,
    title: 'Find Coffee Near You - Google Maps',
    url: 'https://maps.google.com/coffee',
    description: 'Search for coffee shops, cafes, and espresso bars nearby...',
    isTargetDomain: false,
  },
  {
    position: 4,
    title: 'Specialty Coffee Guide - BestCoffee.com',
    url: 'https://bestcoffee.com/specialty-guide',
    description: 'Everything you need to know about specialty coffee...',
    isTargetDomain: true,
  },
  {
    position: 5,
    title: 'Coffee Shop Reviews and Ratings',
    url: 'https://yelp.com/coffee-shops',
    description: 'Read reviews and ratings from real customers...',
    isTargetDomain: false,
  },
];

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let taskIdCounter = 0;
let sessionIdCounter = 0;

/**
 * Create a mock search task with optional overrides
 */
export function createMockSearchTask(overrides: Partial<SearchTask> = {}): SearchTask {
  const id = overrides.id || `task-${Date.now()}-${taskIdCounter++}`;
  const sessionId = overrides.sessionId || `session-${sessionIdCounter}`;
  
  return {
    id,
    sessionId,
    keyword: 'test keyword',
    engine: 'google',
    status: 'queued',
    retryCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple mock search tasks
 */
export function createMockSearchTasks(
  count: number,
  overrides: Partial<SearchTask> = {}
): SearchTask[] {
  sessionIdCounter++;
  return Array.from({ length: count }, (_, i) =>
    createMockSearchTask({
      keyword: `keyword ${i + 1}`,
      ...overrides,
    })
  );
}

/**
 * Create a completed task with results
 */
export function createCompletedTask(
  keyword: string,
  results: SearchResult[],
  overrides: Partial<SearchTask> = {}
): SearchTask {
  const startTime = new Date(Date.now() - 5000);
  const endTime = new Date();
  
  return createMockSearchTask({
    keyword,
    status: 'completed',
    results,
    startTime,
    endTime,
    duration: endTime.getTime() - startTime.getTime(),
    ...overrides,
  });
}

/**
 * Create a failed task with error
 */
export function createFailedTask(
  keyword: string,
  error: string,
  overrides: Partial<SearchTask> = {}
): SearchTask {
  return createMockSearchTask({
    keyword,
    status: 'failed',
    error,
    retryCount: 3,
    ...overrides,
  });
}

/**
 * Create tasks with various statuses for testing
 */
export function createMixedStatusTasks(): SearchTask[] {
  sessionIdCounter++;
  const sessionId = `session-${sessionIdCounter}`;
  
  return [
    createMockSearchTask({ sessionId, keyword: 'queued task', status: 'queued' }),
    createMockSearchTask({ sessionId, keyword: 'running task', status: 'running' }),
    createCompletedTask('completed task', sampleSearchResults.slice(0, 3), { sessionId }),
    createFailedTask('failed task', 'Connection timeout', { sessionId }),
    createMockSearchTask({ sessionId, keyword: 'cancelled task', status: 'cancelled' }),
  ];
}

/**
 * Create a search config with optional overrides
 */
export function createSearchConfig(overrides: Partial<SearchConfig> = {}): SearchConfig {
  return {
    keywords: ['test keyword'],
    engine: 'google',
    targetDomains: ['example.com'],
    maxRetries: 3,
    delayBetweenSearches: 3000,
    useRandomProxy: false,
    clickThrough: false,
    simulateHumanBehavior: true,
    ...overrides,
  };
}

/**
 * Reset task ID counter (call in beforeEach)
 */
export function resetSearchTaskFixtures(): void {
  taskIdCounter = 0;
  sessionIdCounter = 0;
}

// ============================================================================
// ERROR SCENARIOS
// ============================================================================

export const errorScenarios = [
  { type: 'network', message: 'Network request failed', retryable: true },
  { type: 'timeout', message: 'Page load timeout after 30s', retryable: true },
  { type: 'proxy', message: 'Proxy connection refused', retryable: true },
  { type: 'captcha', message: 'CAPTCHA detected', retryable: false },
  { type: 'blocked', message: 'IP blocked by target site', retryable: false },
  { type: 'rate-limit', message: 'Too many requests (429)', retryable: true },
  { type: 'parse', message: 'Failed to parse search results', retryable: true },
  { type: 'crash', message: 'Browser tab crashed', retryable: true },
];

// ============================================================================
// SEARCH ENGINE SELECTORS (for testing result extraction)
// ============================================================================

export const searchEngineSelectors = {
  google: {
    resultsContainer: '#search',
    resultItem: '.g',
    title: 'h3',
    link: 'a[href]',
    description: '.VwiC3b',
  },
  bing: {
    resultsContainer: '#b_results',
    resultItem: '.b_algo',
    title: 'h2 a',
    link: 'h2 a',
    description: '.b_caption p',
  },
  duckduckgo: {
    resultsContainer: '.results',
    resultItem: '.result',
    title: '.result__title',
    link: '.result__url',
    description: '.result__snippet',
  },
  yahoo: {
    resultsContainer: '#web',
    resultItem: '.algo',
    title: 'h3 a',
    link: 'h3 a',
    description: '.compText',
  },
  brave: {
    resultsContainer: '#results',
    resultItem: '.snippet',
    title: '.title',
    link: '.url',
    description: '.description',
  },
};
