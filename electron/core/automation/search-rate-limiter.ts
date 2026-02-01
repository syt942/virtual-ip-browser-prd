/**
 * Search Engine Rate Limiter
 * 
 * SECURITY: Prevents abuse and detection by implementing per-engine rate limits.
 * Uses token bucket algorithm with per-engine and global limits.
 * 
 * @module electron/core/automation/search-rate-limiter
 */

import type { SearchEngine } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Rate limit configuration for a search engine
 */
export interface EngineRateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
  /** Minimum delay between requests in ms */
  minDelayMs: number;
  /** Maximum concurrent requests */
  maxConcurrent: number;
}

/**
 * Default rate limits per search engine
 * These are conservative limits to avoid detection
 */
const DEFAULT_ENGINE_LIMITS: Record<SearchEngine, EngineRateLimitConfig> = {
  google: {
    maxRequests: 30,
    windowMs: 60000,       // 30 requests per minute
    minDelayMs: 2000,      // 2 seconds between requests
    maxConcurrent: 3,
  },
  bing: {
    maxRequests: 40,
    windowMs: 60000,       // 40 requests per minute
    minDelayMs: 1500,
    maxConcurrent: 5,
  },
  duckduckgo: {
    maxRequests: 30,
    windowMs: 60000,
    minDelayMs: 2000,
    maxConcurrent: 3,
  },
  yahoo: {
    maxRequests: 30,
    windowMs: 60000,
    minDelayMs: 2000,
    maxConcurrent: 3,
  },
  brave: {
    maxRequests: 40,
    windowMs: 60000,
    minDelayMs: 1500,
    maxConcurrent: 5,
  },
};

/**
 * Global rate limit (across all engines)
 */
const GLOBAL_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60000,        // 100 requests per minute total
  maxConcurrent: 10,
};

// ============================================================================
// TOKEN BUCKET
// ============================================================================

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number, windowMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.refillRate = maxTokens / windowMs;
  }

  /**
   * Try to consume a token
   * @returns true if token consumed, false if rate limited
   */
  tryConsume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Get time until next token available (in ms)
   */
  getWaitTime(): number {
    this.refill();
    
    if (this.tokens >= 1) {
      return 0;
    }
    
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Reset bucket to full
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

// ============================================================================
// SEARCH RATE LIMITER
// ============================================================================

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  waitTimeMs: number;
  reason?: 'engine_limit' | 'global_limit' | 'concurrent_limit' | 'min_delay';
  engine?: SearchEngine;
}

/**
 * SearchRateLimiter manages rate limiting for search automation
 */
export class SearchRateLimiter {
  private engineBuckets: Map<SearchEngine, TokenBucket> = new Map();
  private globalBucket: TokenBucket;
  private engineConfigs: Map<SearchEngine, EngineRateLimitConfig> = new Map();
  private lastRequestTime: Map<SearchEngine, number> = new Map();
  private activeRequests: Map<SearchEngine, number> = new Map();
  private globalActiveRequests: number = 0;

  constructor(customLimits?: Partial<Record<SearchEngine, Partial<EngineRateLimitConfig>>>) {
    // Initialize global bucket
    this.globalBucket = new TokenBucket(GLOBAL_RATE_LIMIT.maxRequests, GLOBAL_RATE_LIMIT.windowMs);

    // Initialize per-engine buckets and configs
    const engines: SearchEngine[] = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];
    
    for (const engine of engines) {
      const defaultConfig = DEFAULT_ENGINE_LIMITS[engine];
      const customConfig = customLimits?.[engine] || {};
      const config: EngineRateLimitConfig = { ...defaultConfig, ...customConfig };
      
      this.engineConfigs.set(engine, config);
      this.engineBuckets.set(engine, new TokenBucket(config.maxRequests, config.windowMs));
      this.lastRequestTime.set(engine, 0);
      this.activeRequests.set(engine, 0);
    }
  }

  /**
   * Check if a request is allowed for the given engine
   */
  checkLimit(engine: SearchEngine): RateLimitResult {
    const config = this.engineConfigs.get(engine);
    if (!config) {
      return { allowed: false, waitTimeMs: 0, reason: 'engine_limit', engine };
    }

    // Check concurrent request limit for engine
    const activeForEngine = this.activeRequests.get(engine) || 0;
    if (activeForEngine >= config.maxConcurrent) {
      return { 
        allowed: false, 
        waitTimeMs: 1000, // Wait at least 1 second
        reason: 'concurrent_limit',
        engine 
      };
    }

    // Check global concurrent limit
    if (this.globalActiveRequests >= GLOBAL_RATE_LIMIT.maxConcurrent) {
      return { 
        allowed: false, 
        waitTimeMs: 1000,
        reason: 'concurrent_limit' 
      };
    }

    // Check minimum delay between requests for this engine
    const lastRequest = this.lastRequestTime.get(engine) || 0;
    const timeSinceLastRequest = Date.now() - lastRequest;
    if (timeSinceLastRequest < config.minDelayMs) {
      return { 
        allowed: false, 
        waitTimeMs: config.minDelayMs - timeSinceLastRequest,
        reason: 'min_delay',
        engine 
      };
    }

    // Check engine token bucket
    const engineBucket = this.engineBuckets.get(engine);
    if (!engineBucket?.tryConsume()) {
      return { 
        allowed: false, 
        waitTimeMs: engineBucket?.getWaitTime() || 1000,
        reason: 'engine_limit',
        engine 
      };
    }

    // Check global token bucket
    if (!this.globalBucket.tryConsume()) {
      // Refund the engine token we just consumed
      engineBucket?.reset();
      return { 
        allowed: false, 
        waitTimeMs: this.globalBucket.getWaitTime(),
        reason: 'global_limit' 
      };
    }

    return { allowed: true, waitTimeMs: 0 };
  }

  /**
   * Record the start of a request
   */
  startRequest(engine: SearchEngine): void {
    const current = this.activeRequests.get(engine) || 0;
    this.activeRequests.set(engine, current + 1);
    this.globalActiveRequests++;
    this.lastRequestTime.set(engine, Date.now());
  }

  /**
   * Record the end of a request
   */
  endRequest(engine: SearchEngine): void {
    const current = this.activeRequests.get(engine) || 0;
    this.activeRequests.set(engine, Math.max(0, current - 1));
    this.globalActiveRequests = Math.max(0, this.globalActiveRequests - 1);
  }

  /**
   * Wait for rate limit and then check again
   * Returns true when allowed, throws on timeout
   */
  async waitForLimit(engine: SearchEngine, maxWaitMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const result = this.checkLimit(engine);
      
      if (result.allowed) {
        return;
      }
      
      // Wait for the suggested time (with a cap)
      const waitTime = Math.min(result.waitTimeMs, 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    throw new Error(`[Rate Limit] Timeout waiting for ${engine} rate limit (${maxWaitMs}ms)`);
  }

  /**
   * Execute a function with rate limiting
   */
  async executeWithLimit<T>(
    engine: SearchEngine,
    fn: () => Promise<T>,
    maxWaitMs: number = 30000
  ): Promise<T> {
    // Wait for rate limit
    await this.waitForLimit(engine, maxWaitMs);
    
    // Record request start
    this.startRequest(engine);
    
    try {
      return await fn();
    } finally {
      this.endRequest(engine);
    }
  }

  /**
   * Get current rate limit status for all engines
   */
  getStatus(): Record<SearchEngine, {
    activeRequests: number;
    tokensAvailable: number;
    lastRequestTime: number;
  }> {
    const status: Record<string, {
      activeRequests: number;
      tokensAvailable: number;
      lastRequestTime: number;
    }> = {};

    const engines: SearchEngine[] = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];
    
    for (const engine of engines) {
      status[engine] = {
        activeRequests: this.activeRequests.get(engine) || 0,
        tokensAvailable: this.engineBuckets.get(engine)?.getTokens() || 0,
        lastRequestTime: this.lastRequestTime.get(engine) || 0,
      };
    }

    return status as Record<SearchEngine, {
      activeRequests: number;
      tokensAvailable: number;
      lastRequestTime: number;
    }>;
  }

  /**
   * Get global status
   */
  getGlobalStatus(): {
    activeRequests: number;
    tokensAvailable: number;
  } {
    return {
      activeRequests: this.globalActiveRequests,
      tokensAvailable: this.globalBucket.getTokens(),
    };
  }

  /**
   * Reset all rate limits
   */
  reset(): void {
    this.globalBucket.reset();
    for (const bucket of this.engineBuckets.values()) {
      bucket.reset();
    }
    for (const engine of this.activeRequests.keys()) {
      this.activeRequests.set(engine, 0);
      this.lastRequestTime.set(engine, 0);
    }
    this.globalActiveRequests = 0;
  }

  /**
   * Update configuration for an engine
   */
  updateEngineConfig(engine: SearchEngine, config: Partial<EngineRateLimitConfig>): void {
    const currentConfig = this.engineConfigs.get(engine);
    if (currentConfig) {
      const newConfig = { ...currentConfig, ...config };
      this.engineConfigs.set(engine, newConfig);
      this.engineBuckets.set(engine, new TokenBucket(newConfig.maxRequests, newConfig.windowMs));
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let rateLimiterInstance: SearchRateLimiter | null = null;

/**
 * Get the global search rate limiter instance
 */
export function getSearchRateLimiter(): SearchRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new SearchRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the global rate limiter (for testing)
 */
export function resetSearchRateLimiter(): void {
  rateLimiterInstance?.reset();
  rateLimiterInstance = null;
}

export default SearchRateLimiter;
