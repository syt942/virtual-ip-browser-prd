/**
 * RateLimiter Unit Tests
 * Tests for IPC rate limiting functionality
 * 
 * Coverage targets:
 * - Basic rate limiting operations
 * - Per-key tracking
 * - Window expiration
 * - IPCRateLimiter channel configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  RateLimiter, 
  IPCRateLimiter,
  getIPCRateLimiter,
  resetIPCRateLimiter 
} from '../../../electron/ipc/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(1000, 5); // 5 requests per 1 second
  });

  // ============================================================
  // BASIC OPERATIONS TESTS
  // ============================================================
  describe('basic operations', () => {
    it('allows requests under limit', () => {
      const key = 'test-key';
      
      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed(key)).toBe(true);
      }
    });

    it('blocks requests over limit', () => {
      const key = 'test-key';
      
      // Use up all 5 allowed requests
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(key);
      }
      
      // 6th request should be blocked
      expect(limiter.isAllowed(key)).toBe(false);
    });

    it('resets after window expires', async () => {
      const key = 'test-key';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(key);
      }
      expect(limiter.isAllowed(key)).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      expect(limiter.isAllowed(key)).toBe(true);
    });

    it('tracks requests per key independently', () => {
      const key1 = 'key-1';
      const key2 = 'key-2';
      
      // Use up all requests for key1
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(key1);
      }
      
      // key1 should be blocked, key2 should be allowed
      expect(limiter.isAllowed(key1)).toBe(false);
      expect(limiter.isAllowed(key2)).toBe(true);
    });
  });

  // ============================================================
  // UTILITY METHODS TESTS
  // ============================================================
  describe('utility methods', () => {
    it('getRemainingRequests returns correct count', () => {
      const key = 'test-key';
      
      expect(limiter.getRemainingRequests(key)).toBe(5);
      
      limiter.isAllowed(key);
      expect(limiter.getRemainingRequests(key)).toBe(4);
      
      limiter.isAllowed(key);
      limiter.isAllowed(key);
      expect(limiter.getRemainingRequests(key)).toBe(2);
    });

    it('getRetryAfter returns time until reset', () => {
      const key = 'test-key';
      
      // No requests yet - should return 0
      expect(limiter.getRetryAfter(key)).toBe(0);
      
      // Make a request
      limiter.isAllowed(key);
      
      // Should return time until oldest request expires
      const retryAfter = limiter.getRetryAfter(key);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(1000);
    });

    it('reset clears limits for specific key', () => {
      const key = 'test-key';
      
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        limiter.isAllowed(key);
      }
      expect(limiter.isAllowed(key)).toBe(false);
      
      // Reset
      limiter.reset(key);
      
      // Should be allowed again
      expect(limiter.isAllowed(key)).toBe(true);
      expect(limiter.getRemainingRequests(key)).toBe(4); // 1 used
    });

    it('reset clears all limits when no key provided', () => {
      // Use up requests for multiple keys
      limiter.isAllowed('key1');
      limiter.isAllowed('key2');
      
      // Reset all
      limiter.reset();
      
      // All should be at full capacity
      expect(limiter.getRemainingRequests('key1')).toBe(5);
      expect(limiter.getRemainingRequests('key2')).toBe(5);
    });
  });

  // ============================================================
  // CLEANUP TESTS
  // ============================================================
  describe('cleanup', () => {
    it('removes expired entries', async () => {
      const key = 'test-key';
      
      limiter.isAllowed(key);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Cleanup
      limiter.cleanup();
      
      // Key should be removed (getRemainingRequests returns max for unknown keys)
      expect(limiter.getRemainingRequests(key)).toBe(5);
    });
  });
});

describe('IPCRateLimiter', () => {
  let ipcLimiter: IPCRateLimiter;

  beforeEach(() => {
    resetIPCRateLimiter();
    ipcLimiter = new IPCRateLimiter();
  });

  afterEach(() => {
    ipcLimiter.destroy();
  });

  // ============================================================
  // CHANNEL CONFIGURATION TESTS
  // ============================================================
  describe('channel configuration', () => {
    it('applies stricter limits to automation channels', () => {
      // automation:start-search has limit of 5 per minute
      const channel = 'automation:start-search';
      const clientId = 'test-client';
      
      // Should allow first 5
      for (let i = 0; i < 5; i++) {
        const result = ipcLimiter.checkLimit(channel, clientId);
        expect(result.allowed).toBe(true);
      }
      
      // 6th should be blocked
      const blocked = ipcLimiter.checkLimit(channel, clientId);
      expect(blocked.allowed).toBe(false);
    });

    it('applies higher limits to tab operations', () => {
      // tab:create has limit of 50 per minute
      const channel = 'tab:create';
      const clientId = 'test-client';
      
      // Should allow many more requests
      for (let i = 0; i < 50; i++) {
        const result = ipcLimiter.checkLimit(channel, clientId);
        expect(result.allowed).toBe(true);
      }
      
      // 51st should be blocked
      const blocked = ipcLimiter.checkLimit(channel, clientId);
      expect(blocked.allowed).toBe(false);
    });

    it('uses default limits for unknown channels', () => {
      // Unknown channel uses default of 100 per minute
      const channel = 'unknown:channel';
      const clientId = 'test-client';
      
      // First request should be allowed
      const result = ipcLimiter.checkLimit(channel, clientId);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================
  describe('integration', () => {
    it('checkLimit returns allowed/remaining/retryAfter', () => {
      const result = ipcLimiter.checkLimit('tab:navigate', 'client-1');
      
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('retryAfter');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.retryAfter).toBe('number');
    });

    it('returns retryAfter when blocked', () => {
      const channel = 'automation:start-search';
      const clientId = 'test-client';
      
      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        ipcLimiter.checkLimit(channel, clientId);
      }
      
      const result = ipcLimiter.checkLimit(channel, clientId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('normalizes channel names (case-insensitive)', () => {
      const clientId = 'test';
      
      ipcLimiter.checkLimit('TAB:CREATE', clientId);
      ipcLimiter.checkLimit('tab:create', clientId);
      ipcLimiter.checkLimit('Tab:Create', clientId);
      
      // All should count towards the same limit
      const result = ipcLimiter.checkLimit('tab:create', clientId);
      expect(result.remaining).toBe(46); // 50 - 4
    });
  });

  // ============================================================
  // MIDDLEWARE TESTS
  // ============================================================
  describe('middleware', () => {
    it('creates middleware function for channel', () => {
      const middleware = ipcLimiter.middleware('proxy:add');
      
      expect(typeof middleware).toBe('function');
    });

    it('middleware returns boolean', () => {
      const middleware = ipcLimiter.middleware('proxy:add');
      
      const result = middleware('client-1');
      expect(typeof result).toBe('boolean');
    });
  });

  // ============================================================
  // RESET AND DESTROY TESTS
  // ============================================================
  describe('reset and destroy', () => {
    it('reset clears all limiters', () => {
      // Make some requests
      ipcLimiter.checkLimit('proxy:add', 'client-1');
      ipcLimiter.checkLimit('tab:create', 'client-1');
      
      // Reset
      ipcLimiter.reset();
      
      // Should be at full capacity
      const result = ipcLimiter.checkLimit('proxy:add', 'client-1');
      expect(result.remaining).toBe(9); // proxy:add limit is 10
    });

    it('destroy stops cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      ipcLimiter.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // ============================================================
  // SINGLETON TESTS
  // ============================================================
  describe('singleton', () => {
    it('getIPCRateLimiter returns same instance', () => {
      resetIPCRateLimiter();
      
      const instance1 = getIPCRateLimiter();
      const instance2 = getIPCRateLimiter();
      
      expect(instance1).toBe(instance2);
    });

    it('resetIPCRateLimiter creates new instance', () => {
      const instance1 = getIPCRateLimiter();
      
      resetIPCRateLimiter();
      
      const instance2 = getIPCRateLimiter();
      expect(instance1).not.toBe(instance2);
    });
  });
});
