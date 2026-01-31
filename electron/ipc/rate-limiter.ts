/**
 * IPC Rate Limiter
 * Prevents DoS attacks by limiting IPC request rates
 */

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Simple sliding window rate limiter
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];

    // Filter out old requests
    timestamps = timestamps.filter(t => t > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= this.maxRequests) {
      this.requests.set(key, timestamps);
      return false;
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(key) || [];
    const validRequests = timestamps.filter(t => t > windowStart).length;
    return Math.max(0, this.maxRequests - validRequests);
  }

  /**
   * Get time until next request is allowed (in ms)
   */
  getRetryAfter(key: string): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) {return 0;}
    
    const oldest = Math.min(...timestamps);
    const retryAfter = oldest + this.windowMs - Date.now();
    return Math.max(0, retryAfter);
  }

  /**
   * Reset limits for a specific key or all keys
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const keys = Array.from(this.requests.keys());
    for (const key of keys) {
      const timestamps = this.requests.get(key) || [];
      const valid = timestamps.filter(t => t > windowStart);
      if (valid.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, valid);
      }
    }
  }
}

/**
 * IPC-specific rate limiter with per-channel configuration
 */
export class IPCRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();
  private readonly defaultLimits: RateLimitConfig;
  private readonly channelLimits: Map<string, RateLimitConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.defaultLimits = { windowMs: 60000, maxRequests: 100 };
    
    // Configure stricter limits for sensitive operations
    this.channelLimits = new Map([
      // Proxy operations - moderate limits
      ['proxy:add', { windowMs: 60000, maxRequests: 10 }],
      ['proxy:remove', { windowMs: 60000, maxRequests: 20 }],
      ['proxy:validate', { windowMs: 60000, maxRequests: 20 }],
      ['proxy:set-rotation', { windowMs: 60000, maxRequests: 10 }],
      
      // Tab operations - higher limits
      ['tab:create', { windowMs: 60000, maxRequests: 50 }],
      ['tab:close', { windowMs: 60000, maxRequests: 50 }],
      ['tab:navigate', { windowMs: 60000, maxRequests: 100 }],
      
      // Automation - strict limits to prevent abuse
      ['automation:start-search', { windowMs: 60000, maxRequests: 5 }],
      ['automation:stop-search', { windowMs: 60000, maxRequests: 10 }],
      ['automation:add-keyword', { windowMs: 60000, maxRequests: 50 }],
      ['automation:add-domain', { windowMs: 60000, maxRequests: 30 }],
      
      // Privacy - moderate limits
      ['privacy:set-fingerprint', { windowMs: 60000, maxRequests: 20 }],
      ['privacy:toggle-webrtc', { windowMs: 60000, maxRequests: 30 }],
      ['privacy:toggle-tracker-blocking', { windowMs: 60000, maxRequests: 30 }],
      
      // Session - strict limits
      ['session:save', { windowMs: 60000, maxRequests: 10 }],
      ['session:load', { windowMs: 60000, maxRequests: 10 }],
    ]);

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if a request is allowed
   */
  checkLimit(channel: string, clientId: string = 'default'): { 
    allowed: boolean; 
    remaining: number;
    retryAfter: number;
  } {
    // Normalize channel name (case-insensitive)
    const normalizedChannel = channel.toLowerCase();
    const key = `${clientId}:${normalizedChannel}`;
    
    if (!this.limiters.has(normalizedChannel)) {
      const limits = this.channelLimits.get(normalizedChannel) || this.defaultLimits;
      this.limiters.set(normalizedChannel, new RateLimiter(limits.windowMs, limits.maxRequests));
    }

    const limiter = this.limiters.get(normalizedChannel)!;
    const allowed = limiter.isAllowed(key);
    const remaining = limiter.getRemainingRequests(key);
    const retryAfter = allowed ? 0 : limiter.getRetryAfter(key);

    if (!allowed) {
      console.warn(`[Rate Limiter] Request blocked for channel: ${channel}, client: ${clientId}`);
    }

    return { allowed, remaining, retryAfter };
  }

  /**
   * Create middleware for IPC handlers
   */
  middleware(channel: string) {
    return (clientId: string = 'default'): boolean => {
      const { allowed } = this.checkLimit(channel, clientId);
      return allowed;
    };
  }

  /**
   * Reset all limits
   */
  reset(): void {
    this.limiters.clear();
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const limiters = Array.from(this.limiters.values());
      for (const limiter of limiters) {
        limiter.cleanup();
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Stop cleanup and release resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limiters.clear();
  }
}

// Singleton instance
let rateLimiterInstance: IPCRateLimiter | null = null;

/**
 * Get the global IPC rate limiter instance
 */
export function getIPCRateLimiter(): IPCRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new IPCRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the global rate limiter (for testing)
 */
export function resetIPCRateLimiter(): void {
  if (rateLimiterInstance) {
    rateLimiterInstance.destroy();
    rateLimiterInstance = null;
  }
}
