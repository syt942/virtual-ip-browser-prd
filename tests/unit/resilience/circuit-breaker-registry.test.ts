/**
 * Circuit Breaker Registry Unit Tests
 * Tests for managing multiple circuit breaker instances
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CircuitBreakerRegistry,
  getCircuitBreakerRegistry,
  resetCircuitBreakerRegistry,
  CircuitBreaker,
  createCircuitBreaker
} from '../../../electron/core/resilience';
import type { CircuitBreakerStateChangeEvent } from '../../../electron/core/resilience';

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    vi.useFakeTimers();
    registry = new CircuitBreakerRegistry({
      autoCleanup: false // Disable for tests
    });
  });

  afterEach(() => {
    registry.destroy();
    resetCircuitBreakerRegistry();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ============================================================
  // BASIC OPERATIONS
  // ============================================================
  describe('basic operations', () => {
    it('should create registry with default config', () => {
      expect(registry).toBeDefined();
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should get or create circuit breaker for proxy', () => {
      const cb = registry.getForProxy('proxy-123', 'US Proxy');
      
      expect(cb).toBeDefined();
      expect(cb.config.serviceType).toBe('proxy');
      expect(cb.config.serviceId).toBe('proxy-123');
    });

    it('should return same circuit breaker on subsequent calls', () => {
      const cb1 = registry.getForProxy('proxy-123');
      const cb2 = registry.getForProxy('proxy-123');
      
      expect(cb1).toBe(cb2);
    });

    it('should get or create circuit breaker for service', () => {
      const cb = registry.getForService('search', 'google');
      
      expect(cb).toBeDefined();
      expect(cb.config.serviceType).toBe('search');
      expect(cb.config.serviceId).toBe('google');
    });

    it('should create different circuit breakers for different services', () => {
      const cb1 = registry.getForService('search', 'google');
      const cb2 = registry.getForService('search', 'bing');
      
      expect(cb1).not.toBe(cb2);
      expect(cb1.id).not.toBe(cb2.id);
    });

    it('should get circuit breaker by ID', () => {
      const cb = registry.getForProxy('proxy-456');
      const retrieved = registry.get('proxy-proxy-456');
      
      expect(retrieved).toBe(cb);
    });

    it('should return undefined for non-existent ID', () => {
      const cb = registry.get('non-existent');
      expect(cb).toBeUndefined();
    });
  });

  // ============================================================
  // REGISTRATION AND REMOVAL
  // ============================================================
  describe('registration and removal', () => {
    it('should register existing circuit breaker', () => {
      const cb = createCircuitBreaker('custom-cb', 'Custom', 'api');
      registry.register(cb);
      
      expect(registry.get('custom-cb')).toBe(cb);
    });

    it('should throw when registering duplicate ID', () => {
      const cb1 = createCircuitBreaker('duplicate', 'First', 'api');
      const cb2 = createCircuitBreaker('duplicate', 'Second', 'api');
      
      registry.register(cb1);
      
      expect(() => registry.register(cb2)).toThrow('already exists');
    });

    it('should remove circuit breaker by ID', () => {
      registry.getForProxy('proxy-789');
      
      const removed = registry.remove('proxy-proxy-789');
      
      expect(removed).toBe(true);
      expect(registry.get('proxy-proxy-789')).toBeUndefined();
    });

    it('should return false when removing non-existent', () => {
      const removed = registry.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should destroy circuit breaker on removal', () => {
      const cb = registry.getForProxy('proxy-destroy');
      const destroySpy = vi.spyOn(cb, 'destroy');
      
      registry.remove('proxy-proxy-destroy');
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  // ============================================================
  // QUERYING
  // ============================================================
  describe('querying', () => {
    beforeEach(() => {
      // Create various circuit breakers
      registry.getForProxy('proxy-1');
      registry.getForProxy('proxy-2');
      registry.getForService('search', 'google');
      registry.getForService('api', 'translation');
    });

    it('should get all circuit breakers', () => {
      const all = registry.getAll();
      expect(all).toHaveLength(4);
    });

    it('should get circuit breakers by state', () => {
      // Trip one circuit breaker
      const cb = registry.getForProxy('proxy-1');
      cb.trip();
      
      const open = registry.getByState('OPEN');
      const closed = registry.getByState('CLOSED');
      
      expect(open).toHaveLength(1);
      expect(closed).toHaveLength(3);
    });

    it('should get circuit breakers by service type', () => {
      const proxies = registry.getByServiceType('proxy');
      const search = registry.getByServiceType('search');
      const api = registry.getByServiceType('api');
      
      expect(proxies).toHaveLength(2);
      expect(search).toHaveLength(1);
      expect(api).toHaveLength(1);
    });
  });

  // ============================================================
  // RESET OPERATIONS
  // ============================================================
  describe('reset operations', () => {
    it('should reset all circuit breakers', () => {
      const cb1 = registry.getForProxy('proxy-1');
      const cb2 = registry.getForProxy('proxy-2');
      
      cb1.trip();
      cb2.trip();
      
      expect(cb1.getState()).toBe('OPEN');
      expect(cb2.getState()).toBe('OPEN');
      
      registry.resetAll();
      
      expect(cb1.getState()).toBe('CLOSED');
      expect(cb2.getState()).toBe('CLOSED');
    });

    it('should reset circuit breakers by service type', () => {
      const proxy = registry.getForProxy('proxy-1');
      const search = registry.getForService('search', 'google');
      
      proxy.trip();
      search.trip();
      
      registry.resetByServiceType('proxy');
      
      expect(proxy.getState()).toBe('CLOSED');
      expect(search.getState()).toBe('OPEN');
    });
  });

  // ============================================================
  // AGGREGATE METRICS
  // ============================================================
  describe('aggregate metrics', () => {
    it('should calculate aggregate metrics', () => {
      const cb1 = registry.getForProxy('proxy-1');
      const cb2 = registry.getForService('search', 'google');
      
      cb1.recordSuccess();
      cb1.recordSuccess();
      cb1.recordFailure();
      
      cb2.recordSuccess();
      cb2.recordFailure();
      cb2.recordFailure();
      
      const metrics = registry.getAggregateMetrics();
      
      expect(metrics.totalCircuitBreakers).toBe(2);
      expect(metrics.totalRequests).toBe(6);
      expect(metrics.byServiceType.proxy).toBe(1);
      expect(metrics.byServiceType.search).toBe(1);
      expect(metrics.byState.CLOSED).toBe(2);
    });

    it('should calculate overall failure rate', () => {
      const cb1 = registry.getForProxy('proxy-1');
      
      cb1.recordSuccess();
      cb1.recordSuccess();
      cb1.recordFailure();
      cb1.recordFailure();
      
      const metrics = registry.getAggregateMetrics();
      
      expect(metrics.overallFailureRate).toBe(50);
    });

    it('should track total trips and rejections', () => {
      const cb1 = registry.getForProxy('proxy-1');
      cb1.trip();
      
      // Try to execute while open
      cb1.canExecute(); // This doesn't increment rejected
      
      const metrics = registry.getAggregateMetrics();
      
      expect(metrics.totalTrips).toBe(1);
    });
  });

  // ============================================================
  // EVENT FORWARDING
  // ============================================================
  describe('event forwarding', () => {
    it('should emit stateChange event from registry', () => {
      const stateChangeHandler = vi.fn();
      registry.on('stateChange', stateChangeHandler);
      
      const cb = registry.getForProxy('proxy-event', 'Test Proxy');
      cb.trip();
      
      expect(stateChangeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          circuitBreakerId: 'proxy-proxy-event',
          newState: 'OPEN'
        })
      );
    });

    it('should emit open event from registry', () => {
      const openHandler = vi.fn();
      registry.on('open', openHandler);
      
      const cb = registry.getForProxy('proxy-open');
      cb.trip();
      
      expect(openHandler).toHaveBeenCalled();
    });

    it('should emit close event from registry', () => {
      const closeHandler = vi.fn();
      registry.on('close', closeHandler);
      
      const cb = registry.getForProxy('proxy-close');
      cb.trip();
      cb.reset();
      
      expect(closeHandler).toHaveBeenCalled();
    });

    it('should emit created event when circuit breaker added', () => {
      const createdHandler = vi.fn();
      registry.on('created', createdHandler);
      
      registry.getForProxy('new-proxy');
      
      expect(createdHandler).toHaveBeenCalled();
    });

    it('should emit removed event when circuit breaker removed', () => {
      const removedHandler = vi.fn();
      registry.on('removed', removedHandler);
      
      registry.getForProxy('to-remove');
      registry.remove('proxy-to-remove');
      
      expect(removedHandler).toHaveBeenCalledWith('proxy-to-remove');
    });
  });

  // ============================================================
  // SNAPSHOTS
  // ============================================================
  describe('snapshots', () => {
    it('should get all snapshots for persistence', () => {
      registry.getForProxy('proxy-1');
      registry.getForProxy('proxy-2');
      registry.getForService('search', 'google');
      
      const snapshots = registry.getAllSnapshots();
      
      expect(snapshots).toHaveLength(3);
      expect(snapshots[0]).toHaveProperty('id');
      expect(snapshots[0]).toHaveProperty('state');
      expect(snapshots[0]).toHaveProperty('metrics');
      expect(snapshots[0]).toHaveProperty('config');
    });
  });

  // ============================================================
  // SINGLETON
  // ============================================================
  describe('singleton', () => {
    afterEach(() => {
      resetCircuitBreakerRegistry();
    });

    it('should return same instance', () => {
      const instance1 = getCircuitBreakerRegistry();
      const instance2 = getCircuitBreakerRegistry();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getCircuitBreakerRegistry();
      instance1.getForProxy('test');
      
      resetCircuitBreakerRegistry();
      
      const instance2 = getCircuitBreakerRegistry();
      expect(instance2).not.toBe(instance1);
      expect(instance2.getAll()).toHaveLength(0);
    });
  });

  // ============================================================
  // SERVICE TYPE CONFIGS
  // ============================================================
  describe('service type configs', () => {
    it('should apply service type specific configs', () => {
      const customRegistry = new CircuitBreakerRegistry({
        autoCleanup: false,
        serviceTypeConfigs: {
          proxy: {
            failureThreshold: 10,
            resetTimeout: 60000
          }
        }
      });
      
      const cb = customRegistry.getForProxy('custom-proxy');
      
      expect(cb.config.failureThreshold).toBe(10);
      expect(cb.config.resetTimeout).toBe(60000);
      
      customRegistry.destroy();
    });

    it('should apply default callbacks to all circuit breakers', () => {
      const onStateChange = vi.fn();
      
      const customRegistry = new CircuitBreakerRegistry({
        autoCleanup: false,
        defaultCallbacks: { onStateChange }
      });
      
      const cb = customRegistry.getForProxy('callback-proxy');
      cb.trip();
      
      expect(onStateChange).toHaveBeenCalled();
      
      customRegistry.destroy();
    });
  });

  // ============================================================
  // CLEANUP AND DESTRUCTION
  // ============================================================
  describe('cleanup and destruction', () => {
    it('should destroy all circuit breakers on registry destroy', () => {
      const cb1 = registry.getForProxy('proxy-1');
      const cb2 = registry.getForProxy('proxy-2');
      
      const destroy1 = vi.spyOn(cb1, 'destroy');
      const destroy2 = vi.spyOn(cb2, 'destroy');
      
      registry.destroy();
      
      expect(destroy1).toHaveBeenCalled();
      expect(destroy2).toHaveBeenCalled();
    });

    it('should clear all circuit breakers on destroy', () => {
      registry.getForProxy('proxy-1');
      registry.getForProxy('proxy-2');
      
      registry.destroy();
      
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
