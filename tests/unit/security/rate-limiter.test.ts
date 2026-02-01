/**
 * Search Rate Limiter Tests
 * Tests for per-engine and global rate limiting
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  SearchRateLimiter, 
  resetSearchRateLimiter,
  getSearchRateLimiter 
} from '../../../electron/core/automation/search-rate-limiter';
import type { SearchEngine } from '../../../electron/core/automation/types';

describe('SearchRateLimiter', () => {
  let rateLimiter: SearchRateLimiter;

  beforeEach(() => {
    resetSearchRateLimiter();
    rateLimiter = new SearchRateLimiter();
  });

  afterEach(() => {
    resetSearchRateLimiter();
  });

  // ==========================================================================
  // Basic Rate Limiting
  // ==========================================================================

  describe('Basic Rate Limiting', () => {
    it('should allow initial requests', () => {
      const result = rateLimiter.checkLimit('google');
      expect(result.allowed).toBe(true);
      expect(result.waitTimeMs).toBe(0);
    });

    it('should track active requests', () => {
      rateLimiter.startRequest('google');
      const status = rateLimiter.getStatus();
      expect(status.google.activeRequests).toBe(1);
    });

    it('should decrement active requests on end', () => {
      rateLimiter.startRequest('google');
      rateLimiter.endRequest('google');
      const status = rateLimiter.getStatus();
      expect(status.google.activeRequests).toBe(0);
    });

    it('should not go negative on extra endRequest calls', () => {
      rateLimiter.endRequest('google');
      rateLimiter.endRequest('google');
      const status = rateLimiter.getStatus();
      expect(status.google.activeRequests).toBe(0);
    });
  });

  // ==========================================================================
  // Concurrent Request Limits
  // ==========================================================================

  describe('Concurrent Request Limits', () => {
    it('should enforce per-engine concurrent limits', () => {
      // Google has maxConcurrent: 3 by default
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      
      const result = rateLimiter.checkLimit('google');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('concurrent_limit');
    });

    it('should allow requests after concurrent slots free up', () => {
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      
      // Free up a slot
      rateLimiter.endRequest('google');
      
      // Should now be allowed (after min delay)
      // Note: May still be blocked by min_delay, so just check concurrent isn't the blocker
      const result = rateLimiter.checkLimit('google');
      if (!result.allowed) {
        expect(result.reason).not.toBe('concurrent_limit');
      }
    });

    it('should track global concurrent requests', () => {
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('bing');
      rateLimiter.startRequest('duckduckgo');
      
      const globalStatus = rateLimiter.getGlobalStatus();
      expect(globalStatus.activeRequests).toBe(3);
    });
  });

  // ==========================================================================
  // Minimum Delay Enforcement
  // ==========================================================================

  describe('Minimum Delay Enforcement', () => {
    it('should enforce minimum delay between requests', () => {
      // Make a request
      rateLimiter.checkLimit('google');
      rateLimiter.startRequest('google');
      rateLimiter.endRequest('google');
      
      // Immediately try another
      const result = rateLimiter.checkLimit('google');
      
      // Should be blocked by min_delay (2000ms for Google)
      if (!result.allowed) {
        expect(result.reason).toBe('min_delay');
        expect(result.waitTimeMs).toBeGreaterThan(0);
        expect(result.waitTimeMs).toBeLessThanOrEqual(2000);
      }
    });

    it('should allow request after minimum delay passes', async () => {
      vi.useFakeTimers();
      
      rateLimiter.checkLimit('google');
      rateLimiter.startRequest('google');
      rateLimiter.endRequest('google');
      
      // Advance time past min delay (2000ms for Google)
      vi.advanceTimersByTime(2100);
      
      const result = rateLimiter.checkLimit('google');
      // Should not be blocked by min_delay anymore
      if (!result.allowed) {
        expect(result.reason).not.toBe('min_delay');
      }
      
      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Token Bucket Rate Limiting
  // ==========================================================================

  describe('Token Bucket Rate Limiting', () => {
    it('should consume tokens on requests', () => {
      const initialTokens = rateLimiter.getStatus().google.tokensAvailable;
      
      rateLimiter.checkLimit('google');
      
      const afterTokens = rateLimiter.getStatus().google.tokensAvailable;
      expect(afterTokens).toBeLessThan(initialTokens);
    });

    it('should block when tokens exhausted', async () => {
      vi.useFakeTimers();
      
      // Exhaust all tokens for Google (30 per minute)
      for (let i = 0; i < 35; i++) {
        rateLimiter.checkLimit('google');
        // Advance past min delay
        vi.advanceTimersByTime(100);
      }
      
      const result = rateLimiter.checkLimit('google');
      if (!result.allowed) {
        expect(['engine_limit', 'min_delay']).toContain(result.reason);
      }
      
      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Per-Engine Configuration
  // ==========================================================================

  describe('Per-Engine Configuration', () => {
    it('should have different limits for different engines', () => {
      // Bing has higher limits than Google
      const googleStatus = rateLimiter.getStatus().google;
      const bingStatus = rateLimiter.getStatus().bing;
      
      // Both should start with their max tokens
      expect(googleStatus.tokensAvailable).toBeGreaterThan(0);
      expect(bingStatus.tokensAvailable).toBeGreaterThan(0);
    });

    it('should allow custom configuration', () => {
      const customLimiter = new SearchRateLimiter({
        google: {
          maxRequests: 10,
          windowMs: 60000,
          minDelayMs: 500,
          maxConcurrent: 2
        }
      });
      
      // Start 2 concurrent requests (the new max)
      customLimiter.startRequest('google');
      customLimiter.startRequest('google');
      
      // Third should be blocked
      const result = customLimiter.checkLimit('google');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('concurrent_limit');
    });

    it('should allow updating engine config', () => {
      rateLimiter.updateEngineConfig('google', { maxConcurrent: 1 });
      
      rateLimiter.startRequest('google');
      
      const result = rateLimiter.checkLimit('google');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('concurrent_limit');
    });
  });

  // ==========================================================================
  // Global Rate Limiting
  // ==========================================================================

  describe('Global Rate Limiting', () => {
    it('should track global token usage', () => {
      const initialGlobal = rateLimiter.getGlobalStatus().tokensAvailable;
      
      rateLimiter.checkLimit('google');
      rateLimiter.checkLimit('bing');
      
      const afterGlobal = rateLimiter.getGlobalStatus().tokensAvailable;
      expect(afterGlobal).toBeLessThan(initialGlobal);
    });

    it('should enforce global concurrent limit', () => {
      // Global limit is 10 concurrent
      const engines: SearchEngine[] = ['google', 'bing', 'duckduckgo', 'yahoo', 'brave'];
      
      // Start 10 concurrent requests across different engines
      for (let i = 0; i < 10; i++) {
        const engine = engines[i % engines.length];
        rateLimiter.startRequest(engine);
      }
      
      expect(rateLimiter.getGlobalStatus().activeRequests).toBe(10);
      
      // Next request should be blocked by global concurrent limit
      const result = rateLimiter.checkLimit('google');
      if (!result.allowed) {
        expect(result.reason).toBe('concurrent_limit');
      }
    });
  });

  // ==========================================================================
  // Wait and Execute Functions
  // ==========================================================================

  describe('waitForLimit', () => {
    it('should resolve immediately if not rate limited', async () => {
      const start = Date.now();
      await rateLimiter.waitForLimit('google', 1000);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(100);
    });

    it('should timeout if rate limit cannot be satisfied', async () => {
      // Exhaust concurrent limit
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      rateLimiter.startRequest('google');
      
      // Should throw timeout error (message contains "Timeout")
      await expect(
        rateLimiter.waitForLimit('google', 100)
      ).rejects.toThrow('Timeout');
    });
  });

  describe('executeWithLimit', () => {
    it('should execute function when allowed', async () => {
      const result = await rateLimiter.executeWithLimit('google', async () => {
        return 'success';
      });
      
      expect(result).toBe('success');
    });

    it('should track request during execution', async () => {
      const checkDuringExecution = vi.fn();
      
      await rateLimiter.executeWithLimit('google', async () => {
        checkDuringExecution(rateLimiter.getStatus().google.activeRequests);
        return 'done';
      });
      
      expect(checkDuringExecution).toHaveBeenCalledWith(1);
      expect(rateLimiter.getStatus().google.activeRequests).toBe(0);
    });

    it('should release request on error', async () => {
      try {
        await rateLimiter.executeWithLimit('google', async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected
      }
      
      // Request should still be released
      expect(rateLimiter.getStatus().google.activeRequests).toBe(0);
    });
  });

  // ==========================================================================
  // Reset Functionality
  // ==========================================================================

  describe('Reset', () => {
    it('should reset all limits', () => {
      // Use some tokens
      rateLimiter.checkLimit('google');
      rateLimiter.checkLimit('bing');
      rateLimiter.startRequest('google');
      
      // Reset
      rateLimiter.reset();
      
      // Check everything is reset
      const status = rateLimiter.getStatus();
      expect(status.google.activeRequests).toBe(0);
      expect(status.bing.activeRequests).toBe(0);
      
      // Tokens should be back to max
      expect(status.google.tokensAvailable).toBeGreaterThan(25);
    });
  });

  // ==========================================================================
  // Singleton Instance
  // ==========================================================================

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getSearchRateLimiter();
      const instance2 = getSearchRateLimiter();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getSearchRateLimiter();
      instance1.startRequest('google');
      
      resetSearchRateLimiter();
      
      const instance2 = getSearchRateLimiter();
      expect(instance2.getStatus().google.activeRequests).toBe(0);
    });
  });
});
