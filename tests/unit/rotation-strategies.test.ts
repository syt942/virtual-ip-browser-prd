/**
 * Proxy Rotation Strategies Tests
 * TDD tests for Geographic, Sticky-Session, Time-Based, and Custom Rules strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProxyRotationStrategy } from '../../electron/core/proxy-engine/rotation';
import type { ProxyConfig, RotationConfig, GeoLocation } from '../../electron/core/proxy-engine/types';

// Helper to create mock proxies
function createMockProxy(overrides: Partial<ProxyConfig> = {}): ProxyConfig {
  return {
    id: crypto.randomUUID(),
    name: 'Test Proxy',
    host: 'proxy.test.com',
    port: 8080,
    protocol: 'http',
    status: 'active',
    failureCount: 0,
    totalRequests: 10,
    successRate: 100,
    latency: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

// Helper to create mock geolocation
function createMockGeoLocation(overrides: Partial<GeoLocation> = {}): GeoLocation {
  return {
    country: 'US',
    countryName: 'United States',
    region: 'California',
    city: 'Los Angeles',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    ...overrides
  };
}

describe('ProxyRotationStrategy - New Strategies', () => {
  let strategy: ProxyRotationStrategy;
  let mockProxies: ProxyConfig[];

  beforeEach(() => {
    strategy = new ProxyRotationStrategy();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ============================================================
  // GEOGRAPHIC ROTATION STRATEGY TESTS
  // ============================================================
  describe('geographic strategy', () => {
    let geoProxies: ProxyConfig[];

    beforeEach(() => {
      geoProxies = [
        createMockProxy({
          id: 'us-1',
          name: 'US Proxy 1',
          geolocation: createMockGeoLocation({ country: 'US', region: 'California' })
        }),
        createMockProxy({
          id: 'us-2',
          name: 'US Proxy 2',
          geolocation: createMockGeoLocation({ country: 'US', region: 'Texas' })
        }),
        createMockProxy({
          id: 'uk-1',
          name: 'UK Proxy 1',
          geolocation: createMockGeoLocation({ country: 'GB', countryName: 'United Kingdom', region: 'London' })
        }),
        createMockProxy({
          id: 'de-1',
          name: 'DE Proxy 1',
          geolocation: createMockGeoLocation({ country: 'DE', countryName: 'Germany', region: 'Berlin' })
        }),
        createMockProxy({
          id: 'no-geo',
          name: 'No Geo Proxy',
          geolocation: undefined
        })
      ];
    });

    it('should select proxies from preferred countries first', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US']
      });

      const selected = strategy.selectProxy(geoProxies);
      expect(selected).toBeDefined();
      expect(selected?.geolocation?.country).toBe('US');
    });

    it('should cycle through proxies within preferred country (round-robin)', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US']
      });

      const first = strategy.selectProxy(geoProxies);
      const second = strategy.selectProxy(geoProxies);

      expect(first?.geolocation?.country).toBe('US');
      expect(second?.geolocation?.country).toBe('US');
      expect(first?.id).not.toBe(second?.id);
    });

    it('should respect geographic preferences order', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['GB', 'US']
      });

      const selected = strategy.selectProxy(geoProxies);
      expect(selected?.geolocation?.country).toBe('GB');
    });

    it('should exclude specified countries', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US', 'GB'],
        excludeCountries: ['US']
      });

      // Select multiple times to ensure US is never selected
      for (let i = 0; i < 10; i++) {
        const selected = strategy.selectProxy(geoProxies);
        expect(selected?.geolocation?.country).not.toBe('US');
      }
    });

    it('should fallback to round-robin when no geo matches', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['JP'] // No Japanese proxies
      });

      const selected = strategy.selectProxy(geoProxies);
      expect(selected).toBeDefined();
    });

    it('should filter by region within a country', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US'],
        preferredRegions: ['California']
      });

      // Select multiple times
      for (let i = 0; i < 5; i++) {
        const selected = strategy.selectProxy(geoProxies);
        expect(selected?.geolocation?.region).toBe('California');
      }
    });

    it('should handle proxies without geolocation data', () => {
      const noGeoProxies = [
        createMockProxy({ id: '1', geolocation: undefined }),
        createMockProxy({ id: '2', geolocation: undefined })
      ];

      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US']
      });

      const selected = strategy.selectProxy(noGeoProxies);
      expect(selected).toBeDefined(); // Should fallback
    });

    it('should return null for empty proxy list', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US']
      });

      const selected = strategy.selectProxy([]);
      expect(selected).toBeNull();
    });

    it('should support target country override in context', () => {
      strategy.setConfig({
        strategy: 'geographic',
        geographicPreferences: ['US']
      });

      const selected = strategy.selectProxy(geoProxies, { targetCountry: 'DE' });
      expect(selected?.geolocation?.country).toBe('DE');
    });
  });

  // ============================================================
  // STICKY-SESSION STRATEGY TESTS
  // ============================================================
  describe('sticky-session strategy', () => {
    let sessionProxies: ProxyConfig[];

    beforeEach(() => {
      sessionProxies = [
        createMockProxy({ id: 'proxy-1', name: 'Proxy 1' }),
        createMockProxy({ id: 'proxy-2', name: 'Proxy 2' }),
        createMockProxy({ id: 'proxy-3', name: 'Proxy 3' })
      ];
    });

    it('should return same proxy for same domain', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000 // 1 hour
      });

      const first = strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      const second = strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      const third = strategy.selectProxy(sessionProxies, { domain: 'example.com' });

      expect(first?.id).toBe(second?.id);
      expect(second?.id).toBe(third?.id);
    });

    it('should return different proxies for different domains', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      const selections = new Set<string>();
      const domains = ['google.com', 'facebook.com', 'twitter.com', 'github.com', 'reddit.com'];

      for (const domain of domains) {
        const proxy = strategy.selectProxy(sessionProxies, { domain });
        if (proxy) {selections.add(`${domain}:${proxy.id}`);}
      }

      // Each domain should have a consistent mapping
      for (const domain of domains) {
        const proxy = strategy.selectProxy(sessionProxies, { domain });
        expect(selections.has(`${domain}:${proxy?.id}`)).toBe(true);
      }
    });

    it('should expire sticky mappings after TTL', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 1000 // 1 second
      });

      const first = strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      
      // Advance time past TTL
      vi.advanceTimersByTime(2000);

      // The mapping should potentially change after expiry
      // (implementation may assign same or different proxy)
      const afterExpiry = strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      expect(afterExpiry).toBeDefined();
    });

    it('should use consistent hashing for deterministic assignment', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000,
        stickyHashAlgorithm: 'consistent'
      });

      // Same domain should always hash to same proxy (deterministic)
      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        const proxy = strategy.selectProxy(sessionProxies, { domain: 'test.com' });
        results.push(proxy?.id || '');
      }

      expect(new Set(results).size).toBe(1);
    });

    it('should normalize domains (handle URLs)', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      const fromUrl = strategy.selectProxy(sessionProxies, { domain: 'https://example.com/path?query=1' });
      const fromDomain = strategy.selectProxy(sessionProxies, { domain: 'example.com' });

      expect(fromUrl?.id).toBe(fromDomain?.id);
    });

    it('should handle wildcard domain patterns', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      // Set a wildcard mapping
      strategy.setStickyMapping('*.google.com', 'proxy-1');

      const maps = strategy.selectProxy(sessionProxies, { domain: 'mail.google.com' });
      const docs = strategy.selectProxy(sessionProxies, { domain: 'docs.google.com' });

      expect(maps?.id).toBe('proxy-1');
      expect(docs?.id).toBe('proxy-1');
    });

    it('should fallback when sticky proxy becomes unavailable', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000,
        stickyFallbackOnFailure: true
      });

      const first = strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      
      // Remove the assigned proxy
      const remainingProxies = sessionProxies.filter(p => p.id !== first?.id);

      const fallback = strategy.selectProxy(remainingProxies, { domain: 'example.com' });
      expect(fallback).toBeDefined();
      expect(fallback?.id).not.toBe(first?.id);
    });

    it('should return null without domain context', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      // Without domain, should fallback to round-robin
      const selected = strategy.selectProxy(sessionProxies);
      expect(selected).toBeDefined();
    });

    it('should track mapping statistics', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      strategy.selectProxy(sessionProxies, { domain: 'example.com' });

      const mappings = strategy.getStickyMappings();
      const mapping = mappings.find(m => m.domain === 'example.com');
      
      expect(mapping).toBeDefined();
      expect(mapping?.requestCount).toBe(3);
    });

    it('should clear sticky mapping manually', () => {
      strategy.setConfig({
        strategy: 'sticky-session',
        stickySessionTTL: 3600000
      });

      strategy.selectProxy(sessionProxies, { domain: 'example.com' });
      strategy.clearStickyMapping('example.com');

      const mappings = strategy.getStickyMappings();
      expect(mappings.find(m => m.domain === 'example.com')).toBeUndefined();
    });
  });

  // ============================================================
  // TIME-BASED ROTATION STRATEGY TESTS
  // ============================================================
  describe('time-based strategy', () => {
    let timeProxies: ProxyConfig[];

    beforeEach(() => {
      timeProxies = [
        createMockProxy({ id: 'proxy-1', name: 'Proxy 1' }),
        createMockProxy({ id: 'proxy-2', name: 'Proxy 2' }),
        createMockProxy({ id: 'proxy-3', name: 'Proxy 3' })
      ];
    });

    it('should rotate proxy after interval expires', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 5000 // 5 seconds
      });

      const first = strategy.selectProxy(timeProxies);
      
      // Before interval expires - should return same proxy
      vi.advanceTimersByTime(3000);
      const same = strategy.selectProxy(timeProxies);
      expect(same?.id).toBe(first?.id);

      // After interval expires - should rotate
      vi.advanceTimersByTime(3000); // Total: 6 seconds
      const rotated = strategy.selectProxy(timeProxies);
      expect(rotated?.id).not.toBe(first?.id);
    });

    it('should apply jitter to rotation interval', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 10000, // 10 seconds
        jitterPercent: 50 // +/- 50%
      });

      // With 50% jitter, interval could be 5000-15000ms
      const intervals: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const interval = strategy.getNextRotationInterval();
        intervals.push(interval);
      }

      // Check that intervals vary (not all the same)
      const uniqueIntervals = new Set(intervals);
      expect(uniqueIntervals.size).toBeGreaterThan(1);

      // Check all intervals are within bounds
      for (const interval of intervals) {
        expect(interval).toBeGreaterThanOrEqual(5000);
        expect(interval).toBeLessThanOrEqual(15000);
      }
    });

    it('should respect minimum interval', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 1000,
        minInterval: 5000,
        jitterPercent: 90
      });

      const interval = strategy.getNextRotationInterval();
      expect(interval).toBeGreaterThanOrEqual(5000);
    });

    it('should respect maximum interval', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 100000,
        maxInterval: 30000,
        jitterPercent: 50
      });

      const interval = strategy.getNextRotationInterval();
      expect(interval).toBeLessThanOrEqual(30000);
    });

    it('should track last rotation timestamp', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 5000
      });

      const now = Date.now();
      vi.setSystemTime(now);

      strategy.selectProxy(timeProxies);

      const lastRotation = strategy.getLastRotationTime();
      expect(lastRotation?.getTime()).toBe(now);
    });

    it('should provide time until next rotation', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 10000
      });

      strategy.selectProxy(timeProxies);
      
      vi.advanceTimersByTime(3000);
      
      const timeUntilNext = strategy.getTimeUntilNextRotation();
      expect(timeUntilNext).toBe(7000);
    });

    it('should force rotation on demand', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 60000 // 1 minute
      });

      const first = strategy.selectProxy(timeProxies);
      
      // Force rotation before interval
      strategy.forceRotation();
      
      const afterForce = strategy.selectProxy(timeProxies);
      expect(afterForce?.id).not.toBe(first?.id);
    });

    it('should rotate on proxy failure when configured', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 60000,
        rotateOnFailure: true
      });

      const first = strategy.selectProxy(timeProxies);
      
      // Report failure on current proxy
      strategy.reportProxyFailure(first!.id);
      
      const afterFailure = strategy.selectProxy(timeProxies);
      expect(afterFailure?.id).not.toBe(first?.id);
    });

    it('should not rotate on failure when disabled', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 60000,
        rotateOnFailure: false
      });

      const first = strategy.selectProxy(timeProxies);
      
      strategy.reportProxyFailure(first!.id);
      
      // Should still return same proxy (within interval)
      const afterFailure = strategy.selectProxy(timeProxies);
      expect(afterFailure?.id).toBe(first?.id);
    });

    it('should track rotation history', () => {
      strategy.setConfig({
        strategy: 'time-based',
        interval: 1000
      });

      strategy.selectProxy(timeProxies);
      vi.advanceTimersByTime(2000);
      strategy.selectProxy(timeProxies);
      vi.advanceTimersByTime(2000);
      strategy.selectProxy(timeProxies);

      const history = strategy.getRotationHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('reason');
    });

    it('should respect schedule windows', () => {
      // Set current time to Monday 10:00 AM
      const monday10am = new Date('2024-01-08T10:00:00');
      vi.setSystemTime(monday10am);

      strategy.setConfig({
        strategy: 'time-based',
        interval: 1000,
        scheduleWindows: [{
          startHour: 9,
          endHour: 17,
          daysOfWeek: [1, 2, 3, 4, 5] // Monday-Friday
        }]
      });

      // Should rotate during window
      const first = strategy.selectProxy(timeProxies);
      vi.advanceTimersByTime(2000);
      const second = strategy.selectProxy(timeProxies);
      expect(second?.id).not.toBe(first?.id);
    });

    it('should skip rotation outside schedule windows', () => {
      // Set current time to Sunday 10:00 AM
      const sunday10am = new Date('2024-01-07T10:00:00');
      vi.setSystemTime(sunday10am);

      strategy.setConfig({
        strategy: 'time-based',
        interval: 1000,
        scheduleWindows: [{
          startHour: 9,
          endHour: 17,
          daysOfWeek: [1, 2, 3, 4, 5] // Monday-Friday only
        }]
      });

      const first = strategy.selectProxy(timeProxies);
      vi.advanceTimersByTime(2000);
      const second = strategy.selectProxy(timeProxies);
      
      // Should NOT rotate on Sunday
      expect(second?.id).toBe(first?.id);
    });

    it('should handle overnight schedule windows', () => {
      // Set current time to 23:00
      const night = new Date('2024-01-08T23:00:00');
      vi.setSystemTime(night);

      strategy.setConfig({
        strategy: 'time-based',
        interval: 1000,
        scheduleWindows: [{
          startHour: 22,
          endHour: 6, // Overnight window
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
        }]
      });

      const first = strategy.selectProxy(timeProxies);
      vi.advanceTimersByTime(2000);
      const second = strategy.selectProxy(timeProxies);
      
      expect(second?.id).not.toBe(first?.id);
    });
  });

  // ============================================================
  // CUSTOM RULES STRATEGY TESTS
  // ============================================================
  describe('custom strategy', () => {
    let rulesProxies: ProxyConfig[];

    beforeEach(() => {
      rulesProxies = [
        createMockProxy({
          id: 'fast-proxy',
          name: 'Fast Proxy',
          latency: 50,
          geolocation: createMockGeoLocation({ country: 'US' }),
          tags: ['premium', 'fast']
        }),
        createMockProxy({
          id: 'uk-proxy',
          name: 'UK Proxy',
          latency: 150,
          geolocation: createMockGeoLocation({ country: 'GB' }),
          tags: ['standard']
        }),
        createMockProxy({
          id: 'slow-proxy',
          name: 'Slow Proxy',
          latency: 500,
          geolocation: createMockGeoLocation({ country: 'DE' }),
          tags: ['budget']
        })
      ];
    });

    it('should evaluate rules by priority order', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [
          {
            id: 'rule-1',
            name: 'Low Priority',
            priority: 1,
            conditions: [{ field: 'domain', operator: 'contains', value: 'example' }],
            actions: [{ action: 'use_proxy', params: { proxyId: 'slow-proxy' } }],
            enabled: true
          },
          {
            id: 'rule-2',
            name: 'High Priority',
            priority: 10,
            conditions: [{ field: 'domain', operator: 'contains', value: 'example' }],
            actions: [{ action: 'use_proxy', params: { proxyId: 'fast-proxy' } }],
            enabled: true
          }
        ]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'example.com' });
      expect(selected?.id).toBe('fast-proxy'); // Higher priority rule wins
    });

    it('should support domain equals condition', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Google Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'equals', value: 'google.com' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const google = strategy.selectProxy(rulesProxies, { domain: 'google.com' });
      const other = strategy.selectProxy(rulesProxies, { domain: 'facebook.com' });

      expect(google?.id).toBe('uk-proxy'); // Rule matched
      expect(other?.id).not.toBe('uk-proxy'); // No rule matches, fallback to round-robin
    });

    it('should support domain contains condition', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Social Media Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'contains', value: 'facebook' }],
          actions: [{ action: 'use_country', params: { country: 'US' } }],
          enabled: true
        }]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'www.facebook.com' });
      expect(selected?.geolocation?.country).toBe('US');
    });

    it('should support domain starts_with condition', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'API Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'starts_with', value: 'api.' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const api = strategy.selectProxy(rulesProxies, { domain: 'api.example.com' });
      const www = strategy.selectProxy(rulesProxies, { domain: 'www.example.com' });

      expect(api?.id).toBe('uk-proxy');
      expect(www?.id).not.toBe('uk-proxy');
    });

    it('should support domain ends_with condition', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'UK Sites Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'ends_with', value: '.co.uk' }],
          actions: [{ action: 'use_country', params: { country: 'GB' } }],
          enabled: true
        }]
      });

      const uk = strategy.selectProxy(rulesProxies, { domain: 'bbc.co.uk' });
      expect(uk?.geolocation?.country).toBe('GB');
    });

    it('should support regex matching', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Pattern Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'matches_regex', value: '^.*\\.google\\.(com|co\\.uk)$' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const googleCom = strategy.selectProxy(rulesProxies, { domain: 'mail.google.com' });
      const googleUk = strategy.selectProxy(rulesProxies, { domain: 'mail.google.co.uk' });
      const other = strategy.selectProxy(rulesProxies, { domain: 'mail.yahoo.com' });

      expect(googleCom?.id).toBe('uk-proxy');
      expect(googleUk?.id).toBe('uk-proxy');
      expect(other?.id).not.toBe('uk-proxy');
    });

    it('should support AND condition logic', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Combined Rule',
          priority: 1,
          conditionLogic: 'AND',
          conditions: [
            { field: 'domain', operator: 'contains', value: 'example' },
            { field: 'path', operator: 'starts_with', value: '/api' }
          ],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const match = strategy.selectProxy(rulesProxies, { 
        domain: 'example.com', 
        url: 'https://example.com/api/users' 
      });
      const noMatch = strategy.selectProxy(rulesProxies, { 
        domain: 'example.com', 
        url: 'https://example.com/web/home' 
      });

      expect(match?.id).toBe('uk-proxy');
      expect(noMatch?.id).not.toBe('uk-proxy');
    });

    it('should support OR condition logic', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Either Rule',
          priority: 1,
          conditionLogic: 'OR',
          conditions: [
            { field: 'domain', operator: 'equals', value: 'google.com' },
            { field: 'domain', operator: 'equals', value: 'youtube.com' }
          ],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const google = strategy.selectProxy(rulesProxies, { domain: 'google.com' });
      const youtube = strategy.selectProxy(rulesProxies, { domain: 'youtube.com' });
      const other = strategy.selectProxy(rulesProxies, { domain: 'facebook.com' });

      expect(google?.id).toBe('uk-proxy');
      expect(youtube?.id).toBe('uk-proxy');
      expect(other?.id).not.toBe('uk-proxy');
    });

    it('should support use_country action', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'UK Sites',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'ends_with', value: '.uk' }],
          actions: [{ action: 'use_country', params: { country: 'GB' } }],
          enabled: true
        }]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'bbc.co.uk' });
      expect(selected?.geolocation?.country).toBe('GB');
    });

    it('should support exclude_proxy action', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'No Slow',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'contains', value: 'fast-site' }],
          actions: [{ action: 'exclude_proxy', params: { proxyId: 'slow-proxy' } }],
          enabled: true
        }]
      });

      // Select multiple times - should never get slow-proxy
      for (let i = 0; i < 10; i++) {
        const selected = strategy.selectProxy(rulesProxies, { domain: 'fast-site.com' });
        expect(selected?.id).not.toBe('slow-proxy');
      }
    });

    it('should support exclude_country action', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'No DE',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'equals', value: 'sensitive.com' }],
          actions: [{ action: 'exclude_country', params: { country: 'DE' } }],
          enabled: true
        }]
      });

      for (let i = 0; i < 10; i++) {
        const selected = strategy.selectProxy(rulesProxies, { domain: 'sensitive.com' });
        expect(selected?.geolocation?.country).not.toBe('DE');
      }
    });

    it('should support time-based conditions', () => {
      // Set time to 10 AM
      vi.setSystemTime(new Date('2024-01-08T10:00:00'));

      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Business Hours',
          priority: 1,
          conditions: [
            { field: 'time_hour', operator: 'greater_than', value: 8 },
            { field: 'time_hour', operator: 'less_than', value: 18 }
          ],
          conditionLogic: 'AND',
          actions: [{ action: 'use_proxy', params: { proxyId: 'fast-proxy' } }],
          enabled: true
        }]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'any.com' });
      expect(selected?.id).toBe('fast-proxy');
    });

    it('should support in_list condition', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Premium Sites',
          priority: 1,
          conditions: [{
            field: 'domain',
            operator: 'in_list',
            value: ['netflix.com', 'hulu.com', 'disney.com']
          }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const netflix = strategy.selectProxy(rulesProxies, { domain: 'netflix.com' });
      const other = strategy.selectProxy(rulesProxies, { domain: 'example.com' });

      expect(netflix?.id).toBe('uk-proxy');
      expect(other?.id).not.toBe('uk-proxy');
    });

    it('should skip disabled rules', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Disabled Rule',
          priority: 10,
          conditions: [{ field: 'domain', operator: 'equals', value: 'test.com' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: false // Disabled
        }]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'test.com' });
      // Should fallback to round-robin (fast-proxy), not use the disabled rule's uk-proxy
      expect(selected?.id).not.toBe('uk-proxy');
    });

    it('should stop on match when configured', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [
          {
            id: 'rule-1',
            name: 'First Match',
            priority: 10,
            conditions: [{ field: 'domain', operator: 'contains', value: 'test' }],
            actions: [{ action: 'use_proxy', params: { proxyId: 'fast-proxy' } }],
            stopOnMatch: true,
            enabled: true
          },
          {
            id: 'rule-2',
            name: 'Second Match',
            priority: 5,
            conditions: [{ field: 'domain', operator: 'contains', value: 'test' }],
            actions: [{ action: 'use_proxy', params: { proxyId: 'slow-proxy' } }],
            enabled: true
          }
        ]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'test.com' });
      expect(selected?.id).toBe('fast-proxy'); // First rule stops evaluation
    });

    it('should fallback when no rules match', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Specific Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'equals', value: 'specific.com' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'fast-proxy' } }],
          enabled: true
        }]
      });

      const selected = strategy.selectProxy(rulesProxies, { domain: 'other.com' });
      expect(selected).toBeDefined(); // Should fallback to round-robin
    });

    it('should handle case sensitivity option', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Case Sensitive',
          priority: 1,
          conditions: [{
            field: 'domain',
            operator: 'equals',
            value: 'Example.COM',
            caseSensitive: true
          }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
          enabled: true
        }]
      });

      const exact = strategy.selectProxy(rulesProxies, { domain: 'Example.COM' });
      const lower = strategy.selectProxy(rulesProxies, { domain: 'example.com' });

      expect(exact?.id).toBe('uk-proxy');
      expect(lower?.id).not.toBe('uk-proxy');
    });

    it('should return rule evaluation results', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: [{
          id: 'rule-1',
          name: 'Test Rule',
          priority: 1,
          conditions: [{ field: 'domain', operator: 'equals', value: 'test.com' }],
          actions: [{ action: 'use_proxy', params: { proxyId: 'fast-proxy' } }],
          enabled: true
        }]
      });

      const result = strategy.evaluateRules({ domain: 'test.com' }, rulesProxies);
      
      expect(result.matched).toBe(true);
      expect(result.rule?.id).toBe('rule-1');
      expect(result.actions).toHaveLength(1);
    });

    it('should add and remove rules dynamically', () => {
      strategy.setConfig({
        strategy: 'custom',
        rules: []
      });

      const rule = {
        id: 'dynamic-rule',
        name: 'Dynamic',
        priority: 1,
        conditions: [{ field: 'domain', operator: 'equals', value: 'dynamic.com' }],
        actions: [{ action: 'use_proxy', params: { proxyId: 'uk-proxy' } }],
        enabled: true
      };

      strategy.addRule(rule);
      
      let selected = strategy.selectProxy(rulesProxies, { domain: 'dynamic.com' });
      expect(selected?.id).toBe('uk-proxy');

      strategy.removeRule('dynamic-rule');
      
      selected = strategy.selectProxy(rulesProxies, { domain: 'dynamic.com' });
      // After removing rule, should fallback to round-robin (not uk-proxy)
      expect(selected?.id).not.toBe('uk-proxy');
    });
  });
});
