/**
 * Proxy Rotation Strategy Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProxyRotationStrategy } from '../../electron/core/proxy-engine/rotation';
import type { ProxyConfig } from '../../electron/core/proxy-engine/types';

describe('ProxyRotationStrategy', () => {
  let strategy: ProxyRotationStrategy;
  let mockProxies: ProxyConfig[];

  beforeEach(() => {
    strategy = new ProxyRotationStrategy();
    mockProxies = [
      {
        id: '1',
        name: 'Proxy 1',
        host: 'proxy1.com',
        port: 8080,
        protocol: 'http',
        status: 'active',
        failureCount: 0,
        totalRequests: 10,
        successRate: 100,
        latency: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Proxy 2',
        host: 'proxy2.com',
        port: 8080,
        protocol: 'https',
        status: 'active',
        failureCount: 2,
        totalRequests: 10,
        successRate: 80,
        latency: 200,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Proxy 3',
        host: 'proxy3.com',
        port: 8080,
        protocol: 'http',
        status: 'active',
        failureCount: 0,
        totalRequests: 5,
        successRate: 100,
        latency: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  });

  describe('round-robin strategy', () => {
    it('should cycle through proxies sequentially', () => {
      strategy.setConfig({ strategy: 'round-robin' });

      const first = strategy.selectProxy(mockProxies);
      const second = strategy.selectProxy(mockProxies);
      const third = strategy.selectProxy(mockProxies);
      const fourth = strategy.selectProxy(mockProxies);

      expect(first?.id).toBe('1');
      expect(second?.id).toBe('2');
      expect(third?.id).toBe('3');
      expect(fourth?.id).toBe('1'); // Should cycle back
    });
  });

  describe('fastest strategy', () => {
    it('should select proxy with lowest latency', () => {
      strategy.setConfig({ strategy: 'fastest' });

      const selected = strategy.selectProxy(mockProxies);
      expect(selected?.id).toBe('3'); // Proxy 3 has latency of 50ms
    });
  });

  describe('least-used strategy', () => {
    it('should select proxy with lowest usage count', () => {
      strategy.setConfig({ strategy: 'least-used' });

      // Select proxy (should be first one with 0 usage)
      const first = strategy.selectProxy(mockProxies);
      expect(first).toBeDefined();

      // After multiple selections, should balance usage
      strategy.selectProxy(mockProxies);
      strategy.selectProxy(mockProxies);

      const stats = strategy.getUsageStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('failure-aware strategy', () => {
    it('should prefer proxies with lower failure rates', () => {
      strategy.setConfig({ strategy: 'failure-aware' });

      const selected = strategy.selectProxy(mockProxies);
      
      // Should prefer Proxy 1 or 3 (both have 0 failures) over Proxy 2
      expect(['1', '3']).toContain(selected?.id);
    });
  });

  describe('weighted strategy', () => {
    it('should respect custom weights', () => {
      strategy.setConfig({
        strategy: 'weighted',
        weights: {
          '1': 10,
          '2': 1,
          '3': 1
        }
      });

      // Select multiple times and check distribution
      const selections = new Map<string, number>();
      for (let i = 0; i < 100; i++) {
        const proxy = strategy.selectProxy(mockProxies);
        if (proxy) {
          selections.set(proxy.id, (selections.get(proxy.id) || 0) + 1);
        }
      }

      // Proxy 1 should be selected much more often due to higher weight
      const proxy1Count = selections.get('1') || 0;
      const proxy2Count = selections.get('2') || 0;
      expect(proxy1Count).toBeGreaterThan(proxy2Count * 2);
    });
  });
});
