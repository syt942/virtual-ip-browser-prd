/**
 * Circuit Breaker Unit Tests
 * Comprehensive tests for all three states and transitions
 * 
 * PRD Section 6.2 P1: Circuit breaker pattern testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreaker,
  createCircuitBreaker,
  createProxyCircuitBreaker,
  createSearchCircuitBreaker,
  createApiCircuitBreaker,
  CircuitBreakerOpenError,
  DEFAULT_CIRCUIT_BREAKER_CONFIG
} from '../../../electron/core/resilience';
import type {
  CircuitBreakerConfig,
  CircuitBreakerCallbacks,
  CircuitBreakerStateChangeEvent
} from '../../../electron/core/resilience';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (circuitBreaker) {
      circuitBreaker.destroy();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================
  describe('initialization', () => {
    it('should create circuit breaker with default config', () => {
      circuitBreaker = createCircuitBreaker('test-1', 'Test CB', 'proxy');
      
      expect(circuitBreaker.id).toBe('test-1');
      expect(circuitBreaker.config.name).toBe('Test CB');
      expect(circuitBreaker.config.serviceType).toBe('proxy');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should apply service type presets', () => {
      circuitBreaker = createCircuitBreaker('test-1', 'Test CB', 'proxy');
      
      // Proxy preset has failureThreshold: 3
      expect(circuitBreaker.config.failureThreshold).toBe(3);
    });

    it('should allow custom config overrides', () => {
      circuitBreaker = createCircuitBreaker('test-1', 'Test CB', 'proxy', {
        failureThreshold: 10,
        resetTimeout: 5000
      });
      
      expect(circuitBreaker.config.failureThreshold).toBe(10);
      expect(circuitBreaker.config.resetTimeout).toBe(5000);
    });

    it('should initialize metrics to zero', () => {
      circuitBreaker = createCircuitBreaker('test-1', 'Test CB', 'api');
      const metrics = circuitBreaker.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.failureCount).toBe(0);
      expect(metrics.rejectedCount).toBe(0);
      expect(metrics.tripCount).toBe(0);
    });
  });

  // ============================================================
  // CLOSED STATE TESTS
  // ============================================================
  describe('CLOSED state', () => {
    beforeEach(() => {
      circuitBreaker = createCircuitBreaker('test-closed', 'Test', 'api', {
        failureThreshold: 3,
        failureRateThreshold: 50,
        minimumRequestThreshold: 5
      });
    });

    it('should allow execution when closed', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should execute function successfully', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should track successful requests', async () => {
      await circuitBreaker.execute(async () => 'ok');
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(0);
    });

    it('should track failed requests', async () => {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('test error');
        });
      } catch (e) {
        // Expected
      }
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.consecutiveFailures).toBe(1);
    });

    it('should reset consecutive failures on success', async () => {
      // Record some failures
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      expect(circuitBreaker.getMetrics().consecutiveFailures).toBe(2);
      
      // Record success
      circuitBreaker.recordSuccess(100);
      expect(circuitBreaker.getMetrics().consecutiveFailures).toBe(0);
    });

    it('should remain closed below failure threshold', async () => {
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN when failure threshold exceeded', () => {
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      circuitBreaker.recordFailure('error 3'); // Threshold is 3
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should transition to OPEN when failure rate exceeded', () => {
      // Configure with lower minimum threshold for test
      circuitBreaker = createCircuitBreaker('test-rate', 'Test', 'api', {
        failureThreshold: 100, // High threshold to not trigger
        failureRateThreshold: 50,
        minimumRequestThreshold: 4
      });
      
      // Create 50% failure rate with minimum requests met
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure(); // 4 requests, 50% failure rate
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should track response times', async () => {
      circuitBreaker.recordSuccess(100);
      circuitBreaker.recordSuccess(200);
      circuitBreaker.recordSuccess(150);
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.averageResponseTime).toBe(150);
    });
  });

  // ============================================================
  // OPEN STATE TESTS
  // ============================================================
  describe('OPEN state', () => {
    beforeEach(() => {
      circuitBreaker = createCircuitBreaker('test-open', 'Test', 'api', {
        failureThreshold: 2,
        resetTimeout: 10000
      });
      
      // Trip the circuit
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject execution when open', () => {
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should throw CircuitBreakerOpenError on execute', async () => {
      await expect(
        circuitBreaker.execute(async () => 'test')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should increment rejected count', async () => {
      try {
        await circuitBreaker.execute(async () => 'test');
      } catch (e) {
        // Expected
      }
      
      expect(circuitBreaker.getMetrics().rejectedCount).toBe(1);
    });

    it('should use fallback when provided', async () => {
      const result = await circuitBreaker.execute(
        async () => 'primary',
        { fallback: () => 'fallback' }
      );
      
      expect(result).toBe('fallback');
    });

    it('should return undefined when throwOnReject is false', async () => {
      const result = await circuitBreaker.execute(
        async () => 'test',
        { throwOnReject: false }
      );
      
      expect(result).toBeUndefined();
    });

    it('should track trip count', () => {
      expect(circuitBreaker.getMetrics().tripCount).toBe(1);
      
      // Reset and trip again
      circuitBreaker.reset();
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      
      expect(circuitBreaker.getMetrics().tripCount).toBe(2);
    });

    it('should transition to HALF_OPEN after reset timeout', () => {
      vi.advanceTimersByTime(10000);
      
      // canExecute triggers the transition check
      expect(circuitBreaker.canExecute()).toBe(true);
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should not transition before reset timeout', () => {
      vi.advanceTimersByTime(5000);
      
      expect(circuitBreaker.canExecute()).toBe(false);
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  // ============================================================
  // HALF_OPEN STATE TESTS
  // ============================================================
  describe('HALF_OPEN state', () => {
    beforeEach(() => {
      circuitBreaker = createCircuitBreaker('test-half-open', 'Test', 'api', {
        failureThreshold: 2,
        resetTimeout: 10000,
        successThreshold: 3,
        halfOpenMaxRequests: 3
      });
      
      // Trip the circuit and advance to half-open
      circuitBreaker.recordFailure('error 1');
      circuitBreaker.recordFailure('error 2');
      vi.advanceTimersByTime(10000);
      circuitBreaker.canExecute(); // Trigger transition
      
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should allow limited execution in half-open', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should transition to CLOSED after success threshold met', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN on any failure', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure('error in half-open');
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should limit requests in half-open state', () => {
      // Record max allowed successes without meeting threshold
      circuitBreaker = createCircuitBreaker('test-limit', 'Test', 'api', {
        failureThreshold: 2,
        resetTimeout: 10000,
        successThreshold: 5, // High threshold
        halfOpenMaxRequests: 3
      });
      
      circuitBreaker.recordFailure('e1');
      circuitBreaker.recordFailure('e2');
      vi.advanceTimersByTime(10000);
      circuitBreaker.canExecute();
      
      // Record max requests
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      
      // Should reject further requests until recovery
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should track half-open successes', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      
      expect(circuitBreaker.getMetrics().halfOpenSuccesses).toBe(2);
    });

    it('should reset half-open successes when transitioning to OPEN', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getMetrics().halfOpenSuccesses).toBe(0);
    });
  });

  // ============================================================
  // STATE TRANSITIONS TESTS
  // ============================================================
  describe('state transitions', () => {
    it('should follow CLOSED -> OPEN -> HALF_OPEN -> CLOSED flow', () => {
      circuitBreaker = createCircuitBreaker('test-flow', 'Test', 'api', {
        failureThreshold: 2,
        resetTimeout: 5000,
        successThreshold: 2
      });
      
      // CLOSED state
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      // Trip to OPEN
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for HALF_OPEN
      vi.advanceTimersByTime(5000);
      circuitBreaker.canExecute();
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      // Recover to CLOSED
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should follow CLOSED -> OPEN -> HALF_OPEN -> OPEN flow on failure', () => {
      circuitBreaker = createCircuitBreaker('test-flow-fail', 'Test', 'api', {
        failureThreshold: 2,
        resetTimeout: 5000,
        successThreshold: 3
      });
      
      // Trip to OPEN
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for HALF_OPEN
      vi.advanceTimersByTime(5000);
      circuitBreaker.canExecute();
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
      
      // Fail in HALF_OPEN
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  // ============================================================
  // CALLBACK TESTS
  // ============================================================
  describe('callbacks', () => {
    it('should call onStateChange callback', () => {
      const onStateChange = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 1
      }, { onStateChange });
      
      circuitBreaker.recordFailure();
      
      expect(onStateChange).toHaveBeenCalledTimes(1);
      expect(onStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: 'CLOSED',
          newState: 'OPEN',
          reason: 'failure_threshold_exceeded'
        })
      );
    });

    it('should call onOpen callback when circuit opens', () => {
      const onOpen = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 1
      }, { onOpen });
      
      circuitBreaker.recordFailure();
      
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('should call onClose callback when circuit closes', () => {
      const onClose = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 1,
        resetTimeout: 1000,
        successThreshold: 1
      }, { onClose });
      
      circuitBreaker.recordFailure();
      vi.advanceTimersByTime(1000);
      circuitBreaker.canExecute();
      circuitBreaker.recordSuccess();
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onHalfOpen callback', () => {
      const onHalfOpen = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 1,
        resetTimeout: 1000
      }, { onHalfOpen });
      
      circuitBreaker.recordFailure();
      vi.advanceTimersByTime(1000);
      circuitBreaker.canExecute();
      
      expect(onHalfOpen).toHaveBeenCalledTimes(1);
    });

    it('should call onReject callback when request rejected', async () => {
      const onReject = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 1
      }, { onReject });
      
      circuitBreaker.recordFailure();
      
      try {
        await circuitBreaker.execute(async () => 'test');
      } catch (e) {
        // Expected
      }
      
      expect(onReject).toHaveBeenCalledWith('test-cb');
    });

    it('should call onSuccess callback', () => {
      const onSuccess = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {}, { onSuccess });
      
      circuitBreaker.recordSuccess(150);
      
      expect(onSuccess).toHaveBeenCalledWith('test-cb', 150);
    });

    it('should call onFailure callback', () => {
      const onFailure = vi.fn();
      
      circuitBreaker = createCircuitBreaker('test-cb', 'Test', 'api', {
        failureThreshold: 100 // High to prevent trip
      }, { onFailure });
      
      circuitBreaker.recordFailure('test error');
      
      expect(onFailure).toHaveBeenCalledWith('test-cb', 'test error');
    });
  });

  // ============================================================
  // MANUAL CONTROL TESTS
  // ============================================================
  describe('manual control', () => {
    beforeEach(() => {
      circuitBreaker = createCircuitBreaker('test-manual', 'Test', 'api', {
        failureThreshold: 5
      });
    });

    it('should manually reset circuit', () => {
      circuitBreaker.trip();
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      circuitBreaker.reset();
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should manually trip circuit', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      
      circuitBreaker.trip();
      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should clear consecutive failures on reset', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.getMetrics().consecutiveFailures).toBe(2);
      
      circuitBreaker.reset();
      expect(circuitBreaker.getMetrics().consecutiveFailures).toBe(0);
    });
  });

  // ============================================================
  // METRICS TESTS
  // ============================================================
  describe('metrics', () => {
    beforeEach(() => {
      circuitBreaker = createCircuitBreaker('test-metrics', 'Test', 'api', {
        failureThreshold: 10,
        resetTimeout: 5000
      });
    });

    it('should track time in each state', () => {
      // Start in CLOSED
      vi.advanceTimersByTime(1000);
      
      // Trip to OPEN
      for (let i = 0; i < 10; i++) {
        circuitBreaker.recordFailure();
      }
      vi.advanceTimersByTime(2000);
      
      // Move to HALF_OPEN
      vi.advanceTimersByTime(5000);
      circuitBreaker.canExecute();
      vi.advanceTimersByTime(500);
      
      const metrics = circuitBreaker.getMetrics();
      
      expect(metrics.timeInState.CLOSED).toBeGreaterThanOrEqual(1000);
      expect(metrics.timeInState.OPEN).toBeGreaterThanOrEqual(2000);
      expect(metrics.timeInState.HALF_OPEN).toBeGreaterThanOrEqual(500);
    });

    it('should calculate failure rate correctly', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureRate).toBe(50);
    });

    it('should track last failure and success timestamps', () => {
      const beforeFailure = Date.now();
      circuitBreaker.recordFailure();
      
      vi.advanceTimersByTime(100);
      
      const beforeSuccess = Date.now();
      circuitBreaker.recordSuccess();
      
      const metrics = circuitBreaker.getMetrics();
      
      expect(metrics.lastFailure).not.toBeNull();
      expect(metrics.lastSuccess).not.toBeNull();
      expect(metrics.lastFailure!.getTime()).toBeLessThanOrEqual(metrics.lastSuccess!.getTime());
    });
  });

  // ============================================================
  // SNAPSHOT TESTS
  // ============================================================
  describe('snapshots', () => {
    it('should create accurate snapshot', () => {
      circuitBreaker = createCircuitBreaker('test-snap', 'Test Snapshot', 'proxy', {
        serviceId: 'proxy-123'
      });
      
      circuitBreaker.recordSuccess(100);
      circuitBreaker.recordFailure('error');
      
      const snapshot = circuitBreaker.getSnapshot();
      
      expect(snapshot.id).toBe('test-snap');
      expect(snapshot.name).toBe('Test Snapshot');
      expect(snapshot.serviceType).toBe('proxy');
      expect(snapshot.serviceId).toBe('proxy-123');
      expect(snapshot.state).toBe('CLOSED');
      expect(snapshot.metrics.totalRequests).toBe(2);
      expect(snapshot.metrics.successCount).toBe(1);
      expect(snapshot.metrics.failureCount).toBe(1);
    });

    it('should restore from snapshot', () => {
      circuitBreaker = createCircuitBreaker('test-restore', 'Test', 'api');
      
      const snapshot = {
        state: 'OPEN' as const,
        metrics: {
          tripCount: 5,
          totalRequests: 100,
          failureCount: 50,
          successCount: 50
        },
        updatedAt: new Date()
      };
      
      circuitBreaker.restoreFromSnapshot(snapshot);
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getMetrics().tripCount).toBe(5);
    });
  });

  // ============================================================
  // TIMEOUT TESTS
  // ============================================================
  describe('timeout handling', () => {
    it('should timeout long-running operations', async () => {
      // Use real timers for this test since we need actual timeout behavior
      vi.useRealTimers();
      
      circuitBreaker = createCircuitBreaker('test-timeout', 'Test', 'api');
      
      const slowOperation = () => new Promise<string>(resolve => {
        setTimeout(() => resolve('done'), 500);
      });
      
      await expect(
        circuitBreaker.execute(slowOperation, { timeout: 50 })
      ).rejects.toThrow('timed out');
      
      expect(circuitBreaker.getMetrics().failureCount).toBe(1);
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should complete fast operations within timeout', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      circuitBreaker = createCircuitBreaker('test-timeout', 'Test', 'api');
      
      const fastOperation = () => Promise.resolve('fast');
      
      const result = await circuitBreaker.execute(fastOperation, { timeout: 1000 });
      
      expect(result).toBe('fast');
      expect(circuitBreaker.getMetrics().successCount).toBe(1);
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  // ============================================================
  // FACTORY FUNCTION TESTS
  // ============================================================
  describe('factory functions', () => {
    it('should create proxy circuit breaker with correct defaults', () => {
      circuitBreaker = createProxyCircuitBreaker('proxy-123', 'US Proxy');
      
      expect(circuitBreaker.id).toBe('proxy-proxy-123');
      expect(circuitBreaker.config.serviceType).toBe('proxy');
      expect(circuitBreaker.config.serviceId).toBe('proxy-123');
      expect(circuitBreaker.config.failureThreshold).toBe(3); // Proxy preset
    });

    it('should create search circuit breaker with correct defaults', () => {
      circuitBreaker = createSearchCircuitBreaker('google');
      
      expect(circuitBreaker.id).toBe('search-google');
      expect(circuitBreaker.config.serviceType).toBe('search');
      expect(circuitBreaker.config.serviceId).toBe('google');
    });

    it('should create API circuit breaker with correct defaults', () => {
      circuitBreaker = createApiCircuitBreaker('translation', 'https://api.example.com');
      
      expect(circuitBreaker.id).toBe('api-translation');
      expect(circuitBreaker.config.serviceType).toBe('api');
      expect(circuitBreaker.config.serviceId).toBe('https://api.example.com');
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('edge cases', () => {
    it('should handle destroy gracefully', () => {
      circuitBreaker = createCircuitBreaker('test-destroy', 'Test', 'api');
      circuitBreaker.destroy();
      
      expect(circuitBreaker.canExecute()).toBe(false);
      
      // Should not throw
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();
    });

    it('should throw when executing on destroyed circuit breaker', async () => {
      circuitBreaker = createCircuitBreaker('test-destroy', 'Test', 'api');
      circuitBreaker.destroy();
      
      await expect(
        circuitBreaker.execute(async () => 'test')
      ).rejects.toThrow('destroyed');
    });

    it('should handle empty sliding window', () => {
      circuitBreaker = createCircuitBreaker('test-empty', 'Test', 'api', {
        slidingWindowSize: 1 // Very short window
      });
      
      circuitBreaker.recordFailure();
      vi.advanceTimersByTime(10); // Exceed window
      
      // Failure rate should be recalculated from current window
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failureRate).toBe(0); // Window is empty now
    });

    it('should cleanup old request history', () => {
      circuitBreaker = createCircuitBreaker('test-cleanup', 'Test', 'api', {
        slidingWindowSize: 1000,
        failureThreshold: 10000 // High to prevent trip
      });
      
      // Record many requests
      for (let i = 0; i < 100; i++) {
        circuitBreaker.recordSuccess();
      }
      
      // Advance time past window
      vi.advanceTimersByTime(2000);
      
      // Record new request to trigger cleanup
      circuitBreaker.recordSuccess();
      
      // Metrics should still be tracked
      expect(circuitBreaker.getMetrics().successCount).toBe(101);
    });
  });
});
